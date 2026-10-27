// src/services/soapFormatter.js
// Formats a dictated or typed SOAP section by sending it to the API's
// proofreader, which fixes spelling, grammar and punctuation without adding,
// removing or rewording clinical content. The app no longer calls an AI
// provider itself: no key is shipped in the app, and note text leaves the
// phone only for our own server.
import apiService from './apiService';

/**
 * Clean up the proofread text - remove headers and markdown formatting
 */
function cleanResponse(text, sectionName) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove section headers (case-insensitive)
  const headers = [
    'Symptoms:',
    'Physical Examination:',
    'Lab Investigations:',
    'Laboratory Investigations:',
    'Imaging:',
    'Imaging Findings:',
    'Radiology:',
    'Diagnosis:',
    'Management:',
    'Treatment:',
    'Assessment:',
    'Plan:'
  ];
  
  headers.forEach(header => {
    // Remove with or without asterisks
    const patterns = [
      new RegExp(`\\*\\*${header}\\*\\*\\s*`, 'gi'),
      new RegExp(`\\*${header}\\*\\s*`, 'gi'),
      new RegExp(`${header}\\s*`, 'gi')
    ];
    
    patterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, '');
    });
  });
  
  // Remove all asterisks (markdown bold/italic)
  cleaned = cleaned.replace(/\*\*/g, '');  // Bold
  cleaned = cleaned.replace(/\*/g, '');     // Italic/bullet
  
  // Remove leading/trailing whitespace and extra newlines
  cleaned = cleaned.trim();
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n'); // Max 2 newlines
  
  return cleaned;
}

/**
 * Format a single SOAP section
 * @param {string} sectionName - 'Symptoms', 'Physical Examination', 'Lab Investigations', 'Imaging', 'Diagnosis', or 'Management'
 * @param {string} rawText - Raw transcribed or typed text
 * @returns {Promise<string>} Formatted text for that section
 */
export async function formatSoapSection(sectionName, rawText) {
  if (!rawText?.trim()) {
    return '';
  }

  try {
    const { corrected } = await apiService.proofread(rawText.trim(), sectionName);
    if (!corrected || !corrected.trim()) {
      return rawText; // Keep the original if nothing came back
    }
    return cleanResponse(corrected, sectionName);
  } catch (error) {
    console.error(`❌ Error formatting ${sectionName}:`, error.message);
    // Return original text if formatting fails
    return rawText;
  }
}
