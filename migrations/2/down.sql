
-- Remove sample data
DELETE FROM album_images;
DELETE FROM image_tags;
DELETE FROM albums WHERE uuid IN ('660e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440002');
DELETE FROM tags WHERE name IN ('landscape', 'nature', 'sunset', 'mountains', 'forest', 'ocean', 'ai-art', 'futuristic');
DELETE FROM images WHERE uuid IN ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440004');
