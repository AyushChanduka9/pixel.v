import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { ArrowLeft, Download, Heart, Eye, Calendar, User, Tag, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import Header from '@/react-app/components/Header';
import CommentsSection from '@/react-app/components/CommentsSection';
import ImageEditor from '@/react-app/components/ImageEditor';


export default function ImagePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (id) {
      fetchImage();
      fetchLikes();
    }
  }, [id]);

  const fetchImage = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/images/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }

      const data = await response.json();
      setImage(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch image');
    } finally {
      setLoading(false);
    }
  };

  const fetchLikes = async () => {
    if (!id) return;
    try {
      const response = await fetch(`/api/images/${id}/likes`);
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
      const response = await fetch(`/api/images/${id}/likes`, {
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
      const response = await fetch(`/api/images/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        navigate('/gallery');
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

  const handleEditSave = async (editedImageBlob: Blob) => {
    // Create download for edited image
    const url = URL.createObjectURL(editedImageBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edited-${image.original_filename || 'image'}.jpg`;
    link.click();
    URL.revokeObjectURL(url);
    setShowEditor(false);
  };

  if (showEditor) {
    return (
      <ImageEditor
        image={image}
        onClose={() => setShowEditor(false)}
        onSave={handleEditSave}
      />
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-300 rounded w-32 mb-6"></div>
            <div className="bg-gray-300 rounded-lg aspect-video mb-6"></div>
            <div className="space-y-4">
              <div className="h-6 bg-gray-300 rounded w-3/4"></div>
              <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error || 'Image not found'}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back button */}
        <Link
          to="/gallery"
          className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Gallery</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <img
                src={image.cloudinary_url || `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3e%3crect width='100%25' height='100%25' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%239ca3af' font-family='Arial' font-size='18'%3eNo image%3c/text%3e%3c/svg%3e`}
                alt={image.alt_text || image.title || 'Image'}
                className="w-full h-auto"
                onError={(e) => {
                  e.currentTarget.src = `data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'%3e%3crect width='100%25' height='100%25' fill='%23f3f4f6'/%3e%3ctext x='50%25' y='50%25' text-anchor='middle' dy='0.3em' fill='%239ca3af' font-family='Arial' font-size='18'%3eFailed to load image%3c/text%3e%3c/svg%3e`;
                }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Title and actions */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">
                  {image.title || image.original_filename}
                </h1>
                
                {user && user.id === image.uploaded_by && (
                  <button 
                    onClick={() => setShowEditor(true)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    title="Edit Image"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                )}
              </div>

              {image.caption && (
                <p className="text-gray-600 mb-4">{image.caption}</p>
              )}

              {/* Stats */}
              <div className="flex items-center space-x-4 text-sm text-gray-600 mb-6">
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

              {/* Actions */}
              <div className="space-y-3">
                {/* Delete button - only show for image owner */}
                {user && user.id === image.uploaded_by && (
                  <button
                    onClick={handleDeleteImage}
                    disabled={deleting}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5" />
                    <span>{deleting ? 'Deleting...' : 'Delete Image'}</span>
                  </button>
                )}

                {/* Download button */}
                <a 
                  href={image.download_url || image.cloudinary_url}
                  download={image.original_filename || `image-${image.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200"
                >
                  <Download className="w-5 h-5" />
                  <span>Download</span>
                </a>
              </div>
            </div>

            {/* AI Generation info */}
            {image.is_ai_generated && image.generation_prompt && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                  <div className="w-6 h-6 bg-gradient-to-br from-purple-600 to-blue-500 rounded flex items-center justify-center">
                    <span className="text-xs text-white font-bold">AI</span>
                  </div>
                  <span>AI Generated</span>
                </h3>
                
                <p className="text-gray-700 mb-3 font-medium">"{image.generation_prompt}"</p>
                
                {image.generation_model && (
                  <p className="text-sm text-gray-600">Model: {image.generation_model}</p>
                )}
                
                {image.generation_provider && (
                  <p className="text-sm text-gray-600">Provider: {image.generation_provider}</p>
                )}
              </div>
            )}

            {/* Metadata */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Details</h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>Uploaded {new Date(image.created_at).toLocaleDateString()}</span>
                </div>

                {image.uploader_name && (
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="w-4 h-4" />
                    <span>By {image.uploader_name}</span>
                  </div>
                )}

                <div className="text-gray-600">
                  <span className="font-medium">Dimensions:</span> {image.width} × {image.height}
                </div>

                {image.size_bytes && (
                  <div className="text-gray-600">
                    <span className="font-medium">Size:</span> {(image.size_bytes / 1024 / 1024).toFixed(1)} MB
                  </div>
                )}

                <div className="text-gray-600">
                  <span className="font-medium">Format:</span> {image.mime_type}
                </div>

                {image.license && (
                  <div className="text-gray-600">
                    <span className="font-medium">License:</span> {image.license}
                  </div>
                )}

                {image.attribution && (
                  <div className="text-gray-600">
                    <span className="font-medium">Attribution:</span> {image.attribution}
                  </div>
                )}
              </div>
            </div>

            {/* Tags */}
            {image.tags && image.tags.length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center space-x-2">
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
                </h3>
                
                <div className="flex flex-wrap gap-2">
                  {image.tags.map((tag: any) => (
                    <span
                      key={tag.id}
                      className="inline-block px-3 py-1 text-sm bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition-colors cursor-pointer"
                    >
                      {tag.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Comments Section */}
        <div className="lg:col-span-3 mt-8">
          <CommentsSection imageId={image.id} />
        </div>
      </div>
    </div>
  );
}
