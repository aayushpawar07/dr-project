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

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
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
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
