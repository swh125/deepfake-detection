import axios from 'axios';
import { getRegionConfig } from '../config/regionConfig';

// Dynamically get API Base URL
const getApiBaseUrl = () => {
  const config = getRegionConfig();
  const url = config.apiBaseUrl;

  return url;
};

// Initial API address - wait for IP detection result
// First try to read from localStorage, if not then wait
let initialBaseUrl = (() => {
  try {
    const cached = localStorage.getItem('ip_info');
    if (cached) {
      const info = JSON.parse(cached);
      const region = info.recommendedRegion || (info.isChina ? 'cn' : 'global');
      return region === 'cn' 
        ? (process.env.REACT_APP_API_URL_CN || 'http://localhost:8000')
        : (process.env.REACT_APP_API_URL_GLOBAL || 'http://localhost:8001');
    }
  } catch (e) {
    // Ignore error
  }
  // If no IP info yet, return a temporary address, will be updated after IP detection
  // Use environment variable if available, otherwise default to global backend
  return process.env.REACT_APP_API_URL_GLOBAL || 'http://localhost:8001'; // Temporary address
})();

// API Configuration - use dynamic configuration
const api = axios.create({
  baseURL: initialBaseUrl,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Dynamically update baseURL (when region switches)
export const updateApiBaseUrl = () => {
  const newBaseUrl = getApiBaseUrl();
  if (api.defaults.baseURL !== newBaseUrl) {
    api.defaults.baseURL = newBaseUrl;

  }
};

// Response interceptor to handle connection errors and fallback (before auth interceptor)
const connectionErrorHandler = async (error: any): Promise<any> => {
  // If connection refused or connection closed, try to switch to the other backend
  if (error.code === 'ECONNREFUSED' || 
      error.code === 'ERR_CONNECTION_REFUSED' ||
      error.message?.includes('CONNECTION_REFUSED') ||
      error.message?.includes('Connection refused')) {
    
    const currentBaseUrl = api.defaults.baseURL || '';
    const isCN = currentBaseUrl.includes(':8000');
    
    // If currently trying CN backend and it fails, switch to Global backend
    if (isCN) {
      const globalUrl = process.env.REACT_APP_API_URL_GLOBAL || 'http://localhost:8001';
      api.defaults.baseURL = globalUrl;
      
      // Update localStorage to reflect the switch
      try {
        const cached = localStorage.getItem('ip_info');
        if (cached) {
          const info = JSON.parse(cached);
          info.recommendedRegion = 'global';
          info.isChina = false;
          localStorage.setItem('ip_info', JSON.stringify(info));
        }
      } catch (e) {
        // Ignore
      }
      
      // Retry the request with new URL
      if (error.config) {
        error.config.baseURL = globalUrl;
        try {
          return await api.request(error.config);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    }
  }
  
  return Promise.reject(error);
};

// Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // First check for connection errors and try fallback
    try {
      const connectionResult = await connectionErrorHandler(error);
      // If connectionErrorHandler successfully retried, return the result
      return connectionResult;
    } catch (connectionError) {
      // If connectionErrorHandler couldn't handle it or retry failed, continue with normal error handling
      if (connectionError !== error) {
        // If it's a different error from retry, reject it
        return Promise.reject(connectionError);
      }
    }
    
    // Only handle 401 for non-auth related requests (avoid redirecting during login/register)
    if (error.response?.status === 401) {
      const isAuthEndpoint = error.config?.url?.includes('/auth/');
      if (!isAuthEndpoint) {
        // Handle unauthorized access (only for non-auth endpoints)
        localStorage.removeItem('auth_token');
        localStorage.removeItem('current_user');
        // Use navigate instead of window.location, but there's no navigate here, so keep as is
        // Note: 401 errors on login/register pages should not trigger redirect
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface DetectionRequest {
  file: File;
  media_type: string;
  priority: 'realtime' | 'batch';
}

export interface DetectionResult {
  request_id: string;
  status: 'processing' | 'completed' | 'failed';
  results: DetectionFrame[];
  confidence: number;
}

export interface DetectionFrame {
  frame_idx: number;
  timestamp: number;
  deepfake_score: number;
  artifact_types: string[];
  heatmap_url?: string;
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
  storage: number;
  temperature: number;
}

export interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  response_time: number;
  last_check: Date;
}

export interface ModelConfig {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'training';
  accuracy: number;
  last_updated: Date;
  type: 'image' | 'video' | 'audio' | 'multimodal';
}

export interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed';
  model_a: string;
  model_b: string;
  start_date: Date;
  end_date?: Date;
  results: {
    model_a: { accuracy: number; performance: number };
    model_b: { accuracy: number; performance: number };
  };
}

// API Methods
export const detectionAPI = {
  // Upload and detect media
  detect: async (data: DetectionRequest): Promise<DetectionResult> => {
    const formData = new FormData();
    formData.append('file', data.file);
    formData.append('media_type', data.media_type);
    formData.append('priority', data.priority);

    const response = await api.post('/api/v1/detect', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get detection status
  getStatus: async (requestId: string): Promise<DetectionResult> => {
    const response = await api.get(`/api/v1/detect/${requestId}`);
    return response.data;
  },

  // Get detection history
  getHistory: async (params?: {
    page?: number;
    limit?: number;
    media_type?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const response = await api.get('/api/v1/detect/history', { params });
    return response.data;
  },
};

export const systemAPI = {
  // Get system metrics
  getMetrics: async (): Promise<SystemMetrics> => {
    const response = await api.get('/api/v1/system/metrics');
    return response.data;
  },

  // Get service status
  getServiceStatus: async (): Promise<ServiceStatus[]> => {
    const response = await api.get('/api/v1/system/services');
    return response.data;
  },

  // Get system logs
  getLogs: async (params?: {
    level?: string;
    service?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => {
    const response = await api.get('/api/v1/system/logs', { params });
    return response.data;
  },
};

export const adminAPI = {
  // Get model configurations
  getModels: async (): Promise<ModelConfig[]> => {
    const response = await api.get('/api/v1/admin/models');
    return response.data;
  },

  // Update model configuration
  updateModel: async (modelId: string, data: Partial<ModelConfig>): Promise<ModelConfig> => {
    const response = await api.patch(`/api/v1/admin/models/${modelId}`, data);
    return response.data;
  },

  // Deploy new model
  deployModel: async (data: {
    name: string;
    version: string;
    type: string;
    model_file: File;
  }): Promise<ModelConfig> => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('version', data.version);
    formData.append('type', data.type);
    formData.append('model_file', data.model_file);

    const response = await api.post('/api/v1/admin/models/deploy', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get A/B tests
  getABTests: async (): Promise<ABTest[]> => {
    const response = await api.get('/api/v1/admin/ab-tests');
    return response.data;
  },

  // Create A/B test
  createABTest: async (data: {
    name: string;
    model_a: string;
    model_b: string;
    duration_days: number;
  }): Promise<ABTest> => {
    const response = await api.post('/api/v1/admin/ab-tests', data);
    return response.data;
  },

  // Update A/B test status
  updateABTest: async (testId: string, status: string): Promise<ABTest> => {
    const response = await api.patch(`/api/v1/admin/ab-tests/${testId}`, { status });
    return response.data;
  },

  // Get system configuration
  getSystemConfig: async () => {
    const response = await api.get('/api/v1/admin/config');
    return response.data;
  },

  // Update system configuration
  updateSystemConfig: async (config: Record<string, any>) => {
    const response = await api.patch('/api/v1/admin/config', config);
    return response.data;
  },
};

export const authAPI = {
  // Email Register
  emailRegister: async (data: { email: string; password: string; name: string; region?: string }) => {
    const response = await api.post('/api/v1/auth/email/register', data);
    return response.data;
  },

  // Email Login
  emailLogin: async (data: { email: string; password: string; region?: string }) => {
    const response = await api.post('/api/v1/auth/email/login', data);
    return response.data;
  },

  // Get WeChat QR Code
  getWechatQRCode: async () => {
    const response = await api.get('/api/v1/auth/wechat/qrcode');
    return response.data;
  },

  // Check WeChat login status (polling)
  checkWechatLoginStatus: async (ticket: string) => {
    // This endpoint can be used for polling to check QR code scan status
    // Currently WeChat OAuth is direct callback, so this endpoint is mainly for mock mode
    const response = await api.get(`/api/v1/auth/wechat/status/${ticket}`);
    return response.data;
  },

  // WeChat Callback
  wechatCallback: async (data: { code?: string; openid?: string }) => {
    const response = await api.post('/api/v1/auth/wechat/callback', data);
    return response.data;
  },

  // Google Login
  googleLogin: async (data: { code?: string; google_id?: string; email?: string; name?: string }) => {
    const response = await api.post('/api/v1/auth/google/callback', data);
    return response.data;
  },

  // Logout
  logout: async () => {
    const response = await api.post('/api/v1/auth/logout');
    return response.data;
  },

  // Get current user
  getCurrentUser: async () => {
    // Add timestamp to prevent caching
    const response = await api.get('/api/v1/auth/me', {
      params: { _t: Date.now() },
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return response.data;
  },
};

export default api; 