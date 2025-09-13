import { useState, useEffect } from 'react';
import { Search, Filter, Grid, List, RefreshCw, Wand2, Palette, Target } from 'lucide-react';
import Header from '@/react-app/components/Header';
import ImageGrid from '@/react-app/components/ImageGrid';
import AIImageGenerator from '@/react-app/components/AIImageGenerator';
import ThemeEditor from '@/react-app/components/ThemeEditor';
import VectorSearch from '@/react-app/components/VectorSearch';
import { useImages } from '@/react-app/hooks/useImages';
import { useRefresh } from '@/react-app/hooks/useRefresh';
import { ImageSearchParams } from '@/shared/types';

export default function Gallery() {
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ImageSearchParams>({});
  const [refreshing, setRefreshing] = useState(false);
  const [showAIGenerator, setShowAIGenerator] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [showVectorSearch, setShowVectorSearch] = useState(false);

  const { images, loading, error, fetchImages, hasMore, loadMore } = useImages();
  const { refresh } = useRefresh();

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchQuery || Object.keys(filters).length > 0) {
        fetchImages({ ...filters, q: searchQuery });
      } else {
        fetchImages({});
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [searchQuery, filters]);

  const handleFilterChange = (newFilters: Partial<ImageSearchParams>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchImages({});
      refresh();
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleVectorSearchResults = () => {
    setShowVectorSearch(false);
  };

  return (
    <div className="min-h-screen bg-black">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-white mb-2 font-mono tracking-tighter">
            GALLERY
          </h1>
          <div className="h-1 bg-gradient-to-r from-purple-500 to-blue-500 w-32 mb-4" />
          <p className="text-gray-400 font-mono">Explore and discover amazing images</p>
        </div>

        {/* Search and Filters */}
        <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search images by title, caption, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 font-mono"
              />
            </div>

            {/* Advanced Tools */}
            <div className="flex space-x-2">
              {/* Vector Search */}
              <button
                onClick={() => setShowVectorSearch(true)}
                className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-mono text-sm uppercase tracking-wide"
                title="AI-Powered Vector Search"
              >
                <Target className="w-5 h-5" />
                <span className="hidden md:block">Vector</span>
              </button>

              {/* AI Generator */}
              <button
                onClick={() => setShowAIGenerator(true)}
                className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-mono text-sm uppercase tracking-wide"
                title="AI Image Generation"
              >
                <Wand2 className="w-5 h-5" />
                <span className="hidden md:block">AI Gen</span>
              </button>

              {/* Theme Editor */}
              <button
                onClick={() => setShowThemeEditor(true)}
                className="flex items-center space-x-2 px-4 py-3 bg-gradient-to-r from-pink-600 to-orange-600 text-white rounded-lg hover:from-pink-700 hover:to-orange-700 transition-colors font-mono text-sm uppercase tracking-wide"
                title="Theme Editor"
              >
                <Palette className="w-5 h-5" />
                <span className="hidden md:block">Theme</span>
              </button>
            </div>

            {/* Standard Tools */}
            <div className="flex space-x-2">
              {/* Filter button */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors font-mono text-sm uppercase tracking-wide ${
                  showFilters 
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <Filter className="w-5 h-5" />
                <span>Filters</span>
              </button>

              {/* Refresh button */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors font-mono text-sm uppercase tracking-wide ${
                  refreshing 
                    ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                    : 'bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700'
                }`}
              >
                <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                <span className="hidden md:block">Refresh</span>
              </button>

              {/* View mode toggle */}
              <div className="flex border border-gray-600 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-3 transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <Grid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-3 border-l border-gray-600 transition-colors ${
                    viewMode === 'list'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono uppercase tracking-wide">
                    Privacy
                  </label>
                  <select
                    value={filters.privacy || ''}
                    onChange={(e) => handleFilterChange({ privacy: e.target.value as any || undefined })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white font-mono"
                  >
                    <option value="">All</option>
                    <option value="public">Public</option>
                    <option value="unlisted">Unlisted</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono uppercase tracking-wide">
                    Tags
                  </label>
                  <input
                    type="text"
                    placeholder="Enter tags separated by commas"
                    value={filters.tags || ''}
                    onChange={(e) => handleFilterChange({ tags: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2 font-mono uppercase tracking-wide">
                    Uploader
                  </label>
                  <input
                    type="text"
                    placeholder="Filter by uploader"
                    value={filters.uploaded_by || ''}
                    onChange={(e) => handleFilterChange({ uploaded_by: e.target.value || undefined })}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder-gray-400 font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Error state */}
        {error && (
          <div className="bg-red-900/50 border border-red-600 rounded-lg p-4 mb-8">
            <p className="text-red-300 font-mono">{error}</p>
          </div>
        )}

        {/* Results */}
        <div className="mb-8">
          <ImageGrid images={images} loading={loading} onRefresh={() => fetchImages({})} />
        </div>

        {/* Load more */}
        {hasMore && !loading && (
          <div className="text-center">
            <button
              onClick={loadMore}
              className="px-8 py-3 bg-gray-800 border border-gray-600 rounded-lg text-gray-300 hover:bg-gray-700 hover:text-white transition-colors font-mono uppercase tracking-wide"
            >
              Load More Images
            </button>
          </div>
        )}

        {/* AI Image Generator Modal */}
        {showAIGenerator && (
          <AIImageGenerator
            onClose={() => setShowAIGenerator(false)}
            onImageGenerated={() => {
              handleRefresh();
            }}
          />
        )}

        {/* Theme Editor Modal */}
        {showThemeEditor && (
          <ThemeEditor
            onClose={() => setShowThemeEditor(false)}
          />
        )}

        {/* Vector Search Modal */}
        {showVectorSearch && (
          <VectorSearch
            onClose={() => setShowVectorSearch(false)}
            onResultsFound={handleVectorSearchResults}
          />
        )}
      </div>
    </div>
  );
}
