import { useState, useRef } from 'react';
import { Search, Upload, Image as ImageIcon, Sparkles, X, Loader } from 'lucide-react';
import { Image } from '@/shared/types';

interface VectorSearchProps {
  onClose: () => void;
  onResultsFound: (images: Image[]) => void;
}

interface SearchResult extends Image {
  similarity: number;
  thumbnail_url?: string;
  cloudinary_url?: string;
}

export default function VectorSearch({ onClose, onResultsFound }: VectorSearchProps) {
  const [searchType, setSearchType] = useState<'text' | 'image'>('text');
  const [textQuery, setTextQuery] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    setImageFile(file);
    const preview = URL.createObjectURL(file);
    setImagePreview(preview);
    setError(null);
  };

  const performTextSearch = async () => {
    if (!textQuery.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/vector-search/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: textQuery.trim(),
          limit: 20,
          threshold: 0.7
        })
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results);
      onResultsFound(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const performImageSearch = async () => {
    if (!imageFile) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      formData.append('limit', '20');
      formData.append('threshold', '0.7');

      const response = await fetch('/api/vector-search/image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const data = await response.json();
      setResults(data.results);
      onResultsFound(data.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (searchType === 'text') {
      performTextSearch();
    } else {
      performImageSearch();
    }
  };

  const clearImageUpload = () => {
    setImageFile(null);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Vector Search</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Search Type Toggle */}
          <div className="flex items-center justify-center">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setSearchType('text')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  searchType === 'text'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <Search className="w-4 h-4" />
                <span>Text to Image</span>
              </button>
              <button
                onClick={() => setSearchType('image')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  searchType === 'image'
                    ? 'bg-white text-purple-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Image to Image</span>
              </button>
            </div>
          </div>

          {/* Search Interface */}
          <div className="space-y-4">
            {searchType === 'text' ? (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Describe the image you're looking for
                </label>
                <div className="flex space-x-3">
                  <input
                    type="text"
                    value={textQuery}
                    onChange={(e) => setTextQuery(e.target.value)}
                    placeholder="e.g., 'sunset over mountains', 'cat playing with yarn', 'modern architecture'"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={!textQuery.trim() || loading}
                    className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Search className="w-4 h-4" />
                    )}
                    <span>Search</span>
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload an image to find similar ones
                </label>
                
                {!imageFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50 transition-colors"
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">
                      Click to upload an image or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      Supports JPG, PNG, GIF, WebP
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src={imagePreview!}
                      alt="Search reference"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <button
                      onClick={clearImageUpload}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={handleSearch}
                        disabled={loading}
                        className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl flex items-center space-x-2"
                      >
                        {loading ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Search className="w-4 h-4" />
                        )}
                        <span>Find Similar</span>
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
                  className="hidden"
                />
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Search Results */}
          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Search Results ({results.length})
              </h3>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {results.map((result, index) => (
                  <div
                    key={`result-${result.id}-${index}`}
                    className="relative group bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden"
                  >
                    <img
                      src={result.thumbnail_url || result.cloudinary_url || result.storage_path || ''}
                      alt={result.alt_text || result.title || 'Image'}
                      className="w-full h-32 object-cover"
                    />
                    
                    <div className="p-3">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {result.title || result.original_filename}
                      </p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center space-x-1">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-gray-600">
                            {Math.round(result.similarity * 100)}% match
                          </span>
                        </div>
                      </div>
                      
                      {result.caption && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {result.caption}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="text-center py-12">
              <Loader className="w-12 h-12 text-purple-600 animate-spin mx-auto mb-4" />
              <p className="text-gray-600">
                {searchType === 'text' 
                  ? 'Searching for similar images...' 
                  : 'Analyzing image and finding matches...'}
              </p>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">How Vector Search Works</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>Text to Image:</strong> Uses AI to understand your description and find visually similar images</li>
              <li>• <strong>Image to Image:</strong> Analyzes visual features to find images with similar composition, colors, and objects</li>
              <li>• Powered by Google Gemini Vision and AI Horde models for intelligent search</li>
              <li>• Results are ranked by semantic similarity, not just keyword matching</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
