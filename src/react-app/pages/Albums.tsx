import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import { Plus, Calendar, User, Folder, Trash2 } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';
import Header from '@/react-app/components/Header';
import { Album } from '@/shared/types';

export default function Albums() {
  const { user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchAlbums();
  }, []);

  const createAlbum = async () => {
    if (!user) return;
    
    const name = prompt('Enter album name:');
    if (!name || !name.trim()) return;

    const description = prompt('Enter album description (optional):') || '';

    try {
      const response = await fetch('/api/albums', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          privacy: 'public'
        })
      });

      if (response.ok) {
        fetchAlbums(); // Refresh the list
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMsg.textContent = 'Album created successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        alert('Failed to create album');
      }
    } catch (error) {
      console.error('Error creating album:', error);
      alert('Failed to create album');
    }
  };

  const deleteAlbum = async (albumId: number, albumName: string) => {
    if (!user) return;
    
    if (!confirm(`Are you sure you want to delete the album "${albumName}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingId(albumId);
    
    try {
      const response = await fetch(`/api/albums/${albumId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchAlbums(); // Refresh the list
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMsg.textContent = 'Album deleted successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Failed to delete album');
      }
    } catch (error) {
      console.error('Error deleting album:', error);
      alert('Failed to delete album');
    } finally {
      setDeletingId(null);
    }
  };

  const fetchAlbums = async () => {
    try {
      setLoading(true);
      
      // Only fetch user's albums if logged in
      let url = '/api/albums';
      if (user) {
        // Get user's albums specifically
        url = `/api/albums?created_by=${user.id}`;
      }
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch albums');
      }

      const data = await response.json();
      
      // Filter to only show user-created albums if user is logged in
      let filteredAlbums = data.albums || [];
      if (user) {
        filteredAlbums = filteredAlbums.filter((album: any) => album.created_by === user.id);
      } else {
        // If not logged in, show no albums (only user-created albums should be visible)
        filteredAlbums = [];
      }
      
      setAlbums(filteredAlbums);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch albums');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Albums</h1>
            <p className="text-gray-600">Organize your images into collections</p>
          </div>
          
          {user && (
            <button 
              onClick={createAlbum}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200"
            >
              <Plus className="w-5 h-5" />
              <span>Create Album</span>
            </button>
          )}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gray-300 rounded-lg"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Not logged in state */}
        {!user && !loading && (
          <div className="text-center py-12">
            <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Folder className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Sign in to view your albums</h3>
            <p className="text-gray-500">Create an account to organize your images into albums.</p>
          </div>
        )}

        {/* Albums list */}
        {user && !loading && !error && (
          <>
            {albums.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <Folder className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No albums yet</h3>
                <p className="text-gray-500 mb-6">Create your first album to organize your images.</p>
                <button 
                  onClick={createAlbum}
                  className="inline-flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-500 text-white rounded-lg hover:from-purple-700 hover:to-blue-600 transition-all duration-200"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create Album</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {albums.map((album: any, albumIndex: number) => (
                  <div
                    key={`album-${album.uuid || album.id}-${albumIndex}-${album.name}`}
                    className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all duration-300 p-6 border border-gray-200"
                  >
                    <div className="flex items-center justify-between">
                      <Link
                        to={`/album/${album.uuid || album.id}`}
                        className="flex-1 group"
                      >
                        <div className="flex items-center space-x-4">
                          {/* Album Icon */}
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-blue-100 rounded-lg flex items-center justify-center group-hover:from-purple-200 group-hover:to-blue-200 transition-colors">
                            <Folder className="w-6 h-6 text-purple-600" />
                          </div>
                          
                          {/* Album Info */}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
                              {album.name}
                            </h3>
                            
                            {album.description && (
                              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                {album.description}
                              </p>
                            )}

                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <div className="flex items-center space-x-1">
                                <Calendar className="w-3 h-3" />
                                <span>Created {new Date(album.created_at).toLocaleDateString()}</span>
                              </div>
                              
                              <div className="flex items-center space-x-1">
                                <User className="w-3 h-3" />
                                <span>{album.image_count || 0} images</span>
                              </div>
                              
                              {album.privacy && (
                                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs capitalize">
                                  {album.privacy}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </Link>
                      
                      {/* Delete Button */}
                      <button
                        onClick={() => deleteAlbum(album.id, album.name)}
                        disabled={deletingId === album.id}
                        className="ml-4 p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Delete Album"
                      >
                        {deletingId === album.id ? (
                          <div className="animate-spin w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full"></div>
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
