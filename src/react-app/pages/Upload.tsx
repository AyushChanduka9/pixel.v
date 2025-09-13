import { useState } from 'react';
import { Image, Video, Zap } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import Header from '@/react-app/components/Header';
import BatchUploader from '@/react-app/components/BatchUploader';
import VideoUploader from '@/react-app/components/VideoUploader';
import AIImageGenerator from '@/react-app/components/AIImageGenerator';
import { useRefresh } from '@/react-app/hooks/useRefresh';

export default function Upload() {
  const { user, redirectToLogin } = useAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'video' | 'ai'>('upload');
  const [showSuccess, setShowSuccess] = useState(false);
  const { refresh } = useRefresh();

  // Redirect to login if not authenticated
  if (!user) {
    redirectToLogin();
    return null;
  }

  const handleUploadComplete = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);
    refresh();
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2 font-mono tracking-tighter">
            UPLOAD & CREATE
          </h1>
          <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 w-48 mb-4" />
          <p className="text-gray-400 font-mono">Share your content or generate new images with AI</p>
        </div>

        {/* Success Message */}
        {showSuccess && (
          <div className="mb-6 bg-green-900/50 border border-green-600 rounded-lg p-4">
            <p className="text-green-300 font-medium font-mono">Content uploaded successfully!</p>
          </div>
        )}

        {/* Content Card */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6">
          {/* Tab Navigation */}
          <div className="flex space-x-1 p-1 bg-gray-800 rounded-lg mb-8">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-mono text-sm uppercase tracking-wide ${
                activeTab === 'upload'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Image className="w-5 h-5" />
              <span>Images</span>
            </button>

            <button
              onClick={() => setActiveTab('video')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-mono text-sm uppercase tracking-wide ${
                activeTab === 'video'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Video className="w-5 h-5" />
              <span>Videos</span>
            </button>
            
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-mono text-sm uppercase tracking-wide ${
                activeTab === 'ai'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              <Zap className="w-5 h-5" />
              <span>AI Generate</span>
            </button>
          </div>

          {/* Tab Content */}
          <div>
            {activeTab === 'upload' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2 font-mono tracking-tight">UPLOAD IMAGES</h2>
                  <div className="h-0.5 bg-gradient-to-r from-purple-500 to-transparent w-32 mb-4" />
                  <p className="text-gray-400 font-mono">Drag and drop your images or click to browse. Supports JPG, PNG, GIF, WebP up to 10MB each.</p>
                </div>
                <BatchUploader onUploadComplete={handleUploadComplete} />
              </div>
            )}

            {activeTab === 'video' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2 font-mono tracking-tight">UPLOAD VIDEOS</h2>
                  <div className="h-0.5 bg-gradient-to-r from-blue-500 to-transparent w-32 mb-4" />
                  <p className="text-gray-400 font-mono">Upload your video content. Supports MP4, MOV, AVI, MKV, WebM up to 500MB each.</p>
                </div>
                <VideoUploader onUploadComplete={handleUploadComplete} />
              </div>
            )}
            
            {activeTab === 'ai' && (
              <div>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-white mb-2 font-mono tracking-tight">AI IMAGE GENERATION</h2>
                  <div className="h-0.5 bg-gradient-to-r from-pink-500 to-transparent w-32 mb-4" />
                  <p className="text-gray-400 font-mono">Create stunning images from text descriptions using advanced AI models.</p>
                </div>
                <AIImageGenerator
                  onClose={() => {}}
                  onImageGenerated={handleUploadComplete}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
