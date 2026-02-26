// src/services/apiService.js
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
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout() {
    await storage.clearAll();
  }

  async requestResetCode(email) {
    return await this.request('/auth/request-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async verifyResetCode(email, code) {
    return await this.request('/auth/verify-reset-code', {
      method: 'POST',
      body: JSON.stringify({ email, code }),
    });
  }

  async resetPasswordWithCode(email, code, newPassword) {
    return await this.request('/auth/reset-password-with-code', {
      method: 'POST',
      body: JSON.stringify({ email, code, newPassword }),
    });
  }

  // ==================== PATIENT ENDPOINTS ====================

  async createPatient(patientData) {
    return await this.request('/patients', {
      method: 'POST',
      body: JSON.stringify(patientData),
    });
  }

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

  async updatePatient(id, updateData) {
    return await this.request(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }

  async searchPatientsByPhone(phone) {
    if (!phone || phone.trim().length < 3) return [];
    return await this.request(
      `/patients/search/phone?q=${encodeURIComponent(phone)}`
    );
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

  async getPatientNotes(patientId) {
    return await this.getPatientHistory(patientId);
  }

  // ==================== ICD-10 ENDPOINTS ====================

async getPopularIcd10Codes() {
  return await this.request('/icd10/popular');
}

async searchIcd10Codes(query) {
  return await this.request(`/icd10/search?q=${encodeURIComponent(query)}`);
}

async getIcd10Code(code) {
  return await this.request(`/icd10/${code}`);
}

  async editSoapNoteWithHistory(noteId, updateData) {
    return await this.request(`/soap-notes/${noteId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
  }
}

export default new ApiService();