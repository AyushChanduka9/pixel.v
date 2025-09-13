import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, Eye, Download, Share2, MoreHorizontal, Calendar, User, Camera, CheckSquare, Square } from 'lucide-react';
import ImageModal from './ImageModal';
import BatchOperations from './BatchOperations';
import { Image } from '@/shared/types';

interface ImageGridProps {
  images: Image[];
  loading: boolean;
  onRefresh: () => void;
}

export default function ImageGrid({ images, loading, onRefresh }: ImageGridProps) {
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [hoveredImage, setHoveredImage] = useState<string | null>(null);
  const [selectedImages, setSelectedImages] = useState<Image[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatSize = (bytes: number) => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleImageSelect = (image: Image) => {
    const isSelected = selectedImages.find(img => img.id === image.id);
    if (isSelected) {
      setSelectedImages(selectedImages.filter(img => img.id !== image.id));
    } else {
      setSelectedImages([...selectedImages, image]);
    }
  };

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      setSelectedImages([]);
    }
  };

  const clearSelection = () => {
    setSelectedImages([]);
  };

  const handleBatchComplete = () => {
    setSelectedImages([]);
    onRefresh();
  };

  if (loading && images.length === 0) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 font-mono uppercase tracking-wide">
            Loading Images...
          </p>
        </div>
      </div>
    );
  }

  if (images.length === 0 && !loading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center space-y-6">
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-600" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-white mb-2 font-mono">
              NO IMAGES FOUND
            </h3>
            <p className="text-gray-400 font-mono">
              Try adjusting your search or upload some images to get started
            </p>
          </div>
          <button
            onClick={onRefresh}
            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200 font-mono uppercase tracking-wide"
          >
            Refresh
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Selection mode toggle and controls */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSelectionMode}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors font-mono text-sm uppercase tracking-wide ${
              selectionMode
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 border border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            <span>{selectionMode ? 'Exit Select' : 'Select Images'}</span>
          </button>
          
          {selectionMode && selectedImages.length > 0 && (
            <div className="text-gray-300 font-mono text-sm">
              {selectedImages.length} selected
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {images.map((image, index) => (
          <motion.div
            key={image.uuid}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className="group relative bg-gray-900/50 backdrop-blur-sm border border-gray-700 rounded-lg overflow-hidden hover:border-purple-500/50 transition-all duration-300"
            onMouseEnter={() => setHoveredImage(image.uuid)}
            onMouseLeave={() => setHoveredImage(null)}
          >
            {/* Selection checkbox */}
            {selectionMode && (
              <div className="absolute top-3 left-3 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleImageSelect(image);
                  }}
                  className="w-6 h-6 rounded border-2 border-white bg-black/50 backdrop-blur-sm flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  {selectedImages.find(img => img.id === image.id) ? (
                    <CheckSquare className="w-4 h-4 text-white" />
                  ) : (
                    <Square className="w-4 h-4 text-white" />
                  )}
                </button>
              </div>
            )}

            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden">
              <img
                src={image.storage_path}
                alt={image.alt_text || image.title || 'Image'}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
              />
              
              {/* Overlay */}
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent transition-opacity duration-300 ${
                hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
              }`} />

              {/* AI Generated Badge */}
              {image.is_ai_generated && (
                <div className="absolute top-3 right-3 px-2 py-1 bg-purple-600 text-white text-xs font-mono rounded-full">
                  AI
                </div>
              )}

              {/* Quick Actions */}
              <div className={`absolute top-3 left-3 flex space-x-2 transition-opacity duration-300 ${
                hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
              }`}>
                <button className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-purple-600 transition-colors">
                  <Heart className="w-4 h-4" />
                </button>
                <button className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-blue-600 transition-colors">
                  <Download className="w-4 h-4" />
                </button>
                <button className="p-2 bg-black/60 backdrop-blur-sm rounded-full text-white hover:bg-green-600 transition-colors">
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stats */}
              <div className={`absolute bottom-3 left-3 right-3 flex justify-between items-center text-white text-sm transition-opacity duration-300 ${
                hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
              }`}>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    <Eye className="w-4 h-4" />
                    <span className="font-mono">{image.view_count}</span>
                  </div>
                </div>
                <button className="p-1 bg-black/60 backdrop-blur-sm rounded-full hover:bg-gray-700 transition-colors">
                  <MoreHorizontal className="w-4 h-4" />
                </button>
              </div>

              {/* Click to open or select */}
              <button
                onClick={(e) => {
                  if (selectionMode) {
                    e.preventDefault();
                    handleImageSelect(image);
                  } else {
                    setSelectedImage(image);
                  }
                }}
                className="absolute inset-0 w-full h-full"
              />
            </div>

            {/* Info Panel */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <div>
                <h3 className="font-bold text-white text-lg leading-tight font-mono">
                  {image.title || 'Untitled'}
                </h3>
                {image.caption && (
                  <p className="text-gray-400 text-sm mt-1 line-clamp-2 font-mono">
                    {image.caption}
                  </p>
                )}
              </div>

              {/* Metadata */}
              <div className="flex flex-wrap gap-2 text-xs text-gray-400 font-mono">
                {image.width && image.height && (
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {image.width}×{image.height}
                  </span>
                )}
                {image.size_bytes && (
                  <span className="px-2 py-1 bg-gray-800 rounded">
                    {formatSize(image.size_bytes)}
                  </span>
                )}
                <span className="px-2 py-1 bg-gray-800 rounded">
                  {image.mime_type?.split('/')[1]?.toUpperCase()}
                </span>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-700">
                <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
                  <User className="w-3 h-3" />
                  <span>{image.uploaded_by.split('@')[0] || 'User'}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-400 font-mono">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(image.created_at)}</span>
                </div>
              </div>
            </div>

            {/* Corner decorations */}
            <div className={`absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-purple-500 transition-opacity duration-300 ${
              hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
            }`} />
            <div className={`absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-purple-500 transition-opacity duration-300 ${
              hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
            }`} />
            <div className={`absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-purple-500 transition-opacity duration-300 ${
              hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
            }`} />
            <div className={`absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-purple-500 transition-opacity duration-300 ${
              hoveredImage === image.uuid ? 'opacity-100' : 'opacity-0'
            }`} />
          </motion.div>
        ))}
      </div>

      {/* Loading indicator for pagination */}
      {loading && images.length > 0 && (
        <div className="flex justify-center mt-8">
          <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {/* Batch Operations */}
      {selectedImages.length > 0 && (
        <BatchOperations
          selectedImages={selectedImages}
          onClearSelection={clearSelection}
          onBatchComplete={handleBatchComplete}
        />
      )}

      {/* Image Modal */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
          images={images}
          onNavigate={setSelectedImage}
          onImageDeleted={onRefresh}
        />
      )}
    </>
  );
}
