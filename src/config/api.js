// src/config/api.js
import Constants from 'expo-constants';

/**
 * The one place the app learns where the AfyaScribe backend is.
 *
 * It was written out in three places (apiService twice, AudioService once),
 * which is three places to miss when the backend moves.
 *
 * ── CUTOVER TO THE KENYAN SERVER ──────────────────────────────────────────
 * The backend is moving from Render to api.afyascribe.co.ke. This stays on
 * Render until the data has been copied and the new server verified: a build
 * — or an over-the-air update — shipped earlier would point phones at a server
 * that does not yet hold the real records. At cutover, change DEFAULT_API_URL
 * to the commented line, then build and publish.
 */
const DEFAULT_API_URL = 'https://afyascribe-backend.onrender.com';
// const DEFAULT_API_URL = 'https://api.afyascribe.co.ke';

export const API_URL = (
  Constants.expoConfig?.extra?.API_URL ||
  Constants.manifest?.extra?.API_URL ||
  Constants.manifest2?.extra?.API_URL ||
  process.env.EXPO_PUBLIC_API_URL ||
  DEFAULT_API_URL
).replace(/\/+$/, '');
