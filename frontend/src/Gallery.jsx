import React from 'react'

export function Gallery({ images }) {
    if (!images) return null;

    return (
        <div style={{ marginTop: '0' }}>
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
                <div style={{ textAlign: 'center', marginTop: '2rem', color: 'var(--text-secondary)' }}>
                    <p>No images found.</p>
                </div>
            )}
        </div>
    )
}
