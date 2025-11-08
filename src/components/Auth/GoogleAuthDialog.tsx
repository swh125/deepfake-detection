import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

interface GoogleAuthDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (email: string, password: string) => Promise<void>;
  loading?: boolean;
}

const GoogleAuthDialog: React.FC<GoogleAuthDialogProps> = ({
  open,
  onClose,
  onSuccess,
  loading = false
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // 验证mock账号
    const DEMO_GOOGLE_EMAIL = 'google@demo.com';
    const DEMO_GOOGLE_PASSWORD = 'demo123456';

    if (email !== DEMO_GOOGLE_EMAIL || password !== DEMO_GOOGLE_PASSWORD) {
      setError('Invalid Google account or password. Use: google@demo.com / demo123456');
      return;
    }

    try {
      await onSuccess(email, password);
      // Success后关闭对话框
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Login failed');
    }
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxWidth: '400px'
        }
      }}
    >
      <DialogTitle sx={{ pb: 1, position: 'relative' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
          <Box
            component="img"
            src="https://www.google.com/favicon.ico"
            alt="Google"
            sx={{ width: 24, height: 24, mr: 1 }}
            onError={(e: any) => {
              e.target.style.display = 'none';
            }}
          />
          <Typography variant="h6" sx={{ fontWeight: 400, color: '#202124' }}>
            Sign in with Google
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: '#5f6368'
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent>
        <Box component="form" onSubmit={handleSubmit}>
          <Box sx={{ mb: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Choose an account to continue
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box
            sx={{
              border: '1px solid #dadce0',
              borderRadius: 1,
              p: 2,
              mb: 2,
              backgroundColor: '#f8f9fa'
            }}
          >
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              Demo Account (Mock Mode)
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Email: google@demo.com
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Password: demo123456
            </Typography>
          </Box>

          <TextField
            label="Email or phone"
            type="email"
            fullWidth
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
            autoFocus
          />

          <TextField
            label="Enter your password"
            type="password"
            fullWidth
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Button
              variant="text"
              onClick={handleClose}
              disabled={loading}
              sx={{ color: '#1a73e8' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={loading || !email || !password}
              sx={{
                backgroundColor: '#1a73e8',
                color: '#fff',
                '&:hover': {
                  backgroundColor: '#1557b0'
                }
              }}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : 'Next'}
            </Button>
          </Box>

          <Box sx={{ textAlign: 'center', mt: 3 }}>
            <Typography variant="caption" color="text.secondary">
              This is a mock Google login. Use the demo account above.
            </Typography>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default GoogleAuthDialog;









