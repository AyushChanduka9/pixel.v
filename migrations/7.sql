DELETE FROM image_tags;
DELETE FROM album_images; 
DELETE FROM likes;
DELETE FROM comments;
DELETE FROM images;
DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM image_tags);