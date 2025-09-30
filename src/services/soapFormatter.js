// src/services/soapFormatter.js
import { chatWithGemini } from './geminiClient';
import ICD11Service from './icd11Service';

const SOAP_PROMPT = `You are a medical AI assistant with extensive knowledge of medical terminology, abbreviations, and clinical documentation. Format the following doctor's transcribed notes into proper SOAP format:

S - Subjective (what patient reports - symptoms, concerns, history)
O - Objective (measurable findings - vitals, exam results, observations)  
A - Assessment (diagnosis, clinical thinking, differential diagnosis)
P - Plan (treatment plan, medications, follow-up, patient education)

CRITICAL FORMATTING RULES:
- ONLY include information that is explicitly mentioned in the transcribed notes
- DO NOT add suggestions, recommendations, or typical treatments
- DO NOT write "Not documented", "blank", "-", or any placeholder text
- If a section has no relevant information from the transcription, leave that section completely empty
- DO NOT suggest tests, medications, or treatments that weren't mentioned
- DO NOT add standard medical recommendations or protocols
- Focus ONLY on formatting and organizing the information that was actually transcribed

Medical Guidelines:
- Use standard medical abbreviations appropriately (e.g., HTN for hypertension, DM for diabetes mellitus, SOB for shortness of breath)
- Expand unclear abbreviations if context suggests their meaning
- Preserve exact medication names, dosages, and frequencies as stated
- Include vital signs with proper units (BP, HR, RR, Temp, O2 sat) only if mentioned
- Use proper medical terminology for anatomical locations and procedures
- Format lab values with reference ranges only if mentioned in the original notes
- Keep medical accuracy paramount
- Only organize and format what was actually said by the transcriber

Common Medical Abbreviations Reference:
- HTN = Hypertension
- DM = Diabetes Mellitus  
- SOB = Shortness of Breath
- CP = Chest Pain
- N/V = Nausea/Vomiting
- URI = Upper Respiratory Infection
- UTI = Urinary Tract Infection
- CAD = Coronary Artery Disease
- CHF = Congestive Heart Failure
- COPD = Chronic Obstructive Pulmonary Disease
- GERD = Gastroesophageal Reflux Disease

IMPORTANT: Your job is to organize and format the transcribed content, NOT to add medical knowledge or suggestions. If the transcriber didn't mention a plan, assessment, or objective findings, leave those sections empty.

Transcribed notes to format:`;

