import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
  getCurrentUser,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import { zValidator } from "@hono/zod-validator";
import {
  UpdateImageSchema,
  CreateAlbumSchema,
} from "@/shared/types";
import { cleanupNonCloudinaryImages } from "./cleanup-non-cloudinary";

const app = new Hono<{ Bindings: Env }>();

// Enable CORS only for same-origin requests to prevent direct client→provider calls
app.use("*", cors({
  origin: (origin) => {
    // Allow same origin and development origins
    if (!origin) return origin; // Same origin requests
    const url = new URL(origin);
    const isAllowed = url.hostname === 'localhost' || url.hostname.endsWith('.mocha.app') || url.hostname.endsWith('.workers.dev');
    return isAllowed ? origin : null;
  },
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));

// ============================================================================
// Utility Functions
// ============================================================================

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
  }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on client errors (4xx) except rate limits
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('status:')) {
        const statusMatch = errorMsg.match(/status:\s*(\d+)/);
        if (statusMatch) {
          const status = parseInt(statusMatch[1]);
          if (status >= 400 && status < 500 && status !== 429) {
            throw error; // Don't retry 4xx errors except rate limits
          }
        }
      }
      
      if (attempt === options.maxRetries) {
        break; // Last attempt, will throw
      }
      
      const delay = Math.min(
        options.baseDelay * Math.pow(options.backoffFactor, attempt),
        options.maxDelay
      );
      
      const retryErrorMsg = error instanceof Error ? error.message : String(error);
      console.log(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, retryErrorMsg);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

function validateBase64Image(base64String: string): { isValid: boolean; mimeType?: string; error?: string } {
  if (!base64String || typeof base64String !== 'string') {
    return { isValid: false, error: 'Base64 string is required' };
  }

  // Check for data URL prefix
  const dataUrlMatch = base64String.match(/^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/);
  if (!dataUrlMatch) {
    return { 
      isValid: false, 
      error: 'Base64 must include data URL prefix (data:image/png;base64, or data:image/jpeg;base64,)' 
    };
  }

  const [, mimeType, actualBase64] = dataUrlMatch;
  
  // Validate base64 content
  try {
    // Check if it's valid base64
    const decoded = atob(actualBase64);
    
    // Check minimum size (should be at least a few hundred bytes for a real image)
    if (decoded.length < 100) {
      return { isValid: false, error: 'Base64 data appears to be truncated or too small' };
    }
    
    // Check maximum size (10MB limit)
    if (decoded.length > 10 * 1024 * 1024) {
      return { isValid: false, error: 'Base64 data exceeds 10MB limit' };
    }
    
    return { isValid: true, mimeType: `image/${mimeType}` };
  } catch (error) {
    return { isValid: false, error: 'Invalid base64 encoding' };
  }
}

function validateGenerationParams(prompt: string, settings: any): { isValid: boolean; error?: string } {
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return { isValid: false, error: 'Prompt is required and must be a non-empty string' };
  }

  if (prompt.trim().length < 3) {
    return { isValid: false, error: 'Prompt must be at least 3 characters long' };
  }

  if (prompt.trim().length > 1000) {
    return { isValid: false, error: 'Prompt cannot exceed 1000 characters' };
  }

  if (settings?.steps && (typeof settings.steps !== 'number' || settings.steps < 1 || settings.steps > 100)) {
    return { isValid: false, error: 'Steps must be a number between 1 and 100' };
  }

  if (settings?.size && typeof settings.size === 'string') {
    const sizeMatch = settings.size.match(/^(\d+)x(\d+)$/);
    if (!sizeMatch) {
      return { isValid: false, error: 'Size must be in format WIDTHxHEIGHT (e.g., 1024x1024)' };
    }
    const [, width, height] = sizeMatch.map(Number);
    if (width < 64 || height < 64 || width > 2048 || height > 2048) {
      return { isValid: false, error: 'Image dimensions must be between 64x64 and 2048x2048' };
    }
  }

  return { isValid: true };
}

async function makeAPICall(url: string, options: RequestInit, timeout = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
}

// ============================================================================
// Authentication Routes
// ============================================================================

// Get OAuth redirect URL
app.get('/api/oauth/google/redirect_url', async (c) => {
  try {
    const redirectUrl = await getOAuthRedirectUrl('google', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    return c.json({ redirectUrl }, 200);
  } catch (error) {
    console.error('Error getting OAuth redirect URL:', error);
    return c.json({ error: 'Failed to get redirect URL' }, 500);
  }
});

// Exchange code for session token
app.post("/api/sessions", async (c) => {
  try {
    let body;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return c.json({ error: "Invalid JSON in request body" }, 400);
    }

    if (!body || !body.code) {
      return c.json({ error: "No authorization code provided" }, 400);
    }

    try {
      const sessionToken = await exchangeCodeForSessionToken(body.code, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });

      setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
        httpOnly: true,
        path: "/",
        sameSite: "none",
        secure: true,
        maxAge: 60 * 24 * 60 * 60, // 60 days
      });

      return c.json({ success: true }, 200);
    } catch (authError) {
      console.error('Authentication error:', authError);
      const errorMessage = authError instanceof Error ? authError.message : 'Unknown authentication error';
      return c.json({ error: 'Authentication failed', details: errorMessage }, 401);
    }
  } catch (error) {
    console.error('Unexpected error in session creation:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get current user and ensure they exist in our database
app.get("/api/users/me", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    // Check if user exists in our database, create if not
    let user = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!user) {
      // Create user in our database
      const result = await c.env.DB.prepare(`
        INSERT INTO users (mocha_user_id, email, name, picture_url, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'visitor', datetime('now'), datetime('now'))
      `).bind(
        mochaUser.id,
        mochaUser.email,
        mochaUser.google_user_data.name || null,
        mochaUser.google_user_data.picture || null
      ).run();

      user = await c.env.DB.prepare(
        "SELECT * FROM users WHERE id = ?"
      ).bind(result.meta.last_row_id).first();
    } else {
      // Update user info from Mocha Users Service
      await c.env.DB.prepare(`
        UPDATE users 
        SET email = ?, name = ?, picture_url = ?, updated_at = datetime('now')
        WHERE mocha_user_id = ?
      `).bind(
        mochaUser.email,
        mochaUser.google_user_data.name || null,
        mochaUser.google_user_data.picture || null,
        mochaUser.id
      ).run();
    }

    return c.json({ ...mochaUser, local_user: user });
  } catch (error) {
    console.error('Error getting current user:', error);
    return c.json({ error: 'Failed to get user' }, 500);
  }
});

// Logout
app.get('/api/logout', async (c) => {
  try {
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

    if (typeof sessionToken === 'string') {
      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    }

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 0,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Error logging out:', error);
    return c.json({ error: 'Failed to logout' }, 500);
  }
});

// ============================================================================
// Image Routes
// ============================================================================

// Get images with search/filter
app.get('/api/images', async (c) => {
  try {
    // Set comprehensive cache-busting headers for image listings to ensure fresh data
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('Surrogate-Control', 'no-store');
    
    // Parse query parameters manually to avoid validation issues
    const url = new URL(c.req.url);
    const q = url.searchParams.get('q') || '';
    const album_id = url.searchParams.get('album_id') ? parseInt(url.searchParams.get('album_id')!) : null;
    const tags = url.searchParams.get('tags') || '';
    const uploaded_by = url.searchParams.get('uploaded_by') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0'), 0);
    
    // Advanced search parameters
    const title_search = url.searchParams.get('title_search') || '';
    const caption_search = url.searchParams.get('caption_search') || '';
    const date_range = url.searchParams.get('date_range') || '';
    const camera_make = url.searchParams.get('camera_make') || '';
    const camera_model = url.searchParams.get('camera_model') || '';
    const lens = url.searchParams.get('lens') || '';
    const aperture = url.searchParams.get('aperture') || '';
    const shutter_speed = url.searchParams.get('shutter_speed') || '';
    const iso = url.searchParams.get('iso') || '';
    const focal_length = url.searchParams.get('focal_length') || '';
    const license = url.searchParams.get('license') || '';
    const attribution = url.searchParams.get('attribution') || '';
    const min_width = url.searchParams.get('min_width') || '';
    const min_height = url.searchParams.get('min_height') || '';
    const aspect_ratio = url.searchParams.get('aspect_ratio') || '';
    const is_ai_generated = url.searchParams.get('is_ai_generated') || '';

    let query = `
      SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
      WHERE i.privacy = 'public'
    `;
    const params: any[] = [];

    if (q) {
      query += " AND (i.title LIKE ? OR i.caption LIKE ? OR i.alt_text LIKE ?)";
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    // Advanced search filters
    if (title_search) {
      query += " AND i.title LIKE ?";
      params.push(`%${title_search}%`);
    }

    if (caption_search) {
      query += " AND i.caption LIKE ?";
      params.push(`%${caption_search}%`);
    }

    if (date_range) {
      const [start, end] = date_range.split(',');
      if (start) {
        query += " AND i.created_at >= ?";
        params.push(start + ' 00:00:00');
      }
      if (end) {
        query += " AND i.created_at <= ?";
        params.push(end + ' 23:59:59');
      }
    }

    if (license) {
      query += " AND i.license = ?";
      params.push(license);
    }

    if (attribution) {
      query += " AND i.attribution LIKE ?";
      params.push(`%${attribution}%`);
    }

    if (min_width) {
      query += " AND i.width >= ?";
      params.push(parseInt(min_width));
    }

    if (min_height) {
      query += " AND i.height >= ?";
      params.push(parseInt(min_height));
    }

    if (aspect_ratio && aspect_ratio !== '') {
      const [w, h] = aspect_ratio.split(':').map(n => parseInt(n));
      if (w && h) {
        const ratio = w / h;
        query += " AND ABS((CAST(i.width AS FLOAT) / CAST(i.height AS FLOAT)) - ?) < 0.1";
        params.push(ratio);
      }
    }

    if (is_ai_generated === 'true') {
      query += " AND i.is_ai_generated = 1";
    } else if (is_ai_generated === 'false') {
      query += " AND i.is_ai_generated = 0";
    }

    // EXIF metadata filters (stored as JSON)
    if (camera_make || camera_model || lens || aperture || shutter_speed || iso || focal_length) {
      if (camera_make) {
        query += " AND (i.exif_data LIKE ? OR i.exif_data LIKE ?)";
        params.push(`%"Make":"${camera_make}"%`, `%"make":"${camera_make}"%`);
      }
      if (camera_model) {
        query += " AND (i.exif_data LIKE ? OR i.exif_data LIKE ?)";
        params.push(`%"Model":"${camera_model}"%`, `%"model":"${camera_model}"%`);
      }
      if (lens) {
        query += " AND (i.exif_data LIKE ? OR i.exif_data LIKE ?)";
        params.push(`%"LensModel":"${lens}"%`, `%"lens":"${lens}"%`);
      }
      if (aperture) {
        query += " AND i.exif_data LIKE ?";
        params.push(`%"FNumber":"${aperture}"%`);
      }
      if (shutter_speed) {
        query += " AND i.exif_data LIKE ?";
        params.push(`%"ExposureTime":"${shutter_speed}"%`);
      }
      if (iso) {
        query += " AND i.exif_data LIKE ?";
        params.push(`%"ISO":"${iso}"%`);
      }
      if (focal_length) {
        query += " AND i.exif_data LIKE ?";
        params.push(`%"FocalLength":"${focal_length}"%`);
      }
    }

    if (album_id) {
      query += " AND i.id IN (SELECT image_id FROM album_images WHERE album_id = ?)";
      params.push(album_id);
    }

    if (uploaded_by) {
      query += " AND i.uploaded_by = ?";
      params.push(uploaded_by);
    }

    if (tags) {
      const tagNames = tags.split(',').map((t: string) => t.trim()).filter((t: string) => t);
      if (tagNames.length > 0) {
        query += ` AND i.id IN (
          SELECT it.image_id FROM image_tags it
          JOIN tags t ON it.tag_id = t.id
          WHERE t.name IN (${tagNames.map(() => '?').join(',')})
        )`;
        params.push(...tagNames);
      }
    }

    query += " ORDER BY i.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const { results } = await c.env.DB.prepare(query).bind(...params).all();

    // Add tags and Cloudinary URLs to each image
    const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
    for (const image of results) {
      const { results: imageTags } = await c.env.DB.prepare(`
        SELECT t.* FROM tags t
        JOIN image_tags it ON t.id = it.tag_id
        WHERE it.image_id = ?
      `).bind(image.id).all();
      
      // Add Cloudinary URLs for client-side use
      const imageObj = image as any;
      const publicId = String(imageObj.filename);
      imageObj.tags = imageTags;
      imageObj.cloudinary_url = imageObj.storage_path; // This is the full secure_url
      imageObj.thumbnail_url = buildCloudinaryUrl(cloudName, publicId, 'w_400,h_400,c_fill,q_auto,f_auto');
      imageObj.download_url = buildCloudinaryUrl(cloudName, publicId, 'fl_attachment');
    }

    return c.json({ images: results, limit, offset });
  } catch (error) {
    console.error('Error fetching images:', error);
    return c.json({ error: 'Failed to fetch images' }, 500);
  }
});

// Get single image
app.get('/api/images/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const image = await c.env.DB.prepare(`
      SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
      WHERE i.id = ? OR i.uuid = ?
    `).bind(id, id).first();

    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }

    // Check privacy permissions
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
    let currentUser = null;
    
    if (sessionToken) {
      try {
        currentUser = await getCurrentUser(sessionToken, {
          apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
          apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
        });
      } catch (e) {
        // Ignore auth errors
      }
    }

    if (image.privacy !== 'public' && (!currentUser || currentUser.id !== image.uploaded_by)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Increment view count
    await c.env.DB.prepare("UPDATE images SET view_count = view_count + 1 WHERE id = ?")
      .bind(image.id).run();

    // Get tags
    const { results: tags } = await c.env.DB.prepare(`
      SELECT t.* FROM tags t
      JOIN image_tags it ON t.id = it.tag_id
      WHERE it.image_id = ?
    `).bind(image.id).all();

    // Add Cloudinary URLs
    const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
    const publicId = String(image.filename);
    
    const imageWithUrls = {
      ...image,
      tags,
      cloudinary_url: image.storage_path, // This is the full secure_url
      thumbnail_url: buildCloudinaryUrl(cloudName, publicId, 'w_400,h_400,c_fill,q_auto,f_auto'),
      download_url: buildCloudinaryUrl(cloudName, publicId, 'fl_attachment')
    };

    return c.json(imageWithUrls);
  } catch (error) {
    console.error('Error fetching image:', error);
    return c.json({ error: 'Failed to fetch image' }, 500);
  }
});

// Get album details
app.get('/api/albums/:id', async (c) => {
  try {
    const id = c.req.param('id');
    
    const album = await c.env.DB.prepare(`
      SELECT a.*, u.name as creator_name, u.picture_url as creator_picture
      FROM albums a
      LEFT JOIN users u ON a.created_by = u.mocha_user_id
      WHERE a.id = ? OR a.uuid = ?
    `).bind(id, id).first();

    if (!album) {
      return c.json({ error: 'Album not found' }, 404);
    }

    // Check privacy permissions
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
    let currentUser = null;
    
    if (sessionToken) {
      try {
        currentUser = await getCurrentUser(sessionToken, {
          apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
          apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
        });
      } catch (e) {
        // Ignore auth errors
      }
    }

    if (album.privacy !== 'public' && (!currentUser || currentUser.id !== album.created_by)) {
      return c.json({ error: 'Access denied' }, 403);
    }

    return c.json(album);
  } catch (error) {
    console.error('Error fetching album:', error);
    return c.json({ error: 'Failed to fetch album' }, 500);
  }
});

// Delete single image
app.delete('/api/images/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    // Check if image exists and user has permission
    const image = await c.env.DB.prepare("SELECT * FROM images WHERE id = ? OR uuid = ?")
      .bind(id, id).first();

    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }

    const userRecord = await c.env.DB.prepare("SELECT role FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    if (image.uploaded_by !== user?.id && userRecord?.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Delete related records first
    await c.env.DB.prepare("DELETE FROM image_tags WHERE image_id = ?").bind(image.id).run();
    await c.env.DB.prepare("DELETE FROM album_images WHERE image_id = ?").bind(image.id).run();
    await c.env.DB.prepare("DELETE FROM likes WHERE image_id = ?").bind(image.id).run();
    await c.env.DB.prepare("DELETE FROM comments WHERE image_id = ?").bind(image.id).run();

    // Delete the image
    await c.env.DB.prepare("DELETE FROM images WHERE id = ?").bind(image.id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting image:', error);
    return c.json({ error: 'Failed to delete image' }, 500);
  }
});

// Update image metadata
app.put('/api/images/:id', authMiddleware, zValidator('json', UpdateImageSchema), async (c) => {
  try {
    const id = c.req.param('id');
    const data = c.req.valid('json');
    const user = c.get('user');

    // Check if image exists and user has permission
    const image = await c.env.DB.prepare("SELECT * FROM images WHERE id = ? OR uuid = ?")
      .bind(id, id).first();

    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }

    if (image.uploaded_by !== user?.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Update image
    const updates = [];
    const params = [];
    
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = ?`);
        params.push(value);
      }
    });

    if (updates.length > 0) {
      updates.push('updated_at = datetime("now")');
      params.push(image.id);

      await c.env.DB.prepare(`
        UPDATE images SET ${updates.join(', ')} WHERE id = ?
      `).bind(...params).run();
    }

    const updatedImage = await c.env.DB.prepare("SELECT * FROM images WHERE id = ?")
      .bind(image.id).first();

    return c.json(updatedImage);
  } catch (error) {
    console.error('Error updating image:', error);
    return c.json({ error: 'Failed to update image' }, 500);
  }
});

