import React, { useState, useEffect } from 'react'
import { UploadZone } from './UploadZone'
import { Gallery } from './Gallery'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom'
import Signup from "./pages/Signup"
import Login from "./pages/Login"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function Home() {
  const [images, setImages] = useState([]);
  const { currentUser, logout } = useAuth()
  const navigate = useNavigate()

  const handleUpload = async (file) => {
    if (!currentUser) {
      alert("Please log in to upload!");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    // Get Token
    const token = await currentUser.getIdToken();

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Server error');
    }

    const data = await response.json();
    console.log("Uploaded:", data);

    if (data.image_url && !data.image_url.startsWith('http')) {
      data.image_url = `${API_URL}${data.image_url}`;
    }
    data.url = data.image_url;

    setImages(prev => [data, ...prev]);
  };

  const loadImages = async (tag) => {
    if (!tag) {
      loadRecentImages();
      return;
    }
    try {
      const response = await fetch(`${API_URL}/search?tag=${encodeURIComponent(tag)}`);
      const data = await response.json();
      const results = (data.results || []).map(img => ({
        ...img,
        url: img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`
      }));
      setImages(results);
    } catch (e) {
      console.error(e);
      alert("Search failed");
    }
  };

  const loadRecentImages = async () => {
    try {
      const response = await fetch(`${API_URL}/images`);
      const data = await response.json();
      const results = (data.results || []).map(img => ({
        ...img,
        url: img.url.startsWith('http') ? img.url : `${API_URL}${img.url}`
      }));
      setImages(results);
    } catch (e) {
      console.error("Failed to load recent images", e);
    }
  };

  async function handleLogout() {
    try {
      await logout()
      navigate("/login")
    } catch {
      console.error("Failed to log out")
    }
  }

  useEffect(() => {
    loadRecentImages();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
            Smart<span style={{ color: 'var(--accent-color)' }}>Gallery</span>
          </h1>
          <p style={{ margin: 0, color: 'var(--text-secondary)' }}>
            AI-Powered Semantic Image Search
          </p>
        </div>
        <div>
          {currentUser ? (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span>{currentUser.email}</span>
              <button onClick={handleLogout} style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}>Log Out</button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => navigate("/login")}>Log In</button>
              <button onClick={() => navigate("/signup")} style={{ background: 'var(--accent-color)', borderColor: 'var(--accent-color)' }}>Sign Up</button>
            </div>
          )}
        </div>
      </div>

      {currentUser && <UploadZone onUpload={handleUpload} />}
      {!currentUser && (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p>Please <span style={{ color: 'var(--accent-color)', cursor: 'pointer' }} onClick={() => navigate("/login")}>Log In</span> to upload images.</p>
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
