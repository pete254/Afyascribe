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

  async createClinic(clinicData) {
    const data = await this.request('/auth/create-clinic', {
      method: 'POST',
      body: JSON.stringify(clinicData),
    });
    if (data.access_token) {
      await storage.saveToken(data.access_token);
      await storage.saveUser(data.user);
    }
    return data;
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

  /**
   * Get all doctors in the facility.
   * Uses a dedicated endpoint accessible to ALL staff roles (not just owners).
   * Safe to call from queue, triage, and SOAP note screens.
   */
  async getFacilityDoctors() {
    return await this.request('/facility/users/doctors');
  }

  // ==================== FACILITY LOGO ENDPOINTS ====================

  async uploadFacilityLogo(fileObj) {
    const token = await storage.getToken();
    const formData = new FormData();
    formData.append('file', {
      uri: fileObj.uri,
      name: fileObj.name || 'logo.jpg',
      type: fileObj.type || 'image/jpeg',
    });
    const response = await fetch(`${this.baseURL}/facilities/logo`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || 'Logo upload failed');
    return data;
  }

  async removeFacilityLogo() {
    return this.request('/facilities/logo', { method: 'DELETE' });
  }

  async getFacilityDetails(facilityId) {
    return this.request(`/facilities/${facilityId}`);
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

  async checkInPatient(patientId, reasonForVisit, assignedDoctorId) {
    return await this.request('/patient-visits/check-in', {
      method: 'POST',
      body: JSON.stringify({ patientId, reasonForVisit, assignedDoctorId }),
    });
  }

  async getActiveQueue() {
    return await this.request('/patient-visits/queue');
  }

  async getMyQueue() {
    return await this.request('/patient-visits/my-queue');
  }

  async getQueueStats() {
    return await this.request('/patient-visits/stats');
  }

  async submitTriage(visitId, triageData) {
    return await this.request(`/patient-visits/${visitId}/triage`, {
      method: 'PATCH',
      body: JSON.stringify(triageData),
    });
  }

  async reassignVisit(visitId, assignedDoctorId) {
    return await this.request(`/patient-visits/${visitId}/reassign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedDoctorId }),
    });
  }

  async markWithDoctor(visitId) {
    return await this.request(`/patient-visits/${visitId}/with-doctor`, {
      method: 'PATCH',
    });
  }

  async completeVisit(visitId) {
    return await this.request(`/patient-visits/${visitId}/complete`, {
      method: 'PATCH',
    });
  }

  async cancelVisit(visitId) {
    return await this.request(`/patient-visits/${visitId}/cancel`, {
      method: 'PATCH',
    });
  }

  async getVisit(visitId) {
    return await this.request(`/patient-visits/${visitId}`);
  }

  // ==================== BILLING ENDPOINTS ====================

  async createBill(
    visitId,
    serviceType,
    serviceDescription,
    amount,
    paymentMode = 'cash',
    insuranceSchemeName = null,
    catalogItemId = null,
  ) {
    return await this.request('/billing', {
      method: 'POST',
      body: JSON.stringify({
        visitId,
        serviceType,
        serviceDescription,
        amount,
        paymentMode,
        insuranceSchemeName,
        ...(catalogItemId ? { catalogItemId } : {}),
      }),
    });
  }

  async getVisitBills(visitId) {
    return await this.request(`/billing/visit/${visitId}`);
  }

  async getVisitBillingSummary(visitId) {
    return await this.request(`/billing/visit/${visitId}/summary`);
  }

  async markBillPaid(billId, paymentData) {
    return await this.request(`/billing/${billId}/pay`, {
      method: 'PATCH',
      body: JSON.stringify(paymentData),
    });
  }

  async waiveBill(billId, waiverReason) {
    return await this.request(`/billing/${billId}/waive`, {
      method: 'PATCH',
      body: JSON.stringify({ waiverReason }),
    });
  }

  async getUnpaidBillsToday() {
    return await this.request('/billing/unpaid-today');
  }

  async updateBill(billId, data) {
    return await this.request(`/billing/${billId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteBill(billId) {
    return await this.request(`/billing/${billId}`, {
      method: 'DELETE',
    });
  }

  // ==================== DRAFT SOAP NOTE ENDPOINTS ====================

  async createDraft(patientId, fields = {}) {
    return await this.request('/soap-notes/draft', {
      method: 'POST',
      body: JSON.stringify({ patientId, ...fields }),
    });
  }

  async updateDraft(draftId, patientId, fields = {}) {
    return await this.request(`/soap-notes/draft/${draftId}`, {
      method: 'POST',
      body: JSON.stringify({ patientId, ...fields }),
    });
  }

  async getMyDrafts() {
    return await this.request('/soap-notes/drafts');
  }

  async finaliseDraft(draftId, patientId, fields = {}) {
    return await this.request(`/soap-notes/draft/${draftId}/finalise`, {
      method: 'POST',
      body: JSON.stringify({ patientId, ...fields }),
    });
  }

  async deleteDraft(draftId) {
    return await this.request(`/soap-notes/draft/${draftId}`, {
      method: 'DELETE',
    });
  }

  async getDraftForPatient(patientId) {
    const drafts = await this.getMyDrafts();
    return drafts.find(d => d.patientId === patientId || d.patient?.id === patientId) || null;
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

  async getPatientDocuments(patientId) {
    return await this.request(`/patient-documents/patient/${patientId}`);
  }

  async uploadPatientDocument(patientId, pendingFile, category, notes) {
    const token = await storage.getToken();

    const formData = new FormData();
    formData.append('patientId', patientId);
    formData.append('category', category || 'other');
    if (notes) formData.append('notes', notes);

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

  async deletePatientDocument(documentId) {
    return await this.request(`/patient-documents/${documentId}`, {
      method: 'DELETE',
    });
  }

  // ── Shared multipart upload helper ────────────────────────────────────────
  async _uploadDocument(endpoint, fileObj, extraFields = {}) {
    const token = await storage.getToken();

    const formData = new FormData();

    Object.entries(extraFields).forEach(([key, val]) => {
      if (val !== undefined && val !== null) formData.append(key, String(val));
    });

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

  async uploadPatientLevelDocument(patientId, fileObj) {
    return this._uploadDocument('/patient-documents/patient', fileObj, {
      patientId,
      documentName: fileObj.documentName,
      category:     fileObj.category || 'other',
      notes:        fileObj.notes,
    });
  }

  async uploadSoapNoteDocument(patientId, soapNoteId, fileObj) {
    return this._uploadDocument('/patient-documents/soap-note', fileObj, {
      patientId,
      soapNoteId,
      documentName: fileObj.documentName,
      category:     fileObj.category || 'other',
      notes:        fileObj.notes,
    });
  }

  async getPatientLevelDocs(patientId) {
    return this.request(`/patient-documents/patient/${patientId}`);
  }

  async getSoapNoteDocs(soapNoteId) {
    return this.request(`/patient-documents/soap-note/${soapNoteId}`);
  }

  async getAllPatientDocs(patientId) {
    return this.request(`/patient-documents/patient/${patientId}/all`);
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

  getInsuranceClaimsExportUrl(from, to, scheme) {
    const BASE = 'https://afyascribe-backend.onrender.com';
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    if (scheme) params.append('scheme', scheme);
    return `${BASE}/reports/insurance-claims/export?${params.toString()}`;
  }

  // ==================== SERVICE CATALOG ENDPOINTS ====================

  async getServiceCatalog(showAll = false) {
    const q = showAll ? '?all=true' : '';
    return await this.request(`/service-catalog${q}`);
  }

  async seedDefaultServices() {
    return await this.request('/service-catalog/seed-defaults', {
      method: 'POST',
    });
  }

  async createServiceCatalogItem(data) {
    return await this.request('/service-catalog', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateServiceCatalogItem(id, data) {
    return await this.request(`/service-catalog/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteServiceCatalogItem(id) {
    return await this.request(`/service-catalog/${id}`, {
      method: 'DELETE',
    });
  }

  // ==================== RECEIPTS ====================

  async getPaidBills(from, to) {
    const params = new URLSearchParams();
    if (from) params.append('from', from);
    if (to) params.append('to', to);
    return await this.request(`/billing/paid?${params.toString()}`);
  }

  // ==================== APPOINTMENTS ENDPOINTS ====================

  async createAppointment(data) {
    return await this.request('/appointments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMyTodayAppointments() {
    return await this.request('/appointments/my-today');
  }

  async getFacilityAppointments(date) {
    const q = date ? `?date=${date}` : '';
    return await this.request(`/appointments/facility${q}`);
  }

  async getPatientAppointments(patientId) {
    return await this.request(`/appointments/patient/${patientId}`);
  }

  async updateAppointment(id, data) {
    return await this.request(`/appointments/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteAppointment(id) {
    return await this.request(`/appointments/${id}`, {
      method: 'DELETE',
    });
  }
}

export default new ApiService();