// Upload images via Cloudinary API
app.post('/api/images/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const caption = formData.get('caption') as string;
    const alt_text = formData.get('alt_text') as string;
    const privacy = formData.get('privacy') as string || 'public';
    const tagsJson = formData.get('tags') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ error: 'Only image files are allowed' }, 400);
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // Parse tags
    let tags: string[] = [];
    try {
      tags = tagsJson ? JSON.parse(tagsJson) : [];
    } catch (e) {
      tags = [];
    }

    // Generate unique identifiers
    const uuid = crypto.randomUUID();
    const originalFilename = file.name;
    
    try {
      // Create FormData for Cloudinary upload
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('upload_preset', c.env.CLOUDINARY_UPLOAD_PRESET);
      cloudinaryFormData.append('public_id', `pixelvault/${uuid}`);
      cloudinaryFormData.append('folder', 'pixelvault');
      if (tags.length > 0) {
        cloudinaryFormData.append('tags', ['pixelvault', ...tags].join(','));
      } else {
        cloudinaryFormData.append('tags', 'pixelvault');
      }
      
      // Upload to Cloudinary via API
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Cloudinary upload failed:', errorText);
        return c.json({ error: 'Failed to upload to Cloudinary' }, 500);
      }

      const uploadResult = await uploadResponse.json() as any;
      console.log('File uploaded to Cloudinary:', uploadResult.public_id);

      // Store Cloudinary URLs and metadata
      const result = await c.env.DB.prepare(`
        INSERT INTO images (
          uuid, filename, original_filename, storage_path, title, caption, alt_text,
          mime_type, width, height, size_bytes, uploaded_by, privacy,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        uuid,
        uploadResult.public_id, // Store Cloudinary public_id as filename
        originalFilename,
        uploadResult.secure_url, // Store full Cloudinary URL
        title || originalFilename,
        caption || null,
        alt_text || null,
        uploadResult.format ? `image/${uploadResult.format}` : file.type,
        uploadResult.width || null,
        uploadResult.height || null,
        uploadResult.bytes || file.size,
        user.id,
        privacy
      ).run();

      const imageId = result.meta.last_row_id;

      // Handle tags
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          if (!tagName.trim()) continue;

          // Get or create tag
          let tag = await c.env.DB.prepare("SELECT * FROM tags WHERE name = ?")
            .bind(tagName.trim().toLowerCase()).first();

          if (!tag) {
            const tagResult = await c.env.DB.prepare(`
              INSERT INTO tags (name, created_at) VALUES (?, datetime('now'))
            `).bind(tagName.trim().toLowerCase()).run();
            
            tag = await c.env.DB.prepare("SELECT * FROM tags WHERE id = ?")
              .bind(tagResult.meta.last_row_id).first();
          }

          // Link tag to image
          if (tag) {
            await c.env.DB.prepare(`
              INSERT INTO image_tags (image_id, tag_id, created_at) 
              VALUES (?, ?, datetime('now'))
            `).bind(imageId, tag.id).run();
          }
        }
      }

      // Get the created image with tags and add Cloudinary URLs
      const image = await c.env.DB.prepare(`
        SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
        FROM images i
        LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
        WHERE i.id = ?
      `).bind(imageId).first();

      // Get tags
      const { results: imageTags } = await c.env.DB.prepare(`
        SELECT t.* FROM tags t
        JOIN image_tags it ON t.id = it.tag_id
        WHERE it.image_id = ?
      `).bind(imageId).all();

      // Add Cloudinary URLs to the response
      const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
      const publicId = uploadResult.public_id;
      
      const imageWithUrls = {
        ...image,
        tags: imageTags,
        cloudinary_url: uploadResult.secure_url,
        thumbnail_url: `https://res.cloudinary.com/${cloudName}/image/upload/w_400,h_400,c_fill,q_auto,f_auto/${publicId}`,
        download_url: `https://res.cloudinary.com/${cloudName}/image/upload/fl_attachment/${publicId}`
      };

      return c.json({ 
        success: true, 
        image: imageWithUrls
      }, 201);
    } catch (uploadError) {
      console.error('Upload failed:', uploadError);
      return c.json({ error: `Failed to upload file: ${uploadError}` }, 500);
    }
  } catch (error) {
    console.error('Error uploading image:', error);
    return c.json({ error: 'Failed to upload image' }, 500);
  }
});

// ============================================================================
// Helper function to build Cloudinary URLs
// ============================================================================

function buildCloudinaryUrl(cloudName: string, publicId: string, transformation = '') {
  if (!publicId) return null;
  
  // Handle different public_id formats
  let formattedPublicId = publicId;
  if (!publicId.startsWith('pixelvault/') && !publicId.includes('.')) {
    formattedPublicId = `pixelvault/${publicId}`;
  }
  
  const baseUrl = `https://res.cloudinary.com/${cloudName}/image/upload`;
  return transformation ? `${baseUrl}/${transformation}/${formattedPublicId}` : `${baseUrl}/${formattedPublicId}`;
}

// ============================================================================
// AI Image Generation Routes
// ============================================================================

// Generate image with AI - main endpoint with fallback strategy
app.post('/api/ai/generate-image', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      console.error('❌ [AI-GEN] No authenticated user found');
      return c.json({ error: 'Authentication required' }, 401);
    }

    console.log('🎨 [AI-GEN] Starting AI image generation request:', {
      userId: user.id,
      userEmail: user.email,
      timestamp: new Date().toISOString()
    });

    let body;
    try {
      body = await c.req.json();
    } catch (jsonError) {
      console.error('❌ [AI-GEN] Failed to parse request JSON:', jsonError);
      return c.json({ error: 'Invalid JSON in request body' }, 400);
    }

    const { prompt, settings } = body;
    
    console.log('📝 [AI-GEN] Request details:', {
      hasPrompt: !!prompt,
      promptLength: prompt?.length || 0,
      settings: settings ? Object.keys(settings) : [],
      provider: settings?.provider || 'not-specified'
    });

    // Validate input parameters
    const validation = validateGenerationParams(prompt, settings);
    if (!validation.isValid) {
      return c.json({ error: validation.error }, 400);
    }

    // Default to horde since that's the main provider now
    const provider = settings?.provider || 'horde';
    console.log(`🎨 [AI-GEN] Generating image with provider: ${provider}, prompt: ${prompt.slice(0, 100)}...`);

    // Provider strategy with fallbacks
    const providers = [provider];
    
    // Add fallbacks based on primary provider
    if (provider === 'ai-horde' || provider === 'horde') {
      providers.push('gemini', 'huggingface', 'kobold');
    } else if (provider === 'gemini') {
      providers.push('horde', 'huggingface', 'kobold');
    } else if (provider === 'huggingface') {
      providers.push('gemini', 'horde', 'kobold');
    } else if (provider === 'kobold') {
      providers.push('gemini', 'huggingface', 'horde');
    } else if (provider === 'openai') {
      providers.push('gemini', 'huggingface', 'kobold');
    }

    let lastError: Error | null = null;
    
    for (const currentProvider of providers) {
      try {
        console.log(`Attempting generation with provider: ${currentProvider}`);
        
        switch (currentProvider) {
          case 'ai-horde':
          case 'horde': // Support both names for compatibility
            return await generateWithAIHorde(c, prompt, settings);
          case 'gemini':
            return await generateWithGemini(c, prompt, settings);
          case 'huggingface':
            return await generateWithHuggingFace(c, prompt, settings);
          case 'openai':
            return await generateWithOpenAI(c, prompt, settings);
          case 'kobold':
            return await generateWithKobold(c, prompt, settings);
          default:
            console.error(`❌ [AI-GEN] Unknown provider: ${currentProvider}`);
            throw new Error(`Unknown provider: ${currentProvider}`);
        }
      } catch (error) {
        console.error(`Provider ${currentProvider} failed:`, error);
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // Check if it's a client error that shouldn't be retried
        if (error instanceof Error) {
          const message = error.message.toLowerCase();
          if (message.includes('invalid') || message.includes('bad request') || 
              message.includes('unauthorized') || message.includes('forbidden')) {
            // Don't try other providers for client errors unless it's rate limiting
            if (!message.includes('rate limit') && !message.includes('quota')) {
              break;
            }
          }
        }
        
        // Continue to next provider
        continue;
      }
    }

    // All providers failed
    const errorMessage = lastError ? lastError.message : 'All AI providers failed';
    console.error('All AI generation providers failed:', errorMessage);
    
    return c.json({ 
      error: 'AI image generation failed', 
      details: errorMessage,
      providers_attempted: providers 
    }, 500);
    
  } catch (error) {
    console.error('Error in AI image generation endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ error: 'Image generation failed', details: errorMessage }, 500);
  }
});

