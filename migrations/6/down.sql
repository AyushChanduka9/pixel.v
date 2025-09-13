
-- Remove the test data
DELETE FROM image_tags WHERE image_id IN (15, 16, 17);
DELETE FROM image_tags WHERE tag_id IN (1, 2, 3, 4, 5, 6);
DELETE FROM tags WHERE id IN (1, 2, 3, 4, 5, 6);
DELETE FROM images WHERE id IN (15, 16, 17);
