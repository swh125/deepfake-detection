import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Divider
} from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import { useRegion } from '../../contexts/RegionContext';
import GoogleAuthDialog from '../../components/Auth/GoogleAuthDialog';
import toast from 'react-hot-toast';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, getWechatQRCode, wechatLogin, googleLogin, loading: authLoading } = useAuth();
  const { region, isChina } = useRegion();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showWechatQR, setShowWechatQR] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [wechatAuthUrl, setWechatAuthUrl] = useState('');
  const [isWechatMock, setIsWechatMock] = useState(true);
  const [wechatTicket, setWechatTicket] = useState('');
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证
    if (!name || name.trim().length === 0) {
      setError('Name is required');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await register(email, password, name.trim());
      toast.success('Registration successful!');
      navigate('/');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Registration failed';
      setError(errorMessage);
      toast.error(errorMessage);
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
      
      // 如果是真实OAuth，显示二维码让用户扫码
      if (!qrData.isMock && qrData.authUrl) {

      } else {
        // 模拟模式：自动完成注册

        setTimeout(async () => {
          try {
            // 使用固定的测试openid，确保每次登录都是同一个用户
            // 清除localStorage中可能存在的旧openid，强制使用固定值
            const fixedOpenId = 'mock_wechat_demo_user_001';
            localStorage.setItem('mock_wechat_openid', fixedOpenId);
            const mockOpenId = fixedOpenId;

            await wechatLogin(mockOpenId);
            toast.success('WeChat registration successful!');
            navigate('/', { replace: true });
          } catch (err: any) {

            toast.error('WeChat registration failed');
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
      if (event.data.type === 'WECHAT_LOGIN_SUCCESS') {
        const { token, user } = event.data;

        toast.success('WeChat registration successful!');
        navigate('/', { replace: true });
      } else if (event.data.type === 'WECHAT_LOGIN_ERROR') {

        toast.error(event.data.error || 'WeChat registration failed');
        setError(event.data.error);
      }
    };

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
      toast.success('Google registration successful!');
      navigate('/', { replace: true });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || err.message || 'Google registration failed';
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
            Create Account
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
                {loading ? <CircularProgress size={20} /> : 'Register with WeChat'}
              </Button>
              
              {showWechatQR && qrCodeUrl && (
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <img src={qrCodeUrl} alt="WeChat QR Code" style={{ maxWidth: '100%', height: 'auto', maxHeight: '300px' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {isWechatMock ? 'Mock Mode: Auto register in 2 seconds' : 'Scan with WeChat to register'}
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
                  <span>Sign up with Google</span>
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

          <Box component="form" onSubmit={handleEmailRegister} sx={{ display: 'grid', gap: 2 }}>
            <TextField
              label="Name"
              type="text"
              fullWidth
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={loading}
              placeholder="Enter your name"
            />
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
              helperText="At least 6 characters"
            />
            <TextField
              label="Confirm Password"
              type="password"
              fullWidth
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              disabled={loading || authLoading}
              sx={{ py: 1.5, mt: 1 }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Create Account'}
            </Button>
          </Box>

          <Box sx={{ mt: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Already have an account?{' '}
              <Link to="/login" style={{ textDecoration: 'none' }}>
                Sign In
              </Link>
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Register;