// Generate image using OpenAI DALL-E
async function generateWithOpenAI(c: any, prompt: string, settings: any): Promise<Response> {
  if (!c.env.OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  return await withRetry(async () => {
    const requestBody = {
      model: settings?.model || 'dall-e-3',
      prompt: prompt.trim(),
      n: 1,
      size: settings?.size || '1024x1024',
      quality: settings?.quality || 'standard',
      style: settings?.style || 'vivid',
    };

    console.log('OpenAI API request:', requestBody);

    const response = await makeAPICall('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('OpenAI response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error response:', errorText);
      
      // Parse OpenAI error response
      let errorMessage = `OpenAI API error (status: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (parseError) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as any;
    console.log('OpenAI generation successful');
    
    if (!result.data || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error('No image data returned from OpenAI');
    }

    const imageUrl = result.data[0].url;
    if (!imageUrl) {
      throw new Error('No image URL in OpenAI response');
    }

    // Download and upload to Cloudinary
    const imageResponse = await makeAPICall(imageUrl, { method: 'GET' });
    if (!imageResponse.ok) {
      throw new Error('Failed to download generated image from OpenAI');
    }
    
    const imageBlob = await imageResponse.blob();
    const cloudinaryResult = await uploadToCloudinary(c, imageBlob) as any;

    return c.json({
      success: true,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      metadata: {
        prompt,
        model: settings?.model || 'dall-e-3',
        provider: 'openai',
        settings,
        generatedAt: new Date().toISOString()
      }
    });
  });
}

// Generate image using Google Gemini
async function generateWithGemini(c: any, prompt: string, settings: any): Promise<Response> {
  if (!c.env.GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  return await withRetry(async () => {
    const model = settings?.model || 'imagen-3.0-fast-001';
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateImage?key=${c.env.GEMINI_API_KEY}`;
    
    const requestBody = {
      prompt: prompt.trim(),
      generationConfig: {
        sampleCount: 1,
        ...(settings?.negativePrompt && { negativePrompt: settings.negativePrompt }),
      }
    };

    console.log('Gemini API request:', requestBody);

    const response = await makeAPICall(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    console.log('Gemini response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error response:', errorText);
      
      let errorMessage = `Gemini API error (status: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        }
      } catch (parseError) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as any;
    console.log('Gemini generation successful');
    
    if (!result.candidates || !Array.isArray(result.candidates) || result.candidates.length === 0) {
      throw new Error('No image candidates returned from Gemini');
    }

    const candidate = result.candidates[0];
    if (!candidate.image || !candidate.image.generatedImage) {
      throw new Error('No image data in Gemini response');
    }

    // Validate and convert base64
    const base64Data = candidate.image.generatedImage;
    const base64WithPrefix = `data:image/png;base64,${base64Data}`;
    const validation = validateBase64Image(base64WithPrefix);
    
    if (!validation.isValid) {
      throw new Error(`Invalid image data from Gemini: ${validation.error}`);
    }

    // Convert to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const imageBlob = new Blob([byteArray], { type: validation.mimeType });

    console.log('Created image blob, size:', imageBlob.size);

    const cloudinaryResult = await uploadToCloudinary(c, imageBlob) as any;

    return c.json({
      success: true,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      metadata: {
        prompt,
        model,
        provider: 'gemini',
        settings,
        generatedAt: new Date().toISOString()
      }
    });
  });
}

// Generate image using Hugging Face Inference API
async function generateWithHuggingFace(c: any, prompt: string, settings: any): Promise<Response> {
  if (!c.env.HUGGING_FACE_API_KEY) {
    throw new Error('Hugging Face API key not configured');
  }

  return await withRetry(async () => {
    const modelName = settings?.hfModel || 'black-forest-labs/FLUX.1-schnell';
    const modelEndpoint = `https://api-inference.huggingface.co/models/${modelName}`;

    // Prepare the request payload based on model type
    let requestBody: any = {
      inputs: prompt.trim(),
    };

    // Add parameters for Stable Diffusion models
    if (modelName.includes('stable-diffusion') || modelName.includes('flux') || modelName.includes('FLUX')) {
      requestBody.parameters = {
        negative_prompt: settings?.negativePrompt || '',
        num_inference_steps: Math.min(settings?.steps || 20, 30),
        guidance_scale: settings?.guidance || 7.5,
      };
      
      // Only add dimensions for models that support them
      if (!modelName.includes('FLUX.1-schnell')) {
        requestBody.parameters.width = parseInt(settings?.size?.split('x')[0] || '512');
        requestBody.parameters.height = parseInt(settings?.size?.split('x')[1] || '512');
      }
    }

    console.log('HuggingFace API request:', { endpoint: modelEndpoint, body: requestBody });

    const response = await makeAPICall(modelEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.HUGGING_FACE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    }, 60000); // Longer timeout for HF

    console.log('HuggingFace response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Hugging Face API error response:', errorText);
      
      let errorMessage = `Hugging Face API error (status: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.error) {
          errorMessage = errorJson.error;
        } else if (errorJson.estimated_time) {
          errorMessage = `Model is still loading. Estimated time: ${errorJson.estimated_time} seconds`;
        }
      } catch (parseError) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    // HF returns raw image bytes
    const imageBlob = await response.blob();
    console.log('HuggingFace image blob size:', imageBlob.size, 'type:', imageBlob.type);

    // Verify we got an image
    if (imageBlob.size === 0) {
      throw new Error('Empty response from Hugging Face');
    }

    if (!imageBlob.type.startsWith('image/')) {
      // Try to parse as JSON to get error message
      try {
        const errorText = await imageBlob.text();
        const errorJson = JSON.parse(errorText);
        
        if (errorJson.error) {
          throw new Error(errorJson.error);
        } else if (errorJson.estimated_time) {
          throw new Error(`Model is still loading. Estimated time: ${errorJson.estimated_time} seconds`);
        }
        
        throw new Error('Invalid response from Hugging Face');
      } catch (parseError) {
        if (parseError instanceof Error && parseError.message.includes('estimated_time')) {
          throw parseError;
        }
        throw new Error('Invalid image response from Hugging Face');
      }
    }

    const cloudinaryResult = await uploadToCloudinary(c, imageBlob) as any;

    return c.json({
      success: true,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      metadata: {
        prompt,
        model: modelName,
        provider: 'huggingface',
        settings,
        generatedAt: new Date().toISOString()
      }
    });
  });
}

// Generate image using AI Horde (Stable Horde) with rate limiting fixes
async function generateWithAIHorde(c: any, prompt: string, settings: any): Promise<Response> {
  const apiKey = c.env.AI_HORDE_API_KEY || '0000000000';
  
  if (!apiKey || apiKey === '0000000000') {
    console.warn('Using default AI Horde API key - consider registering for better priority');
  }

  return await withRetry(async () => {
    // Prepare AI Horde parameters
    const hordeParams: any = {
      prompt: prompt.trim(),
      params: {
        width: Math.min(parseInt(settings?.size?.split('x')[0] || '512'), 1024),
        height: Math.min(parseInt(settings?.size?.split('x')[1] || '512'), 1024),
        steps: Math.min(settings?.steps || 20, 50),
        cfg_scale: settings?.guidance || 7.5,
        sampler_name: settings?.sampler || 'k_euler',
        models: settings?.hordeModels && settings.hordeModels.length > 0 ? settings.hordeModels : ['stable_diffusion']
      },
      nsfw: false,
      censor_nsfw: true,
      r2: true,
      shared: true
    };

    if (settings?.negativePrompt && settings.negativePrompt.trim()) {
      hordeParams.params.negative_prompt = settings.negativePrompt.trim();
    }

    console.log('AI Horde submit request:', hordeParams);

    // Submit generation request
    const response = await makeAPICall('https://aihorde.net/api/v2/generate/async', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/json',
        'Client-Agent': 'PixelVault:1.0:admin@pixelvault.app'
      },
      body: JSON.stringify(hordeParams),
    });

    console.log('AI Horde submit response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Horde submit error response:', errorText);
      
      let errorMessage = `AI Horde API error (status: ${response.status})`;
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (parseError) {
        errorMessage = errorText || errorMessage;
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as any;
    console.log('AI Horde submit result:', result);
    
    const jobId = result.id;
    if (!jobId) {
      throw new Error('No job ID returned from AI Horde');
    }

    // Return job ID for polling
    return c.json({
      success: true,
      jobId: jobId,
      provider: 'ai-horde',
      metadata: {
        prompt,
        provider: 'ai-horde',
        settings,
        generatedAt: new Date().toISOString(),
        kudosCost: result.kudos || 0,
        queuePosition: result.queue_position || 0
      }
    });
  }, {
    maxRetries: 2, // Fewer retries for AI Horde to avoid rate limits
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 2,
  });
}

// Generate image using KoboldCpp/KoboldAI
async function generateWithKobold(c: any, prompt: string, settings: any): Promise<Response> {
  if (!c.env.KOBOLD_API_URL) {
    throw new Error('KoboldCpp API URL not configured');
  }

  return await withRetry(async () => {
    const baseUrl = c.env.KOBOLD_API_URL.replace(/\/$/, ''); // Remove trailing slash
    
    // First, check if KoboldCpp supports image generation by checking available endpoints
    let endpoint = `${baseUrl}/api/v1/generate`;
    let isImageGenerationSupported = false;
    
    // Try to detect if this is a KoboldCpp instance with image generation capability
    try {
      const versionResponse = await makeAPICall(`${baseUrl}/api/v1/model`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      }, 5000);
      
      if (versionResponse.ok) {
        const modelInfo = await versionResponse.json() as any;
        console.log('KoboldCpp model info:', modelInfo);
        
        // Check if the model supports image generation
        // Some newer KoboldCpp builds support multimodal models
        if (modelInfo.result && (
          modelInfo.result.includes('vision') || 
          modelInfo.result.includes('image') ||
          modelInfo.result.includes('multimodal') ||
          modelInfo.result.includes('sd') ||
          modelInfo.result.includes('diffusion')
        )) {
          isImageGenerationSupported = true;
        }
      }
    } catch (versionError) {
      console.log('Could not detect KoboldCpp image generation capability:', versionError);
    }

    // Try OpenAI-compatible endpoint first (newer KoboldCpp versions)
    const openaiEndpoint = `${baseUrl}/v1/images/generations`;
    let useOpenAIFormat = false;
    
    try {
      const testResponse = await makeAPICall(openaiEndpoint, {
        method: 'OPTIONS',
        headers: { 'Content-Type': 'application/json' }
      }, 3000);
      
      if (testResponse.ok || testResponse.status === 405) { // Method not allowed is OK, means endpoint exists
        useOpenAIFormat = true;
        endpoint = openaiEndpoint;
        console.log('Using OpenAI-compatible endpoint for KoboldCpp');
      }
    } catch (testError) {
      console.log('OpenAI-compatible endpoint not available, using standard KoboldCpp format');
    }

    let requestBody: any;
    
    if (useOpenAIFormat) {
      // Use OpenAI-compatible format
      requestBody = {
        prompt: prompt.trim(),
        n: 1,
        size: settings?.size || '512x512',
        response_format: 'b64_json'
      };
    } else {
      // Use standard KoboldCpp text generation format
      // Some installations may have image generation plugins
      requestBody = {
        prompt: `Generate an image: ${prompt.trim()}`,
        max_context_length: 2048,
        max_length: 100,
        rep_pen: 1.1,
        temperature: 0.8,
        top_p: 0.9,
        top_k: 40,
        // Image-specific parameters for compatible versions
        image_prompt: prompt.trim(),
        width: parseInt(settings?.size?.split('x')[0] || '512'),
        height: parseInt(settings?.size?.split('x')[1] || '512'),
        steps: settings?.steps || 20,
        cfg_scale: settings?.guidance || 7.5,
        negative_prompt: settings?.negativePrompt || '',
        sampler_name: settings?.sampler || 'euler',
        batch_size: 1
      };
    }

    console.log('KoboldCpp API request:', { 
      endpoint, 
      useOpenAIFormat, 
      isImageGenerationSupported,
      promptLength: prompt.length 
    });

    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'PixelVault/1.0'
    };

    // Add API key if provided (some KoboldCpp instances may require it)
    if (c.env.KOBOLD_API_KEY && c.env.KOBOLD_API_KEY.trim() !== '') {
      headers['Authorization'] = `Bearer ${c.env.KOBOLD_API_KEY}`;
    }

    const response = await makeAPICall(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    }, 90000); // Longer timeout for local processing

    console.log('KoboldCpp response status:', response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('KoboldCpp API error response:', errorText);
      
      let errorMessage = `KoboldCpp API error (status: ${response.status})`;
      
      if (response.status === 404) {
        errorMessage = 'KoboldCpp endpoint not found. Please verify your KoboldCpp instance is running and supports image generation.';
      } else if (response.status === 503) {
        errorMessage = 'KoboldCpp service unavailable. Please check if your instance is running and not overloaded.';
      } else {
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.error) {
            errorMessage = errorJson.error;
          } else if (errorJson.detail) {
            errorMessage = errorJson.detail;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
      }
      
      throw new Error(errorMessage);
    }

    const result = await response.json() as any;
    console.log('KoboldCpp generation result received');

    // Handle different response formats
    let imageData: string | null = null;
    
    if (useOpenAIFormat && result.data && Array.isArray(result.data) && result.data.length > 0) {
      // OpenAI-compatible format
      const imageResult = result.data[0];
      if (imageResult.b64_json) {
        imageData = `data:image/png;base64,${imageResult.b64_json}`;
      } else if (imageResult.url) {
        // If URL is provided, download the image
        const imageResponse = await makeAPICall(imageResult.url, { method: 'GET' });
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob();
          const cloudinaryResult = await uploadToCloudinary(c, imageBlob) as any;
          
          return c.json({
            success: true,
            imageUrl: cloudinaryResult.secure_url,
            publicId: cloudinaryResult.public_id,
            metadata: {
              prompt,
              model: 'koboldcpp-openai-compatible',
              provider: 'kobold',
              settings,
              generatedAt: new Date().toISOString()
            }
          });
        }
      }
    } else if (result.results && Array.isArray(result.results) && result.results.length > 0) {
      // Standard KoboldCpp text response format
      const resultText = result.results[0].text;
      
      // Look for base64 image data in the response
      const base64Match = resultText.match(/data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)/);
      if (base64Match) {
        imageData = base64Match[0];
      } else {
        // If no image data found in text generation response
        throw new Error(`KoboldCpp returned text response instead of image. This instance may not support image generation. Response: "${resultText.slice(0, 200)}..."`);
      }
    } else if (result.image) {
      // Direct image response format
      if (typeof result.image === 'string') {
        imageData = result.image.startsWith('data:') ? result.image : `data:image/png;base64,${result.image}`;
      }
    } else if (result.generated_image) {
      // Alternative image field name
      imageData = result.generated_image.startsWith('data:') ? result.generated_image : `data:image/png;base64,${result.generated_image}`;
    } else if (result.images && Array.isArray(result.images) && result.images.length > 0) {
      // Array of images format
      const firstImage = result.images[0];
      if (typeof firstImage === 'string') {
        imageData = firstImage.startsWith('data:') ? firstImage : `data:image/png;base64,${firstImage}`;
      }
    }

    if (!imageData) {
      console.error('No image data found in KoboldCpp response:', result);
      throw new Error('KoboldCpp instance does not support image generation or returned unexpected response format. Please ensure you are running KoboldCpp with a model that supports image generation, or use a different AI provider.');
    }

    // Validate and convert base64
    const validation = validateBase64Image(imageData);
    if (!validation.isValid) {
      throw new Error(`Invalid image data from KoboldCpp: ${validation.error}`);
    }

    // Extract base64 content
    const base64Match = imageData.match(/^data:image\/[^;]+;base64,(.+)$/);
    if (!base64Match) {
      throw new Error('Invalid base64 format from KoboldCpp');
    }

    const base64Data = base64Match[1];

    // Convert to blob
    const byteCharacters = atob(base64Data);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const imageBlob = new Blob([byteArray], { type: validation.mimeType });

    console.log('Created KoboldCpp image blob, size:', imageBlob.size);

    const cloudinaryResult = await uploadToCloudinary(c, imageBlob) as any;

    return c.json({
      success: true,
      imageUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      metadata: {
        prompt,
        model: settings?.koboldModel || 'koboldcpp-local',
        provider: 'kobold',
        settings,
        generatedAt: new Date().toISOString(),
        endpoint_used: useOpenAIFormat ? 'openai-compatible' : 'standard'
      }
    });
  }, {
    maxRetries: 1, // Fewer retries for local instances
    baseDelay: 5000,
    maxDelay: 20000,
    backoffFactor: 2,
  });
}

// Upload blob to Cloudinary with comprehensive debugging and validation
async function uploadToCloudinary(c: any, imageBlob: Blob): Promise<any> {
  console.log('🚀 [DEBUG] Starting Cloudinary upload process');
  console.log('🔍 [DEBUG] Input validation:', {
    blobExists: !!imageBlob,
    blobSize: imageBlob?.size || 0,
    blobType: imageBlob?.type || 'unknown'
  });

  if (!imageBlob || imageBlob.size === 0) {
    console.error('❌ [ERROR] Invalid image blob: empty or null');
    throw new Error('Invalid image blob: empty or null');
  }

  // Validate Cloudinary configuration
  const cloudConfig = {
    cloudName: c.env.CLOUDINARY_CLOUD_NAME,
    uploadPreset: c.env.CLOUDINARY_UPLOAD_PRESET,
    apiKey: c.env.CLOUDINARY_API_KEY ? '[PRESENT]' : '[MISSING]',
    apiSecret: c.env.CLOUDINARY_API_SECRET ? '[PRESENT]' : '[MISSING]'
  };
  
  console.log('🔧 [DEBUG] Cloudinary configuration:', cloudConfig);

  if (!c.env.CLOUDINARY_CLOUD_NAME || !c.env.CLOUDINARY_UPLOAD_PRESET) {
    console.error('❌ [ERROR] Cloudinary configuration missing:', cloudConfig);
    throw new Error('Cloudinary configuration missing: cloud_name or upload_preset');
  }

  console.log('📊 [DEBUG] Pre-upload validation:', {
    blobSize: imageBlob.size,
    blobType: imageBlob.type,
    sizeInMB: (imageBlob.size / 1024 / 1024).toFixed(2)
  });

  // Validate that it's an image blob
  if (!imageBlob.type.startsWith('image/') && imageBlob.type !== 'application/octet-stream') {
    console.error('❌ [ERROR] Invalid file type:', imageBlob.type);
    throw new Error(`Invalid file type for image upload: ${imageBlob.type}`);
  }

  // Size limits
  if (imageBlob.size > 10 * 1024 * 1024) {
    console.error('❌ [ERROR] Image too large:', {
      actualSize: imageBlob.size,
      maxSize: 10 * 1024 * 1024,
      actualSizeMB: (imageBlob.size / 1024 / 1024).toFixed(2)
    });
    throw new Error('Image too large for upload (max 10MB)');
  }

  return await withRetry(async () => {
    const publicId = `pixelvault/ai-generated-${crypto.randomUUID()}`;
    
    console.log('📤 [DEBUG] Preparing Cloudinary upload:', {
      publicId,
      uploadPreset: c.env.CLOUDINARY_UPLOAD_PRESET,
      folder: 'pixelvault',
      cloudName: c.env.CLOUDINARY_CLOUD_NAME
    });

    const formData = new FormData();
    formData.append('file', imageBlob, 'generated-image.png');
    formData.append('upload_preset', c.env.CLOUDINARY_UPLOAD_PRESET);
    formData.append('public_id', publicId);
    formData.append('folder', 'pixelvault');
    formData.append('tags', 'pixelvault,ai-generated');
    formData.append('resource_type', 'image');

    const uploadUrl = `https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/image/upload`;
    console.log('🌐 [DEBUG] Upload URL:', uploadUrl);

    const startTime = Date.now();
    const response = await makeAPICall(uploadUrl, {
      method: 'POST',
      body: formData,
    });
    const uploadDuration = Date.now() - startTime;

    console.log('📡 [DEBUG] Cloudinary response:', {
      status: response.status,
      statusText: response.statusText,
      uploadDurationMs: uploadDuration,
      contentType: response.headers.get('content-type')
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [ERROR] Cloudinary upload failed:', {
        status: response.status,
        statusText: response.statusText,
        responseText: errorText,
        uploadDurationMs: uploadDuration
      });
      
      let errorMessage = 'Failed to save generated image';
      let errorDetails = {};
      
      try {
        const errorJson = JSON.parse(errorText);
        console.error('❌ [ERROR] Cloudinary error JSON:', errorJson);
        
        errorDetails = {
          error: errorJson.error,
          message: errorJson.error?.message,
          http_code: errorJson.error?.http_code,
          api_key: errorJson.error?.api_key ? '[PRESENT]' : '[MISSING]'
        };
        
        if (errorJson.error && errorJson.error.message) {
          errorMessage = `Cloudinary error: ${errorJson.error.message}`;
          
          // Check for common issues
          if (errorJson.error.message.includes('upload preset')) {
            console.error('❌ [ERROR] Upload preset issue detected. Check preset configuration in Cloudinary dashboard.');
          }
          if (errorJson.error.message.includes('folder')) {
            console.error('❌ [ERROR] Folder restriction detected. Check upload preset folder settings.');
          }
          if (errorJson.error.message.includes('unauthorized')) {
            console.error('❌ [ERROR] Authentication issue. Check API credentials.');
          }
        }
      } catch (parseError) {
        console.error('❌ [ERROR] Failed to parse Cloudinary error response:', parseError);
        errorMessage = `Cloudinary error: ${response.status} ${errorText}`;
        errorDetails = { raw_response: errorText };
      }
      
      console.error('❌ [ERROR] Final error details:', errorDetails);
      throw new Error(errorMessage);
    }

    let result: any;
    try {
      result = await response.json();
    } catch (parseError) {
      console.error('❌ [ERROR] Failed to parse Cloudinary success response:', parseError);
      throw new Error('Invalid response from Cloudinary');
    }

    console.log('✅ [SUCCESS] Cloudinary upload response:', {
      public_id: result.public_id,
      secure_url: result.secure_url,
      resource_type: result.resource_type,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      uploadDurationMs: uploadDuration
    });

    // Validate required fields in response
    const requiredFields = ['secure_url', 'public_id', 'resource_type'];
    const missingFields = requiredFields.filter(field => !result[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ [ERROR] Missing required fields in Cloudinary response:', {
        missingFields,
        actualFields: Object.keys(result),
        fullResponse: result
      });
      throw new Error(`Cloudinary response missing required fields: ${missingFields.join(', ')}`);
    }

    // Validate secure_url format
    if (!result.secure_url.startsWith('https://res.cloudinary.com/')) {
      console.error('❌ [ERROR] Invalid secure_url format:', result.secure_url);
      throw new Error('Invalid secure_url format received from Cloudinary');
    }

    console.log('✅ [SUCCESS] Cloudinary upload validation passed:', {
      secure_url: result.secure_url,
      public_id: result.public_id,
      size_bytes: result.bytes,
      dimensions: `${result.width}x${result.height}`,
      format: result.format
    });
    
    return result;
  });
}

// Poll AI Horde job status with improved rate limiting
app.get('/api/ai/horde-status/:jobId', async (c) => {
  try {
    const jobId = c.req.param('jobId');
    
    if (!jobId || jobId.trim() === '') {
      return c.json({ error: 'Job ID is required' }, 400);
    }

    const apiKey = c.env.AI_HORDE_API_KEY || '0000000000';

    console.log('Checking AI Horde status for job:', jobId);

    // Use withRetry for status checks with conservative rate limiting
    const response = await withRetry(async () => {
      const resp = await makeAPICall(`https://aihorde.net/api/v2/generate/status/${jobId}`, {
        headers: {
          'apikey': apiKey,
          'Client-Agent': 'PixelVault:1.0:admin@pixelvault.app'
        },
      }, 15000); // Increased timeout

      if (!resp.ok) {
        const errorText = await resp.text();
        console.error('AI Horde status error response:', errorText);
        
        let errorMessage = `AI Horde status error (status: ${resp.status})`;
        try {
          const errorJson = JSON.parse(errorText);
          if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch (parseError) {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      return resp;
    }, {
      maxRetries: 1, // Reduce retries to avoid rate limits
      baseDelay: 5000, // Much longer delay for rate limiting
      maxDelay: 10000,
      backoffFactor: 2,
    });

    const statusResult = await response.json() as any;
    console.log('AI Horde status result for job', jobId, ':', {
      done: statusResult.done,
      finished: statusResult.finished,
      processing: statusResult.processing,
      waiting: statusResult.waiting,
      queue_position: statusResult.queue_position,
      faulted: statusResult.faulted,
      generations_count: statusResult.generations?.length || 0
    });

    // If generation is complete and we have images
    if (statusResult.done && statusResult.generations && statusResult.generations.length > 0) {
      const generation = statusResult.generations[0];
      console.log('Generation complete, processing image. Generation data:', {
        id: generation.id || 'no-id',
        model: generation.model || 'no-model',
        worker_id: generation.worker_id || 'no-worker',
        worker_name: generation.worker_name || 'no-worker-name',
        state: generation.state || 'no-state',
        img_length: generation.img ? generation.img.length : 0,
        seed: generation.seed || 'no-seed'
      });
      
      if (!generation.img) {
        console.error('No image data in generation:', generation);
        return c.json({ 
          success: false,
          error: 'No image data in completed generation',
          generation_info: {
            state: generation.state,
            model: generation.model,
            worker_name: generation.worker_name
          }
        }, 500);
      }

      try {
        let imageBlob: Blob;
        
        // Check if img is a URL or base64 data
        if (generation.img.startsWith('http://') || generation.img.startsWith('https://')) {
          // It's a URL - download the image
          console.log('Downloading image from AI Horde URL:', generation.img);
          
          const imageResponse = await makeAPICall(generation.img, { 
            method: 'GET',
            headers: {
              'User-Agent': 'PixelVault/1.0'
            }
          }, 30000);
          
          if (!imageResponse.ok) {
            throw new Error(`Failed to download image from AI Horde: ${imageResponse.status} ${imageResponse.statusText}`);
          }
          
          imageBlob = await imageResponse.blob();
          console.log('Downloaded image blob from URL, size:', imageBlob.size, 'type:', imageBlob.type);
          
        } else {
          // It's base64 data
          console.log('Processing base64 image data, length:', generation.img.length);
          
          const base64WithPrefix = `data:image/webp;base64,${generation.img}`;
          const validation = validateBase64Image(base64WithPrefix);
          
          if (!validation.isValid) {
            console.error('Base64 validation failed:', validation.error);
            throw new Error(`Invalid image data from AI Horde: ${validation.error}`);
          }

          // Convert to blob
          const byteCharacters = atob(generation.img);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          imageBlob = new Blob([byteArray], { type: 'image/webp' });
          
          console.log('Created image blob from base64, size:', imageBlob.size, 'type:', imageBlob.type);
        }
        
        const cloudinaryResult = await uploadToCloudinary(c, imageBlob) as any;
        console.log('Uploaded to Cloudinary successfully:', cloudinaryResult.public_id);

        return c.json({
          success: true,
          done: true,
          imageUrl: cloudinaryResult.secure_url,
          publicId: cloudinaryResult.public_id,
          metadata: {
            provider: 'ai-horde',
            model: generation.model || 'stable-diffusion',
            seed: generation.seed,
            worker_name: generation.worker_name,
            worker_id: generation.worker_id,
            generatedAt: new Date().toISOString()
          }
        });
      } catch (processingError) {
        console.error('Error processing AI Horde image:', processingError);
        const errorMessage = processingError instanceof Error ? processingError.message : 'Unknown error';
        return c.json({ 
          success: false,
          error: `Failed to process generated image: ${errorMessage}`,
          details: {
            generation_id: generation.id,
            worker: generation.worker_name,
            img_size: generation.img ? generation.img.length : 0
          }
        }, 500);
      }
    }

    // Check for any errors in the status
    if (statusResult.faulted) {
      console.error('AI Horde job faulted:', statusResult);
      return c.json({ error: 'Image generation failed' }, 500);
    }

    // Return current status
    return c.json({
      success: true,
      done: statusResult.done || false,
      waiting: statusResult.waiting || 0,
      processing: statusResult.processing || 0,
      finished: statusResult.finished || 0,
      kudos: statusResult.kudos || 0,
      queue_position: statusResult.queue_position || 0,
      faulted: statusResult.faulted || false,
      wait_time: statusResult.wait_time || 0
    });
  } catch (error) {
    console.error('Error checking AI Horde status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    // Return appropriate status code based on error type
    let statusCode = 500;
    if (errorMessage.includes('Job not found') || errorMessage.includes('404')) {
      statusCode = 404;
    } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      statusCode = 429;
    } else if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
      statusCode = 401;
    }
    
    return c.json({ error: `Failed to check generation status: ${errorMessage}` }, statusCode as any);
  }
});

