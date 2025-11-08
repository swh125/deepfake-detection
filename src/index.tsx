import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import ColorModeProvider from './theme/ColorModeProvider';
import { RegionProvider } from './contexts/RegionContext';
import { AuthProvider } from './contexts/AuthContext';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// 调试：检查环境变量是否在应用启动时加载
if (process.env.NODE_ENV === 'development') {

}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ColorModeProvider>
        <RegionProvider>
          <AuthProvider>
            <BrowserRouter>
              <App />
              <Toaster
                position="top-right"
                containerStyle={{
                  top: 80, // 在AppBar下方，避免遮住用户名
                  right: 20, // 右侧偏移，避免遮挡内容
                }}
                toastOptions={{
                  duration: 4000,
                  style: {
                    marginTop: '10px',
                  },
                }}
              />
            </BrowserRouter>
          </AuthProvider>
        </RegionProvider>
      </ColorModeProvider>
    </QueryClientProvider>
  </React.StrictMode>
); 