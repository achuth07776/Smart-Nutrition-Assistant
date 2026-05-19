const BASE_URL = import.meta.env.VITE_API_URL || '';

async function request(endpoint, options = {}) {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Auth
  login(email, password) {
    return request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  signup(email, password, name = '') {
    return request('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  },

  logout(token) {
    return request('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  },

  // Chat
  chat(message, userId, conversationHistory = []) {
    return request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message, user_id: userId, conversation_history: conversationHistory }),
    });
  },

  // Voice log
  voiceLog(audioBase64, userId, languageCode = 'hi-IN') {
    return request('/api/voice-log', {
      method: 'POST',
      body: JSON.stringify({ audio_base64: audioBase64, user_id: userId, language_code: languageCode }),
    });
  },

  // Text log
  textLog(text, userId) {
    return request('/api/text-log', {
      method: 'POST',
      body: JSON.stringify({ text, user_id: userId }),
    });
  },

  // Image log
  imageLog(imageBase64, userId, mimeType = 'image/jpeg') {
    return request('/api/image-log', {
      method: 'POST',
      body: JSON.stringify({ image_base64: imageBase64, user_id: userId, mime_type: mimeType }),
    });
  },

  // Confirm meal
  confirmMeal(mealLogId, userId, editedItems = null) {
    return request('/api/confirm-meal', {
      method: 'POST',
      body: JSON.stringify({ meal_log_id: mealLogId, user_id: userId, edited_items: editedItems }),
    });
  },

  // Dashboard
  getDashboard(userId) {
    return request(`/api/dashboard/${userId}`);
  },

  // History
  getHistory(userId, limit = 50) {
    return request(`/api/history/${userId}?limit=${limit}`);
  },

  // Profile
  getProfile(userId) {
    return request(`/api/profile/${userId}`);
  },

  updateProfile(profileData) {
    return request('/api/profile', {
      method: 'POST',
      body: JSON.stringify(profileData),
    });
  },
};