// Save AI generated image to gallery with comprehensive debugging
app.post('/api/ai/save-generated-image', authMiddleware, async (c) => {
  console.log('🎨 [DEBUG] Starting AI image gallery save process');
  
  try {
    const user = c.get('user');
    if (!user) {
      console.error('❌ [ERROR] No authenticated user found');
      return c.json({ error: 'Authentication required' }, 401);
    }

    console.log('👤 [DEBUG] User authenticated:', { userId: user.id, email: user.email });

    const requestBody = await c.req.json();
    const { imageUrl, imageBase64, prompt, settings, title, caption, alt_text, privacy, provider } = requestBody;

    console.log('📥 [DEBUG] Save request details:', {
      hasImageUrl: !!imageUrl,
      hasImageBase64: !!imageBase64,
      promptLength: prompt?.length || 0,
      provider,
      privacy: privacy || 'not-specified',
      title: title || 'not-provided',
      imageUrlPreview: imageUrl ? `${imageUrl.substring(0, 50)}...` : 'none',
      base64Preview: imageBase64 ? `${imageBase64.substring(0, 50)}...` : 'none'
    });

    // Input validation with detailed logging
    if ((!imageUrl && !imageBase64) || !prompt) {
      console.error('❌ [ERROR] Missing required fields:', {
        hasImageUrl: !!imageUrl,
        hasImageBase64: !!imageBase64,
        hasPrompt: !!prompt
      });
      return c.json({ error: 'Image data (URL or base64) and prompt are required' }, 400);
    }

    let finalImageBlob: Blob;
    let cloudinaryResult: any;
    let processingMethod = '';

    try {
      if (imageBase64) {
        processingMethod = 'base64';
        console.log('🔍 [DEBUG] Processing base64 image data for gallery save');
        console.log('📊 [DEBUG] Base64 analysis:', {
          totalLength: imageBase64.length,
          hasDataPrefix: imageBase64.startsWith('data:'),
          mimeTypeMatch: imageBase64.match(/^data:image\/([^;]+)/)?.[1] || 'unknown'
        });
        
        // Validate base64 format with detailed error logging
        const validation = validateBase64Image(imageBase64);
        if (!validation.isValid) {
          console.error('❌ [ERROR] Base64 validation failed:', {
            error: validation.error,
            imageBase64Preview: imageBase64.substring(0, 100)
          });
          throw new Error(`Invalid base64 image data: ${validation.error}`);
        }

        console.log('✅ [SUCCESS] Base64 validation passed:', {
          mimeType: validation.mimeType,
          estimatedSizeKB: Math.round(imageBase64.length * 0.75 / 1024)
        });

        // Extract base64 content (remove data URL prefix)
        const base64Match = imageBase64.match(/^data:image\/[^;]+;base64,(.+)$/);
        if (!base64Match) {
          console.error('❌ [ERROR] Base64 format parsing failed:', {
            hasDataPrefix: imageBase64.startsWith('data:'),
            hasBase64Marker: imageBase64.includes('base64,'),
            prefix: imageBase64.substring(0, 50)
          });
          throw new Error('Invalid base64 format - missing data URL prefix');
        }

        const base64Data = base64Match[1];
        console.log('🔧 [DEBUG] Base64 data extracted:', {
          originalLength: imageBase64.length,
          base64DataLength: base64Data.length,
          estimatedBytesAfterDecode: Math.round(base64Data.length * 0.75)
        });

        // Convert to blob with error handling
        try {
          const byteCharacters = atob(base64Data);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          finalImageBlob = new Blob([byteArray], { type: validation.mimeType });

          console.log('✅ [SUCCESS] Base64 to blob conversion completed:', {
            blobSize: finalImageBlob.size,
            blobType: finalImageBlob.type,
            sizeMB: (finalImageBlob.size / 1024 / 1024).toFixed(2)
          });
        } catch (atobError) {
          console.error('❌ [ERROR] Base64 decoding failed:', atobError);
          throw new Error('Failed to decode base64 image data');
        }

      } else if (imageUrl) {
        processingMethod = 'url';
        console.log('🌐 [DEBUG] Downloading image from URL for gallery save:', {
          url: imageUrl,
          urlDomain: new URL(imageUrl).hostname
        });
        
        const downloadStartTime = Date.now();
        const imageResponse = await makeAPICall(imageUrl, {
          method: 'GET',
          headers: {
            'User-Agent': 'PixelVault/1.0',
            'Accept': 'image/*'
          }
        }, 30000);
        const downloadDuration = Date.now() - downloadStartTime;

        console.log('📡 [DEBUG] Image download response:', {
          status: imageResponse.status,
          statusText: imageResponse.statusText,
          contentType: imageResponse.headers.get('content-type'),
          contentLength: imageResponse.headers.get('content-length'),
          downloadDurationMs: downloadDuration
        });

        if (!imageResponse.ok) {
          console.error('❌ [ERROR] Failed to download image:', {
            status: imageResponse.status,
            statusText: imageResponse.statusText,
            url: imageUrl,
            downloadDurationMs: downloadDuration
          });
          throw new Error(`Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`);
        }

        finalImageBlob = await imageResponse.blob();
        
        console.log('✅ [SUCCESS] Image downloaded and converted to blob:', {
          blobSize: finalImageBlob.size,
          blobType: finalImageBlob.type,
          sizeMB: (finalImageBlob.size / 1024 / 1024).toFixed(2),
          downloadDurationMs: downloadDuration
        });
        
        // Validate that we got an image
        if (!finalImageBlob.type.startsWith('image/')) {
          console.error('❌ [ERROR] Downloaded content is not an image:', {
            actualType: finalImageBlob.type,
            contentType: imageResponse.headers.get('content-type'),
            url: imageUrl
          });
          throw new Error('Downloaded content is not an image');
        }
      }

      console.log('📤 [DEBUG] Starting Cloudinary upload process:', {
        processingMethod,
        blobSize: finalImageBlob!.size,
        blobType: finalImageBlob!.type
      });

      // Upload to Cloudinary with comprehensive error handling
      try {
        cloudinaryResult = await uploadToCloudinary(c, finalImageBlob!) as any;
        
        console.log('✅ [SUCCESS] Cloudinary upload completed:', {
          public_id: cloudinaryResult.public_id,
          secure_url: cloudinaryResult.secure_url,
          format: cloudinaryResult.format,
          bytes: cloudinaryResult.bytes,
          width: cloudinaryResult.width,
          height: cloudinaryResult.height
        });
      } catch (cloudinaryError) {
        console.error('❌ [ERROR] Cloudinary upload failed:', {
          error: cloudinaryError instanceof Error ? cloudinaryError.message : 'Unknown error',
          processingMethod,
          blobSize: finalImageBlob!.size,
          provider
        });
        throw cloudinaryError;
      }

    } catch (uploadError) {
      console.error('❌ [ERROR] Image processing/upload pipeline failed:', {
        error: uploadError instanceof Error ? uploadError.message : 'Unknown error',
        processingMethod,
        provider,
        step: 'processing-or-upload'
      });
      throw new Error(`Failed to process image: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
    }

    // Database storage with detailed logging
    const uuid = crypto.randomUUID();
    const originalFilename = `ai-generated-${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '-')}.${cloudinaryResult.format || 'jpg'}`;
    const finalTitle = title || `AI Generated: ${prompt.slice(0, 50)}`;
    const finalCaption = caption || `Generated with ${provider === 'ai-horde' ? 'AI Horde (Free)' : settings?.model || 'AI Model'} using prompt: "${prompt}"`;
    const finalPrivacy = privacy || 'private';

    console.log('💾 [DEBUG] Preparing database insert:', {
      uuid,
      originalFilename,
      title: finalTitle,
      privacy: finalPrivacy,
      provider,
      model: settings?.model || (provider === 'ai-horde' ? 'stable-diffusion' : provider || 'ai-model'),
      promptLength: prompt.length,
      userId: user.id
    });

    try {
      const result = await c.env.DB.prepare(`
        INSERT INTO images (
          uuid, filename, original_filename, storage_path, title, caption, alt_text,
          mime_type, width, height, size_bytes, uploaded_by, privacy, is_ai_generated, 
          generation_prompt, generation_model, generation_provider, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        uuid,
        cloudinaryResult.public_id, // Store Cloudinary public_id as filename
        originalFilename,
        cloudinaryResult.secure_url, // Store Cloudinary secure_url as storage_path
        finalTitle,
        finalCaption,
        alt_text || prompt,
        cloudinaryResult.format ? `image/${cloudinaryResult.format}` : 'image/jpeg',
        cloudinaryResult.width || null,
        cloudinaryResult.height || null,
        cloudinaryResult.bytes || finalImageBlob!.size,
        user.id,
        finalPrivacy,
        1, // is_ai_generated = true
        prompt,
        settings?.model || (provider === 'ai-horde' ? 'stable-diffusion' : provider || 'ai-model'),
        provider || 'unknown'
      ).run();

      const imageId = result.meta.last_row_id;

      console.log('✅ [SUCCESS] Database insert completed:', {
        imageId,
        insertedRows: result.meta?.changes || 0,
        lastRowId: result.meta?.last_row_id
      });

      // Build response with all URLs
      const thumbnailUrl = buildCloudinaryUrl(c.env.CLOUDINARY_CLOUD_NAME, cloudinaryResult.public_id, 'w_400,h_400,c_fill,q_auto,f_auto');
      
      const savedImage = {
        id: imageId,
        uuid,
        savedUrl: cloudinaryResult.secure_url, // Return this for immediate use
        publicId: cloudinaryResult.public_id,
        thumbnailUrl,
        width: cloudinaryResult.width,
        height: cloudinaryResult.height,
        size: cloudinaryResult.bytes,
        privacy: finalPrivacy,
        provider,
        model: settings?.model || (provider === 'ai-horde' ? 'stable-diffusion' : provider || 'ai-model')
      };

      console.log('✅ [SUCCESS] AI generated image saved to gallery successfully:', {
        imageId,
        uuid,
        provider,
        privacy: finalPrivacy,
        secure_url: cloudinaryResult.secure_url,
        thumbnailUrl,
        processingMethod
      });

      return c.json({ 
        success: true, 
        imageId,
        savedUrl: cloudinaryResult.secure_url,
        publicId: cloudinaryResult.public_id,
        image: savedImage,
        debug: {
          processingMethod,
          provider,
          cloudinaryFormat: cloudinaryResult.format,
          finalSize: cloudinaryResult.bytes
        }
      });

    } catch (dbError) {
      console.error('❌ [ERROR] Database insert failed:', {
        error: dbError instanceof Error ? dbError.message : 'Unknown error',
        uuid,
        provider,
        cloudinaryPublicId: cloudinaryResult.public_id
      });
      throw new Error(`Failed to save to database: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`);
    }

  } catch (error) {
    console.error('❌ [ERROR] Gallery save process failed:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return c.json({ 
      error: `Failed to save image: ${errorMessage}`,
      debug: {
        timestamp: new Date().toISOString(),
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }
    }, 500);
  }
});

