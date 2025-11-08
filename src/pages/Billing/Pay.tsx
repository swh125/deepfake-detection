import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Alert,
  CircularProgress,
  Divider,
  Stack,
  Avatar,
  Paper,
  Badge,
  Snackbar,
} from '@mui/material';
import {
  Chat as WeChatIcon,
  AccountBalance as AlipayIcon,
  CreditCard as StripeIcon,
  Payment as PayPalIcon,
  CheckCircle,
  Star,
  TrendingUp,
  WorkspacePremium as ProIcon,
} from '@mui/icons-material';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useRegion } from '../../hooks/useRegion';
import { useAuth } from '../../contexts/AuthContext';
import { getRegionConfig } from '../../config/regionConfig';
import api from '../../services/api';
import StripePayment from '../../components/Payment/StripePayment';
import PayPalPayment from '../../components/Payment/PayPalPayment';
import WechatPaymentDialog from '../../components/Payment/WechatPaymentDialog';
import AlipayPaymentDialog from '../../components/Payment/AlipayPaymentDialog';

interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  features: string[];
  popular?: boolean;
}

const Pay: React.FC = () => {
  const navigate = useNavigate();
  const { isChina, region, loading: regionLoading } = useRegion();
  const { user: authUser, isAuthenticated, refreshUser } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  
  // Listen to authUser changes to ensure Alert updates in real-time
  useEffect(() => {
    if (authUser) {

    }
  }, [authUser?.subscription_type, authUser?.subscription_expires_at]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showWechatPaymentDialog, setShowWechatPaymentDialog] = useState(false);
  const [showAlipayPaymentDialog, setShowAlipayPaymentDialog] = useState(false);
  const [isMockMode, setIsMockMode] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<'success' | 'info' | 'warning' | 'error'>('info');

  // Plan definition - use useMemo to avoid infinite loop
  const plans: Plan[] = React.useMemo(() => {
    return isChina
      ? [
          {
            id: 'pro-monthly',
            name: 'Pro Monthly',
            price: 99,
            currency: 'CNY',
            features: ['Unlimited Detections', 'Priority Processing', 'Advanced Analytics', '24/7 Support'],
            popular: false,
          },
          {
            id: 'pro-yearly',
            name: 'Pro Yearly',
            price: 999,
            currency: 'CNY',
            features: ['Unlimited Detections', 'Priority Processing', 'Advanced Analytics', '24/7 Support', 'Save ¥189'],
            popular: true,
          },
        ]
      : [
          {
            id: 'pro-monthly',
            name: 'Pro Monthly',
            price: 14.99,
            currency: 'USD',
            features: ['Unlimited Detections', 'Priority Processing', 'Advanced Analytics', '24/7 Support'],
            popular: false,
          },
          {
            id: 'pro-yearly',
            name: 'Pro Yearly',
            price: 149.99,
            currency: 'USD',
            features: ['Unlimited Detections', 'Priority Processing', 'Advanced Analytics', '24/7 Support', 'Save $29.89'],
            popular: true,
          },
        ];
  }, [isChina]);

  // Payment methods
  const paymentMethods = isChina
    ? [
        { id: 'wechat', name: 'WeChat Pay', icon: <WeChatIcon />, color: '#07C160' },
        { id: 'alipay', name: 'Alipay', icon: <AlipayIcon />, color: '#1677FF' },
      ]
    : [
        { id: 'stripe', name: 'Stripe', icon: <StripeIcon />, color: '#635BFF' },
        { id: 'paypal', name: 'PayPal', icon: <PayPalIcon />, color: '#0070BA' },
      ];

  // Get selected plan from URL parameters (redirected from Pro page)
  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planId = params.get('plan');
    if (planId && plans.length > 0) {
      // Automatically select corresponding plan based on planId
      // planId may be "monthly" or "yearly", need to match "pro-monthly" or "pro-yearly"
      const plan = plans.find(p => p.id.includes(planId) || planId.includes(p.id.replace('pro-', '')));
      if (plan && (!selectedPlan || selectedPlan.id !== plan.id)) {
        setSelectedPlan(plan);
      }
    }
  }, [plans]); // plans is now memoized with useMemo, won't cause infinite loop

  // Handle payment success
  const handlePaymentSuccess = async (orderNo: string) => {
    // Reset all payment-related states to allow new payment
    // IMPORTANT: Reset these BEFORE async operations to allow immediate new payment
    setProcessing(false);
    setClientSecret(null);
    setPaypalOrderId(null);
    setOrderNo(null);
    setQrCode(null);
    setShowPaymentForm(false);
    setError(null);
    setSuccessMessage(null);
    try {

      // Show success message
      const paymentMethodName = selectedMethod === 'stripe' ? 'Stripe' : selectedMethod === 'paypal' ? 'PayPal' : 'Payment';
      // For WeChat and Alipay, skip "Payment payment successful!" message but will show remaining days later
      // For Stripe and PayPal, show payment successful message
      if (selectedMethod !== 'wechat' && selectedMethod !== 'alipay') {
        setSnackbarMessage(`${paymentMethodName} payment successful!`);
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      }

      // Wait 4 seconds first to allow backend to process payment and update subscription
      // Backend has delays for database sync and subscription update, so wait longer
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Try multiple times to refresh user info to ensure getting latest data
      let refreshedUser = null;
      let retryCount = 0;
      const maxRetries = 30; // Increase retry count to 30 times
      
      while (retryCount < maxRetries) {
        try {
          // Wait longer between retries (800ms) to give backend more time
          if (retryCount > 0) {
            await new Promise(resolve => setTimeout(resolve, 800));
          }
          
          refreshedUser = await refreshUser();

          // Check if has subscription info
          if (refreshedUser && refreshedUser.subscription_type) {
            const expiresAt = refreshedUser.subscription_expires_at;
            const daysRemaining = expiresAt 
              ? Math.ceil((new Date(expiresAt).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))
              : 0;

            // Update success message with membership info
            // For WeChat and Alipay: only show remaining days (skip "Payment payment successful!")
            // For Stripe and PayPal: show full message with payment successful
            if (selectedMethod === 'wechat' || selectedMethod === 'alipay') {
              // Only show remaining days for WeChat and Alipay
              setSnackbarMessage(`Membership updated: ${daysRemaining} days remaining.`);
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            } else {
              // Show full message for Stripe and PayPal
              setSnackbarMessage(`${paymentMethodName} payment successful! Membership updated: ${daysRemaining} days remaining.`);
              setSnackbarSeverity('success');
              setSnackbarOpen(true);
            }
            break; // Successfully got subscription info, exit loop
          } else {

          }
        } catch (error) {

        }
        retryCount++;
      }
      
      // Even if didn't get it, try a few more forced refreshes with longer delays
      if (!refreshedUser?.subscription_type) {
        // Try after 3 seconds
        setTimeout(async () => {
          try {
            await refreshUser();
          } catch (error) {

          }
        }, 3000);
        
        // Try after 5 seconds
        setTimeout(async () => {
          try {
            await refreshUser();
          } catch (error) {

          }
        }, 5000);
        
        // Try after 10 seconds (final attempt)
        setTimeout(async () => {
          try {
            await refreshUser();
          } catch (error) {

          }
        }, 10000);
      }
    } catch (error) {

    }
  };

  // Continue payment flow
  const proceedWithPayment = async (method?: string) => {
    if (!selectedPlan) return;
    
    // Use passed method or currently selected method
    const paymentMethod = method || selectedMethod;
    if (!paymentMethod) {
      setError('Please select a payment method');
      return;
    }

    // If passed method is different from currently selected, update selectedMethod
    if (method && method !== selectedMethod) {
      setSelectedMethod(method);
    }

    try {
      setProcessing(true);
      setError(null);
      setSuccessMessage(null);
      setPaymentUrl(null);
      setClientSecret(null);
      setPaypalOrderId(null);

      const apiBaseUrl = getRegionConfig().apiBaseUrl;

      // Use configured api instance (includes token interceptor, will automatically add Authorization header)
      const response = await api.post('/api/v1/payment/create', {
        amount: selectedPlan.price,
        currency: selectedPlan.currency,
        payment_method: paymentMethod,
        region: region,
        description: `Pro Plan - ${selectedPlan.name}`,
      });

      if (!response.data) {
        throw new Error('Invalid response from server');
      }

      if (!response.data.success) {
        throw new Error(response.data.message || 'Payment creation failed');
      }

      if (!response.data.data) {
        throw new Error('Response missing data field');
      }

      const data = response.data.data;

      setOrderNo(data.order_no);

      // Stripe and PayPal need to set order info and automatically show payment form
      if (paymentMethod === 'stripe') {

        if (data.client_secret) {
          // Set clientSecret and orderNo, and automatically show form
          setClientSecret(data.client_secret);
          setShowPaymentForm(true); // Automatically show payment form

        } else {

          setError('Failed to get payment intent. Please try again.');
          setSnackbarMessage('Failed to initialize Stripe payment');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
        return;
      } else if (paymentMethod === 'paypal') {
        // PayPal also uses order_id and automatically shows form
        if (data.order_id) {
          setPaypalOrderId(data.order_id);
          setShowPaymentForm(true); // Automatically show payment form

        }
        return;
      } else if (paymentMethod === 'wechat' && data.order_no) {
        setOrderNo(data.order_no);
        setQrCode(data.qr_code || '');
        setIsMockMode(data.note !== undefined || data.qr_code?.includes('example.com'));
        // Show WeChat payment dialog
        setShowWechatPaymentDialog(true);
        return;
      } else if (paymentMethod === 'alipay' && data.order_no) {
        setOrderNo(data.order_no);
        setQrCode(data.qr_code || '');
        setIsMockMode(data.note !== undefined || data.qr_code?.includes('example.com'));
        // Show Alipay payment dialog
        setShowAlipayPaymentDialog(true);
        return;
      } else {
        if (data.order_no) {
          setSuccessMessage(
            `✅ Payment order created successfully!\n` +
            `Order Number: ${data.order_no}\n\n` +
            (data.note || 'Note: Configure real payment API keys to complete the payment.')
          );
        } else {
          setError('Payment creation failed: ' + (data.note || 'Unknown error'));
          setSnackbarMessage('Payment creation failed');
          setSnackbarSeverity('error');
          setSnackbarOpen(true);
        }
      }
    } catch (err: any) {

      let errorMessage = '';
      if (err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        errorMessage = 'Network Error: Cannot connect to backend server. Please ensure the backend is running';
        setError(errorMessage);
      } else if (err.response?.data) {
        const errorData = err.response.data;
        const errorMsg = errorData.message || 'Failed to create payment order';
        const errorDetail = errorData.error ? `: ${errorData.error}` : '';
        errorMessage = `${errorMsg}${errorDetail}`;
        setError(errorMessage);

      } else {
        errorMessage = err.message || 'Failed to create payment';
        setError(errorMessage);

      }
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    } finally {
      setProcessing(false);
    }
  };

  const handleCreatePayment = async () => {
    // Check if logged in
    if (!isAuthenticated) {
      setShowLoginDialog(true);
      return;
    }

    if (!selectedPlan || !selectedMethod) {
      setError('Please select a plan and payment method');
      return;
    }

    // Prevent duplicate submission
    if (processing) {

      return;
    }

    // Continue payment flow
    await proceedWithPayment(selectedMethod);
  };

  if (regionLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box 
      sx={{ 
        p: { xs: 2, md: 4 }, 
        maxWidth: 1400, 
        mx: 'auto',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(102, 126, 234, 0.03) 0%, transparent 50%)'
            : 'linear-gradient(180deg, rgba(102, 126, 234, 0.02) 0%, transparent 50%)',
        minHeight: '100vh',
      }}
    >
      {/* Header */}
      <Box sx={{ textAlign: 'center', mb: 6 }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Display membership status and remaining days - use key to force re-render */}
          {isAuthenticated && authUser && (
            <Alert 
              key={`membership-${authUser.subscription_type || 'none'}-${authUser.subscription_expires_at || 'none'}`}
              severity="info"
              sx={{ 
                mb: 3,
                borderRadius: 2,
                textAlign: 'left',
                display: 'flex',
                alignItems: 'center',
                bgcolor: 'background.paper',
                color: 'text.primary',
                border: '1px solid',
                borderColor: 'divider',
                '& .MuiAlert-icon': {
                  color: 'primary.main',
                },
              }}
            >
              <Typography variant="body1" sx={{ fontWeight: 600 }}>
                {authUser.subscription_type ? (
                  <>
                    You are already a member ({authUser.subscription_type === 'monthly' ? 'Pro Monthly' : 'Pro Yearly'})
                    {authUser.subscription_expires_at && (() => {
                      const expiresAt = new Date(authUser.subscription_expires_at);
                      const now = new Date();
                      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                      if (daysRemaining > 0) {
                        return ` - ${daysRemaining} days remaining`;
                      } else {
                        return ' - Expired';
                      }
                    })()}
                  </>
                ) : authUser.subscription_expires_at ? (
                  (() => {
                    const expiresAt = new Date(authUser.subscription_expires_at);
                    const now = new Date();
                    const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
                    if (daysRemaining > 0) {
                      return `Your membership expires in ${daysRemaining} days`;
                    } else {
                      return 'Your membership has expired';
                    }
                  })()
                ) : (
                  'You are not a member yet. Choose a plan below to upgrade.'
                )}
              </Typography>
            </Alert>
          )}
          <Typography 
            variant="h2" 
            gutterBottom 
            sx={{ 
              fontWeight: 800,
              fontSize: { xs: '2rem', md: '3rem' },
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 2,
              letterSpacing: '-0.02em',
            }}
          >
            Choose Your Plan
          </Typography>
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ 
              fontWeight: 400,
              fontSize: { xs: '1rem', md: '1.25rem' },
            }}
          >
            Select the perfect plan for your needs and start your journey
          </Typography>
        </motion.div>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {paymentUrl && (
        <Alert severity="info" sx={{ mb: 3 }}>
          {paymentUrl.startsWith('http') ? (
            <Box>
              <Typography>Scan QR code or open link:</Typography>
              <Button
                variant="outlined"
                href={paymentUrl}
                target="_blank"
                sx={{ mt: 1 }}
              >
                Open Payment Link
              </Button>
            </Box>
          ) : (
            paymentUrl
          )}
        </Alert>
      )}

      {/* Plans */}
      <Grid container spacing={3} sx={{ mb: 5 }}>
        {plans.map((plan, index) => (
          <Grid item xs={12} md={6} key={plan.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                sx={{
                  height: '100%',
                  cursor: 'pointer',
                  position: 'relative',
                  border: selectedPlan?.id === plan.id ? 3 : 2,
                  borderColor: selectedPlan?.id === plan.id 
                    ? 'primary.main' 
                    : (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.12)'
                          : 'rgba(0, 0, 0, 0.12)',
                  background: selectedPlan?.id === plan.id
                    ? (theme) => theme.palette.mode === 'dark'
                        ? 'linear-gradient(145deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                        : 'linear-gradient(145deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                    : (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                          : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  overflow: 'visible',
                  '&:hover': {
                    transform: 'translateY(-8px)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 20px 60px rgba(102, 126, 234, 0.3)'
                        : '0 20px 60px rgba(102, 126, 234, 0.2)',
                  },
                }}
                onClick={() => setSelectedPlan(plan)}
              >
                {plan.popular && (
                  <Chip
                    label="Most Popular"
                    icon={<Star sx={{ fontSize: 18 }} />}
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 20,
                      fontWeight: 700,
                      fontSize: '0.85rem',
                      height: 32,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      '& .MuiChip-icon': {
                        color: 'white',
                      },
                    }}
                  />
                )}
                <CardContent sx={{ p: 3, position: 'relative' }}>
                  <Typography variant="h5" gutterBottom sx={{ fontWeight: 600, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 2 }}>
                    <Typography 
                      variant="h2" 
                      color="primary" 
                      sx={{ fontWeight: 700, lineHeight: 1 }}
                    >
                      {plan.currency === 'CNY' ? '¥' : '$'}
                      {plan.price}
                    </Typography>
                    <Typography variant="h6" color="text.secondary" sx={{ ml: 1 }}>
                      / {plan.name.includes('Yearly') ? 'year' : 'month'}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2.5 }} />

                  <Stack spacing={1.5} sx={{ mb: 2 }}>
                    {plan.features.map((feature, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center' }}>
                        <CheckCircle 
                          sx={{ 
                            color: 'success.main', 
                            fontSize: 20, 
                            mr: 1.5,
                            flexShrink: 0
                          }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Payment Method Selection */}
      {selectedPlan && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Paper 
            elevation={0}
            sx={{ 
              p: 4, 
              mb: 4,
              background: (theme) => theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
              borderRadius: 4,
              border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3.5 }}>
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: 2,
                  background: (theme) => theme.palette.mode === 'dark'
                    ? 'linear-gradient(135deg, rgba(102, 126, 234, 0.2) 0%, rgba(118, 75, 162, 0.2) 100%)'
                    : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                  border: (theme) => `1px solid ${theme.palette.mode === 'dark' ? 'rgba(102, 126, 234, 0.3)' : 'rgba(102, 126, 234, 0.2)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2,
                }}
              >
                <TrendingUp sx={{ 
                  color: (theme) => theme.palette.mode === 'dark' ? '#a5b4fc' : '#6366f1', 
                  fontSize: 28 
                }} />
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                  Select Payment Method
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose your preferred payment method
                </Typography>
              </Box>
            </Box>
            
            <Grid container spacing={2.5}>
              {paymentMethods.map((method, index) => (
                <Grid item xs={12} sm={6} key={method.id}>
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 + index * 0.1 }}
                  >
                    <Paper
                      onClick={() => {
                        // Reset payment-related states when switching payment methods
                        if (method.id !== selectedMethod) {
                          setOrderNo(null);
                          setClientSecret(null);
                          setPaypalOrderId(null);
                          setShowPaymentForm(false);
                          setError(null);
                        }
                        setSelectedMethod(method.id);
                      }}
                      elevation={selectedMethod === method.id ? 8 : 2}
                      sx={{
                        p: 3,
                        cursor: 'pointer',
                        border: selectedMethod === method.id ? 2.5 : 1,
                        borderColor: selectedMethod === method.id 
                          ? method.color
                          : 'divider',
                        background: selectedMethod === method.id
                          ? (theme) => theme.palette.mode === 'dark'
                              ? `linear-gradient(135deg, ${method.color}20 0%, ${method.color}15 100%)`
                              : `linear-gradient(135deg, ${method.color}15 0%, ${method.color}08 100%)`
                          : (theme) => theme.palette.background.paper,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': selectedMethod === method.id ? {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: 3,
                          background: `linear-gradient(90deg, ${method.color} 0%, ${method.color}cc 100%)`,
                        } : {},
                        '&:hover': {
                          borderColor: method.color,
                          transform: 'translateY(-4px)',
                          boxShadow: selectedMethod === method.id ? 12 : 6,
                          '&::before': {
                            content: '""',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            height: 3,
                            background: `linear-gradient(90deg, ${method.color} 0%, ${method.color}cc 100%)`,
                          },
                        },
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 2 }}>
                          <Box
                            sx={{
                              width: 64,
                              height: 64,
                              borderRadius: 2.5,
                              background: `linear-gradient(135deg, ${method.color} 0%, ${method.color}dd 100%)`,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              boxShadow: `0 4px 12px ${method.color}40`,
                              flexShrink: 0,
                            }}
                          >
                            <Box sx={{ color: 'white', fontSize: 32 }}>
                              {method.icon}
                            </Box>
                          </Box>
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 700,
                                mb: 0.5,
                                color: selectedMethod === method.id ? method.color : 'text.primary',
                              }}
                            >
                              {method.name}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip 
                                label="Secure" 
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '0.7rem',
                                  bgcolor: selectedMethod === method.id 
                                    ? `${method.color}20` 
                                    : 'rgba(0, 0, 0, 0.06)',
                                  color: selectedMethod === method.id 
                                    ? method.color 
                                    : 'text.secondary',
                                  fontWeight: 600,
                                }}
                              />
                              <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{ fontSize: '0.75rem' }}
                              >
                                Fast & Safe
                              </Typography>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              width: 32,
                              height: 32,
                              borderRadius: '50%',
                              border: 2,
                              borderColor: selectedMethod === method.id 
                                ? method.color 
                                : 'divider',
                              bgcolor: selectedMethod === method.id 
                                ? method.color 
                                : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {selectedMethod === method.id && (
                              <CheckCircle 
                                sx={{ 
                                  color: 'white', 
                                  fontSize: 20,
                                }} 
                              />
                            )}
                          </Box>
                        </Box>
                        {selectedPlan && selectedMethod === method.id && (
                          <Button
                            variant="contained"
                            fullWidth
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!selectedPlan) {
                                setSnackbarMessage('Please select a plan first');
                                setSnackbarSeverity('warning');
                                setSnackbarOpen(true);
                                return;
                              }
                              // If already have order info, directly show payment form
                              if (orderNo || clientSecret || paypalOrderId) {
                                setShowPaymentForm(true);
                              } else {
                                // Otherwise create payment order (Stripe and PayPal will automatically show form)
                                await proceedWithPayment(method.id);
                                // After creating order, if Stripe or PayPal, will automatically show payment form
                                // If WeChat or Alipay, will automatically show dialog
                              }
                            }}
                            disabled={processing || !selectedPlan}
                            sx={{
                              backgroundColor: method.color,
                              color: 'white',
                              py: 1.2,
                              fontWeight: 600,
                              '&:hover': {
                                backgroundColor: method.color,
                                opacity: 0.9,
                              },
                              '&:disabled': {
                                backgroundColor: method.color,
                                opacity: 0.5,
                              },
                            }}
                          >
                            {processing && selectedMethod === method.id ? (
                              <>
                                <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
                                Processing...
                              </>
                            ) : (
                              `Pay with ${method.name}`
                            )}
                          </Button>
                        )}
                      </Box>
                    </Paper>
                  </motion.div>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </motion.div>
      )}

      {/* Payment Form for Stripe and PayPal - only show after clicking radio button */}
      {showPaymentForm && selectedPlan && selectedMethod && (
        (selectedMethod === 'stripe' && orderNo && clientSecret) ||
        (selectedMethod === 'paypal' && orderNo)
      ) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Paper 
            elevation={3}
            sx={{ 
              p: 4, 
              mb: 4,
              borderRadius: 3,
              background: (theme) => theme.palette.background.paper,
            }}
          >
            <Typography variant="h6" gutterBottom sx={{ mb: 3, fontWeight: 600 }}>
              Complete Payment
            </Typography>
            
            {selectedMethod === 'stripe' && orderNo && clientSecret && (
              <StripePayment
                key={`stripe-${orderNo}-${clientSecret}`} // Force re-render when orderNo or clientSecret changes
                amount={selectedPlan.price}
                currency={selectedPlan.currency}
                orderNo={orderNo}
                clientSecret={clientSecret}
                onSuccess={(orderNo) => {
                  handlePaymentSuccess(orderNo);
                }}
                onError={(error) => {
                  setError(error);
                  setShowPaymentForm(false);
                }}
              />
            )}

            {selectedMethod === 'paypal' && orderNo && (
              <PayPalPayment
                key={`paypal-${orderNo}`} // Force re-render when orderNo changes
                amount={selectedPlan.price}
                currency={selectedPlan.currency}
                orderNo={orderNo}
                paypalOrderId={paypalOrderId || undefined}
                onSuccess={(orderNo) => {
                  handlePaymentSuccess(orderNo);
                }}
                onError={(error) => {
                  setError(error);
                  setShowPaymentForm(false);
                }}
              />
            )}

          </Paper>
        </motion.div>
      )}

      {/* Login Required Dialog */}
      <Dialog
        open={showLoginDialog}
        onClose={() => setShowLoginDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <ProIcon sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Login Required
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 3 }}>
            You need to login to purchase a subscription plan. Please login or register to continue.
          </DialogContentText>
          <Box
            sx={{
              p: 3,
              borderRadius: 2,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(102, 126, 234, 0.1)'
                  : 'rgba(102, 126, 234, 0.05)',
              border: '1px solid rgba(102, 126, 234, 0.2)',
            }}
          >
            <Typography variant="body2" color="text.secondary">
              After logging in, you will be able to:
            </Typography>
            <Box component="ul" sx={{ mt: 1, pl: 2 }}>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Purchase subscription plans
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Access all premium features
                </Typography>
              </li>
              <li>
                <Typography variant="body2" color="text.secondary">
                  Manage your account and subscriptions
                </Typography>
              </li>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button
            onClick={() => setShowLoginDialog(false)}
            color="inherit"
          >
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

      {/* WeChat Payment Dialog */}
      {selectedPlan && orderNo && (
        <WechatPaymentDialog
          open={showWechatPaymentDialog}
          onClose={() => {
            setShowWechatPaymentDialog(false);
            setOrderNo(null);
            setQrCode(null);
          }}
          amount={selectedPlan.price}
          currency={selectedPlan.currency}
          orderNo={orderNo || ''}
          qrCode={qrCode || ''}
          isMockMode={isMockMode}
          onSuccess={(orderNo: string) => {
            handlePaymentSuccess(orderNo);
            setShowWechatPaymentDialog(false);
            setOrderNo(null);
            setQrCode(null);
          }}
          onError={(error: string) => {
            setError(error);
            setShowWechatPaymentDialog(false);
            setQrCode(null);
          }}
        />
      )}

      {/* Alipay Payment Dialog */}
      {selectedPlan && orderNo && (
        <AlipayPaymentDialog
          open={showAlipayPaymentDialog}
          onClose={() => {
            setShowAlipayPaymentDialog(false);
            setOrderNo(null);
            setQrCode(null);
          }}
          amount={selectedPlan.price}
          currency={selectedPlan.currency}
          orderNo={orderNo || ''}
          qrCode={qrCode || ''}
          isMockMode={isMockMode}
          onSuccess={(orderNo: string) => {
            handlePaymentSuccess(orderNo);
            setShowAlipayPaymentDialog(false);
            setOrderNo(null);
            setQrCode(null);
          }}
          onError={(error: string) => {
            setError(error);
            setShowAlipayPaymentDialog(false);
            setQrCode(null);
          }}
        />
      )}

      {/* Payment Methods Info */}
      <Box
        sx={{
          mt: 3,
          p: 2,
          borderRadius: 2,
          bgcolor: (theme) => theme.palette.mode === 'dark' 
            ? 'rgba(255, 255, 255, 0.05)'
            : 'rgba(0, 0, 0, 0.02)',
          border: '1px solid',
          borderColor: (theme) => theme.palette.divider,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            bgcolor: (theme) => theme.palette.mode === 'dark'
              ? 'rgba(33, 150, 243, 0.2)'
              : 'rgba(33, 150, 243, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <CheckCircle 
            sx={{ 
              color: 'primary.main',
              fontSize: 24 
            }} 
          />
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Available Payment Methods
          </Typography>
          <Typography variant="body1" sx={{ fontWeight: 500, color: 'text.primary' }}>
            {isChina ? (
              <>China region: <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>WeChat Pay</Box> and <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Alipay</Box></>
            ) : (
              <>Global region: <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>Stripe</Box> and <Box component="span" sx={{ color: 'text.secondary', fontWeight: 600 }}>PayPal</Box></>
            )}
          </Typography>
        </Box>
      </Box>

      {/* Snackbar for payment notifications - appears at top to avoid blocking content */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        sx={{
          top: { xs: 80, sm: 100 },
          '& .MuiSnackbarContent-root': {
            backgroundColor: snackbarSeverity === 'success' ? '#4caf50' :
                            snackbarSeverity === 'error' ? '#f44336' :
                            snackbarSeverity === 'warning' ? '#ff9800' :
                            '#2196f3',
            color: 'white',
            fontWeight: 500,
            fontSize: '0.95rem',
            minWidth: '300px',
            maxWidth: '600px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        }}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Pay;
