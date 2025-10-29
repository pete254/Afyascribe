// src/services/apiService.js - COMPLETE & FIXED VERSION
import storage from '../utils/storage';

class ApiService {
  constructor() {
    this.baseURL = 'https://afyascribe-backend.onrender.com';
  }

  // ==================== CORE REQUEST METHOD ====================

  async request(endpoint, options = {}) {
    const token = await storage.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    
    console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log(`📡 API Response: ${response.status} ${response.statusText}`);

      const contentType = response.headers.get('content-type');
      let data;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        const errorMessage = data?.message || data?.error || data || 'Request failed';
        console.error(`❌ API Error:`, errorMessage);
        throw new Error(errorMessage);
      }

      console.log(`✅ API Success:`, data);
      return data;
    } catch (error) {
      console.error(`❌ API Request Failed:`, error);
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

  // ✅ NEW: Request 6-digit reset code
  async requestResetCode(email) {
    const data = await this.request('/auth/request-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });

    return data;
  }

  // ✅ NEW: Verify 6-digit reset code
  async verifyResetCode(email, code) {
    const data = await this.request('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });

    return data;
  }

  // ✅ NEW: Reset password with 6-digit code
  async resetPasswordWithCode(email, code, newPassword) {
    const data = await this.request('/auth/reset-password-with-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
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

  // ✅ FIXED: Added updateSoapNoteStatus method
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

  // ✅ FIXED: Renamed getPatientNotes to getPatientHistory (matches PatientHistoryScreen usage)
  async getPatientHistory(patientId) {
    return await this.request(`/soap-notes/patient/${patientId}`);
  }

  // ✅ ADDED: Keep alias for backward compatibility
  async getPatientNotes(patientId) {
    return await this.getPatientHistory(patientId);
  }

  // ✅ FIXED: Added editSoapNoteWithHistory method (used in PatientHistoryScreen)
  async editSoapNoteWithHistory(noteId, updateData) {
    return await this.request(`/soap-notes/${noteId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  // ✅ ADDED: Get SOAP notes statistics
  async getSoapNotesStatistics() {
    return await this.request('/soap-notes/statistics');
  }

  // ==================== AI FORMATTING ENDPOINT ====================

  async formatWithAI(text, section) {
    return await this.request('/soap-notes/format', {
      method: 'POST',
      body: JSON.stringify({ text, section }),
    });
  }
}

export default new ApiService();