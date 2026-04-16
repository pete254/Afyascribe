// src/context/AuthContext.js
// UPDATED: isOwner and clinicMode are now always stored in AsyncStorage
// so capabilities are correct after logout + re-login (not just first login).
import React, { createContext, useState, useContext, useEffect } from 'react';
import apiService from '../services/apiService';
import storage from '../utils/storage';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const token = await storage.getToken();
      const userData = await storage.getUser();

      if (token && userData) {
        setUser(userData);
        setIsAuthenticated(true);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────

  const login = async (email, password) => {
    try {
      setLoading(true);
      const response = await apiService.login(email, password);

      // response.user now always includes isOwner and clinicMode from the server
      const userToStore = {
        ...response.user,
        // Defensive: ensure these fields always exist so capabilities.js works
        isOwner:    response.user.isOwner    ?? false,
        clinicMode: response.user.clinicMode ?? null,
      };

      await storage.setToken(response.access_token);
      await storage.setUser(userToStore);

      setUser(userToStore);
      setIsAuthenticated(true);

      return { success: true, user: userToStore };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: error.message || 'Login failed. Please check your credentials.',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── REGISTER WITH INVITE CODE (new staff flow) ─────────────────────────────

  const registerWithInviteCode = async (userData) => {
    try {
      setLoading(true);
      const response = await apiService.registerWithInviteCode(userData);

      const userToStore = {
        ...response.user,
        isOwner:    response.user.isOwner    ?? false,
        clinicMode: response.user.clinicMode ?? null,
      };

      await storage.setToken(response.access_token);
      await storage.setUser(userToStore);

      setUser(userToStore);
      setIsAuthenticated(true);

      return { success: true, user: userToStore };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed. Please check your invite code.',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── CREATE CLINIC (clinic owner setup) ────────────────────────────────────

  const createClinic = async (clinicData) => {
    try {
      setLoading(true);
      const response = await apiService.createClinic(clinicData);

      // Owner always gets isOwner: true
      const userToStore = {
        ...response.user,
        isOwner:    response.user.isOwner    ?? true,
        clinicMode: response.user.clinicMode ?? clinicData.clinicMode ?? null,
      };

      await storage.setToken(response.access_token);
      await storage.setUser(userToStore);

      setUser(userToStore);
      setIsAuthenticated(true);

      return { success: true, user: userToStore, inviteCode: response.inviteCode };
    } catch (error) {
      console.error('Create clinic error:', error);
      return {
        success: false,
        error: error.message || 'Failed to create clinic. Please try again.',
      };
    } finally {
      setLoading(false);
    }
  };

  // ── LOGOUT ─────────────────────────────────────────────────────────────────

  const logout = async () => {
    try {
      setLoading(true);
      await storage.removeToken();
      await storage.removeUser();
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const value = {
    user,          // { id, email, firstName, lastName, role, facilityId, facilityCode, facilityName, isOwner, clinicMode }
    loading,
    isAuthenticated,
    login,
    registerWithInviteCode,
    createClinic,
    logout,
    refreshAuth: checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export default AuthContext;