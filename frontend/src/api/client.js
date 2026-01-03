
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

/**
 * Helper to get the token or throw if not logged in
 */
async function getAuthHeaders(currentUser) {
    if (!currentUser) {
        throw new Error("User must be logged in");
    }
    const token = await currentUser.getIdToken();
    return {
        'Authorization': `Bearer ${token}`
    };
}

export const api = {
    /**
     * Upload an image file
     */
    uploadImage: async (file, currentUser) => {
        let headers = {};
        if (currentUser) {
            headers = await getAuthHeaders(currentUser);
        }

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${API_URL}/upload`, {
            method: 'POST',
            body: formData,
            headers: headers // Fetch auto-sets Content-Type for FormData
        });

        if (!response.ok) {
            let errorMsg = 'Upload failed';
            try {
                const errorData = await response.json();
                if (errorData.detail) errorMsg = errorData.detail;
            } catch (e) { }
            throw new Error(errorMsg);
        }

        let data = await response.json();
        return normalizeUrl(data);
    },

    /**
     * Search for images by tag
     */
    searchImages: async (tag, currentUser) => {
        const headers = await getAuthHeaders(currentUser);
        const response = await fetch(`${API_URL}/search?tag=${encodeURIComponent(tag)}`, {
            headers: headers
        });
        if (!response.ok) throw new Error("Search failed");

        const data = await response.json();
        return (data.results || []).map(normalizeUrl);
    },

    /**
     * Get recent images
     */
    getRecentImages: async (currentUser) => {
        const headers = await getAuthHeaders(currentUser);
        const response = await fetch(`${API_URL}/images`, {
            headers: headers
        });
        if (!response.ok) throw new Error("Failed to load images");

        const data = await response.json();
        return (data.results || []).map(normalizeUrl);
    },

    /**
     * Send OTP to email
     */
    sendOtp: async (email) => {
        const response = await fetch(`${API_URL}/auth/send-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });
        if (!response.ok) throw new Error("Failed to send OTP");
        return await response.json();
    },

    /**
     * Verify OTP code
     */
    verifyOtp: async (email, code) => {
        const response = await fetch(`${API_URL}/auth/verify-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, code })
        });
        if (!response.ok) throw new Error("Invalid OTP");
        return await response.json();
    }
};

/**
 * Normalizes image URLs to be absolute if needed
 */
function normalizeUrl(img) {
    if (img.image_url && !img.image_url.startsWith('http')) {
        img.image_url = `${API_URL}${img.image_url}`;
    }
    if (img.url && !img.url.startsWith('http')) {
        if (img.url.startsWith('/')) {
            img.url = `${API_URL}${img.url}`;
        } else {
            img.url = `${API_URL}/${img.url}`;
        }
    }
    // Ensure both fields exist for compatibility
    if (!img.url && img.image_url) img.url = img.image_url;
    if (!img.image_url && img.url) img.image_url = img.url;

    return img;
}
