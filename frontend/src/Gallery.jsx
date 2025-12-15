import React, { useState, useEffect } from 'react'

export function Gallery({ images, loadImages }) {
    const [query, setQuery] = useState("");

    const handleSearch = (e) => {
        e.preventDefault();
        loadImages(query);
    };

    return (
        <div style={{ marginTop: '3rem' }}>
            <div className="glass-panel" style={{ padding: '1rem', display: 'inline-block', marginBottom: '2rem' }}>
                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Search tags (e.g., 'cat', 'sunset')..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                    />
                    <button type="submit">Search</button>
                </form>
            </div>

            <div className="gallery-grid">
                {images.map((img) => (
                    <div key={img.id} className="image-card glass-panel">
                        <img
                            src={img.url}
                            alt={img.filename}
                            loading="lazy"
                        />
                        <div className="tags">
                            {img.tags && img.tags.map((tag, idx) => (
                                <span key={idx} className="tag">#{tag}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {images.length === 0 && (
                <p style={{ color: 'var(--text-secondary)' }}>No images found. Try uploading one!</p>
            )}
        </div>
    )
}
