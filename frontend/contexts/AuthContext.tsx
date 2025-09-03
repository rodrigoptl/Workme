import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { showMessage } from 'react-native-flash-message';

interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  user_type: 'client' | 'professional';
  created_at: string;
  is_active: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: RegisterData) => Promise<boolean>;
  logout: () => Promise<void>;
}

interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  user_type: 'client' | 'professional';
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = process.env.EXPO_PUBLIC_BACKEND_URL + '/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('auth_token');
      const storedUser = await AsyncStorage.getItem('user_data');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        
        // Configure axios default header
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
      }
    } catch (error) {
      console.error('Error loading stored auth:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      const { access_token, user: userData } = response.data;
      
      setToken(access_token);
      setUser(userData);
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      
      // Configure axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      showMessage({
        message: 'Login realizado com sucesso!',
        type: 'success',
      });
      
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao fazer login',
        type: 'danger',
      });
      return false;
    }
  };

  const register = async (userData: RegisterData): Promise<boolean> => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, userData);

      const { access_token, user: newUser } = response.data;
      
      setToken(access_token);
      setUser(newUser);
      
      // Store in AsyncStorage
      await AsyncStorage.setItem('auth_token', access_token);
      await AsyncStorage.setItem('user_data', JSON.stringify(newUser));
      
      // Configure axios default header
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      showMessage({
        message: 'Cadastro realizado com sucesso!',
        type: 'success',
      });
      
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      showMessage({
        message: error.response?.data?.detail || 'Erro ao fazer cadastro',
        type: 'danger',
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      setToken(null);
      
      // Remove from AsyncStorage
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('user_data');
      
      // Remove axios default header
      delete axios.defaults.headers.common['Authorization'];
      
      showMessage({
        message: 'Logout realizado com sucesso!',
        type: 'success',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}