export async function formatToSOAP(transcribedText) {
  if (!transcribedText?.trim()) {
    throw new Error('No transcribed text provided');
  }

  try {
    console.log('Starting enhanced SOAP formatting with ICD-11 integration...');
    
    // Step 1: Format with Gemini (enhanced with strict no-suggestion rules)
    const prompt = `${SOAP_PROMPT}\n\n"${transcribedText.trim()}"`;
    const formattedNotes = await chatWithGemini(prompt);
    
    // Step 2: Extract medical terms for ICD-11 lookup
    const medicalTerms = ICD11Service.extractMedicalTerms(transcribedText);
    console.log('Extracted medical terms:', medicalTerms);
    
    let enhancedNotes = formattedNotes;
    
    // Step 3: Get ICD-11 suggestions if we found medical terms
    if (medicalTerms.length > 0) {
      try {
        console.log('Searching ICD-11 for medical terms...');
        const icdResults = await ICD11Service.searchConditions(medicalTerms);
        
        if (icdResults && icdResults.length > 0) {
          console.log(`Found ${icdResults.length} ICD-11 suggestions`);
          const icdSection = ICD11Service.formatICD11Results(icdResults);
          enhancedNotes += icdSection;
        } else {
          console.log('No ICD-11 codes found for the extracted terms');
        }
      } catch (icdError) {
        console.warn('ICD-11 lookup failed, proceeding without codes:', icdError);
        // Don't fail the entire operation if ICD-11 lookup fails
      }
    }
    
    return {
      success: true,
      original: transcribedText,
      formatted: enhancedNotes,
      medicalTermsFound: medicalTerms,
      timestamp: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('Enhanced SOAP formatting error:', error);
    throw new Error(`Failed to format notes: ${error.message}`);
  }
}

export async function improveSOAP(existingSOAP, additionalNotes) {
  const prompt = `Improve and update this existing SOAP note with additional information, maintaining proper medical terminology and abbreviations:

EXISTING SOAP:
${existingSOAP}

ADDITIONAL NOTES:
${additionalNotes}

CRITICAL RULES:
- ONLY add information that is explicitly mentioned in the additional notes
- DO NOT suggest treatments, tests, or medications that weren't mentioned
- DO NOT add standard medical recommendations
- Only integrate the new factual information into the existing SOAP format
- Maintain medical accuracy and proper abbreviations
- Focus on organizing and formatting, not on adding medical knowledge

Please integrate the new information appropriately into the existing SOAP format, maintaining medical accuracy, proper abbreviations, and only including what was actually documented.`;

  try {
    const improved = await chatWithGemini(prompt);
    
    // Also try to enhance with ICD-11 if new medical terms are found
    const medicalTerms = ICD11Service.extractMedicalTerms(additionalNotes);
    
    if (medicalTerms.length > 0) {
      try {
        const icdResults = await ICD11Service.searchConditions(medicalTerms);
        if (icdResults && icdResults.length > 0) {
          const icdSection = ICD11Service.formatICD11Results(icdResults);
          return improved + icdSection;
        }
      } catch (icdError) {
        console.warn('ICD-11 enhancement failed during improvement:', icdError);
      }
    }
    
    return improved;
  } catch (error) {
    console.error('SOAP improvement error:', error);
    throw error;
  }
}

// New function to get ICD-11 codes for existing SOAP notes
export async function addICD11Codes(soapText) {
  try {
    const medicalTerms = ICD11Service.extractMedicalTerms(soapText);
    
    if (medicalTerms.length === 0) {
      throw new Error('No medical terms found to search for ICD-11 codes');
    }
    
    const icdResults = await ICD11Service.searchConditions(medicalTerms);
    
    if (!icdResults || icdResults.length === 0) {
      throw new Error('No ICD-11 codes found for the medical terms');
    }
    
    return {
      success: true,
      codes: icdResults,
      formattedCodes: ICD11Service.formatICD11Results(icdResults),
      searchTerms: medicalTerms
    };
    
  } catch (error) {
    console.error('ICD-11 code lookup error:', error);
    throw error;
  }
}

// Utility function to expand medical abbreviations (enhanced list)
export function expandMedicalAbbreviations(text) {
  const abbreviations = {
    // Cardiovascular
    'HTN': 'Hypertension',
    'CAD': 'Coronary Artery Disease',
    'CHF': 'Congestive Heart Failure',
    'MI': 'Myocardial Infarction',
    'DVT': 'Deep Vein Thrombosis',
    'PE': 'Pulmonary Embolism',
    'AFIB': 'Atrial Fibrillation',
    'CHD': 'Coronary Heart Disease',
    'MVP': 'Mitral Valve Prolapse',
    'PVD': 'Peripheral Vascular Disease',
    
    // Endocrine
    'DM': 'Diabetes Mellitus',
    'T1DM': 'Type 1 Diabetes Mellitus',
    'T2DM': 'Type 2 Diabetes Mellitus',
    'DKA': 'Diabetic Ketoacidosis',
    'HbA1c': 'Hemoglobin A1c',
    
    // Respiratory
    'SOB': 'Shortness of Breath',
    'COPD': 'Chronic Obstructive Pulmonary Disease',
    'URI': 'Upper Respiratory Infection',
    'URTI': 'Upper Respiratory Tract Infection',
    'LRTI': 'Lower Respiratory Tract Infection',
    'OSA': 'Obstructive Sleep Apnea',
    'TB': 'Tuberculosis',
    
    // Gastrointestinal
    'GERD': 'Gastroesophageal Reflux Disease',
    'N/V': 'Nausea/Vomiting',
    'IBD': 'Inflammatory Bowel Disease',
    'IBS': 'Irritable Bowel Syndrome',
    'PUD': 'Peptic Ulcer Disease',
    'GI': 'Gastrointestinal',
    
    // Genitourinary
    'UTI': 'Urinary Tract Infection',
    'BPH': 'Benign Prostatic Hyperplasia',
    'CKD': 'Chronic Kidney Disease',
    'ESRD': 'End Stage Renal Disease',
    
    // Neurological
    'CVA': 'Cerebrovascular Accident',
    'TIA': 'Transient Ischemic Attack',
    'MS': 'Multiple Sclerosis',
    'PD': 'Parkinson\'s Disease',
    'AD': 'Alzheimer\'s Disease',
    
    // Musculoskeletal
    'OA': 'Osteoarthritis',
    'RA': 'Rheumatoid Arthritis',
    'LBP': 'Low Back Pain',
    
    // General Symptoms
    'CP': 'Chest Pain',
    'HA': 'Headache',
    'F/C': 'Fever/Chills',
    'DOE': 'Dyspnea on Exertion',
    'PND': 'Paroxysmal Nocturnal Dyspnea',
    
    // Common Medical Terms
    'Hx': 'History',
    'FHx': 'Family History',
    'SHx': 'Social History',
    'PMHx': 'Past Medical History',
    'PSHx': 'Past Surgical History',
    'ROS': 'Review of Systems',
    'PE': 'Physical Examination',
    'VS': 'Vital Signs',
    'HEENT': 'Head, Eyes, Ears, Nose, Throat',
    'CV': 'Cardiovascular',
    'Resp': 'Respiratory',
    'Abd': 'Abdomen',
    'Ext': 'Extremities',
    'Neuro': 'Neurological'
  };
  
  let expandedText = text;
  Object.entries(abbreviations).forEach(([abbr, full]) => {
    const regex = new RegExp(`\\b${abbr}\\b`, 'g');
    expandedText = expandedText.replace(regex, `${abbr} (${full})`);
  });
  
  return expandedText;
}