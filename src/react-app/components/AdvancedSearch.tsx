import { useState } from 'react';
import { Calendar, Camera, FileText, Tag, User, Filter, X } from 'lucide-react';
import { ImageSearchParams } from '@/shared/types';

interface AdvancedSearchProps {
  onSearch: (params: ImageSearchParams) => void;
  onClose: () => void;
}

export default function AdvancedSearch({ onSearch, onClose }: AdvancedSearchProps) {
  const [searchParams, setSearchParams] = useState<ImageSearchParams>({});
  const [dateRange, setDateRange] = useState({
    start: '',
    end: ''
  });

  const handleSearch = () => {
    const params: ImageSearchParams = { ...searchParams };
    
    // Handle date range
    if (dateRange.start || dateRange.end) {
      params.date_range = `${dateRange.start || ''},${dateRange.end || ''}`;
    }
    
    onSearch(params);
  };

  const clearFilters = () => {
    setSearchParams({});
    setDateRange({ start: '', end: '' });
    onSearch({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-500 rounded-lg flex items-center justify-center">
              <Filter className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Advanced Search</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Basic Search */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>Content Search</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Search in titles"
                value={searchParams.title_search || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, title_search: e.target.value }))}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Search in captions"
                value={searchParams.caption_search || ''}
                onChange={(e) => setSearchParams(prev => ({ ...prev, caption_search: e.target.value }))}
                className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date Range */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Date Range</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Camera Metadata */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Camera Metadata</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera Make</label>
                <input
                  type="text"
                  placeholder="e.g., Canon, Nikon"
                  value={searchParams.camera_make || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, camera_make: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Camera Model</label>
                <input
                  type="text"
                  placeholder="e.g., EOS R5, D850"
                  value={searchParams.camera_model || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, camera_model: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Lens</label>
                <input
                  type="text"
                  placeholder="e.g., 24-70mm f/2.8"
                  value={searchParams.lens || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, lens: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aperture</label>
                <input
                  type="text"
                  placeholder="e.g., f/2.8"
                  value={searchParams.aperture || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, aperture: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Shutter Speed</label>
                <input
                  type="text"
                  placeholder="e.g., 1/60"
                  value={searchParams.shutter_speed || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, shutter_speed: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">ISO</label>
                <input
                  type="number"
                  placeholder="e.g., 800"
                  value={searchParams.iso || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, iso: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Focal Length</label>
                <input
                  type="text"
                  placeholder="e.g., 85mm"
                  value={searchParams.focal_length || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, focal_length: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* License and Attribution */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <FileText className="w-5 h-5" />
              <span>License & Attribution</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">License</label>
                <select
                  value={searchParams.license || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, license: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Any License</option>
                  <option value="CC0">CC0 (Public Domain)</option>
                  <option value="CC BY">CC BY</option>
                  <option value="CC BY-SA">CC BY-SA</option>
                  <option value="CC BY-NC">CC BY-NC</option>
                  <option value="CC BY-NC-SA">CC BY-NC-SA</option>
                  <option value="All Rights Reserved">All Rights Reserved</option>
                  <option value="Royalty Free">Royalty Free</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Attribution</label>
                <input
                  type="text"
                  placeholder="Search by attribution"
                  value={searchParams.attribution || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, attribution: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Image Properties */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Camera className="w-5 h-5" />
              <span>Image Properties</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Width</label>
                <input
                  type="number"
                  placeholder="1920"
                  value={searchParams.min_width || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, min_width: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Minimum Height</label>
                <input
                  type="number"
                  placeholder="1080"
                  value={searchParams.min_height || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, min_height: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Aspect Ratio</label>
                <select
                  value={searchParams.aspect_ratio || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, aspect_ratio: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="">Any Ratio</option>
                  <option value="1:1">Square (1:1)</option>
                  <option value="4:3">Standard (4:3)</option>
                  <option value="3:2">DSLR (3:2)</option>
                  <option value="16:9">Widescreen (16:9)</option>
                  <option value="21:9">Ultra-wide (21:9)</option>
                  <option value="9:16">Portrait (9:16)</option>
                </select>
              </div>
            </div>
          </div>

          {/* User and Tags */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>User & Tags</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Uploaded By</label>
                <input
                  type="text"
                  placeholder="Username or email"
                  value={searchParams.uploaded_by || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, uploaded_by: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Tags</label>
                <input
                  type="text"
                  placeholder="Comma-separated tags"
                  value={searchParams.tags || ''}
                  onChange={(e) => setSearchParams(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* AI Generated */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
              <Tag className="w-5 h-5" />
              <span>AI Generated</span>
            </h3>
            <div className="flex items-center space-x-6">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="ai_generated"
                  value=""
                  checked={searchParams.is_ai_generated === undefined}
                  onChange={() => setSearchParams(prev => ({ ...prev, is_ai_generated: undefined }))}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span>Any</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="ai_generated"
                  value="true"
                  checked={searchParams.is_ai_generated === 'true'}
                  onChange={() => setSearchParams(prev => ({ ...prev, is_ai_generated: 'true' }))}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span>AI Generated Only</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name="ai_generated"
                  value="false"
                  checked={searchParams.is_ai_generated === 'false'}
                  onChange={() => setSearchParams(prev => ({ ...prev, is_ai_generated: 'false' }))}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <span>Photography Only</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={clearFilters}
            className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear All Filters
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Search Images
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
