
-- Users table for roles and permissions
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  mocha_user_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT,
  picture_url TEXT,
  role TEXT NOT NULL DEFAULT 'visitor',
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Images table
CREATE TABLE images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  filename TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  title TEXT,
  caption TEXT,
  alt_text TEXT,
  mime_type TEXT NOT NULL,
  width INTEGER,
  height INTEGER,
  size_bytes INTEGER,
  exif_data TEXT,
  license TEXT,
  attribution TEXT,
  uploaded_by TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'public',
  view_count INTEGER DEFAULT 0,
  is_ai_generated BOOLEAN DEFAULT 0,
  generation_prompt TEXT,
  generation_model TEXT,
  generation_provider TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Albums/Collections table
CREATE TABLE albums (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  uuid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  cover_image_id INTEGER,
  created_by TEXT NOT NULL,
  privacy TEXT NOT NULL DEFAULT 'public',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Album images junction table
CREATE TABLE album_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  album_id INTEGER NOT NULL,
  image_id INTEGER NOT NULL,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tags table
CREATE TABLE tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Image tags junction table
CREATE TABLE image_tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id INTEGER NOT NULL,
  tag_id INTEGER NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Comments table
CREATE TABLE comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  is_approved BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Likes table
CREATE TABLE likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image_id INTEGER NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_images_uploaded_by ON images(uploaded_by);
CREATE INDEX idx_images_privacy ON images(privacy);
CREATE INDEX idx_images_created_at ON images(created_at);
CREATE INDEX idx_albums_created_by ON albums(created_by);
CREATE INDEX idx_album_images_album_id ON album_images(album_id);
CREATE INDEX idx_album_images_image_id ON album_images(image_id);
CREATE INDEX idx_image_tags_image_id ON image_tags(image_id);
CREATE INDEX idx_image_tags_tag_id ON image_tags(tag_id);
CREATE INDEX idx_comments_image_id ON comments(image_id);
CREATE INDEX idx_likes_image_id ON likes(image_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
