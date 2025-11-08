import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Divider,
  Alert,
  CircularProgress
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useRegion } from '../../contexts/RegionContext';
import GoogleAuthDialog from '../../components/Auth/GoogleAuthDialog';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, getWechatQRCode, wechatLogin, googleLogin, loading: authLoading } = useAuth();
  const { region, isChina } = useRegion();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWechatQR, setShowWechatQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [wechatAuthUrl, setWechatAuthUrl] = useState('');
  const [isWechatMock, setIsWechatMock] = useState(true);
  const [wechatTicket, setWechatTicket] = useState('');
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Login failed');
      toast.error(err.response?.data?.error || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleWechatLogin = async () => {
    try {
      setLoading(true);
      setError('');
      const qrData = await getWechatQRCode();
      setQrCodeUrl(qrData.qrCodeUrl);
      setWechatAuthUrl(qrData.authUrl || '');
      setIsWechatMock(qrData.isMock);
      setWechatTicket(qrData.ticket);
      setShowWechatQR(true);
      
      // 如果是真实OAuth，可以跳转到授权页面，或者显示二维码让用户扫码
      if (!qrData.isMock && qrData.authUrl) {
        // 方式1：直接跳转到微信授权页面（推荐）
        // window.location.href = qrData.authUrl;
        
        // 方式2：显示二维码，用户扫码后会自动跳转
        // 用户扫码后，微信会回调到后端，后端处理后会返回HTML页面
        // 前端需要监听postMessage或等待回调

      } else {
        // 模拟模式：自动完成登录

        setTimeout(async () => {
          try {
            // 使用固定的测试openid，确保每次登录都是同一个用户
            // 清除localStorage中可能存在的旧openid，强制使用固定值
            const fixedOpenId = 'mock_wechat_demo_user_001';
            localStorage.setItem('mock_wechat_openid', fixedOpenId);
            const mockOpenId = fixedOpenId;

            await wechatLogin(mockOpenId);
            toast.success('WeChat login successful!');
            navigate('/', { replace: true });
          } catch (err: any) {

            toast.error('WeChat login failed');
          }
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to get WeChat QR code');
      toast.error(err.message || 'Failed to get WeChat QR code');
    } finally {
      setLoading(false);
    }
  };

  // 监听微信登录回调（postMessage）
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // 安全检查：只处理来自同源或预期的消息

      if (event.data && event.data.type === 'WECHAT_LOGIN_SUCCESS') {
        const { token, user } = event.data;

        // 更新AuthContext
        if (token && user) {
          // 使用wechatLogin来更新状态（但这里需要直接设置）
          // 或者直接调用APIUpdate user information
          localStorage.setItem('auth_token', token);
          localStorage.setItem('current_user', JSON.stringify(user));
          
          // 刷新页面或重新获取用户信息
          window.location.href = '/';
        } else {
          toast.success('WeChat login successful!');
          navigate('/', { replace: true });
        }
      } else if (event.data && event.data.type === 'WECHAT_LOGIN_ERROR') {

        const errorMsg = event.data.error || 'WeChat login failed';
        toast.error(errorMsg);
        setError(errorMsg);
      }
    };

    // 也检查URL参数（如果是从回调页面重定向回来的）
    const urlParams = new URLSearchParams(window.location.search);
    const callbackToken = urlParams.get('token');
    const callbackError = urlParams.get('error');
    
    if (callbackToken) {
      // 从URL参数获取token，说明是回调重定向

      localStorage.setItem('auth_token', callbackToken);
      window.location.href = '/';
    } else if (callbackError) {

      toast.error(decodeURIComponent(callbackError));
      setError(decodeURIComponent(callbackError));
    }

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [navigate]);

  const handleGoogleLoginClick = () => {
    // 打开Google授权对话框
    setShowGoogleDialog(true);
  };

  const handleGoogleAuthSuccess = async (email: string, password: string) => {
    setLoading(true);
    try {
      // 使用固定的Google ID，确保每次登录都是同一个用户
      const fixedGoogleId = 'mock_google_demo_user_001';

      await googleLogin(fixedGoogleId, email, 'Demo User');
      toast.success('Google login successful!');
      navigate('/', { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Google login failed';
      toast.error(errorMessage);

      throw err;
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <Card sx={{ width: 400, maxWidth: '90%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ mb: 3, textAlign: 'center' }}>
            Sign In
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          {isChina ? (
            <>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleWechatLogin}
                disabled={loading || authLoading}
                sx={{ mb: 2, py: 1.5 }}
              >
                {loading ? <CircularProgress size={20} /> : 'Login with WeChat'}
              </Button>
              
              {showWechatQR && qrCodeUrl && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <img src={qrCodeUrl} alt="WeChat QR Code" style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {isWechatMock ? 'Mock Mode: Auto login in 2 seconds' : 'Scan with WeChat to login'}
                  </Typography>
                  {!isWechatMock && wechatAuthUrl && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => window.open(wechatAuthUrl, '_blank')}
                      sx={{ mt: 1 }}
                    >
                      Or Open in New Window
                    </Button>
                  )}
                </Box>
              )}

              <Divider sx={{ my: 2 }}>OR</Divider>
            </>
          ) : (
            <>
              <Button
                variant="outlined"
                fullWidth
                onClick={handleGoogleLoginClick}
                disabled={loading || authLoading}
                sx={{ 
                  mb: 2, 
                  py: 1.5,
                  backgroundColor: '#fff',
                  color: '#4285F4',
                  borderColor: '#4285F4',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    borderColor: '#4285F4'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    component="img"
                    src="https://www.google.com/favicon.ico"
                    alt="Google"
                    sx={{ width: 18, height: 18 }}
                    onError={(e: any) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <span>Sign in with Google</span>
                </Box>
              </Button>

              <GoogleAuthDialog
                open={showGoogleDialog}
                onClose={() => setShowGoogleDialog(false)}
                onSuccess={handleGoogleAuthSuccess}
                loading={loading}
              />

              <Divider sx={{ my: 2 }}>OR</Divider>
            </>
          )}

          <Box component="form" onSubmit={handleEmailLogin} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Email"
              type="email"
              fullWidth
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <TextField
              label="Password"
              type="password"
              fullWidth
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading || authLoading}
              sx={{ py: 1.5 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Sign In'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Don't have an account?{' '}
              <Link to="/register" style={{ textDecoration: 'none' }}>
                Sign Up
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;
