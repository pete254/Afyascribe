// src/components/PatientSearchBar.js - Using your EXISTING apiService
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import apiService from '../services/apiService'; // ✅ Using YOUR existing apiService

export default function PatientSearchBar({ selectedPatient, onPatientSelect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [recentPatients, setRecentPatients] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Load recent patients on mount
  useEffect(() => {
    loadRecentPatients();
  }, []);

  const loadRecentPatients = async () => {
    try {
      const patients = await apiService.getRecentPatients(10);
      console.log(`✅ Loaded ${patients.length} recent patients`);
      setRecentPatients(patients);
    } catch (error) {
      console.error('❌ Failed to load recent patients:', error);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchQuery.length >= 2) {
      const timer = setTimeout(() => {
        searchPatients(searchQuery);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      // Show recent patients when no search query
      if (searchQuery.length === 0 && showResults) {
        setSearchResults(recentPatients);
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }
  }, [searchQuery, recentPatients]);

  const searchPatients = async (query) => {
    setIsSearching(true);
    setShowResults(true);
    
    try {
      // ✅ Using your existing apiService.searchPatients()
      // This automatically includes the JWT token!
      const data = await apiService.searchPatients(query);
      console.log(`✅ Found ${data.length} patients`);
      setSearchResults(data);
    } catch (error) {
      console.error('❌ Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectPatient = (patient) => {
    if (onPatientSelect) {
      onPatientSelect(patient);
    }
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  const handleClearSelection = () => {
    if (onPatientSelect) {
      onPatientSelect(null);
    }
  };

  const renderPatientItem = ({ item }) => (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => handleSelectPatient(item)}
    >
      <View style={styles.resultInfo}>
        <Text style={styles.resultName}>
          {item.firstName} {item.lastName}
        </Text>
        <Text style={styles.resultDetails}>
          ID: {item.patientId} • Age: {item.age || 'N/A'} • {item.gender || 'N/A'}
        </Text>
      </View>
      <Text style={styles.resultArrow}>→</Text>
    </TouchableOpacity>
  );

  if (selectedPatient) {
    return (
      <View style={styles.selectedPatientCard}>
        <View style={styles.selectedPatientInfo}>
          <Text style={styles.selectedPatientLabel}>Selected Patient:</Text>
          <Text style={styles.selectedPatientName}>
            {selectedPatient.firstName} {selectedPatient.lastName}
          </Text>
          <Text style={styles.selectedPatientDetails}>
            ID: {selectedPatient.patientId} • Age: {selectedPatient.age || 'N/A'} • {selectedPatient.gender || 'N/A'}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.clearButton}
          onPress={handleClearSelection}
        >
          <Text style={styles.clearButtonText}>✕</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient by name or ID..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onFocus={() => {
            // Show recent patients when focused with no search
            if (searchQuery.length === 0) {
              setShowResults(true);
              setSearchResults(recentPatients);
            }
          }}
          placeholderTextColor="#9ca3af"
        />
        {isSearching && <ActivityIndicator size="small" color="#0f766e" />}
      </View>

      {showResults && (
        <View style={styles.resultsContainer}>
          {/* Header for recent vs search results */}
          {searchQuery.length === 0 && searchResults.length > 0 && (
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsHeaderText}>📋 Recent Patients</Text>
            </View>
          )}
          
          {searchResults.length > 0 ? (
            <FlatList
              data={searchResults}
              renderItem={renderPatientItem}
              keyExtractor={(item) => item.id.toString()}
              style={styles.resultsList}
              nestedScrollEnabled={true}
              keyboardShouldPersistTaps="handled"
            />
          ) : (
            <View style={styles.noResults}>
              <Text style={styles.noResultsText}>
                {searchQuery.length > 0 ? 'No patients found' : 'No recent patients'}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 4,
  },
  resultsContainer: {
    marginTop: 8,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    maxHeight: 250,
    overflow: 'hidden',
  },
  resultsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  resultsHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  resultsList: {
    maxHeight: 200,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  resultDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  resultArrow: {
    fontSize: 18,
    color: '#0f766e',
  },
  noResults: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 14,
    color: '#9ca3af',
  },
  selectedPatientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#dcfce7',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 12,
    borderWidth: 2,
    borderColor: '#22c55e',
  },
  selectedPatientInfo: {
    flex: 1,
  },
  selectedPatientLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#15803d',
    marginBottom: 4,
  },
  selectedPatientName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 4,
  },
  selectedPatientDetails: {
    fontSize: 13,
    color: '#6b7280',
  },
  clearButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});