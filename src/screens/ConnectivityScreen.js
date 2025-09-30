// src/screens/ConnectivityScreen.js
import React, { useState } from "react";
import { View, Text, Button, StyleSheet, ScrollView } from "react-native";
import { testGemini } from "../services/geminiClient";

const mask = (v) => (v ? v.slice(0, 8) + "..." + v.slice(-8) : "not set");

export default function ConnectivityScreen() {
  const [geminiResult, setGeminiResult] = useState("");
  const [loading, setLoading] = useState(false);

  const onTestGemini = async () => {
    setLoading(true);
    setGeminiResult("");
    try {
      const msg = await testGemini();
      setGeminiResult(msg);
    } catch (e) {
      setGeminiResult(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.h1}>AI API Connectivity Test</Text>
      
      <Text style={styles.subtitle}>Environment Variables:</Text>
      <Text>Gemini API Key: {mask(process.env.EXPO_PUBLIC_GEMINI_API_KEY)}</Text>

      <View style={styles.divider} />

      <Button 
        title={loading ? "Testing Gemini..." : "Test Gemini AI"} 
        onPress={onTestGemini} 
        disabled={loading} 
      />
      
      {!!geminiResult && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultLabel}>Gemini Result:</Text>
          <Text style={styles.result}>{geminiResult}</Text>
        </View>
      )}
      
      <View style={styles.divider} />
      
      <Text style={styles.instructions}>
        📝 Instructions:{"\n"}
        1. Get your Gemini API key from: https://aistudio.google.com/app/apikey{"\n"}
        2. Add these to your .env file:{"\n"}
           EXPO_PUBLIC_GEMINI_API_KEY=your_key_here{"\n"}
           EXPO_PUBLIC_GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent{"\n"}
        3. Restart your development server{"\n"}
        4. Test the connection above
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 16, 
    paddingTop: 48, 
    backgroundColor: "#fff" 
  },
  h1: { 
    fontSize: 24, 
    fontWeight: "700", 
    marginBottom: 16,
    color: "#2563eb"
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    color: "#374151"
  },
  divider: { 
    height: 20 
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: "#10b981"
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8
  },
  result: { 
    fontSize: 14,
    lineHeight: 20,
    color: "#111827"
  },
  instructions: {
    fontSize: 12,
    lineHeight: 18,
    color: "#6b7280",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginTop: 20
  }
});