import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StudentData {
  examID: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photo?: string;
  gender?: string;
  disability?: string;
  age?: number;
  [key: string]: any;
}

export interface AuthContextType {
  token: string | null;
  studentData: StudentData | null;
  isLoading: boolean;
  login: (token: string, studentData: StudentData) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  setStudentData: (data: StudentData | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_TOKEN_KEY = 'auth_token';
const STORAGE_STUDENT_KEY = 'student_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [studentData, setStudentDataState] = useState<StudentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore token from AsyncStorage on app load
  useEffect(() => {
    const restoreToken = async () => {
      try {
        const savedToken = await AsyncStorage.getItem(STORAGE_TOKEN_KEY);
        const savedStudent = await AsyncStorage.getItem(STORAGE_STUDENT_KEY);

        if (savedToken) {
          setToken(savedToken);
          if (savedStudent) {
            setStudentDataState(JSON.parse(savedStudent));
          }
        }
      } catch (e) {
        console.error('Failed to restore token:', e);
      } finally {
        setIsLoading(false);
      }
    };

    restoreToken();
  }, []);

  const login = async (newToken: string, newStudentData: StudentData) => {
    try {
      setToken(newToken);
      setStudentDataState(newStudentData);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem(STORAGE_TOKEN_KEY, newToken);
      await AsyncStorage.setItem(STORAGE_STUDENT_KEY, JSON.stringify(newStudentData));
    } catch (e) {
      console.error('Failed to save token:', e);
      throw e;
    }
  };

  const logout = async () => {
    try {
      setToken(null);
      setStudentDataState(null);
      
      // Clear AsyncStorage
      await AsyncStorage.removeItem(STORAGE_TOKEN_KEY);
      await AsyncStorage.removeItem(STORAGE_STUDENT_KEY);
    } catch (e) {
      console.error('Failed to clear storage:', e);
      throw e;
    }
  };

  const setStudentData = (data: StudentData | null) => {
    setStudentDataState(data);
    if (data) {
      AsyncStorage.setItem(STORAGE_STUDENT_KEY, JSON.stringify(data)).catch(console.error);
    }
  };

  const value: AuthContextType = {
    token,
    studentData,
    isLoading,
    login,
    logout,
    isAuthenticated: !!token,
    setStudentData,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
