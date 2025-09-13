import { useState, useEffect } from 'react';
import { Trash2, FolderPlus, Edit3, Tag, X, Check, AlertCircle, Plus } from 'lucide-react';
import { Image } from '@/shared/types';

interface BatchOperationsProps {
  selectedImages: Image[];
  onClearSelection: () => void;
  onBatchComplete: () => void;
}

export default function BatchOperations({ selectedImages, onClearSelection, onBatchComplete }: BatchOperationsProps) {
  const [operation, setOperation] = useState<'delete' | 'move' | 'edit' | 'tag' | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  
  // Form states
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [metadataUpdates, setMetadataUpdates] = useState({
    title: '',
    caption: '',
    alt_text: '',
    privacy: '',
    license: '',
    attribution: ''
  });
  const [tagsToAdd, setTagsToAdd] = useState('');
  const [tagsToRemove, setTagsToRemove] = useState('');

  // Fetch albums for move operation
  useEffect(() => {
    if (operation === 'move') {
      fetchAlbums();
    }
  }, [operation]);

  const fetchAlbums = async () => {
    try {
      const response = await fetch('/api/albums');
      if (response.ok) {
        const data = await response.json();
        setAlbums(data.albums || []);
      }
    } catch (error) {
      console.error('Error fetching albums:', error);
    }
  };

  if (selectedImages.length === 0) return null;

  const handleBatchDelete = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const results = await Promise.allSettled(
        selectedImages.map(image => 
          fetch(`/api/images/${image.id}`, { method: 'DELETE' })
        )
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        setError(`Failed to delete ${failed} images`);
      }
      
      onBatchComplete();
      setOperation(null);
    } catch (err) {
      setError('Failed to delete images');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchMove = async () => {
    if (!selectedAlbumId) {
      setError('Please select an album');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/images/batch/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds: selectedImages.map(img => img.id),
          albumId: parseInt(selectedAlbumId)
        })
      });

      if (response.ok) {
        onBatchComplete();
        setOperation(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to move images');
      }
    } catch (err) {
      setError('Failed to move images');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchEdit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const updates = Object.fromEntries(
        Object.entries(metadataUpdates).filter(([_, value]) => value.trim() !== '')
      );
      
      const results = await Promise.allSettled(
        selectedImages.map(image => 
          fetch(`/api/images/${image.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updates)
          })
        )
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        setError(`Failed to update ${failed} images`);
      }
      
      onBatchComplete();
      setOperation(null);
    } catch (err) {
      setError('Failed to update images');
    } finally {
      setLoading(false);
    }
  };

  const createNewAlbum = async () => {
    const name = prompt('Enter album name:');
    if (!name || !name.trim()) return;

    const description = prompt('Enter album description (optional):') || '';

    setLoading(true);
    setError(null);

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
        const newAlbum = await response.json();
        // Add the new album to the list
        setAlbums(prevAlbums => [...prevAlbums, newAlbum]);
        // Auto-select the new album
        setSelectedAlbumId(newAlbum.id.toString());
        
        // Show success message
        const successMsg = document.createElement('div');
        successMsg.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded shadow-lg z-50';
        successMsg.textContent = 'Album created successfully!';
        document.body.appendChild(successMsg);
        setTimeout(() => successMsg.remove(), 3000);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create album');
      }
    } catch (error) {
      setError('Failed to create album');
    } finally {
      setLoading(false);
    }
  };

  const handleBatchTag = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const addTags = tagsToAdd.split(',').map(t => t.trim()).filter(t => t);
      const removeTags = tagsToRemove.split(',').map(t => t.trim()).filter(t => t);
      
      const results = await Promise.allSettled(
        selectedImages.map(async image => {
          // Add tags
          if (addTags.length > 0) {
            await fetch(`/api/images/${image.id}/tags`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: addTags })
            });
          }
          
          // Remove tags
          if (removeTags.length > 0) {
            await fetch(`/api/images/${image.id}/tags`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ tags: removeTags })
            });
          }
        })
      );
      
      const failed = results.filter(r => r.status === 'rejected').length;
      if (failed > 0) {
        setError(`Failed to update tags for ${failed} images`);
      }
      
      onBatchComplete();
      setOperation(null);
    } catch (err) {
      setError('Failed to update tags');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white rounded-lg shadow-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Check className="w-5 h-5 text-green-500" />
              <span className="font-medium text-gray-900">
                {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setOperation('delete')}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Delete Selected"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setOperation('move')}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                title="Move to Album"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setOperation('edit')}
                className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                title="Edit Metadata"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              
              <button
                onClick={() => setOperation('tag')}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Manage Tags"
              >
                <Tag className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <button
            onClick={onClearSelection}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-red-700 text-sm">{error}</span>
          </div>
        )}

        {/* Delete Confirmation */}
        {operation === 'delete' && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 mb-4">
              Are you sure you want to delete {selectedImages.length} image{selectedImages.length !== 1 ? 's' : ''}? 
              This action cannot be undone.
            </p>
            <div className="flex space-x-2">
              <button
                onClick={handleBatchDelete}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => setOperation(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Move to Album */}
        {operation === 'move' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-4">
            <h4 className="font-medium text-blue-900">Move to Album</h4>
            
            {albums.length > 0 ? (
              <select
                value={selectedAlbumId}
                onChange={(e) => setSelectedAlbumId(e.target.value)}
                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              >
                <option value="">Select an album</option>
                {albums.map((album) => (
                  <option key={album.id} value={album.id}>
                    {album.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="text-center py-4 bg-blue-100 rounded-lg">
                <p className="text-blue-800 mb-3">No albums found. Create one to organize your images.</p>
              </div>
            )}

            <div className="flex flex-col space-y-2">
              {albums.length > 0 && (
                <div className="flex space-x-2">
                  <button
                    onClick={handleBatchMove}
                    disabled={loading || !selectedAlbumId}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {loading ? 'Moving...' : 'Move to Album'}
                  </button>
                  <button
                    onClick={() => setOperation(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={createNewAlbum}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors flex items-center justify-center space-x-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>{loading ? 'Creating...' : 'Create New Album'}</span>
                </button>
                
                {albums.length === 0 && (
                  <button
                    onClick={() => setOperation(null)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Edit Metadata */}
        {operation === 'edit' && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg space-y-4">
            <h4 className="font-medium text-purple-900">Edit Metadata</h4>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Title"
                value={metadataUpdates.title}
                onChange={(e) => setMetadataUpdates(prev => ({ ...prev, title: e.target.value }))}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Caption"
                value={metadataUpdates.caption}
                onChange={(e) => setMetadataUpdates(prev => ({ ...prev, caption: e.target.value }))}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Alt Text"
                value={metadataUpdates.alt_text}
                onChange={(e) => setMetadataUpdates(prev => ({ ...prev, alt_text: e.target.value }))}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <select
                value={metadataUpdates.privacy}
                onChange={(e) => setMetadataUpdates(prev => ({ ...prev, privacy: e.target.value }))}
                className="px-3 py-2 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Keep Privacy</option>
                <option value="public">Public</option>
                <option value="unlisted">Unlisted</option>
                <option value="private">Private</option>
              </select>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBatchEdit}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update'}
              </button>
              <button
                onClick={() => setOperation(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Manage Tags */}
        {operation === 'tag' && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-4">
            <h4 className="font-medium text-green-900">Manage Tags</h4>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Add tags (comma-separated)"
                value={tagsToAdd}
                onChange={(e) => setTagsToAdd(e.target.value)}
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              <input
                type="text"
                placeholder="Remove tags (comma-separated)"
                value={tagsToRemove}
                onChange={(e) => setTagsToRemove(e.target.value)}
                className="w-full px-3 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleBatchTag}
                disabled={loading || (!tagsToAdd && !tagsToRemove)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Updating...' : 'Update Tags'}
              </button>
              <button
                onClick={() => setOperation(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
