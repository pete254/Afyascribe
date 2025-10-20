// src/services/apiService.js
import storage from '../utils/storage';
import Constants from 'expo-constants';

// 🔍 DIAGNOSTIC: Check all possible sources for API URL
console.log('🔍 ========== API_URL DIAGNOSTIC ==========');
console.log('1. Constants.expoConfig?.extra:', Constants.expoConfig?.extra);
console.log('2. process.env.EXPO_PUBLIC_API_URL:', process.env.EXPO_PUBLIC_API_URL ? 'EXISTS' : 'MISSING');

// ✅ FIXED: Read from multiple sources (same pattern as other services)
const API_URL = 
  Constants.expoConfig?.extra?.API_URL ||                  // EAS builds
  Constants.manifest?.extra?.API_URL ||                    // Legacy
  Constants.manifest2?.extra?.API_URL ||                   // Legacy
  process.env.EXPO_PUBLIC_API_URL ||                       // Local dev
  'https://afyascribe-backend.onrender.com';               // Fallback

console.log('3. Final API_URL:', API_URL);
console.log('==========================================');

console.log('🌐 API Service initialized with URL:', API_URL);

/**
 * API Service for backend communication
 */
class ApiService {
  /**
   * Make authenticated API request
   */
  async request(endpoint, options = {}) {
    try {
      const token = await storage.getToken();
      
      const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        ...options,
        headers,
      };

      console.log(`📡 API Request: ${options.method || 'GET'} ${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, config);
      
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`✅ API Success: ${endpoint}`);
      return data;
    } catch (error) {
      console.error(`❌ API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.access_token) {
      await storage.saveToken(data.access_token);
      await storage.saveUser(data.user);
    }

    return data;
  }

  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    return data;
  }

  async logout() {
    await storage.clearAll();
  }

  async forgotPassword(email) {
    const data = await this.request('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return data;
  }

  async resetPassword(token, newPassword) {
    const data = await this.request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });

    return data;
  }

  // ==================== PATIENT ENDPOINTS ====================

  async searchPatients(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return await this.request(`/patients/search?q=${encodeURIComponent(query)}`);
  }

  async getRecentPatients(limit = 10) {
    return await this.request(`/patients/recent?limit=${limit}`);
  }

  async getAllPatients(page = 1, limit = 20) {
    return await this.request(`/patients?page=${page}&limit=${limit}`);
  }

  async getPatient(id) {
    return await this.request(`/patients/${id}`);
  }

  // ==================== SOAP NOTES ENDPOINTS ====================

  async createSoapNote(noteData) {
    return await this.request('/soap-notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  async getSoapNotes(params = {}) {
    const queryParams = new URLSearchParams();
    
    if (params.page) queryParams.append('page', params.page);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.status) queryParams.append('status', params.status);
    if (params.patientName) queryParams.append('patientName', params.patientName);
    if (params.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params.sortOrder) queryParams.append('sortOrder', params.sortOrder);

    const queryString = queryParams.toString();
    const endpoint = queryString ? `/soap-notes?${queryString}` : '/soap-notes';
    
    return await this.request(endpoint);
  }

  async getSoapNote(id) {
    return await this.request(`/soap-notes/${id}`);
  }

  async updateSoapNote(id, updateData) {
    return await this.request(`/soap-notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async updateSoapNoteStatus(id, status) {
    return await this.request(`/soap-notes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  async deleteSoapNote(id) {
    return await this.request(`/soap-notes/${id}`, {
      method: 'DELETE',
    });
  }

  async getSoapNotesStatistics() {
    return await this.request('/soap-notes/statistics');
  }

  async getPatientHistory(patientId) {
    return await this.request(`/soap-notes/patient/${patientId}`);
  }

  async editSoapNoteWithHistory(noteId, updateData) {
    return await this.request(`/soap-notes/${noteId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }
}

export default new ApiService();