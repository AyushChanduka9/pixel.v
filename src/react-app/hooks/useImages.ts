import { useState, useEffect } from 'react';
import { Image, ImageSearchParams } from '@/shared/types';

interface UseImagesResult {
  images: Image[];
  loading: boolean;
  error: string | null;
  fetchImages: (params?: ImageSearchParams) => Promise<void>;
  hasMore: boolean;
  loadMore: () => Promise<void>;
}

export function useImages(initialParams?: ImageSearchParams): UseImagesResult {
  const [images, setImages] = useState<Image[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [currentParams, setCurrentParams] = useState<ImageSearchParams>(initialParams || {});

  const fetchImages = async (params: ImageSearchParams = {}, reset = false) => {
    try {
      setLoading(true);
      setError(null);

      const searchParams = new URLSearchParams();
      const finalParams = { ...currentParams, ...params };
      
      if (reset) {
        finalParams.offset = 0;
        setOffset(0);
      } else {
        finalParams.offset = offset;
      }

      Object.entries(finalParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          searchParams.append(key, value.toString());
        }
      });

      // Add cache-busting parameter
      searchParams.append('_t', Date.now().toString());

      const response = await fetch(`/api/images?${searchParams}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();
      
      if (reset) {
        setImages(data.images);
      } else {
        setImages(prev => [...prev, ...data.images]);
      }

      setHasMore(data.images.length === (finalParams.limit || 20));
      setCurrentParams(finalParams);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch images');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (!hasMore || loading) return;
    
    const newOffset = offset + (currentParams.limit || 20);
    setOffset(newOffset);
    await fetchImages({ ...currentParams, offset: newOffset });
  };

  useEffect(() => {
    fetchImages(initialParams, true);
  }, []);

  return {
    images,
    loading,
    error,
    fetchImages: (params?: ImageSearchParams) => fetchImages(params, true),
    hasMore,
    loadMore,
  };
}
