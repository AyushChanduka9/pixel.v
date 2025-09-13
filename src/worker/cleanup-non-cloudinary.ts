// Helper function to clean up non-Cloudinary images
export async function cleanupNonCloudinaryImages(db: any) {
  try {
    // Get all non-Cloudinary image IDs
    const { results: nonCloudinaryImages } = await db.prepare(`
      SELECT id FROM images WHERE storage_path NOT LIKE '%res.cloudinary.com%'
    `).all();

    if (nonCloudinaryImages.length === 0) {
      return {
        success: true,
        message: 'No non-Cloudinary images found',
        deletedCounts: {},
        imageIds: []
      };
    }

    const imageIds = nonCloudinaryImages.map((img: any) => img.id);
    const placeholders = imageIds.map(() => '?').join(',');
    
    const deletedCounts: any = {};

    // Delete in correct order to avoid foreign key issues
    
    // 1. Delete image_tags
    const imageTagsResult = await db.prepare(`
      DELETE FROM image_tags WHERE image_id IN (${placeholders})
    `).bind(...imageIds).run();
    deletedCounts.image_tags = imageTagsResult.meta?.changes || 0;

    // 2. Delete album_images 
    const albumImagesResult = await db.prepare(`
      DELETE FROM album_images WHERE image_id IN (${placeholders})
    `).bind(...imageIds).run();
    deletedCounts.album_images = albumImagesResult.meta?.changes || 0;

    // 3. Delete likes
    const likesResult = await db.prepare(`
      DELETE FROM likes WHERE image_id IN (${placeholders})
    `).bind(...imageIds).run();
    deletedCounts.likes = likesResult.meta?.changes || 0;

    // 4. Delete comments
    const commentsResult = await db.prepare(`
      DELETE FROM comments WHERE image_id IN (${placeholders})
    `).bind(...imageIds).run();
    deletedCounts.comments = commentsResult.meta?.changes || 0;

    // 5. Delete the images themselves
    const imagesResult = await db.prepare(`
      DELETE FROM images WHERE id IN (${placeholders})
    `).bind(...imageIds).run();
    deletedCounts.images = imagesResult.meta?.changes || 0;

    // 6. Clean up orphaned tags
    const orphanedTagsResult = await db.prepare(`
      DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM image_tags)
    `).run();
    deletedCounts.orphaned_tags = orphanedTagsResult.meta?.changes || 0;

    return {
      success: true,
      message: `Successfully deleted ${imageIds.length} non-Cloudinary images`,
      deletedCounts,
      imageIds
    };

  } catch (error) {
    console.error('Error cleaning up non-Cloudinary images:', error);
    throw error;
  }
}
