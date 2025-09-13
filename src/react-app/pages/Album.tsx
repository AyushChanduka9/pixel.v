import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Calendar, Image as ImageIcon, Edit, Save, X, Users, Lock, Globe } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import Header from '@/react-app/components/Header';
import ImageGrid from '@/react-app/components/ImageGrid';
import { Album, Image } from '@/shared/types';

interface EditAlbumModal {
  open: boolean;
  name: string;
  description: string;
  privacy: 'public' | 'unlisted' | 'private';
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [album, setAlbum] = useState<Album | null>(null);
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editModal, setEditModal] = useState<EditAlbumModal>({
    open: false,
    name: '',
    description: '',
    privacy: 'public'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      fetchAlbum();
      fetchAlbumImages();
    }
  }, [id]);

  const fetchAlbum = async () => {
    try {
      const response = await fetch(`/api/albums/${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch album');
      }

      const data = await response.json();
      setAlbum(data);
      
      // Initialize edit modal with current values
      setEditModal(prev => ({
        ...prev,
        name: data.name || '',
        description: data.description || '',
        privacy: data.privacy || 'public'
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch album');
    }
  };

  const fetchAlbumImages = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/images?album_id=${id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch album images');
      }

      const data = await response.json();
      setImages(data.images);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch album images');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAlbum = () => {
    if (!album) return;
    
    setEditModal({
      open: true,
      name: album.name || '',
      description: album.description || '',
      privacy: album.privacy || 'public'
    });
  };

  const handleSaveAlbum = async () => {
    if (!album || !user) return;
    
    setSaving(true);
    try {
      const response = await fetch(`/api/albums/${album.uuid || album.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: editModal.name.trim(),
          description: editModal.description.trim() || null,
          privacy: editModal.privacy
        })
      });

      if (response.ok) {
        const updatedAlbum = await response.json();
        setAlbum(updatedAlbum);
        setEditModal(prev => ({ ...prev, open: false }));
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMsg.textContent = 'Album updated successfully';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update album');
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to update album';
      
      // Show error message
      const errorDiv = document.createElement('div');
      errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded shadow-lg z-50';
      errorDiv.textContent = errorMsg;
      document.body.appendChild(errorDiv);
      setTimeout(() => errorDiv.remove(), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (!album) return;
    
    setEditModal({
      open: false,
      name: album.name || '',
      description: album.description || '',
      privacy: album.privacy || 'public'
    });
  };

  const canEditAlbum = user && album && album.created_by === user.id;

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
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
          to="/albums"
          className="inline-flex items-center space-x-2 text-purple-600 hover:text-purple-700 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Albums</span>
        </Link>

        {/* Album header */}
        {album && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 mb-8">
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{album.name}</h1>
                
                {album.description && (
                  <p className="text-gray-600 mb-4">{album.description}</p>
                )}

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-4 h-4" />
                    <span>Created {new Date(album.created_at).toLocaleDateString()}</span>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <ImageIcon className="w-4 h-4" />
                    <span>{images.length} images</span>
                  </div>

                  <div className="flex items-center space-x-1">
                    {album.privacy === 'public' ? (
                      <><Globe className="w-4 h-4" /><span>Public</span></>
                    ) : album.privacy === 'unlisted' ? (
                      <><Users className="w-4 h-4" /><span>Unlisted</span></>
                    ) : (
                      <><Lock className="w-4 h-4" /><span>Private</span></>
                    )}
                  </div>
                </div>
              </div>

              {canEditAlbum && (
                <button 
                  onClick={handleEditAlbum}
                  className="flex items-center space-x-2 px-4 py-2 text-purple-600 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Edit Album</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Images */}
        <div className="mb-8">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-purple-600 border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <ImageIcon className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No images in this album</h3>
              <p className="text-gray-500">Upload some images to get started.</p>
            </div>
          ) : (
            <ImageGrid images={images} loading={false} onRefresh={fetchAlbumImages} />
          )}
        </div>
      </div>

      {/* Edit Album Modal */}
      {editModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Edit Album</h3>
              <button 
                onClick={handleCancelEdit}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Album Name */}
              <div>
                <label htmlFor="album-name" className="block text-sm font-medium text-gray-700 mb-2">
                  Album Name
                </label>
                <input
                  id="album-name"
                  type="text"
                  value={editModal.name}
                  onChange={(e) => setEditModal(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter album name"
                  required
                />
              </div>

              {/* Album Description */}
              <div>
                <label htmlFor="album-description" className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  id="album-description"
                  value={editModal.description}
                  onChange={(e) => setEditModal(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                  placeholder="Describe your album"
                />
              </div>

              {/* Privacy Setting */}
              <div>
                <label htmlFor="album-privacy" className="block text-sm font-medium text-gray-700 mb-2">
                  Privacy
                </label>
                <select
                  id="album-privacy"
                  value={editModal.privacy}
                  onChange={(e) => setEditModal(prev => ({ ...prev, privacy: e.target.value as 'public' | 'unlisted' | 'private' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="public">Public - Anyone can see this album</option>
                  <option value="unlisted">Unlisted - Only people with the link can see</option>
                  <option value="private">Private - Only you can see this album</option>
                </select>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAlbum}
                disabled={!editModal.name.trim() || saving}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
