
-- Remove sample data
DELETE FROM image_tags WHERE image_id IN (1, 2, 3, 4);
DELETE FROM tags WHERE id IN (1, 2, 3, 4, 5, 6);
DELETE FROM album_images WHERE album_id IN (1, 2);
DELETE FROM albums WHERE id IN (1, 2);
DELETE FROM images WHERE id IN (1, 2, 3, 4);
