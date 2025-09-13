# PixelVault

**Next-generation image management platform powered by AI and edge computing**

PixelVault is a modern, high-performance image gallery and media platform built for the edge. It combines advanced AI capabilities with lightning-fast global delivery to provide an exceptional image management experience.

## ✨ Features

- **Modern Gallery**: Advanced image management with AI-powered organization and smart filtering
- **Batch Processing**: High-performance bulk upload with automated metadata extraction
- **Vector Search**: Semantic image search powered by advanced machine learning algorithms
- **Dynamic Themes**: Real-time theme customization with accessibility compliance
- **AI Generation**: State-of-the-art image synthesis with prompt-based control systems
- **Video Support**: Full video upload and management capabilities
- **Access Control**: Enterprise-grade permission management with role-based authentication
- **Mobile Responsive**: Optimized for all devices and screen sizes

## 🚀 Tech Stack

### Frontend
- **React 18** - Modern UI framework with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Lightning-fast build system and development server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Framer Motion** - Advanced animations and transitions
- **Three.js & React Three Fiber** - 3D graphics and animations

### Backend
- **Cloudflare Workers** - Edge computing platform for global performance
- **Hono** - Lightweight web framework for Cloudflare Workers
- **D1 Database** - SQLite-based edge database
- **Zod** - Runtime type validation

### AI & Media Processing
- **OpenAI GPT Models** - AI-powered image generation and analysis
- **Google Gemini Vision** - Advanced image understanding
- **Cloudinary** - Image and video processing and delivery
- **Vector Search** - Semantic similarity search

### Authentication & Security
- **Mocha Users Service** - Enterprise authentication system
- **Role-based Access Control** - Fine-grained permission management
- **End-to-end Encryption** - Secure data handling

## 📋 Prerequisites

- Node.js 18+ and npm
- Cloudflare account with Workers and D1 access
- Cloudinary account for media processing

## 🛠️ Setup Instructions

### 1. Clone and Install

```bash
git clone <repository-url>
cd pixelvault
npm install
```

### 2. Environment Configuration

The following environment variables need to be configured:

#### Required API Keys
- `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `CLOUDINARY_UPLOAD_PRESET` - Cloudinary upload preset name

#### Optional AI Services (for enhanced features)
- `OPENAI_API_KEY` - OpenAI API key for AI image generation
- `GEMINI_API_KEY` - Google Gemini API key for image analysis
- `HUGGING_FACE_API_KEY` - Hugging Face API key for additional AI models
- `AI_HORDE_API_KEY` - AI Horde API key for distributed AI processing
- `KOBOLD_API_URL` - Kobold API endpoint URL
- `KOBOLD_API_KEY` - Kobold API key

#### Authentication (Pre-configured)
- `MOCHA_USERS_SERVICE_API_URL` - Authentication service endpoint
- `MOCHA_USERS_SERVICE_API_KEY` - Authentication service API key

### 3. Database Setup

The database will be automatically initialized with the required schema when you first deploy to Cloudflare Workers.

### 4. Cloudinary Setup

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com)
2. Note your cloud name, API key, and API secret from the dashboard
3. Create an upload preset:
   - Go to Settings → Upload
   - Create a new upload preset
   - Set it to "Unsigned" for direct uploads
   - Configure any transformation settings as needed

### 5. Development Server

```bash
npm run dev
```

The development server will start at `http://localhost:5173`

### 6. Production Deployment

```bash
npm run build
npm run deploy
```

## 🎯 Usage

### Basic Image Management
1. **Upload Images**: Use the Upload page to add single or multiple images
2. **Organize**: Create albums and tag images for better organization
3. **Search**: Use the powerful search functionality to find images quickly
4. **Share**: Control privacy settings and share images with others

### Advanced Features
1. **AI Generation**: Create images from text descriptions using the AI generator
2. **Vector Search**: Find visually similar images using AI-powered semantic search
3. **Batch Operations**: Perform bulk actions on multiple images
4. **Theme Customization**: Customize the appearance with the built-in theme editor

### Video Management
1. **Upload Videos**: Support for MP4, MOV, AVI, MKV, and WebM formats
2. **Automatic Thumbnails**: Automatically generated video previews
3. **Metadata Extraction**: Automatic extraction of video properties

## 🔧 Configuration

### Privacy Settings
- **Public**: Visible to everyone
- **Unlisted**: Accessible via direct link only
- **Private**: Only visible to the uploader

### User Roles
- **Admin**: Full system access and user management
- **Editor**: Upload and manage content
- **Visitor**: View public content only

### Upload Limits
- **Images**: Up to 10MB per file
- **Videos**: Up to 500MB per file
- **Supported Formats**: 
  - Images: JPG, PNG, GIF, WebP
  - Videos: MP4, MOV, AVI, MKV, WebM

## 🏗️ Project Structure

```
src/
├── react-app/           # Frontend React application
│   ├── components/      # Reusable UI components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   └── main.tsx        # Application entry point
├── worker/             # Cloudflare Worker backend
│   └── index.ts        # API routes and handlers
└── shared/             # Shared types and utilities
    └── types.ts        # TypeScript type definitions
```

## 🚀 Performance Features

- **Edge Computing**: Deployed on Cloudflare's global edge network
- **Automatic Optimization**: Images are automatically optimized for web delivery
- **Lazy Loading**: Images load as needed for optimal performance
- **Caching**: Intelligent caching strategies for fast load times
- **CDN Distribution**: Global content delivery for minimal latency

## 🔐 Security

- **Authentication**: Secure user authentication and session management
- **Data Encryption**: All sensitive data is encrypted in transit and at rest
- **Access Control**: Granular permission system for content access
- **Rate Limiting**: Built-in protection against abuse
- **Content Validation**: Comprehensive input validation and sanitization

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the documentation
- Open an issue on GitHub
- Contact the development team

---

**PixelVault** - Revolutionizing image management with AI and edge computing.