// ============================================================================
// Vector Search Routes
// ============================================================================

// Text-to-image vector search using Gemini
app.post('/api/vector-search/text', async (c) => {
  try {
    const { query, limit = 20, threshold = 0.3 } = await c.req.json(); // Lowered default threshold

    if (!query || !query.trim()) {
      return c.json({ error: 'Query is required' }, 400);
    }

    console.log('🔍 [VECTOR-SEARCH] Starting text-to-image search:', {
      query: query.trim(),
      limit,
      threshold,
      timestamp: new Date().toISOString()
    });

    // Enhanced search query with multiple techniques - more comprehensive approach
    const enhancedTerms = [
      query.trim(),
      // Add common visual synonyms and related terms
      ...getVisualSynonyms(query.trim()),
      // Add individual words from the query
      ...query.trim().split(/\s+/).filter((word: string) => word.length > 2)
    ];

    console.log('🔍 [VECTOR-SEARCH] Enhanced search terms:', enhancedTerms);

    // Try to find ANY matching images first, then apply similarity filtering
    // Get all public images if no direct matches found
    let results: any[] = [];
    
    // First attempt: search with enhanced terms
    if (enhancedTerms.length > 0) {
      const searchConditions = enhancedTerms.map(() => 
        '(i.title LIKE ? OR i.caption LIKE ? OR i.alt_text LIKE ? OR i.generation_prompt LIKE ?)'
      ).join(' OR ');

      const searchParams: any[] = [];
      enhancedTerms.forEach(term => {
        const searchTerm = `%${term}%`;
        searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
      });

      try {
        const searchResult = await c.env.DB.prepare(`
          SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
          FROM images i
          LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
          WHERE i.privacy = 'public' 
          AND (${searchConditions})
          ORDER BY 
            CASE 
              WHEN i.title LIKE ? THEN 1
              WHEN i.caption LIKE ? THEN 2
              WHEN i.generation_prompt LIKE ? THEN 3
              ELSE 4
            END,
            i.created_at DESC 
          LIMIT ?
        `).bind(...searchParams, `%${query.trim()}%`, `%${query.trim()}%`, `%${query.trim()}%`, limit * 2).all();
        
        results = searchResult.results;
      } catch (searchError) {
        console.error('Enhanced search failed:', searchError);
        results = [];
      }
    }

    // Fallback: if no results found, get some random public images for semantic similarity
    if (results.length === 0) {
      console.log('🔄 [VECTOR-SEARCH] No direct matches found, using fallback semantic search');
      
      try {
        const fallbackResult = await c.env.DB.prepare(`
          SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
          FROM images i
          LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
          WHERE i.privacy = 'public'
          ORDER BY i.created_at DESC
          LIMIT ?
        `).bind(limit * 3).all(); // Get more images for better semantic matching
        
        results = fallbackResult.results;
      } catch (fallbackError) {
        console.error('Fallback search failed:', fallbackError);
        results = [];
      }
    }

    // Calculate semantic similarity scores with improved algorithm
    const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
    const resultsWithSimilarity = results.map((image: any, index: number) => {
      // Calculate similarity based on text matching with improved scoring
      const similarity = calculateTextSimilarityImproved(query.trim(), enhancedTerms, image, index);
      
      return {
        ...image,
        similarity,
        cloudinary_url: image.storage_path,
        thumbnail_url: buildCloudinaryUrl(cloudName, image.filename, 'w_400,h_400,c_fill,q_auto,f_auto')
      };
    })
    .sort((a, b) => b.similarity - a.similarity) // Sort by similarity score
    .filter(result => result.similarity >= threshold)
    .slice(0, limit); // Apply final limit

    console.log('✅ [VECTOR-SEARCH] Text search completed:', {
      queryTerms: enhancedTerms.length,
      totalResults: results.length,
      filteredResults: resultsWithSimilarity.length,
      topSimilarity: resultsWithSimilarity[0]?.similarity || 0,
      allSimilarities: resultsWithSimilarity.map(r => r.similarity)
    });

    return c.json({ 
      results: resultsWithSimilarity,
      query_enhanced: enhancedTerms,
      search_method: 'enhanced-semantic-search',
      debug: {
        total_images_searched: results.length,
        similarity_scores: resultsWithSimilarity.map(r => ({ title: r.title, score: r.similarity })),
        threshold_used: threshold
      }
    });
  } catch (error) {
    console.error('Error in text vector search:', error);
    return c.json({ error: 'Vector search failed' }, 500);
  }
});

