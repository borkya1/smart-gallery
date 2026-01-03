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
  const [searchQuery, setSearchQuery] = useState("");
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
    if (!currentUser) {
      setImages([]);
      return;
    }

    try {
      let results;
      if (!tag) {
        results = await api.getRecentImages(currentUser);
      } else {
        results = await api.searchImages(tag, currentUser);
      }
      setImages(results);
    } catch (e) {
      console.error(e);
      // alert("Failed to load images"); 
    }
  };

  useEffect(() => {
    loadImages();
  }, [currentUser]);

  return (
    <div>
      <Navbar />

      {!currentUser ? (
        <div className="glass-panel" style={{ padding: '2rem', marginBottom: '2rem', textAlign: 'center' }}>
          <p>Please Log In to view your gallery.</p>
        </div>
      ) : (
        <div style={{ maxWidth: '800px', margin: '0 auto', padding: '0 1rem' }}>

          <div style={{ marginBottom: '2rem' }}>
            <form onSubmit={(e) => { e.preventDefault(); loadImages(searchQuery); }} style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <input
                type="text"
                placeholder="Find images by content tags ( e.g. 'blue sky')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button type="submit">Search</button>
            </form>
          </div>

          <div style={{ marginBottom: '3rem' }}>
            <UploadZone onUpload={handleUpload} />
          </div>

        </div>
      )}

      {currentUser && <Gallery images={images} />}
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
