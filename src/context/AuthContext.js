// src/context/AuthContext.js
// UPDATED: user now carries facilityId, facilityCode, facilityName
// Added registerWithInviteCode() for the new staff onboarding flow
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

      // response.user now includes facilityId, facilityCode, facilityName
      await storage.setToken(response.access_token);
      await storage.setUser(response.user);

      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
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
      // userData = { inviteCode, email, password, firstName, lastName, role }
      const response = await apiService.registerWithInviteCode(userData);

      // Backend returns JWT + user immediately after registration
      await storage.setToken(response.access_token);
      await storage.setUser(response.user);

      setUser(response.user);
      setIsAuthenticated(true);

      return { success: true, user: response.user };
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
    user,          // { id, email, firstName, lastName, role, facilityId, facilityCode, facilityName }
    loading,
    isAuthenticated,
    login,
    registerWithInviteCode,
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