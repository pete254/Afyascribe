// src/utils/storage.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = '@auth_token';
const USER_KEY = '@user_data';

/**
 * Storage utility for managing authentication tokens and user data
 */
const storage = {
  /**
   * Save authentication token
   */
  async saveToken(token) {
    try {
      await AsyncStorage.setItem(TOKEN_KEY, token);
      return true;
    } catch (error) {
      console.error('Error saving token:', error);
      return false;
    }
  },

  /**
   * Get authentication token
   */
  async getToken() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      return token;
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  },

  /**
   * Remove authentication token
   */
  async removeToken() {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      return true;
    } catch (error) {
      console.error('Error removing token:', error);
      return false;
    }
  },

  /**
   * Save user data
   */
  async saveUser(userData) {
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      return true;
    } catch (error) {
      console.error('Error saving user data:', error);
      return false;
    }
  },

  /**
   * Get user data
   */
  async getUser() {
    try {
      const userData = await AsyncStorage.getItem(USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('Error getting user data:', error);
      return null;
    }
  },

  /**
   * Remove user data
   */
  async removeUser() {
    try {
      await AsyncStorage.removeItem(USER_KEY);
      return true;
    } catch (error) {
      console.error('Error removing user data:', error);
      return false;
    }
  },

  /**
   * Clear all stored data (logout)
   */
  async clearAll() {
    try {
      await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  /**
   * Check if user is authenticated
   */
  async isAuthenticated() {
    try {
      const token = await this.getToken();
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  }
};

export default storage;