// Helper function to get visual synonyms
function getVisualSynonyms(query: string): string[] {
  const synonymMap: Record<string, string[]> = {
    'cat': ['feline', 'kitten', 'pet', 'animal'],
    'dog': ['canine', 'puppy', 'pet', 'animal'],
    'sunset': ['dusk', 'evening', 'golden hour', 'orange sky'],
    'mountain': ['peak', 'hill', 'landscape', 'nature'],
    'ocean': ['sea', 'water', 'waves', 'beach'],
    'flower': ['blossom', 'bloom', 'floral', 'botanical'],
    'city': ['urban', 'buildings', 'skyline', 'metropolitan'],
    'forest': ['woods', 'trees', 'nature', 'woodland'],
    'abstract': ['artistic', 'creative', 'modern', 'contemporary'],
    'portrait': ['face', 'person', 'human', 'headshot']
  };

  const lowerQuery = query.toLowerCase();
  const synonyms: string[] = [];

  Object.entries(synonymMap).forEach(([key, values]: [string, string[]]) => {
    if (lowerQuery.includes(key)) {
      synonyms.push(...values);
    }
  });

  return [...new Set(synonyms)]; // Remove duplicates
}



// Improved similarity calculation for better vector search results
function calculateTextSimilarityImproved(query: string, enhancedTerms: string[], image: any, index: number): number {
  const queryLower = query.toLowerCase();
  const searchFields = [
    image.title || '',
    image.caption || '',
    image.alt_text || '',
    image.generation_prompt || ''
  ].join(' ').toLowerCase();

  let totalScore = 0;
  let scoreComponents = 0;

  // 1. Exact query match (highest weight)
  if (searchFields.includes(queryLower)) {
    totalScore += 1.0;
    scoreComponents++;
  }

  // 2. Enhanced terms matching (medium weight)
  const enhancedMatches = enhancedTerms.reduce((count, term) => {
    return count + (searchFields.includes(term.toLowerCase()) ? 1 : 0);
  }, 0);
  
  if (enhancedTerms.length > 0) {
    totalScore += (enhancedMatches / enhancedTerms.length) * 0.8;
    scoreComponents++;
  }

  // 3. Word overlap scoring (medium weight)
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const textWords = searchFields.split(/\s+/);
  
  const partialMatches = queryWords.reduce((count, word: string) => {
    return count + (textWords.some((tw: string) => tw.includes(word) || word.includes(tw)) ? 1 : 0);
  }, 0);

  if (queryWords.length > 0) {
    totalScore += (partialMatches / queryWords.length) * 0.6;
    scoreComponents++;
  }

  // 4. Field-specific bonuses
  const titleMatch = (image.title || '').toLowerCase().includes(queryLower) ? 0.3 : 0;
  const promptMatch = (image.generation_prompt || '').toLowerCase().includes(queryLower) ? 0.3 : 0;
  const captionMatch = (image.caption || '').toLowerCase().includes(queryLower) ? 0.2 : 0;
  
  totalScore += titleMatch + promptMatch + captionMatch;
  if (titleMatch + promptMatch + captionMatch > 0) scoreComponents++;

  // 5. AI-generated content bonus for relevant queries
  const aiRelevantTerms = ['ai', 'generated', 'artificial', 'created', 'digital', 'art', 'synthetic'];
  const isAiQuery = aiRelevantTerms.some(term => queryLower.includes(term));
  if (image.is_ai_generated && isAiQuery) {
    totalScore += 0.2;
    scoreComponents++;
  }

  // Calculate final score
  const baseScore = scoreComponents > 0 ? totalScore / Math.max(scoreComponents, 1) : 0;
  
  // Apply position penalty (less aggressive)
  const positionPenalty = index * 0.02;
  
  // Apply minimum baseline for any public image
  const finalScore = Math.max(0.1, Math.min(1.0, baseScore - positionPenalty));
  
  return finalScore;
}

// Image-to-image vector search using Gemini Vision
app.post('/api/vector-search/image', async (c) => {
  try {
    const formData = await c.req.formData();
    const imageFile = formData.get('image') as File;
    const limit = parseInt(formData.get('limit') as string) || 20;
    const threshold = parseFloat(formData.get('threshold') as string) || 0.6;

    if (!imageFile) {
      return c.json({ error: 'Image file is required' }, 400);
    }

    console.log('🖼️ [VECTOR-SEARCH] Starting image-to-image search:', {
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      limit,
      threshold,
      timestamp: new Date().toISOString()
    });

    let imageDescription = '';
    let visualTags: string[] = [];

    // Use Gemini Vision to analyze the uploaded image
    if (c.env.GEMINI_API_KEY) {
      try {
        console.log('👁️ [VECTOR-SEARCH] Using Gemini Vision for image analysis');
        
        // Convert image to base64
        const imageBytes = await imageFile.arrayBuffer();
        const base64Image = btoa(String.fromCharCode(...new Uint8Array(imageBytes)));
        
        const visionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${c.env.GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  text: "Analyze this image and provide: 1) A detailed description focusing on main subjects, objects, colors, composition, style, and mood. 2) A list of 15-20 relevant visual tags separated by commas. Format: DESCRIPTION: [description] TAGS: [tag1, tag2, tag3...]"
                },
                {
                  inline_data: {
                    mime_type: imageFile.type,
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              maxOutputTokens: 500,
              temperature: 0.3
            }
          }),
        });

        if (visionResponse.ok) {
          const visionResult = await visionResponse.json() as any;
          if (visionResult.candidates?.[0]?.content?.parts?.[0]?.text) {
            const analysisText = visionResult.candidates[0].content.parts[0].text;
            
            // Parse description and tags
            const descMatch = analysisText.match(/DESCRIPTION:\s*([^]*?)(?=TAGS:|$)/i);
            const tagsMatch = analysisText.match(/TAGS:\s*([^]*?)$/i);
            
            if (descMatch) {
              imageDescription = descMatch[1].trim();
            }
            
            if (tagsMatch) {
              visualTags = tagsMatch[1].split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
            }
            
            console.log('✅ [VECTOR-SEARCH] Gemini Vision analysis completed:', {
              descriptionLength: imageDescription.length,
              tagCount: visualTags.length,
              sampleTags: visualTags.slice(0, 5)
            });
          }
        } else {
          console.warn('⚠️ [VECTOR-SEARCH] Gemini Vision analysis failed:', await visionResponse.text());
        }
      } catch (visionError) {
        console.error('❌ [VECTOR-SEARCH] Gemini Vision error:', visionError);
      }
    }

    // If Gemini failed, try basic metadata analysis
    if (!imageDescription && !visualTags.length) {
      console.log('🔄 [VECTOR-SEARCH] Falling back to metadata-based analysis');
      
      // Extract basic visual features from filename and metadata
      const fileName = imageFile.name.toLowerCase();
      const possibleTags = extractTagsFromFilename(fileName);
      visualTags = possibleTags;
      imageDescription = `Image file: ${imageFile.name}`;
    }

    // Build search query using extracted visual information
    const searchTerms = [
      ...imageDescription.split(/\s+/).filter(word => word.length > 3),
      ...visualTags
    ].filter(term => term.length > 2);

    console.log('🔍 [VECTOR-SEARCH] Generated search terms from image:', {
      descriptionWords: imageDescription.split(/\s+/).filter(word => word.length > 3).length,
      visualTags: visualTags.length,
      totalSearchTerms: searchTerms.length,
      sampleTerms: searchTerms.slice(0, 10)
    });

    if (searchTerms.length === 0) {
      // Fallback to random similar images
      console.log('⚠️ [VECTOR-SEARCH] No search terms extracted, using random fallback');
      const { results } = await c.env.DB.prepare(`
        SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
        FROM images i
        LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
        WHERE i.privacy = 'public'
        ORDER BY RANDOM()
        LIMIT ?
      `).bind(limit).all();

      const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
      const resultsWithSimilarity = results.map((image: any, index: number) => ({
        ...image,
        similarity: Math.max(0.4, 0.8 - (index * 0.05)),
        cloudinary_url: image.storage_path,
        thumbnail_url: buildCloudinaryUrl(cloudName, image.filename, 'w_400,h_400,c_fill,q_auto,f_auto')
      }));

      return c.json({ 
        results: resultsWithSimilarity,
        search_method: 'random-fallback',
        analysis: { description: imageDescription, tags: visualTags }
      });
    }

    // Build comprehensive search query
    const searchConditions = searchTerms.map(() => 
      '(i.title LIKE ? OR i.caption LIKE ? OR i.alt_text LIKE ? OR i.generation_prompt LIKE ?)'
    ).join(' OR ');

    const searchParams: any[] = [];
    searchTerms.forEach(term => {
      const searchTerm = `%${term}%`;
      searchParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    });

    // Execute search with relevance scoring
    const { results } = await c.env.DB.prepare(`
      SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture,
        (CASE 
          WHEN i.title LIKE ? THEN 3
          WHEN i.caption LIKE ? THEN 2
          WHEN i.generation_prompt LIKE ? THEN 2
          WHEN i.alt_text LIKE ? THEN 1
          ELSE 0
        END) as relevance_score
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
      WHERE i.privacy = 'public' 
      AND (${searchConditions})
      ORDER BY relevance_score DESC, i.created_at DESC 
      LIMIT ?
    `).bind(
      `%${searchTerms[0]}%`, `%${searchTerms[0]}%`, `%${searchTerms[0]}%`, `%${searchTerms[0]}%`,
      ...searchParams, 
      limit * 2 // Get more results for better filtering
    ).all();

    // Calculate visual similarity scores
    const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
    const resultsWithSimilarity = results.map((image: any, index: number) => {
      const similarity = calculateVisualSimilarity(searchTerms, image, index);
      
      return {
        ...image,
        similarity,
        cloudinary_url: image.storage_path,
        thumbnail_url: buildCloudinaryUrl(cloudName, image.filename, 'w_400,h_400,c_fill,q_auto,f_auto')
      };
    })
    .filter(result => result.similarity >= threshold)
    .slice(0, limit); // Apply final limit

    console.log('✅ [VECTOR-SEARCH] Image search completed:', {
      searchTermsUsed: searchTerms.length,
      totalResults: results.length,
      filteredResults: resultsWithSimilarity.length,
      topSimilarity: resultsWithSimilarity[0]?.similarity || 0,
      analysisMethod: c.env.GEMINI_API_KEY ? 'gemini-vision' : 'metadata-based'
    });

    return c.json({ 
      results: resultsWithSimilarity,
      search_method: c.env.GEMINI_API_KEY ? 'gemini-vision' : 'metadata-based',
      analysis: {
        description: imageDescription,
        tags: visualTags,
        search_terms: searchTerms.slice(0, 10)
      }
    });
  } catch (error) {
    console.error('Error in image vector search:', error);
    return c.json({ error: 'Vector search failed' }, 500);
  }
});

// Helper function to extract tags from filename
function extractTagsFromFilename(filename: string): string[] {
  const commonPatterns: RegExp[] = [
    /cat|feline|kitten/i,
    /dog|canine|puppy/i,
    /sunset|sunrise|dawn|dusk/i,
    /mountain|hill|peak/i,
    /ocean|sea|beach|water/i,
    /flower|floral|bloom/i,
    /city|urban|building/i,
    /forest|tree|nature/i,
    /portrait|face|person/i,
    /abstract|art|artistic/i,
    /landscape|scenery/i,
    /night|dark|evening/i,
    /bright|light|sunny/i,
    /vintage|retro|old/i,
    /modern|contemporary/i
  ];

  const tags: string[] = [];
  
  commonPatterns.forEach((pattern: RegExp) => {
    const match = filename.match(pattern);
    if (match) {
      tags.push(match[0].toLowerCase());
    }
  });

  // Add basic descriptors based on common file naming patterns
  if (filename.includes('img') || filename.includes('pic')) tags.push('photo');
  if (filename.includes('screenshot') || filename.includes('screen')) tags.push('screenshot');
  if (filename.includes('ai') || filename.includes('generated')) tags.push('ai-generated');

  return tags;
}

// Helper function to calculate visual similarity
function calculateVisualSimilarity(searchTerms: string[], image: any, index: number): number {
  const imageText = [
    image.title || '',
    image.caption || '',
    image.alt_text || '',
    image.generation_prompt || ''
  ].join(' ').toLowerCase();

  // Calculate term overlap
  const termMatches = searchTerms.reduce((count, term) => {
    return count + (imageText.includes(term.toLowerCase()) ? 1 : 0);
  }, 0);

  const overlapRatio = searchTerms.length > 0 ? termMatches / searchTerms.length : 0;
  
  // Boost AI-generated images if search terms suggest AI content
  const aiBoost = image.is_ai_generated && searchTerms.some(term => 
    ['generated', 'artificial', 'ai', 'synthetic'].includes(term.toLowerCase())
  ) ? 0.1 : 0;

  // Position penalty for ranking
  const positionPenalty = index * 0.03;
  
  const baseSimilarity = 0.6 + (overlapRatio * 0.3) + aiBoost - positionPenalty;
  
  return Math.max(0.3, Math.min(0.95, baseSimilarity));
}

// ============================================================================
// Video Upload Routes
// ============================================================================

