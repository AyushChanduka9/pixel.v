import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Heart, Eye, Calendar, User, Tag, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import { Image } from '@/shared/types';
import ImageEditor from './ImageEditor';
import VideoEditor from './VideoEditor';
import CommentsSection from './CommentsSection';

interface ImageModalProps {
  image: Image;
  onClose: () => void;
  images: Image[];
  onNavigate: (image: Image) => void;
  onImageDeleted?: () => void;
}

export default function ImageModal({ image, onClose, images, onNavigate, onImageDeleted }: ImageModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const [showEditor, setShowEditor] = useState(false);
  const [showVideoEditor, setShowVideoEditor] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  const isVideo = image.mime_type?.startsWith('video/');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight') {
        handleNext();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [image.id]);

  useEffect(() => {
    fetchLikes();
  }, [image.id]);

  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/images/${image.id}/likes`);
      if (response.ok) {
        const data = await response.json();
        setLikes(data.count || 0);
        setIsLiked(data.user_liked || false);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleToggleLike = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/images/${image.id}/likes`, {
        method: isLiked ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        await fetchLikes();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDeleteImage = async () => {
    if (!user || !confirm('Are you sure you want to delete this image? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/images/${image.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onImageDeleted?.();
        onClose();
      } else {
        const errorData = await response.json();
        alert(`Failed to delete image: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error deleting image:', error);
      alert('Failed to delete image. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const currentIndex = images.findIndex(img => img.id === image.id);

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onNavigate(images[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < images.length - 1) {
      onNavigate(images[currentIndex + 1]);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === modalRef.current) {
      onClose();
    }
  };

  const handleEditSave = async (editedImageBlob: Blob) => {
    // Here you could implement saving the edited image back to the server
    // For now, we'll just trigger a download
    const url = URL.createObjectURL(editedImageBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edited-${image.original_filename || 'image'}.jpg`;
    link.click();
    URL.revokeObjectURL(url);
    setShowEditor(false);
  };

  // Show editor if requested
  if (showEditor && !isVideo) {
    return (
      <ImageEditor
        image={image}
        onClose={() => setShowEditor(false)}
        onSave={handleEditSave}
      />
    );
  }

  // Show video editor if requested
  if (showVideoEditor && isVideo) {
    return (
      <VideoEditor
        videoUrl={(image as any).cloudinary_url || image.storage_path}
        onClose={() => setShowVideoEditor(false)}
        onSave={handleEditSave}
      />
    );
  }

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Navigation buttons */}
      {currentIndex > 0 && (
        <button
          onClick={handlePrevious}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}

      {currentIndex < images.length - 1 && (
        <button
          onClick={handleNext}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors z-10"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      <div className="max-w-7xl max-h-full w-full flex flex-col lg:flex-row gap-6">
        {/* Media */}
        <div className="flex-1 flex items-center justify-center">
          {isVideo ? (
            <video
              src={(image as any).cloudinary_url || image.storage_path}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              controls
              preload="metadata"
            />
          ) : (
            <img
              src={
                (image as any).cloudinary_url || 
                `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3e%3crect width='100%25' height='100%25' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%239ca3af' font-family='Arial' font-size='18'%3eNo image%3c/text%3e%3c/svg%3e`
              }
              alt={image.alt_text || image.title || 'Image'}
              className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                const target = e.currentTarget;
                // Show placeholder on any error
                target.src = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3e%3crect width='100%25' height='100%25' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%239ca3af' font-family='Arial' font-size='18'%3eImage not available%3c/text%3e%3c/svg%3e`;
              }}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:w-80 bg-white/95 backdrop-blur-sm rounded-lg p-6 max-h-full overflow-y-auto">
          <div className="space-y-6">
            {/* Title and caption */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                {image.title || image.original_filename}
              </h2>
              {image.caption && (
                <p className="text-gray-600">{image.caption}</p>
              )}
            </div>

            {/* Stats */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
              <div className="flex items-center space-x-1">
                <Eye className="w-4 h-4" />
                <span>{image.view_count || 0} views</span>
              </div>
              <button
                onClick={handleToggleLike}
                disabled={!user}
                className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${
                  isLiked
                    ? 'text-red-600 bg-red-50'
                    : 'text-gray-600 hover:bg-gray-50'
                } ${!user ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                <span>{likes} likes</span>
              </button>
            </div>

            {/* AI Generation info */}
            {image.is_ai_generated && image.generation_prompt && (
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-purple-900 mb-2">AI Generated</h3>
                <p className="text-sm text-purple-700 mb-2">"{image.generation_prompt}"</p>
                {image.generation_model && (
                  <p className="text-xs text-purple-600">Model: {image.generation_model}</p>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>Uploaded {new Date(image.created_at).toLocaleDateString()}</span>
              </div>

              {(image as any).uploader_name && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <User className="w-4 h-4" />
                  <span>By {(image as any).uploader_name}</span>
                </div>
              )}

              <div className="text-sm text-gray-600">
                <span>{image.width} × {image.height}</span>
                {image.size_bytes && (
                  <span className="ml-2">
                    ({(image.size_bytes / 1024 / 1024).toFixed(1)} MB)
                  </span>
                )}
              </div>

              {image.license && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">License:</span> {image.license}
                </div>
              )}

              {image.attribution && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Attribution:</span> {image.attribution}
                </div>
              )}
            </div>

            {/* Tags */}
            {(image as any).tags && (image as any).tags.length > 0 && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2 flex items-center space-x-1">
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(image as any).tags.map((tag: any, tagIndex: number) => (
                    <span
                      key={`modal-tag-${tag.id}-${tag.name}-${image.id}-${tagIndex}`}
                      className="inline-block px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              {/* Edit button - only show for media owner */}
              {user && (image as any).uploaded_by === user.id && (
                <button
                  onClick={() => isVideo ? setShowVideoEditor(true) : setShowEditor(true)}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit {isVideo ? 'Video' : 'Image'}</span>
                </button>
              )}
              
              {/* Delete button - only show for media owner */}
              {user && (image as any).uploaded_by === user.id && (
                <button
                  onClick={handleDeleteImage}
                  disabled={deleting}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{deleting ? 'Deleting...' : 'Delete'}</span>
                </button>
              )}
              
              <a 
                href={(image as any).download_url || (image as any).cloudinary_url}
                download={image.original_filename || `image-${image.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200"
              >
                <Download className="w-4 h-4" />
                <span>Download</span>
              </a>
            </div>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-8">
          <CommentsSection imageId={image.id} />
        </div>
      </div>
    </div>
  );
}
