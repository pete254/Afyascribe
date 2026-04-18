// src/utils/capabilities.js

function isClinicOwner(user) {
  if (!user) return false;
  if (user.isOwner === true) return true;
  if (user.role === 'facility_admin' || user.role === 'super_admin') return true;
  return false;
}

function isSoloOrTeam(user) {
  if (!user) return false;
  if (!user.clinicMode) return true;
  return user.clinicMode === 'solo' || user.clinicMode === 'team';
}

export function canQueuePatients(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  if (user.role === 'receptionist') return true;
  if (user.role === 'doctor' && isSoloOrTeam(user)) return true;
  return false;
}

export function canViewFullQueue(user) {
  if (!user) return false;
  if (user.role === 'doctor' || user.role === 'nurse') return true;
  return canQueuePatients(user);
}

export function canTriage(user) {
  if (!user) return false;
  if (user.role === 'nurse' || user.role === 'doctor') return true;
  if (isClinicOwner(user)) return true;
  if (user.role === 'receptionist' && isSoloOrTeam(user)) return true;
  return false;
}

export function canCollectPayment(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  if (user.role === 'receptionist') return true;
  if (user.role === 'nurse') return true;
  if (user.role === 'doctor') return true;
  return false;
}

export function canManageStaff(user) {
  return isClinicOwner(user);
}

// FIX: owners (isOwner=true) should also see reports
export function canViewReports(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  return false;
}

export function canEditCatalog(user) {
  if (!user) return false;
  if (isClinicOwner(user)) return true;
  if (user.role === 'doctor') return true;
  if (user.role === 'receptionist') return true;
  return false;
}

export function canSeeOwnerCard(user) {
  return isClinicOwner(user);
}

export function getHomeCards(user) {
  if (!user) return {};

  const isDoctor    = user.role === 'doctor';
  const isNurse     = user.role === 'nurse';
  const isReception = user.role === 'receptionist';
  const isOwner     = isClinicOwner(user);
  const soloOrTeam  = isSoloOrTeam(user);

  return {
    queuePatient:     canQueuePatients(user),
    todaysQueue:      canViewFullQueue(user),
    myQueue:          isDoctor,
    triageQueue:      canTriage(user),
    onboardPatient:   isDoctor || isNurse || isReception || isOwner,
    patientDirectory: true,
    newSoapNote:      isDoctor || (isNurse && soloOrTeam),
    reports:          canViewReports(user),
    serviceCatalog:   canEditCatalog(user),
    ownerCard:        canSeeOwnerCard(user),
  };
}

export function getRoleTitle(user) {
  if (!user) return 'User';
  switch (user.role) {
    case 'doctor': return `Dr. ${user.firstName || ''}`;
    case 'nurse':  return `Nurse ${user.firstName || ''}`;
    default:       return user.firstName || 'User';
  }
}

export function getClinicModeLabel(user) {
  if (!user?.clinicMode) return '';
  const labels = { solo: 'Solo Practice', team: 'Small Team', multi: 'Facility' };
  return labels[user.clinicMode] || '';
}