// src/services/soapFormatter.js - Updated without ICD11 API
import { chatWithGemini } from './geminiClient';

/**
 * Updated to format individual SOAP sections (not entire note)
 * Removed ICD11 API dependency - Gemini knows ICD-11 codes
 */

const SECTION_FORMAT_PROMPT = `You are a medical AI assistant with knowledge of ICD-11 diagnostic codes and medical terminology.

Format the following medical notes for the {SECTION_NAME} section of a SOAP note.

CRITICAL RULES:
- ONLY include information explicitly mentioned in the notes
- DO NOT add suggestions, recommendations, or typical treatments
- Use proper medical terminology and abbreviations
- If relevant diagnosis is mentioned, include appropriate ICD-11 code in parentheses
- Keep it concise and professional
- Format appropriately for the section type

Notes to format:`;

/**
 * Format a single SOAP section with AI
 * @param {string} sectionName - 'Symptoms', 'Physical Examination', 'Diagnosis', or 'Management'
 * @param {string} rawText - Raw transcribed or typed text
 * @returns {Promise<string>} Formatted text for that section
 */
export async function formatSoapSection(sectionName, rawText) {
  if (!rawText?.trim()) {
    return '';
  }

  try {
    console.log(`Formatting ${sectionName} section with AI...`);
    
    const prompt = SECTION_FORMAT_PROMPT
      .replace('{SECTION_NAME}', sectionName) + 
      `\n\n"${rawText.trim()}"`;
    
    const formatted = await chatWithGemini(prompt);
    
    return formatted.trim();
  } catch (error) {
    console.error(`Error formatting ${sectionName}:`, error);
    // Return original text if formatting fails
    return rawText;
  }
}

/**
 * Format all four SOAP sections at once (for backward compatibility)
 * @deprecated Use formatSoapSection for individual sections instead
 */
export async function formatToSOAP(transcribedText) {
  if (!transcribedText?.trim()) {
    throw new Error('No transcribed text provided');
  }

  try {
    console.log('Formatting complete SOAP note...');
    
    const prompt = `You are a medical AI assistant with knowledge of ICD-11 codes and medical terminology.

Format the following doctor's notes into proper SOAP format with four sections:

**Symptoms & Diagnosis** - What patient reports
**Physical Examination** - Clinical findings and observations
**Diagnosis** - Medical diagnosis (include ICD-11 codes if applicable)
**Management** - Treatment plan

CRITICAL RULES:
- ONLY use information explicitly mentioned in the notes
- DO NOT add suggestions or typical treatments
- Use proper medical terminology and abbreviations
- Include ICD-11 codes where relevant (e.g., "Hypertension (BA00)")
- Keep each section concise and professional
- If a section has no information, leave it empty

Notes to format:

"${transcribedText.trim()}"`;

    const formatted = await chatWithGemini(prompt);
    
    return {
      success: true,
      original: transcribedText,
      formatted: formatted.trim(),
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('SOAP formatting error:', error);
    throw new Error(`Failed to format notes: ${error.message}`);
  }
}

/**
 * Extract medical terms from text (for reference)
 * No longer used for API calls, just for display
 */
export function extractMedicalTerms(text) {
  if (!text) return [];

  const commonMedicalTerms = [
    // Cardiovascular
    'hypertension', 'hypotension', 'tachycardia', 'bradycardia', 'arrhythmia',
    'heart failure', 'myocardial infarction', 'angina', 'stroke', 'DVT',
    
    // Respiratory
    'asthma', 'COPD', 'pneumonia', 'bronchitis', 'dyspnea', 'cough',
    'shortness of breath', 'wheezing', 'respiratory infection',
    
    // Endocrine
    'diabetes', 'hyperthyroidism', 'hypothyroidism', 'hyperglycemia',
    'hypoglycemia', 'metabolic syndrome',
    
    // Gastrointestinal
    'GERD', 'gastritis', 'peptic ulcer', 'IBS', 'diarrhea', 'constipation',
    'nausea', 'vomiting', 'abdominal pain',
    
    // Neurological
    'headache', 'migraine', 'seizure', 'dizziness', 'vertigo', 'syncope',
    'neuropathy', 'tremor',
    
    // Musculoskeletal
    'arthritis', 'osteoarthritis', 'rheumatoid arthritis', 'back pain',
    'joint pain', 'fracture', 'sprain',
    
    // Infectious
    'infection', 'fever', 'sepsis', 'UTI', 'URI', 'cellulitis',
    
    // General
    'pain', 'fatigue', 'weakness', 'malaise', 'weight loss', 'weight gain',
    'edema', 'rash', 'anemia'
  ];

  const lowerText = text.toLowerCase();
  const foundTerms = [];

  commonMedicalTerms.forEach(term => {
    if (lowerText.includes(term)) {
      foundTerms.push(term);
    }
  });

  return [...new Set(foundTerms)]; // Remove duplicates
}

/**
 * Expand common medical abbreviations
 */
export function expandMedicalAbbreviations(text) {
  const abbreviations = {
    'HTN': 'Hypertension',
    'DM': 'Diabetes Mellitus',
    'CAD': 'Coronary Artery Disease',
    'CHF': 'Congestive Heart Failure',
    'COPD': 'Chronic Obstructive Pulmonary Disease',
    'SOB': 'Shortness of Breath',
    'CP': 'Chest Pain',
    'N/V': 'Nausea/Vomiting',
    'URI': 'Upper Respiratory Infection',
    'UTI': 'Urinary Tract Infection',
    'GERD': 'Gastroesophageal Reflux Disease',
    'BP': 'Blood Pressure',
    'HR': 'Heart Rate',
    'RR': 'Respiratory Rate',
    'Temp': 'Temperature',
    'O2': 'Oxygen',
    'HA': 'Headache',
    'DOE': 'Dyspnea on Exertion',
    'PND': 'Paroxysmal Nocturnal Dyspnea',
    'CVA': 'Cerebrovascular Accident',
    'TIA': 'Transient Ischemic Attack',
    'MI': 'Myocardial Infarction',
    'PE': 'Pulmonary Embolism',
    'DVT': 'Deep Vein Thrombosis',
  };

  let expandedText = text;
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    expandedText = expandedText.replace(regex, `${abbr} (${full})`);
  });

  return expandedText;
}