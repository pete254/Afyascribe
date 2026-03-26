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
      const response = await fetch(url, { ...options, headers });
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

  // ==================== INVITE CODE ENDPOINTS ====================

  async validateInviteCode(code) {
    return await this.request(`/auth/validate-invite/${code.toUpperCase().trim()}`);
  }

  async registerWithInviteCode(userData) {
    return await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // ==================== FACILITY ADMIN ENDPOINTS ====================

  async getMyInviteCode() {
    return await this.request('/facility/users/invite-code');
  }

  async regenerateInviteCode() {
    return await this.request('/facility/users/invite-code/generate', {
      method: 'POST',
    });
  }

  async getFacilityStaff() {
    return await this.request('/facility/users');
  }

  async createStaff(staffData) {
    return await this.request('/facility/users', {
      method: 'POST',
      body: JSON.stringify(staffData),
    });
  }

  async deactivateStaff(userId, reason) {
    return await this.request(`/facility/users/${userId}/deactivate`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  }

  async reactivateStaff(userId) {
    return await this.request(`/facility/users/${userId}/reactivate`, {
      method: 'PATCH',
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
    if (!query || query.trim().length < 2) return [];
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
    return await this.request(`/patients/search/phone?q=${encodeURIComponent(phone)}`);
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
    return await this.request(queryString ? `/soap-notes?${queryString}` : '/soap-notes');
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
    return await this.request(`/soap-notes/${id}`, { method: 'DELETE' });
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

  async editSoapNoteWithHistory(noteId, updateData) {
    return await this.request(`/soap-notes/${noteId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(updateData),
    });
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

  // ==================== PATIENT VISITS ENDPOINTS ====================

  /**
   * Check in a patient and assign to a doctor.
   * Role: receptionist, facility_admin
   */
  async checkInPatient(patientId, reasonForVisit, assignedDoctorId) {
    return await this.request('/patient-visits/check-in', {
      method: 'POST',
      body: JSON.stringify({ patientId, reasonForVisit, assignedDoctorId }),
    });
  }

  /**
   * Get today's full active queue for the facility.
   * Role: all staff
   */
  async getActiveQueue() {
    return await this.request('/patient-visits/queue');
  }

  /**
   * Get the current doctor's personal queue.
   * Role: doctor
   */
  async getMyQueue() {
    return await this.request('/patient-visits/my-queue');
  }

  /**
   * Get queue stats for home screen counters.
   * Role: all staff
   */
  async getQueueStats() {
    return await this.request('/patient-visits/stats');
  }

  /**
   * Submit triage vitals for a visit.
   * Role: nurse, doctor
   */
  async submitTriage(visitId, triageData) {
    return await this.request(`/patient-visits/${visitId}/triage`, {
      method: 'PATCH',
      body: JSON.stringify(triageData),
    });
  }

  /**
   * Reassign a visit to a different doctor.
   * Role: receptionist, facility_admin
   */
  async reassignVisit(visitId, assignedDoctorId) {
    return await this.request(`/patient-visits/${visitId}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedDoctorId }),
    });
  }

  /**
   * Mark patient as currently with doctor (called when doctor opens visit).
   * Role: doctor
   */
  async markWithDoctor(visitId) {
    return await this.request(`/patient-visits/${visitId}/with-doctor`, {
      method: 'PATCH',
    });
  }

  /**
   * Mark visit as completed.
   * Role: doctor, nurse
   */
  async completeVisit(visitId) {
    return await this.request(`/patient-visits/${visitId}/complete`, {
      method: 'PATCH',
    });
  }

  /**
   * Cancel a visit (no-show / patient left).
   * Role: receptionist, facility_admin
   */
  async cancelVisit(visitId) {
    return await this.request(`/patient-visits/${visitId}/cancel`, {
      method: 'PATCH',
    });
  }

  /**
   * Get a single visit by ID.
   */
  async getVisit(visitId) {
    return await this.request(`/patient-visits/${visitId}`);
  }

  /**
   * Get facility doctors list (for assignment dropdown).
   */
  async getFacilityDoctors() {
    const staff = await this.getFacilityStaff();
    return staff.filter(u => u.role === 'doctor');
  }

  // ==================== BILLING ENDPOINTS ====================

  /**
   * Create a bill for a visit.
   * Role: receptionist, facility_admin
   */
  async createBill(visitId, serviceType, serviceDescription, amount) {
    return await this.request('/billing', {
      method: 'POST',
      body: JSON.stringify({ visitId, serviceType, serviceDescription, amount }),
    });
  }

  /**
   * Get all bills for a specific visit.
   */
  async getVisitBills(visitId) {
    return await this.request(`/billing/visit/${visitId}`);
  }

  /**
   * Get billing summary (total / paid / unpaid) for a visit.
   */
  async getVisitBillingSummary(visitId) {
    return await this.request(`/billing/visit/${visitId}/summary`);
  }

  /**
   * Mark a bill as paid. Automatically advances visit to waiting queue
   * when all bills for the visit are cleared.
   * Role: receptionist, facility_admin
   */
    async markBillPaid(billId, paymentData) {
      return await this.request(`/billing/${billId}/pay`, {
        method: 'PATCH',
        body: JSON.stringify(paymentData),
        // paymentData: { paymentMethod, amountReceived, mpesaReference? }
      });
    }

  /**
   * Waive a bill (admin only).
   */
  async waiveBill(billId, waiverReason) {
    return await this.request(`/billing/${billId}/waive`, {
      method: 'PATCH',
      body: JSON.stringify({ waiverReason }),
    });
  }

  /**
   * Get today's unpaid bills for the facility.
   * Role: receptionist, facility_admin
   */
  async getUnpaidBillsToday() {
    return await this.request('/billing/unpaid-today');
  }

  // ==================== DRAFT SOAP NOTE ENDPOINTS ====================

  /**
   * Create a new draft. All SOAP fields are optional.
   * Returns the saved draft with its id.
   */
  async createDraft(patientId, fields = {}) {
    return await this.request('/soap-notes/draft', {
      method: 'POST',
      body: JSON.stringify({ patientId, ...fields }),
    });
  }

  /**
   * Update an existing draft by id.
   */
  async updateDraft(draftId, patientId, fields = {}) {
    return await this.request(`/soap-notes/draft/${draftId}`, {
      method: 'POST',
      body: JSON.stringify({ patientId, ...fields }),
    });
  }

  /**
   * Get all drafts for the current user.
   */
  async getMyDrafts() {
    return await this.request('/soap-notes/drafts');
  }

  /**
   * Finalise a draft — saves it as a completed SOAP note (status: pending).
   */
  async finaliseDraft(draftId, patientId, fields = {}) {
    return await this.request(`/soap-notes/draft/${draftId}/finalise`, {
      method: 'POST',
      body: JSON.stringify({ patientId, ...fields }),
    });
  }

  // ==================== INSURANCE SCHEMES ENDPOINTS ====================

async getInsuranceSchemes() {
  return await this.request('/insurance-schemes');
}

async createInsuranceScheme(data) {
  return await this.request('/insurance-schemes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

async updateInsuranceScheme(id, data) {
  return await this.request(`/insurance-schemes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

async deleteInsuranceScheme(id) {
  return await this.request(`/insurance-schemes/${id}`, {
    method: 'DELETE',
  });
}

// ==================== PATIENT DOCUMENTS ENDPOINTS ====================

/**
 * Get all documents for a patient
 */
async getPatientDocuments(patientId) {
  return await this.request(`/patient-documents/patient/${patientId}`);
}

/**
 * Upload a document (image or PDF) for a patient
 * pendingFile: { uri, name, type, size, base64 }
 */
async uploadPatientDocument(patientId, pendingFile, category, notes) {
  const token = await storage.getToken();

  const formData = new FormData();
  formData.append('patientId', patientId);
  formData.append('category', category || 'other');
  if (notes) formData.append('notes', notes);

  // Append the file
  formData.append('file', {
    uri: pendingFile.uri,
    name: pendingFile.name,
    type: pendingFile.type,
  });

  const url = `${this.baseURL}/patient-documents/upload`;
  console.log(`🌐 Uploading document to: ${url}`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  const contentType = response.headers.get('content-type');
  let data;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMessage = data?.message || data?.error || data || 'Upload failed';
    console.error(`❌ Upload Error:`, errorMessage);
    throw new Error(errorMessage);
  }

  console.log('✅ Document upload successful');
  return data;
}

/**
 * Delete a patient document
 */
async deletePatientDocument(documentId) {
  return await this.request(`/patient-documents/${documentId}`, {
    method: 'DELETE',
  });
}

// ==================== REPORTS ENDPOINTS ====================

async getReportsPatientsToday() {
  return await this.request('/reports/patients-today');
}

async getFinancialReport(from, to) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  return await this.request(`/reports/financials?${params.toString()}`);
}

async getInsuranceClaimsReport(from, to, scheme) {
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (scheme) params.append('scheme', scheme);
  return await this.request(`/reports/insurance-claims?${params.toString()}`);
}

// Returns the CSV download URL (opened via Linking or expo-sharing)
getInsuranceClaimsExportUrl(from, to, scheme) {
  const BASE = 'https://afyascribe-backend.onrender.com';
  const params = new URLSearchParams();
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (scheme) params.append('scheme', scheme);
  return `${BASE}/reports/insurance-claims/export?${params.toString()}`;
}

  /**
   * Delete a draft permanently.
   */
  async deleteDraft(draftId) {
    return await this.request(`/soap-notes/draft/${draftId}`, {
      method: 'DELETE',
    });
  }

   // ── Shared multipart upload helper ────────────────────────────────────────
  async _uploadDocument(endpoint, fileObj, extraFields = {}) {
    const storage = require('../utils/storage').default;
    const token = await storage.getToken();
 
    const formData = new FormData();
 
    // Append extra fields
    Object.entries(extraFields).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, String(val));
    });
 
    // Append file
    formData.append('file', {
      uri: fileObj.uri,
      name: fileObj.name,
      type: fileObj.type,
    });
 
    const url = `${this.baseURL}${endpoint}`;
    console.log(`🌐 Uploading document to: ${url}`);
 
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'multipart/form-data',
      },
      body: formData,
    });
 
    const contentType = response.headers.get('content-type');
    const data = contentType?.includes('application/json')
      ? await response.json()
      : await response.text();
 
    if (!response.ok) {
      throw new Error(data?.message || data?.error || data || 'Upload failed');
    }
 
    console.log('✅ Document upload successful');
    return data;
  }
 
  // ── PATIENT-LEVEL document (onboarding) ───────────────────────────────────
  async uploadPatientLevelDocument(patientId, fileObj) {
    return this._uploadDocument('/patient-documents/patient', fileObj, {
      patientId,
      documentName: fileObj.documentName,
      category:     fileObj.category || 'other',
      notes:        fileObj.notes,
    });
  }
 
  // ── SOAP NOTE-LEVEL document ───────────────────────────────────────────────
  async uploadSoapNoteDocument(patientId, soapNoteId, fileObj) {
    return this._uploadDocument('/patient-documents/soap-note', fileObj, {
      patientId,
      soapNoteId,
      documentName: fileObj.documentName,
      category:     fileObj.category || 'other',
      notes:        fileObj.notes,
    });
  }
 
  // ── GET: patient-level docs ────────────────────────────────────────────────
  async getPatientLevelDocs(patientId) {
    return this.request(`/patient-documents/patient/${patientId}`);
  }
 
  // ── GET: docs for a specific SOAP note ────────────────────────────────────
  async getSoapNoteDocs(soapNoteId) {
    return this.request(`/patient-documents/soap-note/${soapNoteId}`);
  }
 
  // ── GET: ALL docs for a patient (both scopes) ─────────────────────────────
  async getAllPatientDocs(patientId) {
    return this.request(`/patient-documents/patient/${patientId}/all`);
  }
 
  // ── DELETE a document ──────────────────────────────────────────────────────
  async deletePatientDocument(documentId) {
    return this.request(`/patient-documents/${documentId}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();