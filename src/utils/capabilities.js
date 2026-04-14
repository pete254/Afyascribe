// src/utils/capabilities.js
// Mirror of backend capabilities — used throughout the React Native app.
// Import this instead of checking user.role directly.

export function canQueuePatients(user) {
  if (!user) return false;
  if (user.role === 'receptionist' || user.role === 'facility_admin') return true;
  if (user.isOwner) return true;
  const soloOrTeam = user.clinicMode === 'solo' || user.clinicMode === 'team';
  if (user.role === 'doctor' && soloOrTeam) return true;
  return false;
}

export function canViewFullQueue(user) {
  return canQueuePatients(user) || user?.role === 'nurse';
}

export function canTriage(user) {
  if (!user) return false;
  if (user.role === 'nurse' || user.role === 'doctor') return true;
  if (user.role === 'facility_admin' || user.isOwner) return true;
  const soloOrTeam = user.clinicMode === 'solo' || user.clinicMode === 'team';
  if (user.role === 'receptionist' && soloOrTeam) return true;
  return false;
}

export function canCollectPayment(user) {
  if (!user) return false;
  if (user.role === 'receptionist' || user.role === 'facility_admin') return true;
  if (user.isOwner) return true;
  const soloOrTeam = user.clinicMode === 'solo' || user.clinicMode === 'team';
  if (user.role === 'doctor' && soloOrTeam) return true;
  return false;
}

export function canManageStaff(user) {
  return user?.isOwner || user?.role === 'facility_admin';
}

export function canViewReports(user) {
  return user?.isOwner || user?.role === 'facility_admin';
}

export function canEditCatalog(user) {
  if (!user) return false;
  if (user.isOwner || user.role === 'facility_admin') return true;
  if (user.role === 'doctor' && user.clinicMode === 'team') return true;
  return false;
}

/** Returns which HomeScreen cards are visible for this user */
export function getHomeCards(user) {
  if (!user) return {};
  const soloOrTeam = user.clinicMode === 'solo' || user.clinicMode === 'team';
  const isDoctor = user.role === 'doctor';
  const isNurse  = user.role === 'nurse';
  const isReception = user.role === 'receptionist';

  return {
    queuePatient:     canQueuePatients(user),
    todaysQueue:      canViewFullQueue(user),
    myQueue:          isDoctor,
    triageQueue:      canTriage(user),
    onboardPatient:   isDoctor || isNurse || isReception || user.isOwner,
    patientDirectory: true,
    newSoapNote:      isDoctor || (isNurse && soloOrTeam),
    reports:          canViewReports(user),
    serviceCatalog:   canEditCatalog(user),
    ownerCard:        user.isOwner === true,
  };
}

/** Human-readable greeting for the header */
export function getRoleTitle(user) {
  if (!user) return 'User';
  switch (user.role) {
    case 'doctor': return `Dr. ${user.firstName || ''}`;
    case 'nurse':  return `Nurse ${user.firstName || ''}`;
    default:       return user.firstName || 'User';
  }
}

/** Short label shown under the user's name */
export function getClinicModeLabel(user) {
  if (!user?.clinicMode) return '';
  const labels = { solo: 'Solo Practice', team: 'Small Team', multi: 'Facility' };
  return labels[user.clinicMode] || '';
}