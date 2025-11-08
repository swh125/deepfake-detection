import React, { useState } from 'react';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  IconButton,
  useTheme,
  useMediaQuery,
  Button,
  Stack,
  Badge,
  Tooltip,
  alpha,
} from '@mui/material';
import { Brightness4, Brightness7, Settings as SettingsIcon, Login as LoginIcon, AppRegistration as RegisterIcon, CreditCard as PayIcon, WorkspacePremium as ProIcon, CheckCircle, Schedule } from '@mui/icons-material';
import {
  Dashboard as DashboardIcon,
  Security as SecurityIcon,
  History as HistoryIcon,
  Monitor as MonitorIcon,
  AdminPanelSettings as AdminIcon,
  Menu as MenuIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useColorMode } from '../../theme/ColorModeProvider';
import { useAuth } from '../../contexts/AuthContext';
import RegionIndicator from '../RegionIndicator/RegionIndicator';
import { Avatar, Menu, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions, DialogContentText } from '@mui/material';
import { Logout as LogoutIcon, Person as PersonIcon } from '@mui/icons-material';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
  { text: 'Detection Panel', icon: <SecurityIcon />, path: '/detection' },
  { text: 'History Reports', icon: <HistoryIcon />, path: '/history' },
  { text: 'System Monitor', icon: <MonitorIcon />, path: '/monitor' },
  { text: 'Admin Panel', icon: <AdminIcon />, path: '/admin' },
];

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleColorMode } = useColorMode();
  const { user, isAuthenticated, logout, loading: authLoading, token } = useAuth();
  
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
  
  // 调试：检查认证状态
  React.useEffect(() => {

  }, [isAuthenticated, user, token, authLoading, hasSubscribed, remainingDays]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleNavigation = (path: string) => {
    navigate(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    await logout();
    handleMenuClose();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" color="primary">
          AI Detection System
        </Typography>
      </Toolbar>
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={location.pathname === item.path}
              onClick={() => handleNavigation(item.path)}
              sx={{
                '&.Mui-selected': {
                  backgroundColor: (theme) => theme.palette.action.selected,
                },
              }}
            >
              <ListItemIcon>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        color="default"
        sx={{
          width: { md: `calc(100% - ${drawerWidth}px)` },
          ml: { md: `${drawerWidth}px` },
          backgroundColor: theme.palette.background.paper,
          backdropFilter: 'blur(10px)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div">
            AI Deepfake Detection System
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Stack direction="row" spacing={1} alignItems="center">
            <RegionIndicator />
            <IconButton color="inherit" onClick={toggleColorMode} aria-label="toggle color mode">
              {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
            {/* 默认显示 Login/Register，只有在明确已登录时才显示用户名 */}
            {!authLoading && isAuthenticated && user && token ? (
              <>
                {/* 已登录时显示：Renew/Upgrade to Pro, 用户名 */}
                {hasSubscribed && remainingDays !== null && remainingDays > 0 ? (
                  // 会员状态：显示剩余天数和续费按钮
                  <Tooltip 
                    title={`Your Pro membership expires in ${remainingDays} day${remainingDays > 1 ? 's' : ''}`}
                    arrow
                    placement="bottom"
                  >
                      <Button
                        variant="outlined"
                        startIcon={<CheckCircle />}
                        endIcon={<Schedule sx={{ fontSize: 16 }} />}
                        onClick={() => navigate('/pay')}
                        sx={{
                          bgcolor: 'background.paper',
                          color: 'text.primary',
                          borderWidth: 1,
                          borderColor: 'divider',
                          fontWeight: 600,
                          textTransform: 'none',
                          px: 2.5,
                          py: 0.75,
                          transition: 'all 0.3s ease',
                          '&:hover': {
                            bgcolor: (theme) => theme.palette.mode === 'dark' 
                              ? 'rgba(255, 255, 255, 0.05)' 
                              : 'rgba(0, 0, 0, 0.04)',
                            borderColor: 'divider',
                            transform: 'translateY(-1px)',
                            boxShadow: 1,
                          },
                        }}
                      >
                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                          <Box component="span" sx={{ fontSize: '0.875rem', fontWeight: 600 }}>
                            Pro Member
                          </Box>
                          <Box component="span" sx={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 500 }}>
                            {remainingDays}d left
                          </Box>
                        </Box>
                      </Button>
                  </Tooltip>
                ) : hasSubscribed ? (
                  // 会员已过期：显示续费按钮
                  <Button
                    variant="outlined"
                    startIcon={<ProIcon />}
                    onClick={() => navigate('/pay')}
                    sx={{
                      background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)} 0%, ${alpha(theme.palette.warning.main, 0.05)} 100%)`,
                      color: 'warning.main',
                      borderWidth: 2,
                      borderColor: 'warning.main',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 2.5,
                      py: 0.75,
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        background: (theme) => `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.2)} 0%, ${alpha(theme.palette.warning.main, 0.1)} 100%)`,
                        borderColor: 'warning.dark',
                        transform: 'translateY(-1px)',
                        boxShadow: 3,
                      },
                    }}
                  >
                    Renew Membership
                  </Button>
                ) : (
                  // 非会员：显示升级按钮
                  <Button
                    variant="contained"
                    startIcon={<ProIcon />}
                    onClick={() => navigate('/pay')}
                    sx={{
                      background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main || theme.palette.primary.dark} 100%)`,
                      color: 'white',
                      fontWeight: 600,
                      textTransform: 'none',
                      px: 3,
                      py: 0.875,
                      boxShadow: 3,
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s ease',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: '-100%',
                        width: '100%',
                        height: '100%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)',
                        transition: 'left 0.5s',
                      },
                      '&:hover': {
                        background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark || theme.palette.primary.main} 100%)`,
                        transform: 'translateY(-2px)',
                        boxShadow: 6,
                        '&::before': {
                          left: '100%',
                        },
                      },
                    }}
                  >
                    Upgrade to Pro
                  </Button>
                )}
                {/* 确保用户名始终显示，即使name为空也显示email或id */}
                {(user.name || user.email || user.id) ? (
                  <Button
                    color="inherit"
                    startIcon={<PersonIcon />}
                    onClick={handleMenuOpen}
                    sx={{ textTransform: 'none', ml: 1 }}
                  >
                    {user.name || user.email || `User ${user.id?.substring(0, 8)}`}
                  </Button>
                ) : null}
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                  anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                  }}
                  transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                  }}
                >
                  <MenuItem onClick={() => { navigate('/settings'); handleMenuClose(); }}>
                    <SettingsIcon sx={{ mr: 1 }} /> Settings
                  </MenuItem>
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon sx={{ mr: 1 }} /> Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                {/* 未登录或加载中时显示：Login, Register, Upgrade to Pro */}
                <Button 
                  color="inherit" 
                  startIcon={<LoginIcon />} 
                  onClick={() => navigate('/login')}
                  sx={{ textTransform: 'none', display: 'flex' }}
                >
                  Login
                </Button>
                <Button 
                  color="inherit" 
                  startIcon={<RegisterIcon />} 
                  onClick={() => navigate('/register')}
                  sx={{ textTransform: 'none', display: 'flex' }}
                >
                  Register
                </Button>
                <Button 
                  variant="contained"
                  startIcon={<ProIcon />} 
                  onClick={() => setShowLoginDialog(true)}
                  sx={{
                    background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main || theme.palette.primary.dark} 100%)`,
                    color: 'white',
                    fontWeight: 600,
                    textTransform: 'none',
                    px: 2.5,
                    py: 0.75,
                    boxShadow: 2,
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      background: (theme) => `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.secondary.dark || theme.palette.primary.main} 100%)`,
                      transform: 'translateY(-1px)',
                      boxShadow: 4,
                    },
                  }}
                >
                  Upgrade to Pro
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: theme.palette.background.paper,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: drawerWidth,
              backgroundColor: theme.palette.background.paper,
              borderRight: `1px solid ${theme.palette.divider}`,
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        {children}
      </Box>

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

export default Layout; 