// Upload videos via Cloudinary API
app.post('/api/videos/upload', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const privacy = formData.get('privacy') as string || 'public';
    const tagsJson = formData.get('tags') as string;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('video/')) {
      return c.json({ error: 'Only video files are allowed' }, 400);
    }

    // Validate file size (max 500MB for videos)
    if (file.size > 500 * 1024 * 1024) {
      return c.json({ error: 'File size exceeds 500MB limit' }, 400);
    }

    // Parse tags
    let tags: string[] = [];
    try {
      tags = tagsJson ? JSON.parse(tagsJson) : [];
    } catch (e) {
      tags = [];
    }

    // Generate unique identifiers
    const uuid = crypto.randomUUID();
    const originalFilename = file.name;
    
    try {
      // Create FormData for Cloudinary video upload
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', file);
      cloudinaryFormData.append('upload_preset', c.env.CLOUDINARY_UPLOAD_PRESET);
      cloudinaryFormData.append('public_id', `pixelvault/videos/${uuid}`);
      cloudinaryFormData.append('folder', 'pixelvault/videos');
      cloudinaryFormData.append('resource_type', 'video');
      if (tags.length > 0) {
        cloudinaryFormData.append('tags', ['pixelvault', 'video', ...tags].join(','));
      } else {
        cloudinaryFormData.append('tags', 'pixelvault,video');
      }
      
      // Upload to Cloudinary video endpoint
      const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${c.env.CLOUDINARY_CLOUD_NAME}/video/upload`, {
        method: 'POST',
        body: cloudinaryFormData,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Cloudinary video upload failed:', errorText);
        return c.json({ error: 'Failed to upload video to Cloudinary' }, 500);
      }

      const uploadResult = await uploadResponse.json() as any;
      console.log('Video uploaded to Cloudinary:', uploadResult.public_id);

      // Store video metadata in database (using images table with video flag)
      const result = await c.env.DB.prepare(`
        INSERT INTO images (
          uuid, filename, original_filename, storage_path, title, caption, alt_text,
          mime_type, width, height, size_bytes, uploaded_by, privacy,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `).bind(
        uuid,
        uploadResult.public_id, // Store Cloudinary public_id as filename
        originalFilename,
        uploadResult.secure_url, // Store full Cloudinary URL
        title || originalFilename,
        description || null,
        description || null, // Use description as alt_text for videos
        uploadResult.format ? `video/${uploadResult.format}` : file.type,
        uploadResult.width || null,
        uploadResult.height || null,
        uploadResult.bytes || file.size,
        user.id,
        privacy
      ).run();

      const videoId = result.meta.last_row_id;

      // Handle tags
      if (tags && tags.length > 0) {
        for (const tagName of tags) {
          if (!tagName.trim()) continue;

          // Get or create tag
          let tag = await c.env.DB.prepare("SELECT * FROM tags WHERE name = ?")
            .bind(tagName.trim().toLowerCase()).first();

          if (!tag) {
            const tagResult = await c.env.DB.prepare(`
              INSERT INTO tags (name, created_at) VALUES (?, datetime('now'))
            `).bind(tagName.trim().toLowerCase()).run();
            
            tag = await c.env.DB.prepare("SELECT * FROM tags WHERE id = ?")
              .bind(tagResult.meta.last_row_id).first();
          }

          // Link tag to video
          if (tag) {
            await c.env.DB.prepare(`
              INSERT INTO image_tags (image_id, tag_id, created_at) 
              VALUES (?, ?, datetime('now'))
            `).bind(videoId, tag.id).run();
          }
        }
      }

      // Get the created video with tags and add Cloudinary URLs
      const video = await c.env.DB.prepare(`
        SELECT i.*, u.name as uploader_name, u.picture_url as uploader_picture
        FROM images i
        LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
        WHERE i.id = ?
      `).bind(videoId).first();

      // Get tags
      const { results: videoTags } = await c.env.DB.prepare(`
        SELECT t.* FROM tags t
        JOIN image_tags it ON t.id = it.tag_id
        WHERE it.image_id = ?
      `).bind(videoId).all();

      // Add Cloudinary URLs to the response
      const cloudName = c.env.CLOUDINARY_CLOUD_NAME;
      const publicId = uploadResult.public_id;
      
      const videoWithUrls = {
        ...video,
        tags: videoTags,
        cloudinary_url: uploadResult.secure_url,
        thumbnail_url: `https://res.cloudinary.com/${cloudName}/video/upload/w_400,h_300,c_fill,so_2,f_jpg/${publicId}.jpg`, // Video thumbnail
        download_url: `https://res.cloudinary.com/${cloudName}/video/upload/fl_attachment/${publicId}`
      };

      return c.json({ 
        success: true, 
        video: videoWithUrls
      }, 201);
    } catch (uploadError) {
      console.error('Video upload failed:', uploadError);
      return c.json({ error: `Failed to upload video: ${uploadError}` }, 500);
    }
  } catch (error) {
    console.error('Error uploading video:', error);
    return c.json({ error: 'Failed to upload video' }, 500);
  }
});

// ============================================================================
// Batch Operations Routes
// ============================================================================

// Batch delete images
app.delete('/api/images/batch', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { imageIds } = await c.req.json();

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return c.json({ error: 'Image IDs are required' }, 400);
    }

    // Verify user owns all images or is admin
    const { results: images } = await c.env.DB.prepare(`
      SELECT id, uploaded_by FROM images WHERE id IN (${imageIds.map(() => '?').join(',')})
    `).bind(...imageIds).all();

    const userRecord = await c.env.DB.prepare("SELECT role FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    for (const image of images) {
      if (image.uploaded_by !== user?.id && userRecord?.role !== 'admin') {
        return c.json({ error: 'Access denied for some images' }, 403);
      }
    }

    // Delete related records first
    await c.env.DB.prepare(`DELETE FROM image_tags WHERE image_id IN (${imageIds.map(() => '?').join(',')})`).bind(...imageIds).run();
    await c.env.DB.prepare(`DELETE FROM album_images WHERE image_id IN (${imageIds.map(() => '?').join(',')})`).bind(...imageIds).run();
    await c.env.DB.prepare(`DELETE FROM likes WHERE image_id IN (${imageIds.map(() => '?').join(',')})`).bind(...imageIds).run();
    await c.env.DB.prepare(`DELETE FROM comments WHERE image_id IN (${imageIds.map(() => '?').join(',')})`).bind(...imageIds).run();

    // Delete images
    const result = await c.env.DB.prepare(`DELETE FROM images WHERE id IN (${imageIds.map(() => '?').join(',')})`).bind(...imageIds).run();

    return c.json({ success: true, deleted: result.meta?.changes || 0 });
  } catch (error) {
    console.error('Error in batch delete:', error);
    return c.json({ error: 'Batch delete failed' }, 500);
  }
});

// Batch update image metadata
app.put('/api/images/batch', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { imageIds, updates } = await c.req.json();

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return c.json({ error: 'Image IDs are required' }, 400);
    }

    // Verify user owns all images or is admin
    const { results: images } = await c.env.DB.prepare(`
      SELECT id, uploaded_by FROM images WHERE id IN (${imageIds.map(() => '?').join(',')})
    `).bind(...imageIds).all();

    const userRecord = await c.env.DB.prepare("SELECT role FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    for (const image of images) {
      if (image.uploaded_by !== user?.id && userRecord?.role !== 'admin') {
        return c.json({ error: 'Access denied for some images' }, 403);
      }
    }

    // Build update query
    const updateFields: string[] = [];
    const updateParams: any[] = [];
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        updateFields.push(`${key} = ?`);
        updateParams.push(value);
      }
    });

    if (updateFields.length === 0) {
      return c.json({ error: 'No valid updates provided' }, 400);
    }

    updateFields.push('updated_at = datetime("now")');

    const result = await c.env.DB.prepare(`
      UPDATE images SET ${updateFields.join(', ')} WHERE id IN (${imageIds.map(() => '?').join(',')})
    `).bind(...updateParams, ...imageIds).run();

    return c.json({ success: true, updated: result.meta?.changes || 0 });
  } catch (error) {
    console.error('Error in batch update:', error);
    return c.json({ error: 'Batch update failed' }, 500);
  }
});

// Batch move to album
app.post('/api/images/batch/move', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { imageIds, albumId } = await c.req.json();

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return c.json({ error: 'Image IDs are required' }, 400);
    }

    if (!albumId || typeof albumId !== 'number') {
      return c.json({ error: 'Album ID is required' }, 400);
    }

    // Verify user owns all images or is admin
    const { results: images } = await c.env.DB.prepare(`
      SELECT id, uploaded_by FROM images WHERE id IN (${imageIds.map(() => '?').join(',')})
    `).bind(...imageIds).all();

    const userRecord = await c.env.DB.prepare("SELECT role FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    for (const image of images) {
      if (image.uploaded_by !== user?.id && userRecord?.role !== 'admin') {
        return c.json({ error: 'Access denied for some images' }, 403);
      }
    }

    // Verify album exists and user has access to it
    const album = await c.env.DB.prepare("SELECT * FROM albums WHERE id = ?")
      .bind(albumId).first();

    if (!album) {
      return c.json({ error: 'Album not found' }, 404);
    }

    if (album.created_by !== user?.id && userRecord?.role !== 'admin') {
      return c.json({ error: 'Access denied to album' }, 403);
    }

    // Remove images from any existing albums first
    await c.env.DB.prepare(`
      DELETE FROM album_images WHERE image_id IN (${imageIds.map(() => '?').join(',')})
    `).bind(...imageIds).run();

    // Add images to the new album
    for (const imageId of imageIds) {
      await c.env.DB.prepare(`
        INSERT INTO album_images (album_id, image_id, created_at) 
        VALUES (?, ?, datetime('now'))
      `).bind(albumId, imageId).run();
    }

    return c.json({ success: true, moved: imageIds.length });
  } catch (error) {
    console.error('Error in batch move:', error);
    return c.json({ error: 'Batch move failed' }, 500);
  }
});

// Batch tag operations
app.post('/api/images/batch/tags', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const { imageIds, addTags = [], removeTags = [] } = await c.req.json();

    if (!imageIds || !Array.isArray(imageIds) || imageIds.length === 0) {
      return c.json({ error: 'Image IDs are required' }, 400);
    }

    // Verify user owns all images or is admin
    const { results: images } = await c.env.DB.prepare(`
      SELECT id, uploaded_by FROM images WHERE id IN (${imageIds.map(() => '?').join(',')})
    `).bind(...imageIds).all();

    const userRecord = await c.env.DB.prepare("SELECT role FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    for (const image of images) {
      if (image.uploaded_by !== user?.id && userRecord?.role !== 'admin') {
        return c.json({ error: 'Access denied for some images' }, 403);
      }
    }

    // Add tags
    for (const tagName of addTags) {
      if (!tagName.trim()) continue;

      // Get or create tag
      let tag = await c.env.DB.prepare("SELECT * FROM tags WHERE name = ?")
        .bind(tagName.trim().toLowerCase()).first();

      if (!tag) {
        const tagResult = await c.env.DB.prepare(`
          INSERT INTO tags (name, created_at) VALUES (?, datetime('now'))
        `).bind(tagName.trim().toLowerCase()).run();
        
        tag = await c.env.DB.prepare("SELECT * FROM tags WHERE id = ?")
          .bind(tagResult.meta.last_row_id).first();
      }

      // Link tag to all images
      if (tag) {
        for (const imageId of imageIds) {
          await c.env.DB.prepare(`
            INSERT OR IGNORE INTO image_tags (image_id, tag_id, created_at) 
            VALUES (?, ?, datetime('now'))
          `).bind(imageId, tag.id).run();
        }
      }
    }

    // Remove tags
    if (removeTags.length > 0) {
      const tagIds = await Promise.all(
        removeTags.map(async (tagName: string) => {
          const tag = await c.env.DB.prepare("SELECT id FROM tags WHERE name = ?")
            .bind(tagName.trim().toLowerCase()).first();
          return tag?.id;
        })
      );

      const validTagIds = tagIds.filter(id => id !== undefined);
      
      if (validTagIds.length > 0) {
        await c.env.DB.prepare(`
          DELETE FROM image_tags 
          WHERE image_id IN (${imageIds.map(() => '?').join(',')}) 
          AND tag_id IN (${validTagIds.map(() => '?').join(',')})
        `).bind(...imageIds, ...validTagIds).run();
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error in batch tag operation:', error);
    return c.json({ error: 'Batch tag operation failed' }, 500);
  }
});

// ============================================================================
// Watermark Routes
// ============================================================================

// Generate watermark preview
app.post('/api/images/watermark-preview', async (c) => {
  try {
    const { imageUrl, watermark } = await c.req.json();

    if (!imageUrl || !watermark) {
      return c.json({ error: 'Image URL and watermark settings are required' }, 400);
    }

    // For demo purposes, return the original image
    // In a real implementation, you would:
    // 1. Download the original image
    // 2. Apply watermark using image processing library
    // 3. Return the watermarked image

    const response = await fetch(imageUrl);
    const imageBlob = await response.blob();

    return new Response(imageBlob, {
      headers: {
        'Content-Type': 'image/jpeg',
      },
    });
  } catch (error) {
    console.error('Error generating watermark preview:', error);
    return c.json({ error: 'Failed to generate preview' }, 500);
  }
});

// Download image with watermark
app.post('/api/images/download-with-watermark', async (c) => {
  try {
    const { imageUrl, watermark, filename } = await c.req.json();

    if (!imageUrl || !watermark || !filename) {
      return c.json({ error: 'Image URL, watermark settings, and filename are required' }, 400);
    }

    // For demo purposes, return the original image
    // In a real implementation, you would apply the watermark
    const response = await fetch(imageUrl);
    const imageBlob = await response.blob();

    return new Response(imageBlob, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading watermarked image:', error);
    return c.json({ error: 'Failed to download image' }, 500);
  }
});

// ============================================================================
// RSS and Sitemap Routes
// ============================================================================

// RSS feed for public images
app.get('/api/rss', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT i.*, u.name as uploader_name
      FROM images i
      LEFT JOIN users u ON i.uploaded_by = u.mocha_user_id
      WHERE i.privacy = 'public'
      ORDER BY i.created_at DESC
      LIMIT 50
    `).all();

    const baseUrl = new URL(c.req.url).origin;

    const rssItems = results.map((image: any) => `
      <item>
        <title>${escapeXml(image.title || image.original_filename)}</title>
        <link>${baseUrl}/gallery</link>
        <guid>${baseUrl}/image/${image.uuid}</guid>
        <pubDate>${new Date(image.created_at).toUTCString()}</pubDate>
        <description>${escapeXml(image.caption || '')}</description>
        <author>${escapeXml(image.uploader_name || 'Anonymous')}</author>
        <enclosure url="${image.storage_path}" type="${image.mime_type}" />
      </item>
    `).join('');

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>PixelVault - Latest Images</title>
    <link>${baseUrl}/gallery</link>
    <description>Latest public images from PixelVault</description>
    <language>en-us</language>
    <pubDate>${new Date().toUTCString()}</pubDate>
    <atom:link href="${baseUrl}/api/rss" rel="self" type="application/rss+xml" />
    ${rssItems}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        'Content-Type': 'application/rss+xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    return c.json({ error: 'Failed to generate RSS feed' }, 500);
  }
});

// Sitemap generation
app.get('/api/sitemap.xml', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT uuid, updated_at FROM images WHERE privacy = 'public'
      ORDER BY updated_at DESC
    `).all();

    const { results: albums } = await c.env.DB.prepare(`
      SELECT uuid, updated_at FROM albums WHERE privacy = 'public'
      ORDER BY updated_at DESC
    `).all();

    const baseUrl = new URL(c.req.url).origin;

    const imageUrls = results.map((image: any) => `
      <url>
        <loc>${baseUrl}/image/${image.uuid}</loc>
        <lastmod>${image.updated_at.split(' ')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.7</priority>
      </url>
    `).join('');

    const albumUrls = albums.map((album: any) => `
      <url>
        <loc>${baseUrl}/album/${album.uuid}</loc>
        <lastmod>${album.updated_at.split(' ')[0]}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>0.6</priority>
      </url>
    `).join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/gallery</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/albums</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ${imageUrls}
  ${albumUrls}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return c.json({ error: 'Failed to generate sitemap' }, 500);
  }
});

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

