import z from "zod";

// User types
export const UserRoleSchema = z.enum(['admin', 'editor', 'visitor']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserSchema = z.object({
  id: z.number(),
  mocha_user_id: z.string(),
  email: z.string(),
  name: z.string().nullable(),
  picture_url: z.string().nullable(),
  role: UserRoleSchema,
  is_active: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type User = z.infer<typeof UserSchema>;

// Image types
export const ImagePrivacySchema = z.enum(['public', 'unlisted', 'private']);
export type ImagePrivacy = z.infer<typeof ImagePrivacySchema>;

export const ImageSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  filename: z.string(),
  original_filename: z.string(),
  storage_path: z.string(),
  title: z.string().nullable(),
  caption: z.string().nullable(),
  alt_text: z.string().nullable(),
  mime_type: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
  size_bytes: z.number().nullable(),
  exif_data: z.string().nullable(),
  license: z.string().nullable(),
  attribution: z.string().nullable(),
  uploaded_by: z.string(),
  privacy: ImagePrivacySchema,
  view_count: z.number(),
  is_ai_generated: z.boolean(),
  generation_prompt: z.string().nullable(),
  generation_model: z.string().nullable(),
  generation_provider: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Image = z.infer<typeof ImageSchema>;

// Album types
export const AlbumSchema = z.object({
  id: z.number(),
  uuid: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  cover_image_id: z.number().nullable(),
  created_by: z.string(),
  privacy: ImagePrivacySchema,
  created_at: z.string(),
  updated_at: z.string(),
});
export type Album = z.infer<typeof AlbumSchema>;

// Tag types
export const TagSchema = z.object({
  id: z.number(),
  name: z.string(),
  color: z.string().nullable(),
  created_at: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

// Comment types
export const CommentSchema = z.object({
  id: z.number(),
  image_id: z.number(),
  user_id: z.string(),
  content: z.string(),
  is_approved: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Comment = z.infer<typeof CommentSchema>;

// API request/response schemas
export const CreateImageSchema = z.object({
  title: z.string().optional(),
  caption: z.string().optional(),
  alt_text: z.string().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  privacy: ImagePrivacySchema.optional(),
  album_id: z.number().optional(),
  tags: z.array(z.string()).optional(),
});
export type CreateImageRequest = z.infer<typeof CreateImageSchema>;

export const UpdateImageSchema = z.object({
  title: z.string().optional(),
  caption: z.string().optional(),
  alt_text: z.string().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  privacy: ImagePrivacySchema.optional(),
});
export type UpdateImageRequest = z.infer<typeof UpdateImageSchema>;

export const CreateAlbumSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  privacy: ImagePrivacySchema.optional(),
});
export type CreateAlbumRequest = z.infer<typeof CreateAlbumSchema>;

export const ImageSearchSchema = z.object({
  q: z.string().optional(),
  album_id: z.number().optional(),
  tags: z.string().optional(),
  privacy: ImagePrivacySchema.optional(),
  uploaded_by: z.string().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
  // Advanced search fields
  title_search: z.string().optional(),
  caption_search: z.string().optional(),
  date_range: z.string().optional(),
  camera_make: z.string().optional(),
  camera_model: z.string().optional(),
  lens: z.string().optional(),
  aperture: z.string().optional(),
  shutter_speed: z.string().optional(),
  iso: z.string().optional(),
  focal_length: z.string().optional(),
  license: z.string().optional(),
  attribution: z.string().optional(),
  min_width: z.string().optional(),
  min_height: z.string().optional(),
  aspect_ratio: z.string().optional(),
  is_ai_generated: z.string().optional(),
});
export type ImageSearchParams = z.infer<typeof ImageSearchSchema>;
