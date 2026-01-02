
import React, { useState, useEffect } from 'react'
import { UploadZone } from './UploadZone'
import { Gallery } from './Gallery'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { Navbar } from './components/Navbar'
import { api } from './api/client'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Signup from "./pages/Signup"
import Login from "./pages/Login"

function Home() {
  const [images, setImages] = useState([]);
  const { currentUser } = useAuth();

  const handleUpload = async (file) => {
    try {
      const result = await api.uploadImage(file, currentUser);
      console.log("Uploaded:", result);
      setImages(prev => [result, ...prev]);
    } catch (e) {
      console.error(e);
      alert(e.message || "Upload failed");
    }
  };

  const loadImages = async (tag) => {
    try {
      let results;
      if (!tag) {
        results = await api.getRecentImages();
      } else {
        results = await api.searchImages(tag);
      }
      setImages(results);
    } catch (e) {
      console.error(e);
      alert("Failed to load images");
    }
  };

  useEffect(() => {
    loadImages();
  }, []);

  return (
    <div>
      <Navbar />

      {currentUser && <UploadZone onUpload={handleUpload} />}
      {!currentUser && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p>Please Log In to upload images.</p>
        </div>
      )}

      <Gallery images={images} loadImages={loadImages} />
    </div>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
