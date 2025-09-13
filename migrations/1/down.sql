
DROP INDEX idx_likes_user_id;
DROP INDEX idx_likes_image_id;
DROP INDEX idx_comments_image_id;
DROP INDEX idx_image_tags_tag_id;
DROP INDEX idx_image_tags_image_id;
DROP INDEX idx_album_images_image_id;
DROP INDEX idx_album_images_album_id;
DROP INDEX idx_albums_created_by;
DROP INDEX idx_images_created_at;
DROP INDEX idx_images_privacy;
DROP INDEX idx_images_uploaded_by;

DROP TABLE likes;
DROP TABLE comments;
DROP TABLE image_tags;
DROP TABLE tags;
DROP TABLE album_images;
DROP TABLE albums;
DROP TABLE images;
DROP TABLE users;
