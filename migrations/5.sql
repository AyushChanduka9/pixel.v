
-- Insert sample images if they don't exist
INSERT OR IGNORE INTO images (id, uuid, filename, original_filename, storage_path, title, caption, alt_text, mime_type, width, height, size_bytes, uploaded_by, privacy, view_count, is_ai_generated, created_at, updated_at) VALUES
(1, 'img-001', 'landscape1.jpg', 'mountain_landscape.jpg', '/uploads/landscape1.jpg', 'Mountain Sunrise', 'A breathtaking sunrise over snow-capped mountains', 'Sunrise over mountain peaks with snow', 'image/jpeg', 1920, 1080, 2048000, 'user-123', 'public', 45, 0, datetime('now', '-5 days'), datetime('now', '-5 days')),
(2, 'img-002', 'nature2.jpg', 'forest_path.jpg', '/uploads/nature2.jpg', 'Forest Trail', 'Peaceful hiking trail through dense woodland', 'A winding path through a green forest', 'image/jpeg', 1600, 900, 1536000, 'user-456', 'public', 32, 0, datetime('now', '-3 days'), datetime('now', '-3 days')),
(3, 'img-003', 'ocean3.jpg', 'ocean_waves.jpg', '/uploads/ocean3.jpg', 'Ocean Waves', 'Powerful waves crashing against rocky coastline', 'Ocean waves hitting rocks on the shore', 'image/jpeg', 2048, 1365, 2560000, 'user-789', 'public', 67, 0, datetime('now', '-2 days'), datetime('now', '-2 days')),
(4, 'img-004', 'city4.jpg', 'city_skyline.jpg', '/uploads/city4.jpg', 'Urban Skyline', 'Modern city skyline at golden hour', 'City buildings silhouetted against evening sky', 'image/jpeg', 1920, 1280, 2048000, 'user-123', 'public', 89, 0, datetime('now', '-1 day'), datetime('now', '-1 day'));

-- Insert sample albums if they don't exist
INSERT OR IGNORE INTO albums (id, uuid, name, description, cover_image_id, created_by, privacy, created_at, updated_at) VALUES
(1, 'album-001', 'Nature Collection', 'Beautiful landscapes and natural scenery', 1, 'user-123', 'public', datetime('now', '-4 days'), datetime('now', '-4 days')),
(2, 'album-002', 'Urban Photography', 'City life and architecture', 4, 'user-456', 'public', datetime('now', '-2 days'), datetime('now', '-2 days'));

-- Link images to albums
INSERT OR IGNORE INTO album_images (album_id, image_id, sort_order, created_at) VALUES
(1, 1, 1, datetime('now', '-4 days')),
(1, 2, 2, datetime('now', '-4 days')),
(1, 3, 3, datetime('now', '-4 days')),
(2, 4, 1, datetime('now', '-2 days'));

-- Insert sample tags
INSERT OR IGNORE INTO tags (id, name, color, created_at) VALUES
(1, 'landscape', '#10B981', datetime('now', '-5 days')),
(2, 'nature', '#059669', datetime('now', '-5 days')),
(3, 'mountains', '#6366F1', datetime('now', '-5 days')),
(4, 'ocean', '#3B82F6', datetime('now', '-5 days')),
(5, 'city', '#F59E0B', datetime('now', '-5 days')),
(6, 'urban', '#EF4444', datetime('now', '-5 days'));

-- Link images to tags
INSERT OR IGNORE INTO image_tags (image_id, tag_id, created_at) VALUES
(1, 1, datetime('now', '-5 days')),
(1, 2, datetime('now', '-5 days')),
(1, 3, datetime('now', '-5 days')),
(2, 1, datetime('now', '-3 days')),
(2, 2, datetime('now', '-3 days')),
(3, 1, datetime('now', '-2 days')),
(3, 4, datetime('now', '-2 days')),
(4, 5, datetime('now', '-1 day')),
(4, 6, datetime('now', '-1 day'));
