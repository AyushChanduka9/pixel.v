
-- Remove sample data
DELETE FROM image_tags WHERE tag_id IN (SELECT id FROM tags WHERE name LIKE 'demo-%');
DELETE FROM album_images WHERE album_id IN (SELECT id FROM albums WHERE uuid LIKE 'demo-album-%');
DELETE FROM tags WHERE name LIKE 'demo-%';
DELETE FROM albums WHERE uuid LIKE 'demo-album-%';
DELETE FROM images WHERE uuid LIKE 'demo-img-%';
