
-- Add some sample data to test for duplicates and key issues
INSERT OR REPLACE INTO images (id, uuid, filename, original_filename, storage_path, title, caption, alt_text, mime_type, width, height, size_bytes, uploaded_by, privacy, view_count, is_ai_generated, created_at, updated_at) VALUES
(15, 'img-15-unique', 'sample-15.jpg', 'unique_sample_15.jpg', '/storage/sample-15.jpg', 'Unique Sample 15', 'This is sample 15', 'Alt text for sample 15', 'image/jpeg', 1920, 1080, 2048000, 'user-test', 'public', 25, 0, datetime('now'), datetime('now')),
(16, 'img-16-unique', 'sample-16.jpg', 'unique_sample_16.jpg', '/storage/sample-16.jpg', 'Unique Sample 16', 'This is sample 16', 'Alt text for sample 16', 'image/jpeg', 1920, 1080, 2048000, 'user-test', 'public', 35, 0, datetime('now'), datetime('now')),
(17, 'img-17-unique', 'sample-17.jpg', 'unique_sample_17.jpg', '/storage/sample-17.jpg', 'Unique Sample 17', 'This is sample 17', 'Alt text for sample 17', 'image/jpeg', 1920, 1080, 2048000, 'user-test', 'public', 45, 0, datetime('now'), datetime('now'));

-- Add some tags to test tag rendering
INSERT OR REPLACE INTO tags (id, name, color, created_at) VALUES
(1, 'nature', '#22c55e', datetime('now')),
(2, 'landscape', '#3b82f6', datetime('now')),
(3, 'mountain', '#8b5cf6', datetime('now')),
(4, 'forest', '#10b981', datetime('now')),
(5, 'city', '#f59e0b', datetime('now')),
(6, 'architecture', '#ef4444', datetime('now'));

-- Link some tags to images  
INSERT OR REPLACE INTO image_tags (image_id, tag_id, created_at) VALUES
(1, 1, datetime('now')),
(1, 2, datetime('now')),
(1, 3, datetime('now')),
(2, 1, datetime('now')),
(2, 4, datetime('now')),
(3, 1, datetime('now')),
(4, 5, datetime('now')),
(4, 6, datetime('now')),
(9, 1, datetime('now')),
(9, 2, datetime('now')),
(10, 1, datetime('now')),
(10, 4, datetime('now')),
(11, 6, datetime('now')),
(12, 5, datetime('now')),
(12, 6, datetime('now'));
