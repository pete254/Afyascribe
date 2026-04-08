/**
 * Utility functions for triage vital color coding
 * Determines if a vital is in normal, warning, or critical range
 */

// Normal ranges based on adult vital signs
const VITAL_RANGES = {
  bloodPressure: {
    parse: (value) => {
      if (!value) return null;
      const parts = value.split('/').map(v => parseInt(v.trim()));
      return parts.length === 2 ? { systolic: parts[0], diastolic: parts[1] } : null;
    },
    getStatus: (parsed) => {
      if (!parsed) return 'unknown';
      const { systolic, diastolic } = parsed;
      
      // Normal: < 120/80
      if (systolic < 120 && diastolic < 80) return 'normal';
      // Warning: 120-139/80-89 or Elevated systolic/diastolic
      if ((systolic >= 120 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) return 'warning';
      // Critical: >= 180/120 or > 180 systolic
      if (systolic >= 180 || diastolic >= 120) return 'critical';
      // Hypotensive: < 90 systolic or < 60 diastolic
      if (systolic < 90 || diastolic < 60) return 'critical';
      
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
      // Normal: 36.5 - 37.5°C
      if (parsed >= 36.5 && parsed <= 37.5) return 'normal';
      // Warning: 37.5 - 38.5°C or 35.5 - 36.5°C (mild hypothermia)
      if ((parsed > 37.5 && parsed <= 38.5) || (parsed >= 35.5 && parsed < 36.5)) return 'warning';
      // Critical: > 39°C (high fever) or < 35.5°C (hypothermia)
      if (parsed > 39 || parsed < 35.5) return 'critical';
      
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
      // Normal: 60 - 100 bpm
      if (parsed >= 60 && parsed <= 100) return 'normal';
      // Warning: 50-59 or 101-110 bpm
      if ((parsed >= 50 && parsed < 60) || (parsed > 100 && parsed <= 110)) return 'warning';
      // Critical: < 50 or > 110 bpm
      if (parsed < 50 || parsed > 110) return 'critical';
      
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
      // Normal: 95% - 100%
      if (parsed >= 95 && parsed <= 100) return 'normal';
      // Warning: 90% - 94%
      if (parsed >= 90 && parsed < 95) return 'warning';
      // Critical: < 90%
      if (parsed < 90) return 'critical';
      
      return 'normal';
    },
  },
  weight: {
    parse: (value) => {
      if (!value) return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    },
    getStatus: (parsed) => {
      // Weight itself is rarely critical; just return normal
      return 'normal';
    },
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
    case 'normal':
      return '#10b981'; // Emerald
    case 'warning':
      return '#f59e0b'; // Amber
    case 'critical':
      return '#ef4444'; // Red
    default:
      return '#94a3b8'; // Slate
  }
};

export const getStatusBackgroundColor = (status) => {
  switch (status) {
    case 'normal':
      return '#ecfdf5';
    case 'warning':
      return '#fefce8';
    case 'critical':
      return '#fee2e2';
    default:
      return '#f8fafc';
  }
};

export const getStatusBorderColor = (status) => {
  switch (status) {
    case 'normal':
      return '#a7f3d0';
    case 'warning':
      return '#fde047';
    case 'critical':
      return '#fecaca';
    default:
      return '#e2e8f0';
  }
};
