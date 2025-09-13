
-- Insert some sample images to test the gallery
INSERT INTO images (
  uuid, filename, original_filename, storage_path, title, caption, alt_text, 
  mime_type, width, height, size_bytes, uploaded_by, privacy, view_count,
  is_ai_generated, created_at, updated_at
) VALUES 
(
  '550e8400-e29b-41d4-a716-446655440001', 
  'sample1.jpg', 
  'mountain_landscape.jpg', 
  '/storage/sample1.jpg',
  'Mountain Sunrise',
  'A beautiful sunrise over snow-capped mountains with golden light.',
  'Sunrise over mountain peaks with golden morning light',
  'image/jpeg',
  1920, 1080, 2500000,
  'demo-user-1',
  'public',
  42,
  0,
  datetime('now', '-2 days'),
  datetime('now', '-2 days')
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'sample2.jpg',
  'forest_path.jpg', 
  '/storage/sample2.jpg',
  'Forest Path',
  'A winding path through a misty forest with tall pine trees.',
  'Forest path winding through tall trees in morning mist',
  'image/jpeg',
  1600, 1200, 1800000,
  'demo-user-1',
  'public',
  28,
  0,
  datetime('now', '-1 day'),
  datetime('now', '-1 day')
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'sample3.jpg',
  'ocean_sunset.jpg',
  '/storage/sample3.jpg', 
  'Ocean Sunset',
  'Vibrant sunset colors reflecting on calm ocean waters.',
  'Colorful sunset over calm ocean with cloud reflections',
  'image/jpeg',
  2048, 1365, 3200000,
  'demo-user-2',
  'public',
  67,
  0,
  datetime('now', '-3 hours'),
  datetime('now', '-3 hours')
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  'sample4.jpg',
  'ai_cityscape.jpg',
  '/storage/sample4.jpg',
  'Futuristic City',
  'AI-generated image of a futuristic cityscape with neon lights.',
  'Futuristic city with flying cars and neon lights',
  'image/jpeg',
  1024, 1024, 1200000,
  'demo-user-2',
  'public',
  15,
  1,
  datetime('now', '-1 hour'),
  datetime('now', '-1 hour')
);

-- Insert sample tags
INSERT INTO tags (name, color, created_at) VALUES
('landscape', '#10B981', datetime('now')),
('nature', '#059669', datetime('now')),
('sunset', '#F59E0B', datetime('now')),
('mountains', '#6B7280', datetime('now')),
('forest', '#065F46', datetime('now')),
('ocean', '#0EA5E9', datetime('now')),
('ai-art', '#8B5CF6', datetime('now')),
('futuristic', '#6366F1', datetime('now'));

-- Create sample albums
INSERT INTO albums (
  uuid, name, description, created_by, privacy, created_at, updated_at
) VALUES
(
  '660e8400-e29b-41d4-a716-446655440001',
  'Nature Collection',
  'Beautiful landscapes and natural scenery from around the world.',
  'demo-user-1',
  'public',
  datetime('now', '-1 day'),
  datetime('now', '-1 day')
),
(
  '660e8400-e29b-41d4-a716-446655440002', 
  'AI Creations',
  'Stunning AI-generated artwork and digital compositions.',
  'demo-user-2',
  'public',
  datetime('now', '-2 hours'),
  datetime('now', '-2 hours')
);

-- Link images to tags
INSERT INTO image_tags (image_id, tag_id, created_at) VALUES
(1, 1, datetime('now')), -- Mountain Sunrise -> landscape
(1, 2, datetime('now')), -- Mountain Sunrise -> nature
(1, 4, datetime('now')), -- Mountain Sunrise -> mountains
(2, 1, datetime('now')), -- Forest Path -> landscape
(2, 2, datetime('now')), -- Forest Path -> nature
(2, 5, datetime('now')), -- Forest Path -> forest
(3, 1, datetime('now')), -- Ocean Sunset -> landscape
(3, 3, datetime('now')), -- Ocean Sunset -> sunset
(3, 6, datetime('now')), -- Ocean Sunset -> ocean
(4, 7, datetime('now')), -- Futuristic City -> ai-art
(4, 8, datetime('now')); -- Futuristic City -> futuristic

-- Link images to albums
INSERT INTO album_images (album_id, image_id, sort_order, created_at) VALUES
(1, 1, 0, datetime('now')), -- Nature Collection -> Mountain Sunrise
(1, 2, 1, datetime('now')), -- Nature Collection -> Forest Path
(1, 3, 2, datetime('now')), -- Nature Collection -> Ocean Sunset
(2, 4, 0, datetime('now')); -- AI Creations -> Futuristic City
