import { useState } from 'react';
import { Download, Settings, Image as ImageIcon, X } from 'lucide-react';

interface WatermarkSettings {
  enabled: boolean;
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  opacity: number;
  fontSize: number;
  color: string;
  backgroundColor: string;
  padding: number;
}

interface WatermarkDownloadProps {
  imageUrl: string;
  filename: string;
  onClose: () => void;
}

export default function WatermarkDownload({ imageUrl, filename, onClose }: WatermarkDownloadProps) {
  const [settings, setSettings] = useState<WatermarkSettings>({
    enabled: true,
    text: '© PixelVault',
    position: 'bottom-right',
    opacity: 0.7,
    fontSize: 24,
    color: '#ffffff',
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 20
  });
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const generatePreview = async () => {
    if (!settings.enabled) {
      setPreviewUrl(imageUrl);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/images/watermark-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          watermark: settings
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
    } catch (error) {
      console.error('Preview failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const downloadWithWatermark = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/images/download-with-watermark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl,
          watermark: settings,
          filename
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = `watermarked-${filename}`;
        link.click();
        
        URL.revokeObjectURL(url);
        onClose();
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadOriginal = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = filename;
    link.click();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
              <Download className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Download Options</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Settings Panel */}
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                <Settings className="w-5 h-5" />
                <span>Watermark Settings</span>
              </h3>

              {/* Enable/Disable Watermark */}
              <div className="mb-6">
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={settings.enabled}
                    onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                    className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-gray-700 font-medium">Add watermark</span>
                </label>
              </div>

              {settings.enabled && (
                <div className="space-y-4">
                  {/* Watermark Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Watermark Text
                    </label>
                    <input
                      type="text"
                      value={settings.text}
                      onChange={(e) => setSettings(prev => ({ ...prev, text: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  {/* Position */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Position
                    </label>
                    <select
                      value={settings.position}
                      onChange={(e) => setSettings(prev => ({ ...prev, position: e.target.value as any }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="top-left">Top Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="bottom-right">Bottom Right</option>
                      <option value="center">Center</option>
                    </select>
                  </div>

                  {/* Opacity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Opacity: {Math.round(settings.opacity * 100)}%
                    </label>
                    <input
                      type="range"
                      min="0.1"
                      max="1"
                      step="0.1"
                      value={settings.opacity}
                      onChange={(e) => setSettings(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Font Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Font Size: {settings.fontSize}px
                    </label>
                    <input
                      type="range"
                      min="12"
                      max="72"
                      value={settings.fontSize}
                      onChange={(e) => setSettings(prev => ({ ...prev, fontSize: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  {/* Colors */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Text Color
                      </label>
                      <input
                        type="color"
                        value={settings.color}
                        onChange={(e) => setSettings(prev => ({ ...prev, color: e.target.value }))}
                        className="w-full h-10 border border-gray-300 rounded cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Background
                      </label>
                      <select
                        value={settings.backgroundColor}
                        onChange={(e) => setSettings(prev => ({ ...prev, backgroundColor: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      >
                        <option value="rgba(0,0,0,0.5)">Dark</option>
                        <option value="rgba(255,255,255,0.5)">Light</option>
                        <option value="transparent">None</option>
                      </select>
                    </div>
                  </div>

                  {/* Padding */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Padding: {settings.padding}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={settings.padding}
                      onChange={(e) => setSettings(prev => ({ ...prev, padding: parseInt(e.target.value) }))}
                      className="w-full"
                    />
                  </div>

                  <button
                    onClick={generatePreview}
                    disabled={loading}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                    <span>Generate Preview</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Preview Panel */}
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <ImageIcon className="w-5 h-5" />
              <span>Preview</span>
            </h3>

            <div className="border border-gray-200 rounded-lg overflow-hidden">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="w-full h-64 object-contain bg-gray-50"
                />
              ) : (
                <div className="w-full h-64 bg-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">Click "Generate Preview" to see watermark</p>
                  </div>
                </div>
              )}
            </div>

            {/* Download Buttons */}
            <div className="space-y-3">
              <button
                onClick={downloadWithWatermark}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Download className="w-5 h-5" />
                <span>
                  {settings.enabled ? 'Download with Watermark' : 'Download Image'}
                </span>
              </button>

              <button
                onClick={downloadOriginal}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Download className="w-5 h-5" />
                <span>Download Original</span>
              </button>
            </div>

            <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
              <p className="font-medium mb-1">Download Options:</p>
              <ul className="space-y-1">
                <li>• Watermarked: Adds protection for sharing</li>
                <li>• Original: Full quality without modifications</li>
                <li>• Preview updates automatically as you change settings</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
