import React, { useState } from 'react';
import { loadStripe, StripeElementsOptions } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  useStripe,
  useElements
} from '@stripe/react-stripe-js';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { getRegionConfig } from '../../config/regionConfig';
import api from '../../services/api';
import { STRIPE_PUBLISHABLE_KEY } from '../../config/env';

// 延迟加载Stripe，确保环境变量已加载
const getStripePromise = () => {
  const key = STRIPE_PUBLISHABLE_KEY;

  return loadStripe(key, {
    locale: 'en' as const, // 强制使用英文界面
  });
};

interface StripePaymentProps {
  amount: number;
  currency: string;
  orderNo: string;
  clientSecret?: string; // 已创建的支付意图的client_secret
  onSuccess: (orderNo: string) => void;
  onError: (error: string) => void;
}

const StripePaymentForm: React.FC<StripePaymentProps & { isConfigured: boolean }> = ({
  amount,
  currency,
  orderNo,
  clientSecret,
  onSuccess,
  onError,
  isConfigured
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Check if Stripe and Elements are ready
  React.useEffect(() => {
    if (stripe && elements && clientSecret) {
      // Add small delay to ensure everything is initialized
      const timer = setTimeout(() => {
        setIsReady(true);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [stripe, elements, clientSecret]);

  // Reset ready state when clientSecret changes
  React.useEffect(() => {
    setIsReady(false);
    setProcessing(false);
  }, [clientSecret]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    event.stopPropagation(); // Prevent event bubbling

    // Check if Stripe and Elements are ready
    if (!stripe || !elements) {
      // Show error if not ready
      setErrorMessage('Stripe is not ready. Please wait a moment and try again.');
      setErrorDialogOpen(true);
      return;
    }

    if (!clientSecret) {
      setErrorMessage('Payment intent not found. Please try again.');
      setErrorDialogOpen(true);
      return;
    }

    // Prevent double submission
    if (processing) {
      return;
    }

    setProcessing(true);

    try {
      // 使用已创建的支付意图的client_secret，不再创建新订单

      // 确认支付
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        throw new Error('Card element not found');
      }

      // Add timeout for payment confirmation to prevent hanging
      const paymentPromise = stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            // 可以添加用户信息
          }
        }
      });
      
      // Set timeout (30 seconds) to prevent infinite waiting
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Payment confirmation timeout. Please try again.'));
        }, 30000);
      });
      
      const { error, paymentIntent } = await Promise.race([paymentPromise, timeoutPromise]) as any;

      if (error) {
        // 如果是处理错误或超时，不显示错误，继续等待
        const errorMsg = error.message || '';
        if (errorMsg.includes('processing error') || 
            errorMsg.includes('timeout') || 
            errorMsg.includes('network') ||
            errorMsg.toLowerCase().includes('a processing error occurred')) {
          // 静默处理，不显示错误，继续等待
          setProcessing(false);
          return;
        }
        
        // 显示错误对话框，不调用onError（避免在顶部显示错误）
        const finalErrorMsg = errorMsg || 'Payment failed';
        setErrorMessage(finalErrorMsg);
        setErrorDialogOpen(true);
        setProcessing(false);
        return;
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        // After payment success, update order status
        try {
          const response = await api.post('/api/v1/payment/confirm', {
            order_no: orderNo,
            payment_provider_order_id: paymentIntent.id,
            payment_status: 'paid',
            payment_data: paymentIntent
          }, {
            timeout: 10000 // 10秒超时，减少等待时间
          });

          // Wait 1 second after confirmation (reduced from 3 seconds)
          await new Promise(resolve => setTimeout(resolve, 1000));

        } catch (updateError: any) {
          // Even if update fails, continue with success callback
          // Reduced wait time
          await new Promise(resolve => setTimeout(resolve, 500));
        }
        // Reset processing state before calling onSuccess
        setProcessing(false);
        onSuccess(orderNo);
      } else {
        // Payment intent exists but status is not succeeded
        setProcessing(false);
      }
    } catch (err: any) {
      // 如果是超时或网络错误，不显示错误，继续等待
      const errorMsg = err.message || '';
      if (errorMsg.includes('timeout') || 
          errorMsg.includes('network') || 
          errorMsg.includes('Network Error') ||
          errorMsg.includes('Script error')) {
        // 静默处理，不显示错误，继续等待
        setProcessing(false);
        return;
      }
      
      // 显示错误对话框，不调用onError（避免在顶部显示错误）
      const finalErrorMsg = errorMsg || 'Payment processing failed';
      setErrorMessage(finalErrorMsg);
      setErrorDialogOpen(true);
      setProcessing(false);
    }
  };

  const cardElementOptions = {
    style: {
      base: {
        fontSize: '16px',
        color: '#424770',
        '::placeholder': {
          color: '#aab7c4',
        },
      },
      invalid: {
        color: '#9e2146',
      },
    },
  };

  if (!isConfigured) {
    // 模拟模式：显示Success消息
    return (
      <Box>
        <Alert severity="success">
          <Typography variant="body2">
            ✅ Payment order created successfully! Order Number: {orderNo}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Using mock payment mode. Configure Stripe to enable real payment processing.
          </Typography>
        </Alert>
      </Box>
    );
  }

  // 如果clientSecret不存在，不显示组件（让父组件处理）
  if (!clientSecret) {
    return null;
  }

  // 翻译Stripe错误消息为英文
  const translateErrorMessage = (message: string): string => {
    // 先转换为小写进行匹配（不区分大小写）
    const lowerMessage = message.toLowerCase();
    
    const errorMap: { [key: string]: string } = {
      // 中文错误消息
      '您的银行卡的到期年份是过去的年份': 'Your card\'s expiration year is in the past.',
      '您的银行卡的到期年份是过去的年份。': 'Your card\'s expiration year is in the past.',
      '您的邮编不完整': 'Your postal code is incomplete.',
      '您的邮编不完整。': 'Your postal code is incomplete.',
      '卡号': 'Card number',
      '到期年份': 'Expiration year',
      '邮编': 'Postal code',
      // 英文错误消息（保持原样）
      'your card\'s expiration year is in the past': 'Your card\'s expiration year is in the past.',
      'your card\'s expiration year is in the past.': 'Your card\'s expiration year is in the past.',
      'your postal code is incomplete': 'Your postal code is incomplete.',
      'your postal code is incomplete.': 'Your postal code is incomplete.',
      'your card number is invalid': 'Your card number is invalid.',
      'your card\'s expiration month is invalid': 'Your card\'s expiration month is invalid.',
      'your card\'s expiration year is invalid': 'Your card\'s expiration year is invalid.',
      'your card\'s security code is invalid': 'Your card\'s security code is invalid.',
      'your card was declined': 'Your card was declined.',
      'your card has insufficient funds': 'Your card has insufficient funds.',
      'your card\'s zip code failed validation': 'Your card\'s zip code failed validation.',
    };
    
    // 检查是否有完全匹配
    if (errorMap[message]) {
      return errorMap[message];
    }
    
    // 检查是否有包含匹配（不区分大小写）
    for (const [key, value] of Object.entries(errorMap)) {
      if (lowerMessage.includes(key.toLowerCase()) || message.includes(key)) {
        return value;
      }
    }
    
    // 如果没有匹配，返回原消息
    return message;
  };

  return (
    <>
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 3 }}>
          <Paper sx={{ p: 3, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
              Card Information
            </Typography>
            <Box sx={{ p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
              <CardElement options={cardElementOptions} />
            </Box>
          </Paper>

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={!isReady || processing}
            onClick={(e) => {
              // Ensure form submission is handled
              if (!isReady || processing) {
                e.preventDefault();
                return;
              }
              // Form onSubmit will handle it, but we can also handle click directly
            }}
            sx={{
              py: 1.5,
              background: 'linear-gradient(135deg, #635BFF 0%, #8B7FFF 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #7a6ee6 100%)',
              },
              '&:disabled': {
                opacity: 0.6,
                cursor: 'not-allowed'
              }
            }}
          >
            {processing ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1, color: 'white' }} />
                Processing Payment...
              </>
            ) : (
              `Pay ${currency === 'USD' ? '$' : ''}${amount}`
            )}
          </Button>
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            <strong>⚠️ Sandbox Test Mode - Use Test Cards Only:</strong>
            <br />
            <strong>Successful Payment:</strong> 4242 4242 4242 4242
            <br />
            <strong>Expiry:</strong> Any future date (e.g., 12/25)
            <br />
            <strong>CVC:</strong> Any 3 digits (e.g., 123)
            <br />
            <strong>ZIP:</strong> Any 5 digits (e.g., 12345)
          </Typography>
        </Alert>
      </form>

      {/* Error Dialog - 显示在点击付款后 */}
      <Dialog
        open={errorDialogOpen}
        onClose={() => setErrorDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" color="error">
            Payment Error
          </Typography>
          <IconButton
            aria-label="close"
            onClick={() => setErrorDialogOpen(false)}
            sx={{ color: (theme) => theme.palette.grey[500] }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            {errorMessage ? translateErrorMessage(errorMessage) : 'An error occurred during payment processing.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setErrorDialogOpen(false)} variant="contained" color="primary">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

const StripePayment: React.FC<StripePaymentProps> = ({ clientSecret, ...props }) => {
  // 检查是否配置了Stripe（使用备用配置）
  const stripeKey = STRIPE_PUBLISHABLE_KEY;
  const isConfigured = Boolean(
    stripeKey && 
    stripeKey !== 'pk_test_dummy' &&
    stripeKey.trim() !== ''
  );
  
  // 调试输出（开发环境）
  if (process.env.NODE_ENV === 'development') {

  }

  // Hooks must be called unconditionally at the top level
  const options: StripeElementsOptions = {
    mode: 'payment',
    amount: Math.round(props.amount * 100), // Stripe uses cents
    currency: props.currency.toLowerCase(),
    appearance: {
      theme: 'stripe' as const,
    },
  };

  // Use useMemo to prevent recreating stripePromise on every render
  // Must be called unconditionally
  const stripePromise = React.useMemo(() => {
    if (!isConfigured) return null;
    return getStripePromise();
  }, [isConfigured]);
  
  // Don't render if clientSecret is not provided
  if (!clientSecret) {
    return null;
  }
  
  // Show loading state if Stripe is not ready
  if (!stripePromise) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Loading Stripe...
        </Typography>
      </Box>
    );
  }
  
  return (
    <Elements stripe={stripePromise} options={options} key={`stripe-elements-${clientSecret}`}>
      <StripePaymentForm {...props} clientSecret={clientSecret} isConfigured={isConfigured} />
    </Elements>
  );
};

export default StripePayment;

