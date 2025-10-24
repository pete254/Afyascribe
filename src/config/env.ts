// src/config/env.ts
import Constants from 'expo-constants';

interface Config {
  GROQ_API_KEY: string;
  GEMINI_API_KEY: string;
  API_URL: string;
}

// Get environment variables from EAS Secrets
const getEnvConfig = (): Config => {
  // EAS Secrets are available in Constants.expoConfig.extra during builds
  const extra = Constants.expoConfig?.extra;

  return {
    GROQ_API_KEY: extra?.GROQ_API_KEY || process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
    GEMINI_API_KEY: extra?.GEMINI_API_KEY || process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
    API_URL: extra?.API_URL || process.env.EXPO_PUBLIC_API_URL || 'https://afyascribe-backend.onrender.com',
  };
};

export const ENV = getEnvConfig();

