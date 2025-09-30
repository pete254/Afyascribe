// src/services/icd11Service.js
import Constants from 'expo-constants';

class ICD11Service {
  constructor() {
    this.API_KEY = Constants.expoConfig?.extra?.ICD11_API_KEY || process.env.EXPO_PUBLIC_ICD11_API_KEY;
    this.API_SECRET = Constants.expoConfig?.extra?.ICD11_API_SECRET || process.env.EXPO_PUBLIC_ICD11_API_SECRET;
    this.BASE_URL = 'https://icdapihome2-eme0b9bdf4fafkbg.northeurope-01.azurewebsites.net/icdapi';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async authenticate() {
    try {
      console.log('Authenticating with ICD-11 API...');
      
      if (!this.API_KEY || !this.API_SECRET) {
        throw new Error('ICD-11 API credentials not configured');
      }

      const response = await fetch(`${this.BASE_URL}/Account/AccessKey`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.API_KEY,
          apiSecret: this.API_SECRET
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      this.accessToken = data.accessToken;
      // Set expiry time (typically 1 hour, but adjust based on API response)
      this.tokenExpiry = Date.now() + (data.expiresIn || 3600) * 1000;
      
      console.log('ICD-11 authentication successful');
      return true;
    } catch (error) {
      console.error('ICD-11 authentication error:', error);
      throw error;
    }
  }

  async ensureAuthenticated() {
    if (!this.accessToken || Date.now() >= this.tokenExpiry) {
      await this.authenticate();
    }
  }

  async searchConditions(searchTerms) {
    try {
      await this.ensureAuthenticated();
      
      console.log('Searching ICD-11 for terms:', searchTerms);
      
      const results = [];
      
      // Search for each term individually to get better matches
      for (const term of searchTerms) {
        if (!term || term.length < 3) continue; // Skip very short terms
        
        try {
          // WHO ICD-11 API search endpoint
          const searchUrl = `${this.BASE_URL}/release/11/2024-01/mms/search?q=${encodeURIComponent(term)}&subtreeFilterUsesFoundationDescendants=false&includeKeywordResult=true`;
          
          const response = await fetch(searchUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${this.accessToken}`,
              'Accept': 'application/json',
              'API-Version': 'v2',
              'Accept-Language': 'en'
            }
          });

          if (response.ok) {
            const searchResults = await response.json();
            
            if (searchResults && searchResults.destinationEntities && searchResults.destinationEntities.length > 0) {
              // Take top 3 results for each term
              const topResults = searchResults.destinationEntities.slice(0, 3).map(result => ({
                code: result.theCode,
                title: result.title,
                searchTerm: term,
                url: result.id,
                score: result.score || 1
              }));
              
              results.push(...topResults);
            }
          } else {
            console.warn(`Search failed for term "${term}": ${response.status} ${response.statusText}`);
          }
          
          // Small delay between requests to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (termError) {
          console.warn(`Failed to search for term "${term}":`, termError);
          continue;
        }
      }
      
      // Remove duplicates and sort by relevance
      const uniqueResults = results.filter((result, index, self) => 
        index === self.findIndex(r => r.code === result.code)
      );
      
      return uniqueResults.sort((a, b) => (b.score || 0) - (a.score || 0));
      
    } catch (error) {
      console.error('ICD-11 search error:', error);
      return []; // Return empty array instead of throwing to not break the formatting
    }
  }

  async getCodeDetails(code) {
    try {
      await this.ensureAuthenticated();
      
      const response = await fetch(`${this.BASE_URL}/Entity/${code}?lang=en`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get code details: ${response.status}`);
      }

      const details = await response.json();
      return {
        code: details.code || code,
        title: details.title,
        definition: details.definition,
        inclusions: details.inclusion || [],
        exclusions: details.exclusion || []
      };
      
    } catch (error) {
      console.error('Error getting ICD-11 code details:', error);
      return null;
    }
  }

  // Extract medical terms from text that might be relevant for ICD-11 search
  extractMedicalTerms(text) {
    const medicalTerms = [];
    
    // Common medical condition patterns
    const conditionPatterns = [
      /(?:diagnosed with|diagnosis of|suffers from|presents with|complains of)\s+([^.,;!?]+)/gi,
      /(?:symptoms of|signs of|evidence of)\s+([^.,;!?]+)/gi,
      /(?:pain|ache|burning|tingling|numbness|swelling|rash|fever|nausea|vomiting|diarrhea|constipation|headache|dizziness|fatigue|weakness)/gi,
      /(?:hypertension|diabetes|asthma|depression|anxiety|arthritis|pneumonia|bronchitis|gastritis|dermatitis)/gi
    ];

    conditionPatterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const cleaned = match.replace(/^(diagnosed with|diagnosis of|suffers from|presents with|complains of|symptoms of|signs of|evidence of)\s+/i, '')
                              .trim()
                              .toLowerCase();
          if (cleaned.length > 2 && !medicalTerms.includes(cleaned)) {
            medicalTerms.push(cleaned);
          }
        });
      }
    });

    // Also extract individual significant medical words
    const medicalWords = text.match(/\b(?:pain|fever|nausea|headache|fatigue|weakness|swelling|rash|cough|shortness|breath|chest|abdominal|back|joint|muscle|skin|heart|lung|kidney|liver|stomach|brain|blood|pressure|sugar|diabetes|hypertension|asthma|arthritis|depression|anxiety)\b/gi);
    
    if (medicalWords) {
      medicalWords.forEach(word => {
        const cleaned = word.toLowerCase();
        if (!medicalTerms.includes(cleaned)) {
          medicalTerms.push(cleaned);
        }
      });
    }

    return [...new Set(medicalTerms)]; // Remove duplicates
  }

  formatICD11Results(icdResults) {
    if (!icdResults || icdResults.length === 0) {
      return '';
    }

    let formatted = '\n\n--- SUGGESTED ICD-11 CODES ---\n';
    
    icdResults.forEach((result, index) => {
      formatted += `${index + 1}. ${result.code}: ${result.title}`;
      if (result.searchTerm) {
        formatted += ` (for: ${result.searchTerm})`;
      }
      formatted += '\n';
    });
    
    formatted += '\n(Note: ICD-11 codes are suggestions only. Please verify and select appropriate codes based on clinical judgment.)\n';
    
    return formatted;
  }
}

export default new ICD11Service();