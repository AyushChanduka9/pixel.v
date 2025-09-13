import { useState, useEffect } from 'react';
import { Sparkles, Download, Save, RefreshCw, Settings, Wand2, X, Clock, Users, Coins } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface GenerationJob {
  id: string;
  prompt: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  progress: number;
  imageUrl?: string;
  error?: string;
  createdAt: Date;
  settings: GenerationSettings;
  provider: 'horde';
  hordeJobId?: string;
  queuePosition?: number;
  kudosCost?: number;
  metadata?: any;
}

interface GenerationSettings {
  provider: 'horde';
  model: 'stable_diffusion' | 'anything_v5' | 'deliberate' | 'realistic_vision';
  size: '512x512' | '768x768' | '1024x1024' | '512x768' | '768x512';
  negativePrompt?: string;
  steps?: number;
  guidance?: number;
}

interface AIImageGeneratorProps {
  onClose: () => void;
  onImageGenerated?: (imageUrl: string, metadata: any) => void;
}

export default function AIImageGenerator({ onClose, onImageGenerated }: AIImageGeneratorProps) {
  const { user, redirectToLogin } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<GenerationSettings>({
    provider: 'horde',
    model: 'stable_diffusion',
    size: '512x512',
    steps: 20,
    guidance: 7.5,
  });

  // Poll AI Horde jobs with reduced frequency to avoid rate limits
  useEffect(() => {
    const interval = setInterval(() => {
      pollHordeJobs();
    }, 5000); // 5s interval to reduce rate limiting

    return () => clearInterval(interval);
  }, [jobs]);

  const pollHordeJobs = async () => {
    const hordeJobs = jobs.filter(job => 
      job.status === 'generating' && job.hordeJobId
    );

    if (hordeJobs.length === 0) {
      return; // No AI Horde jobs to poll
    }

    console.log('🔄 [HORDE-POLL] Starting AI Horde status polling:', {
      jobCount: hordeJobs.length,
      jobIds: hordeJobs.map(j => ({ id: j.id, hordeJobId: j.hordeJobId, progress: j.progress })),
      timestamp: new Date().toISOString()
    });

    for (const job of hordeJobs) {
      try {
        const response = await fetch(`/api/ai/horde-status/${job.hordeJobId}`);
        
        if (!response.ok) {
          if (response.status === 429) {
            console.warn('⏳ [HORDE-POLL] Rate limited by AI Horde, will retry later');
            continue; // Skip this iteration, try again later
          }
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();

        if (result.success) {
          if (result.done && result.imageUrl) {
            console.log('🎉 [HORDE-POLL] Generation completed successfully');

            // Generation complete
            const updatedJob = { 
              ...job, 
              status: 'completed' as const, 
              progress: 100,
              imageUrl: result.imageUrl,
              metadata: {
                ...result.metadata,
                completedAt: new Date().toISOString(),
                totalGenerationTime: Date.now() - job.createdAt.getTime()
              }
            };
            
            setJobs(prev => prev.map(j => 
              j.id === job.id ? updatedJob : j
            ));

            // Automatically save to gallery with private visibility
            try {
              await autoSaveToGallery(updatedJob);
            } catch (saveError) {
              console.error('❌ [HORDE-POLL] Auto-save failed:', saveError);
            }

            if (onImageGenerated) {
              onImageGenerated(result.imageUrl, {
                prompt: job.prompt,
                provider: 'horde',
                generatedAt: new Date().toISOString()
              });
            }
          } else {
            // Update progress based on queue position
            const progress = result.queue_position 
              ? Math.max(10, 100 - (result.queue_position * 10)) 
              : Math.min(90, job.progress + 5);

            setJobs(prev => prev.map(j => 
              j.id === job.id 
                ? { 
                    ...j, 
                    progress,
                    queuePosition: result.queue_position,
                    metadata: {
                      ...j.metadata,
                      lastPollAt: new Date().toISOString(),
                      waiting: result.waiting,
                      processing: result.processing
                    }
                  }
                : j
            ));
          }
        } else if (result.error) {
          // Handle errors by marking job as failed
          setJobs(prev => prev.map(j => 
            j.id === job.id 
              ? { 
                  ...j, 
                  status: 'failed',
                  error: result.error,
                  metadata: {
                    ...j.metadata,
                    failedAt: new Date().toISOString(),
                    totalTime: Date.now() - job.createdAt.getTime()
                  }
                }
              : j
          ));
        }
      } catch (error) {
        console.error('❌ [HORDE-POLL] Polling error:', error);
        
        // Mark job as failed if we can't check status
        setJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                status: 'failed',
                error: 'Failed to check generation status',
                metadata: {
                  ...j.metadata,
                  failedAt: new Date().toISOString(),
                  failureReason: 'polling-error',
                  lastError: error instanceof Error ? error.message : 'Unknown error'
                }
              }
            : j
        ));
      }
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      return;
    }

    const jobId = crypto.randomUUID();
    
    const newJob: GenerationJob = {
      id: jobId,
      prompt: prompt.trim(),
      status: 'pending',
      progress: 0,
      createdAt: new Date(),
      settings: { ...settings },
      provider: 'horde'
    };

    setJobs(prev => [newJob, ...prev]);

    try {
      // Update job status to generating
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { ...job, status: 'generating', progress: 10 }
          : job
      ));

      const requestBody = {
        prompt: prompt.trim(),
        settings
      };

      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // For AI Horde, we get a job ID to poll
      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              hordeJobId: result.jobId,
              kudosCost: result.metadata?.kudosCost,
              queuePosition: result.metadata?.queuePosition,
              progress: 20,
              metadata: {
                ...job.metadata,
                submittedAt: new Date().toISOString(),
                kudosCost: result.metadata?.kudosCost
              }
            }
          : job
      ));

    } catch (error) {
      console.error('❌ [GENERATE] Generation process failed:', error);

      setJobs(prev => prev.map(job => 
        job.id === jobId 
          ? { 
              ...job, 
              status: 'failed', 
              error: error instanceof Error ? error.message : 'Generation failed',
              metadata: {
                ...job.metadata,
                failedAt: new Date().toISOString(),
                failureReason: 'generation-error',
                lastError: error instanceof Error ? error.message : 'Unknown error'
              }
            }
          : job
      ));
    }
  };

  const downloadImage = async (imageUrl: string, prompt: string) => {
    try {
      const response = await fetch(imageUrl);

      if (!response.ok) {
        alert(`Failed to download image: ${response.status} ${response.statusText}`);
        return;
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        alert('Downloaded file is empty');
        return;
      }

      const url = URL.createObjectURL(blob);
      const filename = `ai-generated-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.png`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      
      link.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

    } catch (error) {
      alert(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const saveToGallery = async (job: GenerationJob, privacy: 'public' | 'private' = 'public') => {
    if (!job.imageUrl) {
      alert('No image to save to gallery');
      return;
    }

    try {
      const isBase64 = job.imageUrl.startsWith('data:');
      const requestBody = {
        prompt: job.prompt,
        settings: job.settings,
        provider: job.provider,
        title: `AI Generated: ${job.prompt.slice(0, 50)}`,
        caption: `Generated with AI Horde using prompt: "${job.prompt}"`,
        alt_text: job.prompt,
        privacy,
        ...(isBase64 
          ? { imageBase64: job.imageUrl } 
          : { imageUrl: job.imageUrl }
        )
      };

      const response = await fetch('/api/ai/save-generated-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (response.ok) {
        // Show success message
        alert(`Image saved to gallery as ${privacy}!`);
      } else {
        alert(`Failed to save image to gallery: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      alert(`Failed to save image to gallery: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const autoSaveToGallery = async (job: GenerationJob) => {
    if (!job.imageUrl) {
      return;
    }

    try {
      // Determine if we have a URL or base64 data
      const isBase64 = job.imageUrl.startsWith('data:');
      
      const requestBody = {
        prompt: job.prompt,
        settings: job.settings,
        provider: job.provider,
        title: `AI Generated: ${job.prompt.slice(0, 50)}`,
        caption: `Generated with AI Horde using prompt: "${job.prompt}"`,
        alt_text: job.prompt,
        privacy: 'private', // Automatically save as private
        ...(isBase64 
          ? { imageBase64: job.imageUrl } 
          : { imageUrl: job.imageUrl }
        )
      };

      const response = await fetch('/api/ai/save-generated-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        // Show user-friendly error notification
        alert(`Failed to save AI Horde generated image to gallery. Error: ${response.status} ${response.statusText}`);
        return;
      }

      const result = await response.json();

      // Update the job with the saved Cloudinary URL for consistent display
      if (result.savedUrl) {
        setJobs(prev => prev.map(j => 
          j.id === job.id 
            ? { 
                ...j, 
                imageUrl: result.savedUrl, 
                metadata: { 
                  ...j.metadata, 
                  cloudinaryUrl: result.savedUrl,
                  savedToGallery: true,
                  galleryImageId: result.imageId,
                  autoSaveTimestamp: new Date().toISOString()
                } 
              }
            : j
        ));
      }

    } catch (error) {
      // Show user-friendly error
      alert(`Failed to auto-save AI Horde generated image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const getStatusIcon = (job: GenerationJob) => {
    switch (job.status) {
      case 'pending':
        return <RefreshCw className="w-4 h-4 text-yellow-500" />;
      case 'generating':
        return <Users className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'completed':
        return <Sparkles className="w-4 h-4 text-green-500" />;
      case 'failed':
        return <X className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusText = (job: GenerationJob) => {
    if (job.status === 'generating') {
      if (job.queuePosition) {
        return `Queue position: ${job.queuePosition}`;
      }
      return 'Processing...';
    }
    return job.status.charAt(0).toUpperCase() + job.status.slice(1);
  };

  // Redirect to login if not authenticated
  if (!user) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Wand2 className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">
              You need to be logged in to generate AI images. Please sign in to continue.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onClose();
                  redirectToLogin();
                }}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-500 text-white rounded-lg hover:from-purple-700 hover:to-pink-600 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-pink-500 rounded-lg flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">AI Image Generator</h2>
              <p className="text-sm text-gray-600">Powered by AI Horde - Free community AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Generation Panel */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Generate New Image</h3>
              
              {/* Provider Info */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">AI Provider</label>
                <div className="p-4 rounded-lg border-2 border-green-500 bg-green-50">
                  <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-700">AI Horde</span>
                    <span className="text-xs bg-green-200 text-green-800 px-2 py-1 rounded-full">FREE</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Community-powered Stable Diffusion models</p>
                </div>
              </div>
              
              {/* Prompt Input */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe your image
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A futuristic cityscape at sunset with flying cars and neon lights..."
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-500"
                  />
                </div>

                {/* Settings Toggle */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="flex items-center space-x-2 text-purple-600 hover:text-purple-700 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Advanced Settings</span>
                  </button>
                  
                  <button
                    onClick={generateImage}
                    disabled={!prompt.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-lg hover:from-green-700 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Free</span>
                  </button>
                </div>

                {/* Advanced Settings */}
                {showSettings && (
                  <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Stable Diffusion Model</label>
                        <select
                          value={settings.model}
                          onChange={(e) => setSettings(prev => ({ ...prev, model: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="stable_diffusion">Stable Diffusion</option>
                          <option value="anything_v5">Anything V5</option>
                          <option value="deliberate">Deliberate</option>
                          <option value="realistic_vision">Realistic Vision</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                        <select
                          value={settings.size}
                          onChange={(e) => setSettings(prev => ({ ...prev, size: e.target.value as any }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="512x512">Square (512×512)</option>
                          <option value="768x768">Large Square (768×768)</option>
                          <option value="1024x1024">XL Square (1024×1024)</option>
                          <option value="512x768">Portrait (512×768)</option>
                          <option value="768x512">Landscape (768×512)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Steps</label>
                        <select
                          value={settings.steps}
                          onChange={(e) => setSettings(prev => ({ ...prev, steps: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="10">10 (Fast)</option>
                          <option value="20">20 (Balanced)</option>
                          <option value="30">30 (Quality)</option>
                          <option value="50">50 (High Quality)</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Guidance Scale
                        </label>
                        <select
                          value={settings.guidance}
                          onChange={(e) => setSettings(prev => ({ ...prev, guidance: parseFloat(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="5">5 (Creative)</option>
                          <option value="7.5">7.5 (Balanced)</option>
                          <option value="10">10 (Precise)</option>
                          <option value="15">15 (Very Precise)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Negative Prompt</label>
                      <input
                        type="text"
                        placeholder="blurry, low quality, distorted..."
                        value={settings.negativePrompt || ''}
                        onChange={(e) => setSettings(prev => ({ ...prev, negativePrompt: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-gray-900 placeholder-gray-500"
                      />
                      <p className="text-xs text-gray-500 mt-1">What to avoid in the image</p>
                    </div>

                    <div className="bg-green-50 p-3 rounded-lg">
                      <div className="flex items-center space-x-2 text-green-700">
                        <Coins className="w-4 h-4" />
                        <span className="text-sm font-medium">AI Horde Benefits</span>
                      </div>
                      <p className="text-xs text-green-600 mt-1">
                        Completely free • Community-powered • No API costs
                      </p>
                      <p className="text-xs text-green-600">
                        Queue times may vary based on community usage
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Generation History */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Generation History</h3>
            
            <div className="space-y-4 max-h-[600px] overflow-y-auto">
              {jobs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>No generations yet. Create your first AI image!</p>
                </div>
              ) : (
                jobs.map((job) => (
                  <div key={job.id} className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getStatusIcon(job)}
                          <span className="text-sm font-medium text-gray-900">
                            {getStatusText(job)}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Free
                          </span>
                          <span className="text-xs text-gray-500">
                            {job.createdAt.toLocaleTimeString()}
                          </span>
                          {job.kudosCost && (
                            <span className="text-xs text-green-600 flex items-center space-x-1">
                              <Coins className="w-3 h-3" />
                              <span>{job.kudosCost} kudos</span>
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 line-clamp-2">{job.prompt}</p>
                        
                        {job.status === 'generating' && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="h-2 rounded-full transition-all duration-300 bg-gradient-to-r from-green-500 to-emerald-500"
                                style={{ width: `${job.progress}%` }}
                              ></div>
                            </div>
                            {job.queuePosition && (
                              <p className="text-xs text-gray-500 mt-1 flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Queue position: {job.queuePosition}</span>
                              </p>
                            )}
                          </div>
                        )}
                        
                        {job.error && (
                          <p className="text-sm text-red-600 mt-2">{job.error}</p>
                        )}
                      </div>
                    </div>

                    {job.imageUrl && (
                      <div className="space-y-3">
                        <img
                          src={job.imageUrl}
                          alt={job.prompt}
                          className="w-full h-48 object-cover rounded-lg"
                        />
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadImage(job.imageUrl!, job.prompt)}
                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <Download className="w-4 h-4" />
                            <span>Download</span>
                          </button>
                          
                          <button
                            onClick={() => saveToGallery(job, 'public')}
                            className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            title="Save as public (already auto-saved as private)"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Public</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
