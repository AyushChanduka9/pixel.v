import { useState, useRef, useEffect } from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, Scissors, 
  Volume2, VolumeX, Download, X, Sliders, 
  Filter, Type 
} from 'lucide-react';

interface VideoEditorProps {
  videoUrl: string;
  onClose: () => void;
  onSave?: (editedVideoBlob: Blob) => void;
}

interface VideoSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  volume: number;
  speed: number;
  startTime: number;
  endTime: number;
  rotation: number;
  flipH: boolean;
  flipV: boolean;
}

export default function VideoEditor({ videoUrl, onClose, onSave }: VideoEditorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [activeTab, setActiveTab] = useState<'basic' | 'filters' | 'trim' | 'text'>('basic');
  
  const [settings, setSettings] = useState<VideoSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    volume: 100,
    speed: 1,
    startTime: 0,
    endTime: 0,
    rotation: 0,
    flipH: false,
    flipV: false,
  });

  const [textOverlays, setTextOverlays] = useState<Array<{
    id: string;
    text: string;
    x: number;
    y: number;
    fontSize: number;
    color: string;
    startTime: number;
    endTime: number;
  }>>([]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoadedMetadata = () => {
      setDuration(video.duration);
      setSettings(prev => ({ ...prev, endTime: video.duration }));
    };

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('timeupdate', handleTimeUpdate);

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('timeupdate', handleTimeUpdate);
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [settings]);

  const applyFilters = () => {
    const video = videoRef.current;
    if (!video) return;

    const filters = [
      `brightness(${settings.brightness}%)`,
      `contrast(${settings.contrast}%)`,
      `saturate(${settings.saturation}%)`,
    ];

    const transform = [
      `rotate(${settings.rotation}deg)`,
      settings.flipH ? 'scaleX(-1)' : '',
      settings.flipV ? 'scaleY(-1)' : '',
    ].filter(Boolean).join(' ');

    video.style.filter = filters.join(' ');
    video.style.transform = transform;
    video.volume = settings.volume / 100;
    video.playbackRate = settings.speed;
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleSeek = (value: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = value;
    setCurrentTime(value);
  };

  const handleSettingChange = (key: keyof VideoSettings, value: number | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetSettings = () => {
    setSettings({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      volume: 100,
      speed: 1,
      startTime: 0,
      endTime: duration,
      rotation: 0,
      flipH: false,
      flipV: false,
    });
  };

  const addTextOverlay = () => {
    const newOverlay = {
      id: crypto.randomUUID(),
      text: 'Sample Text',
      x: 50,
      y: 50,
      fontSize: 24,
      color: '#ffffff',
      startTime: currentTime,
      endTime: Math.min(currentTime + 5, duration),
    };
    setTextOverlays(prev => [...prev, newOverlay]);
  };

  const updateTextOverlay = (id: string, updates: Partial<typeof textOverlays[0]>) => {
    setTextOverlays(prev => prev.map(overlay => 
      overlay.id === id ? { ...overlay, ...updates } : overlay
    ));
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(overlay => overlay.id !== id));
  };

  const exportVideo = async () => {
    // This is a simplified implementation
    // In a real app, you'd use FFmpeg.js or similar for actual video processing
    try {
      const response = await fetch(videoUrl);
      const blob = await response.blob();
      
      // Create a download link for the "edited" video
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'edited-video.mp4';
      link.click();
      URL.revokeObjectURL(url);

      if (onSave) {
        onSave(blob);
      }
    } catch (error) {
      console.error('Error exporting video:', error);
      alert('Failed to export video');
    }
  };

  const formatTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const tabs = [
    { id: 'basic', label: 'Basic', icon: Sliders },
    { id: 'filters', label: 'Filters', icon: Filter },
    { id: 'trim', label: 'Trim', icon: Scissors },
    { id: 'text', label: 'Text', icon: Type },
  ];

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 text-white p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">Video Editor</h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={resetSettings}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>
          <button
            onClick={exportVideo}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* Video Preview */}
        <div className="flex-1 flex items-center justify-center bg-black relative">
          <video
            ref={videoRef}
            src={videoUrl}
            className="max-w-full max-h-full"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Text Overlays */}
          {textOverlays.map(overlay => (
            currentTime >= overlay.startTime && currentTime <= overlay.endTime && (
              <div
                key={overlay.id}
                className="absolute pointer-events-none"
                style={{
                  left: `${overlay.x}%`,
                  top: `${overlay.y}%`,
                  fontSize: `${overlay.fontSize}px`,
                  color: overlay.color,
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8)',
                  fontWeight: 'bold',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {overlay.text}
              </div>
            )
          ))}
        </div>

        {/* Controls Panel */}
        <div className="w-80 bg-gray-800 text-white flex flex-col">
          {/* Tabs */}
          <div className="flex border-b border-gray-700">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center space-x-1 p-3 transition-colors ${
                  activeTab === id 
                    ? 'bg-blue-600 text-white' 
                    : 'hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm">{label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 p-4 overflow-y-auto">
            {activeTab === 'basic' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Brightness</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={settings.brightness}
                    onChange={(e) => handleSettingChange('brightness', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{settings.brightness}%</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Contrast</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={settings.contrast}
                    onChange={(e) => handleSettingChange('contrast', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{settings.contrast}%</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Saturation</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={settings.saturation}
                    onChange={(e) => handleSettingChange('saturation', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{settings.saturation}%</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Volume</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={settings.volume}
                    onChange={(e) => handleSettingChange('volume', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{settings.volume}%</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Speed</label>
                  <input
                    type="range"
                    min="0.25"
                    max="4"
                    step="0.25"
                    value={settings.speed}
                    onChange={(e) => handleSettingChange('speed', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{settings.speed}x</span>
                </div>
              </div>
            )}

            {activeTab === 'filters' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Rotation</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleSettingChange('rotation', settings.rotation - 90)}
                      className="flex-1 flex items-center justify-center p-2 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleSettingChange('rotation', settings.rotation + 90)}
                      className="flex-1 flex items-center justify-center p-2 bg-gray-700 rounded hover:bg-gray-600"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400">{settings.rotation}°</span>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.flipH}
                      onChange={(e) => handleSettingChange('flipH', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Flip Horizontal</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={settings.flipV}
                      onChange={(e) => handleSettingChange('flipV', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm">Flip Vertical</span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'trim' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Start Time</label>
                  <input
                    type="range"
                    min="0"
                    max={duration}
                    step="0.1"
                    value={settings.startTime}
                    onChange={(e) => handleSettingChange('startTime', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{formatTime(settings.startTime)}</span>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">End Time</label>
                  <input
                    type="range"
                    min={settings.startTime}
                    max={duration}
                    step="0.1"
                    value={settings.endTime}
                    onChange={(e) => handleSettingChange('endTime', Number(e.target.value))}
                    className="w-full"
                  />
                  <span className="text-xs text-gray-400">{formatTime(settings.endTime)}</span>
                </div>

                <div className="text-sm text-gray-400">
                  Duration: {formatTime(settings.endTime - settings.startTime)}
                </div>
              </div>
            )}

            {activeTab === 'text' && (
              <div className="space-y-4">
                <button
                  onClick={addTextOverlay}
                  className="w-full flex items-center justify-center space-x-2 p-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Type className="w-4 h-4" />
                  <span>Add Text</span>
                </button>

                <div className="space-y-3">
                  {textOverlays.map(overlay => (
                    <div key={overlay.id} className="p-3 bg-gray-700 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <input
                          type="text"
                          value={overlay.text}
                          onChange={(e) => updateTextOverlay(overlay.id, { text: e.target.value })}
                          className="flex-1 bg-gray-600 text-white px-2 py-1 rounded text-sm"
                        />
                        <button
                          onClick={() => removeTextOverlay(overlay.id)}
                          className="ml-2 p-1 text-red-400 hover:text-red-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-gray-400">Size</label>
                          <input
                            type="range"
                            min="12"
                            max="48"
                            value={overlay.fontSize}
                            onChange={(e) => updateTextOverlay(overlay.id, { fontSize: Number(e.target.value) })}
                            className="w-full"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-400">Color</label>
                          <input
                            type="color"
                            value={overlay.color}
                            onChange={(e) => updateTextOverlay(overlay.id, { color: e.target.value })}
                            className="w-full h-6 rounded"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Controls */}
      <div className="bg-gray-900 text-white p-4">
        <div className="flex items-center space-x-4">
          <button
            onClick={togglePlay}
            className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleMute}
            className="p-2 hover:bg-gray-700 rounded transition-colors"
          >
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>

          <div className="flex-1 flex items-center space-x-4">
            <span className="text-sm text-gray-400">{formatTime(currentTime)}</span>
            <input
              type="range"
              min="0"
              max={duration}
              value={currentTime}
              onChange={(e) => handleSeek(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-sm text-gray-400">{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
