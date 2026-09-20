import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { toast } from 'sonner';
import { isJwtExpired } from '../utils/jwtUtils';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'candidate' | 'employer' | 'admin';
}

interface AuthContextType {
  user: User | null;
  token: string | null; // This is already here, just confirming it's part of the context
  login: (email: string, password: string) => Promise<User>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  forgotPassword: (email: string) => Promise<void>;
  verifyOtp: (email: string, otp: string) => Promise<void>;
  resetPasswordWithOtp: (email: string, otp: string, newPassword: string) => Promise<void>;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  impersonatorAdmin: User | null;
  impersonateUser: (targetUser: User, targetToken: string) => void;
  exitImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const API_BASE = (import.meta as any).env?.VITE_API_BASE || '/api';

const getInitialToken = (): string | null => {
  try {
    const stored = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!stored || isJwtExpired(stored)) {
      if (stored) {
        localStorage.removeItem('token');
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
      }
      return null;
    }
    return stored;
  } catch {
    return null;
  }
};

const getInitialUser = (): User | null => {
  try {
    const storedToken = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (!storedToken || isJwtExpired(storedToken)) return null;
    const storedUser = localStorage.getItem('user');
    if (!storedUser) return null;
    const parsed = JSON.parse(storedUser);
    return parsed && typeof parsed === 'object'
      ? { ...parsed, role: typeof parsed.role === 'string' ? parsed.role.toLowerCase() : parsed.role }
      : parsed;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(getInitialUser);
  const [token, setToken] = useState<string | null>(getInitialToken);

  const [impersonatorAdmin, setImpersonatorAdmin] = useState<User | null>(() => {
    try {
      const stored = sessionStorage.getItem('admin_impersonator_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const isImpersonating = !!impersonatorAdmin;

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('admin_impersonator_token');
    sessionStorage.removeItem('admin_impersonator_user');
    setImpersonatorAdmin(null);
  }, []);

  const impersonateUser = useCallback((targetUser: User, targetToken: string) => {
    if (!user || user.role !== 'admin') {
      toast.error('Only administrators can enter View As mode');
      return;
    }
    // Save current admin context
    sessionStorage.setItem('admin_impersonator_token', token || '');
    sessionStorage.setItem('admin_impersonator_user', JSON.stringify(user));
    setImpersonatorAdmin(user);

    const normalized = {
      ...targetUser,
      role: typeof targetUser.role === 'string' ? (targetUser.role.toLowerCase() as any) : targetUser.role,
    };
    setUser(normalized);
    setToken(targetToken);
    localStorage.setItem('token', targetToken);
    localStorage.setItem('user', JSON.stringify(normalized));
    toast.success(`Now viewing as ${normalized.name} (${normalized.role})`);
  }, [user, token]);

  const exitImpersonation = useCallback(() => {
    const adminToken = sessionStorage.getItem('admin_impersonator_token');
    const adminUserStr = sessionStorage.getItem('admin_impersonator_user');
    if (!adminToken || !adminUserStr) {
      toast.error('Original Admin session not found');
      return;
    }
    try {
      const adminUser = JSON.parse(adminUserStr);
      setUser(adminUser);
      setToken(adminToken);
      localStorage.setItem('token', adminToken);
      localStorage.setItem('user', JSON.stringify(adminUser));
      sessionStorage.removeItem('admin_impersonator_token');
      sessionStorage.removeItem('admin_impersonator_user');
      setImpersonatorAdmin(null);
      toast.success('Exited View As mode. Returned to Admin.');
    } catch (e) {
      console.error('Failed to exit impersonation', e);
    }
  }, []);

  useEffect(() => {
    const handleAuthExpired = (event?: any) => {
      logout();
      const message = event?.detail?.message || 'Your session has expired. Please log in again.';
      try {
        toast.error(message);
      } catch {
        console.warn(message);
      }
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, [logout]);

  const login = async (email: string, password: string): Promise<User> => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), password: password.trim() }),
      });

      if (!response.ok) {
        let message = 'Login failed';
        try {
          const errorData = await response.json();
          // Support ProblemDetail (Spring) and our custom error shape
          if (errorData.message) message = errorData.message;
          else if (errorData.error) message = errorData.error;
          else if (errorData.detail) message = errorData.detail;
          else if (errorData.errors && typeof errorData.errors === 'object') {
            const first = Object.values(errorData.errors)[0] as string | undefined;
            if (first) message = first;
          }
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      const data = await response.json();
      const { token: jwtToken, user: userData } = data;

      const normalizedUser = userData && typeof userData === 'object'
        ? { ...userData, role: typeof userData.role === 'string' ? userData.role.toLowerCase() : userData.role }
        : userData;

      setToken(jwtToken);
      setUser(normalizedUser);
      localStorage.setItem('token', jwtToken);
      localStorage.setItem('user', JSON.stringify(normalizedUser));
      return normalizedUser;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: any) => {
    try {
      // Convert role to uppercase to match backend enum
      const payload = {
        ...userData,
        role: userData.role.toUpperCase()
      };

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          // Handle Spring Boot validation errors
          if (errorData.errors && typeof errorData.errors === 'object') {
            const firstError = Object.values(errorData.errors)[0];
            if (Array.isArray(firstError) && firstError.length > 0) {
              errorMessage = firstError[0] as string;
            } else if (typeof firstError === 'string') {
              errorMessage = firstError;
            }
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (parseError) {
          // If JSON parsing fails, try to get text
          try {
            const text = await response.text();
            if (text) errorMessage = text;
          } catch {
            errorMessage = `Registration failed with status ${response.status}`;
          }
        }
        throw new Error(errorMessage);
      }

      // Registration was successful, no need to process response body here.
    } catch (error) {
      throw error;
    }
  };

  const forgotPassword = async (email: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!response.ok) {
        let message = 'Failed to send OTP';
        try {
          const errorData = await response.json();
          if (errorData.message) message = errorData.message;
          else if (errorData.error) message = errorData.error;
          else if (errorData.detail) message = errorData.detail;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }

      // Success - the backend will send the OTP email
    } catch (error) {
      throw error;
    }
  };

  const verifyOtp = async (email: string, otp: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email.trim(), otp: otp.trim() }),
      });

      if (!response.ok) {
        let message = 'Failed to verify OTP';
        try {
          const errorData = await response.json();
          if (errorData.message) message = errorData.message;
          else if (errorData.error) message = errorData.error;
          else if (errorData.detail) message = errorData.detail;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }
    } catch (error) {
      throw error;
    }
  };

  const resetPasswordWithOtp = async (email: string, otp: string, newPassword: string): Promise<void> => {
    try {
      const response = await fetch(`${API_BASE}/auth/reset-password-with-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email.trim(), 
          otp: otp.trim(), 
          newPassword: newPassword.trim() 
        }),
      });

      if (!response.ok) {
        let message = 'Failed to reset password';
        try {
          const errorData = await response.json();
          if (errorData.message) message = errorData.message;
          else if (errorData.error) message = errorData.error;
          else if (errorData.detail) message = errorData.detail;
        } catch {
          const text = await response.text();
          if (text) message = text;
        }
        throw new Error(message);
      }
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    forgotPassword,
    verifyOtp,
    resetPasswordWithOtp,
    isAuthenticated: !!user,
    isImpersonating,
    impersonatorAdmin,
    impersonateUser,
    exitImpersonation,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
