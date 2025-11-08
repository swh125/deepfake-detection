import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  LinearProgress,
  Chip,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Security as SecurityIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  Star,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [showLoginDialog, setShowLoginDialog] = React.useState(false);

  // 计算会员剩余天数
  const getRemainingDays = () => {
    if (!user?.subscription_expires_at) return null;
    const expiresAt = new Date(user.subscription_expires_at);
    const now = new Date();
    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
    return daysRemaining > 0 ? daysRemaining : 0;
  };

  // 检查用户是否曾经开过会员（即使过期了也算）
  const hasEverSubscribed = () => {
    return !!(user?.subscription_expires_at || user?.subscription_type);
  };

  const remainingDays = getRemainingDays();
  const hasSubscribed = hasEverSubscribed();

  // 处理按钮点击
  const handleUpgradeClick = () => {
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }
    navigate('/pay');
  };
  
  const stats = [
    {
      title: 'Total Detections',
      value: '12,847',
      change: '+15%',
      icon: <SecurityIcon />,
      color: '#2196f3',
    },
    {
      title: 'Detection Rate',
      value: '98.5%',
      change: '+2.3%',
      icon: <SpeedIcon />,
      color: '#4caf50',
    },
    {
      title: 'False Positives',
      value: '1.2%',
      change: '-0.5%',
      icon: <WarningIcon />,
      color: '#ff9800',
    },
    {
      title: 'System Uptime',
      value: '99.9%',
      change: '+0.1%',
      icon: <TrendingUpIcon />,
      color: '#9c27b0',
    },
  ];

  const recentDetections = [
    {
      id: 1,
      filename: 'video_001.mp4',
      type: 'Video',
      status: 'Deepfake Detected',
      confidence: 0.95,
      timestamp: '2 minutes ago',
    },
    {
      id: 2,
      filename: 'image_002.jpg',
      type: 'Image',
      status: 'Authentic',
      confidence: 0.98,
      timestamp: '5 minutes ago',
    },
    {
      id: 3,
      filename: 'audio_003.wav',
      type: 'Audio',
      status: 'Deepfake Detected',
      confidence: 0.87,
      timestamp: '8 minutes ago',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography 
        variant="h4" 
        gutterBottom 
        sx={{ 
          color: (theme) => theme.palette.mode === 'dark' ? '#ffffff' : '#000000',
          fontWeight: 700,
          mb: 4,
          textShadow: (theme) => theme.palette.mode === 'dark' ? 'none' : '0 1px 2px rgba(0,0,0,0.1)'
        }}
      >
        Dashboard Overview
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        backgroundColor: stat.color,
                        borderRadius: '50%',
                        p: 1,
                        mr: 2,
                      }}
                    >
                      {stat.icon}
                    </Box>
                    <Box>
                      <Typography variant="h6" component="div">
                        {stat.value}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {stat.title}
                      </Typography>
                    </Box>
                  </Box>
                  <Chip
                    label={stat.change}
                    size="small"
                    color={stat.change.startsWith('+') ? 'success' : 'error'}
                    sx={{ fontSize: '0.75rem' }}
                  />
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Recent Detections */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Detections
              </Typography>
              <Box sx={{ mt: 2 }}>
                {recentDetections.map((detection, index) => (
                  <motion.div
                    key={detection.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        py: 2,
                        borderBottom: index < recentDetections.length - 1 ? '1px solid #333' : 'none',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1">
                          {detection.filename}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {detection.type} • {detection.timestamp}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Chip
                          label={detection.status}
                          color={detection.status === 'Deepfake Detected' ? 'error' : 'success'}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                          Confidence: {(detection.confidence * 100).toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>
                  </motion.div>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Stack spacing={3}>
            {/* Upgrade to Pro Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card
                sx={{
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(145deg, rgba(102, 126, 234, 0.25) 0%, rgba(118, 75, 162, 0.25) 100%)'
                      : 'linear-gradient(145deg, rgba(102, 126, 234, 0.12) 0%, rgba(118, 75, 162, 0.12) 100%)',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                  },
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: '0 12px 40px rgba(102, 126, 234, 0.3)',
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Box
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        mr: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Star sx={{ color: 'white', fontSize: 20 }} />
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {hasSubscribed ? 'Renew Membership' : 'Upgrade to Pro'}
                    </Typography>
                  </Box>
                  <Typography 
                    variant="body2" 
                    color="text.secondary" 
                    sx={{ 
                      mb: 3,
                      lineHeight: 1.6,
                    }}
                  >
                    {hasSubscribed 
                      ? remainingDays !== null && remainingDays > 0
                        ? `Your membership expires in ${remainingDays} days. Renew now to continue enjoying premium features.`
                        : 'Your membership has expired. Renew now to continue enjoying premium features.'
                      : 'Unlock unlimited detections, priority processing, and advanced features.'}
                  </Typography>
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleUpgradeClick}
                    sx={{
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'none',
                      py: 1.2,
                      boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                        boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                        transform: 'translateY(-2px)',
                      },
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                  >
                    {hasSubscribed ? 'Renew Now' : 'Upgrade to Pro'}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* System Status */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  System Status
                </Typography>
                <Box sx={{ mt: 2 }}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      CPU Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={65}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      65%
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" gutterBottom>
                      Memory Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={45}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      45%
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" gutterBottom>
                      GPU Usage
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={80}
                      sx={{ height: 8, borderRadius: 4 }}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                      80%
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>

      {/* Login Required Dialog */}
      <Dialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Login Required</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Please log in first to upgrade to Pro or renew your membership.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLoginDialog(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={() => {
              setShowLoginDialog(false);
              navigate('/register');
            }}
            variant="outlined"
            sx={{ mr: 1 }}
          >
            Register
          </Button>
          <Button
            onClick={() => {
              setShowLoginDialog(false);
              navigate('/login');
            }}
            variant="contained"
          >
            Login
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Dashboard; 