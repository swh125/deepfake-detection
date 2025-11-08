import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { getRegionConfig } from '../config/regionConfig';

interface User {
  id: string;
  email?: string;
  name?: string;
  wechat_openid?: string;
  region: 'cn' | 'global';
  subscription_type?: 'monthly' | 'yearly' | null;
  subscription_expires_at?: string | null; // ISO date string
}

interface WechatQRCodeData {
  qrCodeUrl: string;
  authUrl?: string;
  ticket: string;
  isMock: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  getWechatQRCode: () => Promise<WechatQRCodeData>;
  wechatLogin: (openid: string) => Promise<void>;
  googleLogin: (googleId: string, email?: string, name?: string) => Promise<void>;
  updateUserSubscription: (subscriptionType: 'monthly' | 'yearly' | null, expiresAt?: Date) => void;
  refreshUser: () => Promise<User | undefined>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：每次刷新页面都清除登录状态，需要重新登录
  useEffect(() => {
    const initAuth = async () => {
      try {
        // 清除所有保存的认证信息，强制用户重新登录

        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        setToken(null);
        setUser(null);
        setLoading(false);
      } catch (error) {

        setToken(null);
        setUser(null);
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const regionConfig = getRegionConfig();
      const response = await authAPI.emailLogin({
        email,
        password,
        region: regionConfig.region
      });

      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('auth_token', userToken);
        localStorage.setItem('current_user', JSON.stringify(userData));
      } else {
        throw new Error(response.error || 'Login failed');
      }
    } catch (error: any) {

      throw error;
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const regionConfig = getRegionConfig();
      
      // 确保region正确传递
      const region = regionConfig.region || 'cn'; // 默认cn

      const response = await authAPI.emailRegister({
        email,
        password,
        name,
        region: region // 明确传递region
      });

      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('auth_token', userToken);
        localStorage.setItem('current_user', JSON.stringify(userData));
      } else {
        throw new Error(response.error || 'Registration failed');
      }
    } catch (error: any) {

      throw error;
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await authAPI.logout();
      }
    } catch (error) {

    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('current_user');
    }
  };

  const getWechatQRCode = async (): Promise<{ qrCodeUrl: string; authUrl?: string; ticket: string; isMock: boolean }> => {
    try {
      const response = await authAPI.getWechatQRCode();
      if (response.success && response.data) {
        return {
          qrCodeUrl: response.data.qr_code_url,
          authUrl: response.data.auth_url,
          ticket: response.data.ticket,
          isMock: response.data.is_mock !== false // 默认为true（模拟模式）
        };
      }
      throw new Error('Failed to get QR code');
    } catch (error) {

      throw error;
    }
  };

  const wechatLogin = async (openid: string) => {
    try {

      const response = await authAPI.wechatCallback({ openid });

      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;
        setUser(userData);
        setToken(userToken);
        localStorage.setItem('auth_token', userToken);
        localStorage.setItem('current_user', JSON.stringify(userData));
        
        // 登录Success后，立即刷新用户信息以确保获取最新的订阅信息

        setTimeout(async () => {
          try {
            await refreshUser();

          } catch (refreshError) {

          }
        }, 500); // 延迟500ms确保token已保存
      } else {
        throw new Error(response.error || 'WeChat login failed');
      }
    } catch (error: any) {

      throw error;
    }
  };

  const googleLogin = async (googleId: string, email?: string, name?: string) => {
    try {

      const response = await authAPI.googleLogin({ 
        google_id: googleId,
        email,
        name
      });

      if (response.success && response.data) {
        const { user: userData, token: userToken } = response.data;

        setUser(userData);
        setToken(userToken);
        localStorage.setItem('auth_token', userToken);
        localStorage.setItem('current_user', JSON.stringify(userData));
      } else {
        const errorMsg = response.error || 'Google login failed';

        throw new Error(errorMsg);
      }
    } catch (error: any) {

      throw error;
    }
  };

  const updateUserSubscription = (subscriptionType: 'monthly' | 'yearly' | null, expiresAt?: Date) => {
    if (user) {
      const updatedUser = { 
        ...user, 
        subscription_type: subscriptionType,
        subscription_expires_at: expiresAt ? expiresAt.toISOString() : null
      };
      setUser(updatedUser);
      localStorage.setItem('current_user', JSON.stringify(updatedUser));
    }
  };

  // 从后端重新获取用户信息（用于支付Success后同步数据）
  const refreshUser = async () => {
    // 先保存当前用户信息，防止刷新失败时丢失
    const currentUser = user;
    const currentToken = token || localStorage.getItem('auth_token');
    
    try {
      const response = await authAPI.getCurrentUser();

      if (response.success && response.data) {
        // 确保返回的数据包含必要字段，如果不完整，合并现有数据
        // 优先使用后端返回的最新数据（即使为null也要使用，因为null表示没有订阅）
        const refreshedData = {
          ...currentUser, // 先保留现有数据
          ...response.data, // 用新数据覆盖
          // 确保关键字段存在
          id: response.data.id || currentUser?.id,
          email: response.data.email || currentUser?.email,
          name: response.data.name || currentUser?.name,
          region: response.data.region || currentUser?.region || 'cn',
          // 订阅信息：优先使用后端返回的数据（即使为null），如果后端没有返回则使用现有数据
          subscription_type: response.data.hasOwnProperty('subscription_type') 
            ? response.data.subscription_type 
            : (currentUser?.subscription_type || null),
          subscription_expires_at: response.data.hasOwnProperty('subscription_expires_at') 
            ? response.data.subscription_expires_at 
            : (currentUser?.subscription_expires_at || null),
        };

        // 确保保留token
        if (currentToken) {
          setToken(currentToken);
        }
        
        setUser(refreshedData);
        localStorage.setItem('current_user', JSON.stringify(refreshedData));

        return refreshedData;
      } else {

        // 保留现有用户信息，不修改

        return currentUser || undefined;
      }
    } catch (error: any) {

      // 如果是401错误，说明token无效，但不要在这里清除（让初始化逻辑处理）
      if (error.response?.status === 401) {

      }
      // 确保用户信息不被清空
      if (!user && currentUser) {

        setUser(currentUser);
      }
      // 确保token不被清空
      if (!token && currentToken) {
        setToken(currentToken);
      }
      // 返回当前用户信息，不抛出错误
      return currentUser || user || undefined;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    loading,
    login,
    register,
    logout,
    getWechatQRCode,
    wechatLogin,
    googleLogin,
    updateUserSubscription,
    refreshUser,
    isAuthenticated: !!user && !!token
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