// ============================================================================
// Comments Routes
// ============================================================================

// Get comments for an image
app.get('/api/images/:id/comments', async (c) => {
  try {
    const id = c.req.param('id');
    
    const { results } = await c.env.DB.prepare(`
      SELECT c.*, u.name as user_name, u.picture_url as user_picture
      FROM comments c
      JOIN users u ON c.user_id = u.mocha_user_id
      WHERE c.image_id = ? AND c.is_approved = 1
      ORDER BY c.created_at DESC
    `).bind(id).all();

    return c.json({ comments: results });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return c.json({ error: 'Failed to fetch comments' }, 500);
  }
});

// Add comment to an image
app.post('/api/images/:id/comments', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const { content } = await c.req.json();

    if (!content || !content.trim()) {
      return c.json({ error: 'Comment content is required' }, 400);
    }

    // Check if image exists
    const image = await c.env.DB.prepare("SELECT * FROM images WHERE id = ? OR uuid = ?")
      .bind(id, id).first();

    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }

    await c.env.DB.prepare(`
      INSERT INTO comments (image_id, user_id, content, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now'), datetime('now'))
    `).bind(image.id, user?.id, content.trim()).run();

    return c.json({ success: true }, 201);
  } catch (error) {
    console.error('Error adding comment:', error);
    return c.json({ error: 'Failed to add comment' }, 500);
  }
});

// Delete comment
app.delete('/api/comments/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const comment = await c.env.DB.prepare("SELECT * FROM comments WHERE id = ?")
      .bind(id).first();

    if (!comment) {
      return c.json({ error: 'Comment not found' }, 404);
    }

    // Check if user owns the comment or is admin
    const userRecord = await c.env.DB.prepare("SELECT * FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    if (comment.user_id !== user?.id && userRecord?.role !== 'admin') {
      return c.json({ error: 'Access denied' }, 403);
    }

    await c.env.DB.prepare("DELETE FROM comments WHERE id = ?").bind(id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return c.json({ error: 'Failed to delete comment' }, 500);
  }
});

// Get likes for an image
app.get('/api/images/:id/likes', async (c) => {
  try {
    const id = c.req.param('id');
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);
    let currentUser = null;
    
    if (sessionToken) {
      try {
        currentUser = await getCurrentUser(sessionToken, {
          apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
          apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
        });
      } catch (e) {
        // Ignore auth errors
      }
    }

    // Get total likes count
    const { results: [countResult] } = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM likes WHERE image_id = ?"
    ).bind(id).all();

    let userLiked = false;
    if (currentUser) {
      const like = await c.env.DB.prepare(
        "SELECT * FROM likes WHERE image_id = ? AND user_id = ?"
      ).bind(id, currentUser.id).first();
      userLiked = !!like;
    }

    return c.json({ 
      count: countResult?.count || 0, 
      user_liked: userLiked 
    });
  } catch (error) {
    console.error('Error fetching likes:', error);
    return c.json({ error: 'Failed to fetch likes' }, 500);
  }
});

// Toggle like for an image
app.post('/api/images/:id/likes', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    // Check if image exists
    const image = await c.env.DB.prepare("SELECT * FROM images WHERE id = ? OR uuid = ?")
      .bind(id, id).first();

    if (!image) {
      return c.json({ error: 'Image not found' }, 404);
    }

    // Check if user already liked this image
    const existingLike = await c.env.DB.prepare(
      "SELECT * FROM likes WHERE image_id = ? AND user_id = ?"
    ).bind(image.id, user?.id).first();

    if (existingLike) {
      return c.json({ error: 'Already liked' }, 400);
    }

    await c.env.DB.prepare(`
      INSERT INTO likes (image_id, user_id, created_at)
      VALUES (?, ?, datetime('now'))
    `).bind(image.id, user?.id).run();

    return c.json({ success: true }, 201);
  } catch (error) {
    console.error('Error adding like:', error);
    return c.json({ error: 'Failed to add like' }, 500);
  }
});

// Remove like from an image
app.delete('/api/images/:id/likes', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');

    const result = await c.env.DB.prepare(
      "DELETE FROM likes WHERE image_id = ? AND user_id = ?"
    ).bind(id, user?.id).run();

    if (result.meta?.changes === 0) {
      return c.json({ error: 'Like not found' }, 404);
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error removing like:', error);
    return c.json({ error: 'Failed to remove like' }, 500);
  }
});

// ============================================================================
// Admin Routes (Temporary)
// ============================================================================

// Cleanup non-Cloudinary images only
app.delete('/api/admin/cleanup-non-cloudinary', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Get user record to check admin role
    const userRecord = await c.env.DB.prepare("SELECT * FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    if (!userRecord || userRecord.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Get count before deletion for verification
    const beforeCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM images WHERE storage_path NOT LIKE '%res.cloudinary.com%'"
    ).first();

    if (!beforeCount || beforeCount.count === 0) {
      return c.json({ 
        success: true, 
        message: 'No non-Cloudinary images found to clean up',
        before_count: 0,
        after_count: 0,
        deleted_counts: {}
      });
    }

    // Execute cleanup
    const result = await cleanupNonCloudinaryImages(c.env.DB);

    // Verify count after deletion
    const afterCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM images WHERE storage_path NOT LIKE '%res.cloudinary.com%'"
    ).first();

    // Set comprehensive cache-busting headers
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('Surrogate-Control', 'no-store');
    c.header('Vary', 'Authorization');

    return c.json({ 
      ...result,
      before_count: beforeCount.count,
      after_count: afterCount?.count || 0,
      verified: (afterCount?.count || 0) === 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up non-Cloudinary images:', error);
    return c.json({ error: 'Failed to cleanup non-Cloudinary images' }, 500);
  }
});

// Enhanced cleanup route with verification and cache-busting
app.delete('/api/admin/cleanup-images', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Get user record to check admin role
    const userRecord = await c.env.DB.prepare("SELECT * FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    if (!userRecord || userRecord.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    // Get counts before deletion for verification
    const beforeCounts: any = {};
    const countQueries = [
      { name: 'image_tags', query: 'SELECT COUNT(*) as count FROM image_tags' },
      { name: 'album_images', query: 'SELECT COUNT(*) as count FROM album_images' },
      { name: 'likes', query: 'SELECT COUNT(*) as count FROM likes' },
      { name: 'comments', query: 'SELECT COUNT(*) as count FROM comments' },
      { name: 'images', query: 'SELECT COUNT(*) as count FROM images' }
    ];

    for (const { name, query } of countQueries) {
      const result = await c.env.DB.prepare(query).first();
      beforeCounts[name] = result?.count || 0;
    }

    // Execute cleanup in correct order to avoid foreign key constraints
    // Use a batch transaction for better atomicity
    const statements = [
      "DELETE FROM image_tags",
      "DELETE FROM album_images", 
      "DELETE FROM likes",
      "DELETE FROM comments",
      "DELETE FROM images",
      "DELETE FROM tags WHERE id NOT IN (SELECT DISTINCT tag_id FROM image_tags)"
    ];

    let deletedCounts: any = {};
    
    // Execute in transaction-like manner with individual statements
    try {
      for (const sql of statements) {
        const result = await c.env.DB.prepare(sql).run();
        const tableName = sql.split(' ')[2]; // Extract table name
        deletedCounts[tableName] = result.meta?.changes || 0;
        console.log(`Executed: ${sql}, Changes: ${result.meta?.changes || 0}`);
      }
    } catch (deleteError) {
      console.error('Error during cleanup:', deleteError);
      throw deleteError;
    }

    // Verify counts after deletion
    const afterCounts: any = {};
    for (const { name, query } of countQueries) {
      const result = await c.env.DB.prepare(query).first();
      afterCounts[name] = result?.count || 0;
    }

    // Set comprehensive cache-busting headers
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('Surrogate-Control', 'no-store');
    c.header('Vary', 'Authorization');

    return c.json({ 
      success: true, 
      message: 'All image data cleaned up successfully',
      before_counts: beforeCounts,
      deleted_counts: deletedCounts,
      after_counts: afterCounts,
      verified: Object.values(afterCounts).every(count => count === 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error cleaning up image data:', error);
    return c.json({ error: 'Failed to cleanup image data' }, 500);
  }
});

// Add a verification route to check current counts
app.get('/api/admin/verify-cleanup', authMiddleware, async (c) => {
  try {
    const user = c.get('user');
    
    // Get user record to check admin role
    const userRecord = await c.env.DB.prepare("SELECT * FROM users WHERE mocha_user_id = ?")
      .bind(user?.id).first();

    if (!userRecord || userRecord.role !== 'admin') {
      return c.json({ error: 'Admin access required' }, 403);
    }

    const counts: any = {};
    const countQueries = [
      { name: 'images', query: 'SELECT COUNT(*) as count FROM images' },
      { name: 'image_tags', query: 'SELECT COUNT(*) as count FROM image_tags' },
      { name: 'album_images', query: 'SELECT COUNT(*) as count FROM album_images' },
      { name: 'likes', query: 'SELECT COUNT(*) as count FROM likes' },
      { name: 'comments', query: 'SELECT COUNT(*) as count FROM comments' }
    ];

    for (const { name, query } of countQueries) {
      const result = await c.env.DB.prepare(query).first();
      counts[name] = result?.count || 0;
    }

    // Set comprehensive cache-busting headers
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('Surrogate-Control', 'no-store');
    c.header('Vary', 'Authorization');

    return c.json({ 
      counts,
      is_clean: Object.values(counts).every(count => count === 0),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error verifying cleanup:', error);
    return c.json({ error: 'Failed to verify cleanup' }, 500);
  }
});

// ============================================================================
// Album Routes
// ============================================================================

// Get albums
app.get('/api/albums', async (c) => {
  try {
    // Set comprehensive cache-busting headers for album listings to ensure fresh data
    c.header('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    c.header('Pragma', 'no-cache');
    c.header('Expires', '0');
    c.header('Surrogate-Control', 'no-store');
    
    const { results } = await c.env.DB.prepare(`
      SELECT a.*, u.name as creator_name, u.picture_url as creator_picture,
             COUNT(ai.image_id) as image_count
      FROM albums a
      LEFT JOIN users u ON a.created_by = u.mocha_user_id
      LEFT JOIN album_images ai ON a.id = ai.album_id
      WHERE a.privacy = 'public'
      GROUP BY a.id, a.uuid, a.name, a.description, a.cover_image_id, a.created_by, a.privacy, a.created_at, a.updated_at, u.name, u.picture_url
      ORDER BY a.created_at DESC
    `).all();

    return c.json({ albums: results });
  } catch (error) {
    console.error('Error fetching albums:', error);
    return c.json({ error: 'Failed to fetch albums' }, 500);
  }
});

// Create album
app.post('/api/albums', authMiddleware, zValidator('json', CreateAlbumSchema), async (c) => {
  try {
    const data = c.req.valid('json');
    const user = c.get('user');

    const uuid = crypto.randomUUID();
    
    const result = await c.env.DB.prepare(`
      INSERT INTO albums (uuid, name, description, created_by, privacy, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(
      uuid,
      data.name,
      data.description || null,
      user?.id,
      data.privacy || 'public'
    ).run();

    const album = await c.env.DB.prepare("SELECT * FROM albums WHERE id = ?")
      .bind(result.meta.last_row_id).first();

    return c.json(album, 201);
  } catch (error) {
    console.error('Error creating album:', error);
    return c.json({ error: 'Failed to create album' }, 500);
  }
});

// Update album
app.put('/api/albums/:id', authMiddleware, async (c) => {
  try {
    const id = c.req.param('id');
    const user = c.get('user');
    const { name, description, privacy } = await c.req.json();

    // Validate required fields
    if (!name || !name.trim()) {
      return c.json({ error: 'Album name is required' }, 400);
    }

    // Check if album exists and user has permission
    const album = await c.env.DB.prepare("SELECT * FROM albums WHERE id = ? OR uuid = ?")
      .bind(id, id).first();

    if (!album) {
      return c.json({ error: 'Album not found' }, 404);
    }

    if (album.created_by !== user?.id) {
      return c.json({ error: 'Access denied' }, 403);
    }

    // Update album
    await c.env.DB.prepare(`
      UPDATE albums 
      SET name = ?, description = ?, privacy = ?, updated_at = datetime('now')
      WHERE id = ? OR uuid = ?
    `).bind(name.trim(), description?.trim() || null, privacy || 'public', id, id).run();

    // Get updated album
    const updatedAlbum = await c.env.DB.prepare("SELECT * FROM albums WHERE id = ? OR uuid = ?")
      .bind(id, id).first();

    return c.json(updatedAlbum);
  } catch (error) {
    console.error('Error updating album:', error);
    return c.json({ error: 'Failed to update album' }, 500);
  }
});

// Fallback route for React Router
app.get('*', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta property="og:title" content="PixelVault" />
    <meta property="og:description" content="Modern extensible image gallery and media platform" />
    <meta
      property="og:image"
      content="https://mocha-cdn.com/og.png"
      type="image/png"
    />
    <meta
      property="og:url"
      content="https://getmocha.com"
    />
    <meta property="og:type" content="website" />
    <meta property="og:author" content="Mocha" />
    <meta property="og:site_name" content="PixelVault" />
    <meta property="twitter:card" content="summary_large_image" />
    <meta property="twitter:site" content="@get_mocha" />
    <meta property="twitter:title" content="PixelVault" />
    <meta property="twitter:description" content="Modern extensible image gallery and media platform" />
    <meta
      property="twitter:image"
      content="https://mocha-cdn.com/og.png"
      type="image/png"
    />
    <link
      rel="shortcut icon"
      href="https://mocha-cdn.com/favicon.ico"
      type="image/x-icon"
    />
    <link
      rel="apple-touch-icon"
      sizes="180x180"
      href="https://mocha-cdn.com/apple-touch-icon.png"
      type="image/png"
    />
    <title>PixelVault</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/react-app/main.tsx"></script>
  </body>
</html>`);
});

export default {
  fetch: app.fetch.bind(app),
};
