// src/utils/capabilities.js
// Mirror of backend capabilities — used throughout the React Native app.
//
// PERMISSION MATRIX:
// ─────────────────────────────────────────────────────────────────────
// Owner / Doctor (isOwner=true or created via createClinic):
//   queue, triage, SOAP, billing, catalog, directory, staff mgmt (owner card)
//   NO reports
//
// Doctor (regular, added via invite code):
//   myQueue, SOAP notes, triage, billing, directory, service catalog
//   CAN queue patients in solo/team clinics
//   NO reports, NO owner card
//
// Receptionist / Secretary:
//   queue, assign/reassign, triage, onboard, directory, service catalog
//   NO reports, NO SOAP notes
//
// Nurse:
//   triage, onboard, directory
//   SOAP notes in solo/team mode
//   NO reports
//
// facility_admin / super_admin:
//   everything including reports
// ─────────────────────────────────────────────────────────────────────

/**
 * A user is considered an "owner" if:
 * - They have isOwner === true in their stored profile, OR
 * - Their role is facility_admin / super_admin
 *
 * NOTE: isOwner may not be in older JWTs. We fall back gracefully.
 */
function isClinicOwner(user) {
  if (!user) return false;
  if (user.isOwner === true) return true;
  if (user.role === 'facility_admin' || user.role === 'super_admin') return true;
  return false;
}

/**
 * True for clinics that run without strict departmental separation.
 * When clinicMode is absent (old tokens), default to true so doctors
 * keep all their permissions after re-login.
 */
function isSoloOrTeam(user) {
  if (!user) return false;
  if (!user.clinicMode) return true; // safe default — keeps capabilities after re-login
  return user.clinicMode === 'solo' || user.clinicMode === 'team';
}

// ── Capability checks ─────────────────────────────────────────────────────────

/** Can check a patient in and create a visit */
export function canQueuePatients(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  if (user.role === 'receptionist') return true;
  // Doctors queue their own patients in solo/team clinics
  if (user.role === 'doctor' && isSoloOrTeam(user)) return true;
  return false;
}

/** Can see the full Today's Queue screen */
export function canViewFullQueue(user) {
  if (!user) return false;
  // All clinical roles see the queue
  if (user.role === 'doctor' || user.role === 'nurse') return true;
  return canQueuePatients(user);
}

/** Can record triage vitals */
export function canTriage(user) {
  if (!user) return false;
  if (user.role === 'nurse' || user.role === 'doctor') return true;
  if (isClinicOwner(user)) return true;
  // Receptionists triage in solo/team clinics
  if (user.role === 'receptionist' && isSoloOrTeam(user)) return true;
  return false;
}

/** Can collect payments at the billing screen */
export function canCollectPayment(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  if (user.role === 'receptionist') return true;
  if (user.role === 'nurse') return true;
 
  if (user.role === 'doctor') return true;
  return false;
}

/** Can view and manage staff (invite code, deactivate staff, etc.) */
export function canManageStaff(user) {
  return isClinicOwner(user);
}

/** Can see the Reports screen */
export function canViewReports(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  return user.role === 'facility_admin' || user.role === 'super_admin';
}

/** Can edit the Service Catalog */
export function canEditCatalog(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  if (user.role === 'doctor') return true;       // doctors pick services when billing
  if (user.role === 'receptionist') return true; // receptionists manage service list
  return false;
}

/** Can see the Owner Card (invite code, staff list, clinic mode) */
export function canSeeOwnerCard(user) {
  return isClinicOwner(user);
}

// ── HomeScreen card map ───────────────────────────────────────────────────────

/** Returns which HomeScreen cards are visible for this user */
export function getHomeCards(user) {
  if (!user) return {};

  const isDoctor    = user.role === 'doctor';
  const isNurse     = user.role === 'nurse';
  const isReception = user.role === 'receptionist';
  const isOwner     = isClinicOwner(user);
  const soloOrTeam  = isSoloOrTeam(user);

  return {
    // ── Patient flow ───────────────────────────────────────────────────
    queuePatient:     canQueuePatients(user),
    todaysQueue:      canViewFullQueue(user),
    myQueue:          isDoctor,          // personal queue for doctors
    triageQueue:      canTriage(user),

    // ── Patient records ────────────────────────────────────────────────
    onboardPatient:   isDoctor || isNurse || isReception || isOwner,
    patientDirectory: true,              // everyone can search patients

    // ── Clinical ───────────────────────────────────────────────────────
    // Receptionists do NOT get SOAP notes
    newSoapNote:      isDoctor || (isNurse && soloOrTeam),

    // ── Admin ──────────────────────────────────────────────────────────
    reports:          canViewReports(user),
    serviceCatalog:   canEditCatalog(user),
    ownerCard:        canSeeOwnerCard(user),
  };
}

// ── Display helpers ───────────────────────────────────────────────────────────

/** Human-readable greeting prefix */
export function getRoleTitle(user) {
  if (!user) return 'User';
  switch (user.role) {
    case 'doctor': return `Dr. ${user.firstName || ''}`;
    case 'nurse':  return `Nurse ${user.firstName || ''}`;
    default:       return user.firstName || 'User';
  }
}

/** Short clinic mode label shown under the user's name */
export function getClinicModeLabel(user) {
  if (!user?.clinicMode) return '';
  const labels = { solo: 'Solo Practice', team: 'Small Team', multi: 'Facility' };
  return labels[user.clinicMode] || '';
}