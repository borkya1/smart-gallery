import React, { useState, useCallback } from 'react'

export function UploadZone({ onUpload }) {
    const [isDragActive, setIsDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragActive(true);
        } else if (e.type === 'dragleave') {
            setIsDragActive(false);
        }
    }, []);

    const handleDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files[0]);
        }
    }, []);

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files[0]);
        }
    };

    const handleFiles = async (file) => {
        setUploading(true);
        try {
            await onUpload(file);
        } catch (error) {
            console.error("Upload failed", error);
            alert("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div
            className={`upload-zone glass-panel ${isDragActive ? 'active' : ''}`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
        >
            <input
                type="file"
                id="file-upload"
                style={{ display: 'none' }}
                onChange={handleChange}
                accept="image/*"
            />
            {uploading ? (
                <p>Analyze & Uploading... 🤖</p>
            ) : (
                <div>
                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>
                        Drag & Drop your image here
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        or click to select
                    </p>
                </div>
            )}
        </div>
    )
}
