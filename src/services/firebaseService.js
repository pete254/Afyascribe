// src/services/firebaseService.js
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

class FirebaseService {
  constructor() {
    this.COLLECTION_NAME = 'soapNotes';
  }

  // Extract patient information from transcribed text
  extractPatientInfo(transcribedText) {
    if (!transcribedText) return { patientName: 'Unknown Patient' };

    const text = transcribedText.toLowerCase();
    let patientName = 'Unknown Patient';
    let age = null;
    let gender = null;

    // Common patterns for patient names
    const namePatterns = [
      /patient (?:name (?:is )?)?([a-zA-Z\s]+?)(?:\s|,|\.|\n|$)/i,
      /(?:mr\.?|mrs\.?|ms\.?|dr\.?)\s+([a-zA-Z\s]+?)(?:\s|,|\.|\n|$)/i,
      /([a-zA-Z]+\s+[a-zA-Z]+)(?:\s+is\s+a|\s+presents|\s+complains|\s+reports)/i,
      /(?:name|patient):\s*([a-zA-Z\s]+?)(?:\s|,|\.|\n|$)/i
    ];

    for (const pattern of namePatterns) {
      const match = transcribedText.match(pattern);
      if (match && match[1] && match[1].trim().length > 1) {
        patientName = match[1].trim()
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        break;
      }
    }

    // Extract age
    const agePatterns = [
      /(\d{1,3})\s*(?:year|yr)s?\s*old/i,
      /age:?\s*(\d{1,3})/i,
      /(\d{1,3})\s*y\.?o\.?/i
    ];

    for (const pattern of agePatterns) {
      const match = transcribedText.match(pattern);
      if (match && match[1]) {
        const extractedAge = parseInt(match[1]);
        if (extractedAge > 0 && extractedAge < 150) {
          age = extractedAge;
          break;
        }
      }
    }

    // Extract gender
    const malePatterns = /\b(?:male|man|boy|he|his|him)\b/i;
    const femalePatterns = /\b(?:female|woman|girl|she|her)\b/i;
    
    if (malePatterns.test(transcribedText)) {
      gender = 'Male';
    } else if (femalePatterns.test(transcribedText)) {
      gender = 'Female';
    }

    return {
      patientName,
      age,
      gender
    };
  }

  // Save a new SOAP note to Firebase
  async saveSoapNote(data) {
    try {
      console.log('Saving SOAP note to Firebase...', data);

      // Extract patient info from original transcription
      const patientInfo = this.extractPatientInfo(data.originalTranscription);

      const noteData = {
        // Patient Information
        patientName: patientInfo.patientName,
        patientAge: patientInfo.age,
        patientGender: patientInfo.gender,
        
        // Note Content
        originalTranscription: data.originalTranscription || '',
        formattedSoapNotes: data.formattedSoapNotes || '',
        medicalTermsFound: data.medicalTermsFound || [],
        
        // Metadata
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        
        // Additional fields for tracking
        transcriptionMethod: data.transcriptionMethod || 'voice', // 'voice' or 'manual'
        confidence: data.confidence || null,
        processingTime: data.processingTime || null
      };

      const docRef = await addDoc(collection(db, this.COLLECTION_NAME), noteData);
      console.log('SOAP note saved with ID:', docRef.id);
      
      return {
        success: true,
        id: docRef.id,
        data: {
          ...noteData,
          id: docRef.id,
          createdAt: new Date(), // For immediate UI update
          updatedAt: new Date()
        }
      };
      
    } catch (error) {
      console.error('Error saving SOAP note:', error);
      throw new Error(`Failed to save note: ${error.message}`);
    }
  }

  // Get all SOAP notes from Firebase
  async getAllSoapNotes() {
    try {
      console.log('Fetching all SOAP notes from Firebase...');
      
      const q = query(
        collection(db, this.COLLECTION_NAME),
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      const notes = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        notes.push({
          id: doc.id,
          ...data,
          // Convert Firestore timestamps to JavaScript dates
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        });
      });
      
      console.log(`Fetched ${notes.length} SOAP notes from Firebase`);
      return notes;
      
    } catch (error) {
      console.error('Error fetching SOAP notes:', error);
      throw new Error(`Failed to fetch notes: ${error.message}`);
    }
  }

  // Update SOAP note status
  async updateSoapNoteStatus(noteId, status, additionalData = {}) {
    try {
      console.log(`Updating SOAP note ${noteId} status to ${status}...`);
      
      const noteRef = doc(db, this.COLLECTION_NAME, noteId);
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      if (status === 'submitted') {
        updateData.submittedAt = serverTimestamp();
      }
      
      await updateDoc(noteRef, updateData);
      console.log('SOAP note status updated successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating SOAP note status:', error);
      throw new Error(`Failed to update note status: ${error.message}`);
    }
  }

  // Delete a SOAP note
  async deleteSoapNote(noteId) {
    try {
      console.log(`Deleting SOAP note ${noteId}...`);
      
      await deleteDoc(doc(db, this.COLLECTION_NAME, noteId));
      console.log('SOAP note deleted successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error deleting SOAP note:', error);
      throw new Error(`Failed to delete note: ${error.message}`);
    }
  }

  // Get a specific SOAP note by ID
  async getSoapNote(noteId) {
    try {
      const docRef = doc(db, this.COLLECTION_NAME, noteId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date()
        };
      } else {
        throw new Error('Note not found');
      }
    } catch (error) {
      console.error('Error fetching SOAP note:', error);
      throw new Error(`Failed to fetch note: ${error.message}`);
    }
  }

  // Update a SOAP note
  async updateSoapNote(noteId, updates) {
    try {
      console.log(`Updating SOAP note ${noteId}...`);
      
      const noteRef = doc(db, this.COLLECTION_NAME, noteId);
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };
      
      await updateDoc(noteRef, updateData);
      console.log('SOAP note updated successfully');
      
      return { success: true };
      
    } catch (error) {
      console.error('Error updating SOAP note:', error);
      throw new Error(`Failed to update note: ${error.message}`);
    }
  }
}

export default new FirebaseService();