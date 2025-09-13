
-- Clear existing data to avoid conflicts
DELETE FROM album_images;
DELETE FROM image_tags;
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM tags;
DELETE FROM images;
DELETE FROM albums;
DELETE FROM users;

-- Insert sample users
INSERT INTO users (mocha_user_id, email, name, picture_url, role, created_at, updated_at) VALUES 
('user1', 'photographer@example.com', 'Sarah Chen', 'https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=150&h=150&fit=crop&crop=face', 'admin', datetime('now', '-30 days'), datetime('now')),
('user2', 'artist@example.com', 'Mike Johnson', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', 'editor', datetime('now', '-20 days'), datetime('now')),
('user3', 'visitor@example.com', 'Emma Wilson', 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', 'visitor', datetime('now', '-10 days'), datetime('now'));

-- Insert sample images
INSERT INTO images (uuid, filename, original_filename, storage_path, title, caption, alt_text, mime_type, width, height, size_bytes, uploaded_by, privacy, view_count, is_ai_generated, generation_prompt, generation_model, created_at, updated_at) VALUES
('img-1', 'landscape-1.jpg', 'mountain_sunset.jpg', '/storage/landscape-1.jpg', 'Mountain Sunset', 'A breathtaking sunset over the mountain peaks', 'Beautiful mountain landscape with golden sunset', 'image/jpeg', 1920, 1080, 2048576, 'user1', 'public', 245, 0, NULL, NULL, datetime('now', '-25 days'), datetime('now')),
('img-2', 'nature-2.jpg', 'forest_path.jpg', '/storage/nature-2.jpg', 'Forest Path', 'A serene path through the autumn forest', 'Peaceful forest trail with fall foliage', 'image/jpeg', 1600, 1200, 1843200, 'user1', 'public', 189, 0, NULL, NULL, datetime('now', '-22 days'), datetime('now')),
('img-3', 'abstract-3.jpg', 'ai_creation.jpg', '/storage/abstract-3.jpg', 'Digital Dreams', 'An abstract AI-generated artwork exploring digital consciousness', 'Colorful abstract digital art with flowing patterns', 'image/jpeg', 2048, 2048, 3145728, 'user2', 'public', 156, 1, 'A vibrant abstract digital artwork with flowing colors and geometric patterns representing the fusion of technology and creativity', 'DALL-E 3', datetime('now', '-18 days'), datetime('now')),
('img-4', 'cityscape-4.jpg', 'urban_night.jpg', '/storage/cityscape-4.jpg', 'Urban Nights', 'City lights reflecting on wet streets after rain', 'Nighttime cityscape with illuminated buildings and wet reflections', 'image/jpeg', 1920, 1280, 2621440, 'user2', 'public', 312, 0, NULL, NULL, datetime('now', '-15 days'), datetime('now')),
('img-5', 'portrait-5.jpg', 'street_musician.jpg', '/storage/portrait-5.jpg', 'Street Musician', 'A talented street performer captured in natural light', 'Black and white portrait of street musician playing guitar', 'image/jpeg', 1200, 1600, 1920000, 'user1', 'public', 98, 0, NULL, NULL, datetime('now', '-12 days'), datetime('now')),
('img-6', 'architecture-6.jpg', 'modern_building.jpg', '/storage/architecture-6.jpg', 'Modern Architecture', 'Contemporary building design with clean geometric lines', 'Modern glass and steel building with geometric facade', 'image/jpeg', 1600, 1200, 1843200, 'user3', 'public', 167, 0, NULL, NULL, datetime('now', '-8 days'), datetime('now')),
('img-7', 'nature-7.jpg', 'ocean_waves.jpg', '/storage/nature-7.jpg', 'Ocean Waves', 'Powerful waves crashing against rocky coastline', 'Dramatic seascape with waves hitting rocks', 'image/jpeg', 2560, 1440, 4194304, 'user1', 'public', 234, 0, NULL, NULL, datetime('now', '-5 days'), datetime('now')),
('img-8', 'macro-8.jpg', 'flower_closeup.jpg', '/storage/macro-8.jpg', 'Morning Dew', 'Macro shot of water droplets on flower petals', 'Close-up of pink flower with water droplets', 'image/jpeg', 1200, 1800, 2764800, 'user2', 'public', 143, 0, NULL, NULL, datetime('now', '-3 days'), datetime('now'));

-- Insert sample albums
INSERT INTO albums (uuid, name, description, cover_image_id, created_by, privacy, created_at, updated_at) VALUES
('album-1', 'Nature Collection', 'A curated collection of stunning nature photography from around the world', 1, 'user1', 'public', datetime('now', '-20 days'), datetime('now')),
('album-2', 'Urban Exploration', 'Capturing the essence of city life and modern architecture', 4, 'user2', 'public', datetime('now', '-15 days'), datetime('now')),
('album-3', 'Digital Art Gallery', 'AI-generated and digital artworks showcasing creative possibilities', 3, 'user2', 'public', datetime('now', '-10 days'), datetime('now'));

-- Link images to albums
INSERT INTO album_images (album_id, image_id, sort_order, created_at) VALUES
(1, 1, 1, datetime('now', '-20 days')),
(1, 2, 2, datetime('now', '-20 days')),
(1, 7, 3, datetime('now', '-20 days')),
(1, 8, 4, datetime('now', '-20 days')),
(2, 4, 1, datetime('now', '-15 days')),
(2, 6, 2, datetime('now', '-15 days')),
(2, 5, 3, datetime('now', '-15 days')),
(3, 3, 1, datetime('now', '-10 days'));

-- Insert sample tags
INSERT INTO tags (name, color, created_at) VALUES
('landscape', '#22c55e', datetime('now', '-30 days')),
('nature', '#16a34a', datetime('now', '-30 days')),
('sunset', '#f59e0b', datetime('now', '-30 days')),
('forest', '#15803d', datetime('now', '-30 days')),
('abstract', '#8b5cf6', datetime('now', '-30 days')),
('digital-art', '#a855f7', datetime('now', '-30 days')),
('ai-generated', '#ec4899', datetime('now', '-30 days')),
('cityscape', '#3b82f6', datetime('now', '-30 days')),
('architecture', '#6366f1', datetime('now', '-30 days')),
('portrait', '#ef4444', datetime('now', '-30 days')),
('black-white', '#6b7280', datetime('now', '-30 days')),
('ocean', '#06b6d4', datetime('now', '-30 days')),
('waves', '#0891b2', datetime('now', '-30 days')),
('macro', '#10b981', datetime('now', '-30 days')),
('flowers', '#f97316', datetime('now', '-30 days'));

-- Link tags to images
INSERT INTO image_tags (image_id, tag_id, created_at) VALUES
(1, 1, datetime('now', '-25 days')),
(1, 2, datetime('now', '-25 days')),
(1, 3, datetime('now', '-25 days')),
(2, 2, datetime('now', '-22 days')),
(2, 4, datetime('now', '-22 days')),
(3, 5, datetime('now', '-18 days')),
(3, 6, datetime('now', '-18 days')),
(3, 7, datetime('now', '-18 days')),
(4, 8, datetime('now', '-15 days')),
(4, 9, datetime('now', '-15 days')),
(5, 10, datetime('now', '-12 days')),
(5, 11, datetime('now', '-12 days')),
(6, 9, datetime('now', '-8 days')),
(7, 2, datetime('now', '-5 days')),
(7, 12, datetime('now', '-5 days')),
(7, 13, datetime('now', '-5 days')),
(8, 14, datetime('now', '-3 days')),
(8, 15, datetime('now', '-3 days'));
