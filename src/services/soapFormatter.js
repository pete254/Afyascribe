// src/services/soapFormatter.js - Updated with Lab & Imaging sections
import { chatWithGemini } from './geminiClient';

/**
 * Get ultra-simple section-specific prompt
 */
function getSectionPrompt(sectionName, rawText) {
  const nameLower = sectionName.toLowerCase();
  
  if (nameLower.includes('symptom')) {
    return `Rewrite concisely in plain text (no headers, no asterisks):\n${rawText}`;
  }
  
  if (nameLower.includes('physical') || nameLower.includes('examination')) {
    return `Rewrite concisely in plain text (no headers, no asterisks):\n${rawText}`;
  }
  
  // NEW: Lab Investigations
  if (nameLower.includes('lab') || nameLower.includes('investigation')) {
    return `Rewrite lab results concisely in plain text (no headers, no asterisks). Include test names, values, and units:\n${rawText}`;
  }
  
  // NEW: Imaging
  if (nameLower.includes('imaging') || nameLower.includes('radiology')) {
    return `Rewrite imaging findings concisely in plain text (no headers, no asterisks). Include modality, findings, and impressions:\n${rawText}`;
  }
  
  if (nameLower.includes('diagnosis')) {
    return `Rewrite concisely in plain text (no headers, no asterisks):\n${rawText}`;
  }
  
  if (nameLower.includes('management') || nameLower.includes('plan')) {
    return `Rewrite concisely in plain text (no headers, no asterisks):\n${rawText}`;
  }
  
  // Fallback
  return `Rewrite in plain text (no headers, no asterisks):\n${rawText}`;
}

/**
 * Clean up Gemini response - remove headers and markdown formatting
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
 * Format a single SOAP section with AI
 * @param {string} sectionName - 'Symptoms', 'Physical Examination', 'Lab Investigations', 'Imaging', 'Diagnosis', or 'Management'
 * @param {string} rawText - Raw transcribed or typed text
 * @returns {Promise<string>} Formatted text for that section
 */
export async function formatSoapSection(sectionName, rawText) {
  if (!rawText?.trim()) {
    console.log('⚠️ No text to format');
    return '';
  }

  try {
    console.log(`🔄 Formatting ${sectionName}...`);
    console.log(`📝 Input text length: ${rawText.length} chars`);
    
    // Get section-specific prompt
    const prompt = getSectionPrompt(sectionName, rawText.trim());
    console.log(`📤 Sending prompt: "${prompt.substring(0, 50)}..."`);
    
    const formatted = await chatWithGemini(prompt);
    
    if (!formatted || !formatted.trim()) {
      console.error('❌ Empty response from Gemini');
      return rawText; // Return original if no response
    }
    
    // Clean up the response
    const cleaned = cleanResponse(formatted, sectionName);
    
    console.log(`✅ Formatted ${sectionName} successfully`);
    console.log(`📥 Response length: ${cleaned.length} chars`);
    
    return cleaned;
  } catch (error) {
    console.error(`❌ Error formatting ${sectionName}:`, error);
    console.error('Error details:', error.message);
    // Return original text if formatting fails
    return rawText;
  }
}