// src/services/apiService.js
import storage from '../utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

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

      // Add authorization header if token exists
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const config = {
        ...options,
        headers,
      };

      console.log(`API Request: ${options.method || 'GET'} ${API_URL}${endpoint}`);
      
      const response = await fetch(`${API_URL}${endpoint}`, config);
      
      // Handle different response types
      if (response.status === 204) {
        return { success: true };
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      throw error;
    }
  }

  // ==================== AUTH ENDPOINTS ====================

  /**
   * Login user
   */
  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    // Save token and user data
    if (data.access_token) {
      await storage.saveToken(data.access_token);
      await storage.saveUser(data.user);
    }

    return data;
  }

  /**
   * Register new user
   */
  async register(userData) {
    const data = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });

    return data;
  }

  /**
   * Logout user
   */
  async logout() {
    await storage.clearAll();
  }

  // ==================== PATIENT ENDPOINTS ====================

  /**
   * Search patients by name or ID
   */
  async searchPatients(query) {
    if (!query || query.trim().length < 2) {
      return [];
    }
    return await this.request(`/patients/search?q=${encodeURIComponent(query)}`);
  }

  /**
   * Get recently registered patients
   */
  async getRecentPatients(limit = 10) {
    return await this.request(`/patients/recent?limit=${limit}`);
  }

  /**
   * Get all patients (paginated)
   */
  async getAllPatients(page = 1, limit = 20) {
    return await this.request(`/patients?page=${page}&limit=${limit}`);
  }

  /**
   * Get patient by ID
   */
  async getPatient(id) {
    return await this.request(`/patients/${id}`);
  }

  // ==================== SOAP NOTES ENDPOINTS ====================

  /**
   * Create new SOAP note
   */
  async createSoapNote(noteData) {
    return await this.request('/soap-notes', {
      method: 'POST',
      body: JSON.stringify(noteData),
    });
  }

  /**
   * Get all SOAP notes (paginated and filtered)
   */
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

  /**
   * Get single SOAP note by ID
   */
  async getSoapNote(id) {
    return await this.request(`/soap-notes/${id}`);
  }

  /**
   * Update SOAP note
   */
  async updateSoapNote(id, updateData) {
    return await this.request(`/soap-notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  /**
   * Update SOAP note status
   */
  async updateSoapNoteStatus(id, status) {
    return await this.request(`/soap-notes/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Delete SOAP note
   */
  async deleteSoapNote(id) {
    return await this.request(`/soap-notes/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get SOAP notes statistics
   */
  async getSoapNotesStatistics() {
    return await this.request('/soap-notes/statistics');
  }
}

export default new ApiService();