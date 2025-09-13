import { useState, useEffect } from 'react';
import { MessageCircle, Heart, Trash2, Send } from 'lucide-react';
import { useAuth } from '@getmocha/users-service/react';

interface Comment {
  id: number;
  content: string;
  user_id: string;
  user_name: string;
  user_picture: string | null;
  created_at: string;
  is_approved: boolean;
}

interface CommentsSectionProps {
  imageId: number;
}

export default function CommentsSection({ imageId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [likes, setLikes] = useState(0);
  const [isLiked, setIsLiked] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchLikes();
  }, [imageId]);

  const fetchComments = async () => {
    try {
      const response = await fetch(`/api/images/${imageId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(data.comments || []);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLikes = async () => {
    try {
      const response = await fetch(`/api/images/${imageId}/likes`);
      if (response.ok) {
        const data = await response.json();
        setLikes(data.count || 0);
        setIsLiked(data.user_liked || false);
      }
    } catch (error) {
      console.error('Error fetching likes:', error);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSubmitting(true);
    try {
      const response = await fetch(`/api/images/${imageId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newComment.trim(),
        }),
      });

      if (response.ok) {
        setNewComment('');
        await fetchComments();
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLike = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/images/${imageId}/likes`, {
        method: isLiked ? 'DELETE' : 'POST',
      });

      if (response.ok) {
        await fetchLikes();
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleDeleteComment = async (commentId: number) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/comments/${commentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchComments();
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with likes */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <MessageCircle className="w-5 h-5" />
          <span>Comments ({comments.length})</span>
        </h3>
        
        <button
          onClick={handleToggleLike}
          disabled={!user}
          className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
            isLiked
              ? 'bg-red-50 text-red-600 hover:bg-red-100'
              : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
          } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
          <span>{likes}</span>
        </button>
      </div>

      {/* Comment form */}
      {user && (
        <form onSubmit={handleSubmitComment} className="mb-6">
          <div className="flex space-x-3">
            <img
              src={user.google_user_data?.picture || '/api/placeholder-avatar'}
              alt={user.google_user_data?.name || 'User'}
              className="w-10 h-10 rounded-full bg-gray-200"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
              <div className="flex justify-end mt-2">
                <button
                  type="submit"
                  disabled={!newComment.trim() || submitting}
                  className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                  <span>{submitting ? 'Posting...' : 'Post'}</span>
                </button>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Comments list */}
      <div className="space-y-4">
        {loading ? (
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex space-x-3">
                <div className="w-10 h-10 bg-gray-300 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-300 rounded w-1/4"></div>
                  <div className="h-16 bg-gray-300 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="flex space-x-3">
              <img
                src={comment.user_picture || '/api/placeholder-avatar'}
                alt={comment.user_name}
                className="w-10 h-10 rounded-full bg-gray-200"
              />
              <div className="flex-1">
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-gray-900">{comment.user_name}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                      {user && (user.id === comment.user_id) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-gray-700">{comment.content}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {!user && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-blue-700">
            <a href="/login" className="font-medium hover:underline">
              Sign in
            </a>{' '}
            to like and comment on this image.
          </p>
        </div>
      )}
    </div>
  );
}
