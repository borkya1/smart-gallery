import React, { useState, useEffect } from 'react'
import { UploadZone } from './UploadZone'
import { Gallery } from './Gallery'

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function App() {
  const [images, setImages] = useState([]);

  const handleUpload = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Server error');
    }

    const data = await response.json();
    console.log("Uploaded:", data);

    // Add to gallery immediately
    // Fix relative URL for local display
    if (data.image_url && !data.image_url.startsWith('http')) {
      data.image_url = `${API_URL}${data.image_url}`;
    }
    // Map backend 'image_url' to frontend 'url' expected by Gallery
    data.url = data.image_url;

    setImages(prev => [data, ...prev]);
  };

  const loadImages = async (tag) => {
    if (!tag) {
      // If search is cleared, load recents
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

  useEffect(() => {
    loadRecentImages();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>
        Smart<span style={{ color: 'var(--accent-color)' }}>Gallery</span>
      </h1>
      <p style={{ marginBottom: '3rem', color: 'var(--text-secondary)' }}>
        AI-Powered Semantic Image Search
      </p>

      <UploadZone onUpload={handleUpload} />

      <Gallery images={images} loadImages={loadImages} />
    </div>
  )
}

export default App
