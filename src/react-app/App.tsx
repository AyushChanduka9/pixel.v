import { BrowserRouter as Router, Routes, Route } from "react-router";
import { AuthProvider } from "@getmocha/users-service/react";
import HomePage from "@/react-app/pages/Home";
import AuthCallbackPage from "@/react-app/pages/AuthCallback";
import GalleryPage from "@/react-app/pages/Gallery";
import AlbumsPage from "@/react-app/pages/Albums";
import AlbumPage from "@/react-app/pages/Album";
import UploadPage from "@/react-app/pages/Upload";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/gallery" element={<GalleryPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          <Route path="/album/:id" element={<AlbumPage />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
