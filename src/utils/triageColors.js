/**
 * Utility functions for triage vital color coding
 * Determines if a vital is in normal, warning, or critical range
 */

const VITAL_RANGES = {
  bloodPressure: {
    parse: (value) => {
      if (!value) return null;
      const parts = value.split('/').map(v => parseInt(v.trim()));
      return parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])
        ? { systolic: parts[0], diastolic: parts[1] }
        : null;
    },
    getStatus: (parsed) => {
      if (!parsed) return 'unknown';
      const { systolic, diastolic } = parsed;
      // Critical: hypotension or hypertensive crisis
      if (systolic < 90 || diastolic < 60) return 'critical';
      if (systolic >= 180 || diastolic >= 120) return 'critical';
      // Normal: <120/80
      if (systolic < 120 && diastolic < 80) return 'normal';
      // Warning: elevated / stage 1 HTN
      return 'warning';
    },
  },
  temperature: {
    parse: (value) => {
      if (!value) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    },
    getStatus: (parsed) => {
      if (parsed === null) return 'unknown';
      if (parsed < 35.5 || parsed > 39.5) return 'critical';
      if (parsed < 36.5 || parsed > 37.5) return 'warning';
      return 'normal';
    },
  },
  pulse: {
    parse: (value) => {
      if (!value) return null;
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    },
    getStatus: (parsed) => {
      if (parsed === null) return 'unknown';
      if (parsed < 40 || parsed > 150) return 'critical';
      if (parsed < 60 || parsed > 100) return 'warning';
      return 'normal';
    },
  },
  spO2: {
    parse: (value) => {
      if (!value) return null;
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    },
    getStatus: (parsed) => {
      if (parsed === null) return 'unknown';
      if (parsed < 90) return 'critical';
      if (parsed < 95) return 'warning';
      return 'normal';
    },
  },
  respiratoryRate: {
    parse: (value) => {
      if (!value) return null;
      const num = parseInt(value);
      return isNaN(num) ? null : num;
    },
    getStatus: (parsed) => {
      if (parsed === null) return 'unknown';
      // Normal adult: 12–20 breaths/min
      if (parsed < 8 || parsed > 30) return 'critical';
      if (parsed < 12 || parsed > 20) return 'warning';
      return 'normal';
    },
  },
  weight: {
    parse: (value) => {
      if (!value) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    },
    getStatus: () => 'normal',
  },
  height: {
    parse: (value) => {
      if (!value) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    },
    getStatus: () => 'normal',
  },
};

export const getVitalStatus = (vitalName, value) => {
  const config = VITAL_RANGES[vitalName];
  if (!config) return 'unknown';
  const parsed = config.parse(value);
  return config.getStatus(parsed);
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'normal':   return '#10b981';
    case 'warning':  return '#f59e0b';
    case 'critical': return '#ef4444';
    default:         return '#94a3b8';
  }
};

export const getStatusBackgroundColor = (status) => {
  switch (status) {
    case 'normal':   return '#ecfdf5';
    case 'warning':  return '#fefce8';
    case 'critical': return '#fee2e2';
    default:         return '#f8fafc';
  }
};

export const getStatusBorderColor = (status) => {
  switch (status) {
    case 'normal':   return '#a7f3d0';
    case 'warning':  return '#fde047';
    case 'critical': return '#fecaca';
    default:         return '#e2e8f0';
  }
};