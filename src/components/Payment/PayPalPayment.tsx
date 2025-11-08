import React, { useState, useEffect } from 'react';
import { PayPalButtons, PayPalScriptProvider, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import {
  Box,
  Alert,
  Typography,
  CircularProgress
} from '@mui/material';
import api from '../../services/api';

interface PayPalPaymentProps {
  amount: number;
  currency: string;
  orderNo: string;
  paypalOrderId?: string; // 已创建的PayPal订单ID（可选）
  onSuccess: (orderNo: string) => void;
  onError: (error: string) => void;
}

// Internal component for detecting script loading status
const PayPalButtonWrapper: React.FC<{
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string; payerID?: string | null }) => Promise<void>;
  onError: (err: any) => void;
  onCancel: (data: any) => void;
  amount: number;
  currency: string;
  orderNo: string;
  onScriptLoad: () => void;
  onScriptError: (error: string) => void;
}> = ({ createOrder, onApprove, onError, onCancel, amount, currency, orderNo, onScriptLoad, onScriptError }) => {
  const [{ isResolved, isPending, isRejected }] = usePayPalScriptReducer();

  useEffect(() => {
    if (isResolved) {
      // Add a longer delay to ensure buttons are fully initialized and ready for user interaction
      // PayPal buttons need time to fully render and attach event handlers
      const timeoutId = setTimeout(() => {
        onScriptLoad();
      }, 800); // Increased to 800ms to ensure PayPal SDK is fully ready for user input (prevents password field clearing)
      
      return () => clearTimeout(timeoutId);
    } else if (isRejected) {
      // Script failed to load - show error after a delay to allow for network issues
      const timeoutId = setTimeout(() => {
        onScriptError('PayPal script failed to load. This may be due to network issues. Please check your internet connection, refresh the page, or try using Stripe payment instead.');
      }, 5000); // Wait 5 seconds before showing error
      
      return () => clearTimeout(timeoutId);
    }
  }, [isResolved, isPending, isRejected, onScriptLoad, onScriptError]);

  // Show loading state while script is loading
  if (isPending || (!isResolved && !isRejected)) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, minHeight: 50 }}>
        <CircularProgress size={20} />
        <Typography variant="body2" color="text.secondary">
          Loading PayPal script... This may take a few seconds.
        </Typography>
      </Box>
    );
  }

  // Don't render buttons until script is fully resolved
  if (!isResolved) {
    return null;
  }

  return (
    <Box sx={{ position: 'relative', mb: 0 }}>
      <PayPalButtons
        createOrder={createOrder}
        onApprove={onApprove as any}
        onError={onError}
        onCancel={onCancel}
        style={{
          layout: 'vertical',
          color: 'blue',
          shape: 'rect',
          label: 'paypal',
          height: 45
        }}
        forceReRender={[amount, currency, orderNo]}
      />
    </Box>
  );
};

const PayPalPayment: React.FC<PayPalPaymentProps> = ({
  amount,
  currency,
  orderNo,
  paypalOrderId,
  onSuccess,
  onError
}) => {
  const [processing, setProcessing] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptError, setScriptError] = useState<string | null>(null);

  // Use a counter to force re-initialization when orderNo changes
  const [initKey, setInitKey] = useState(0);

  // Reset script loaded state when orderNo changes (new payment)
  useEffect(() => {
    // Reset all states when orderNo changes to allow fresh payment
    setScriptLoaded(false);
    setScriptError(null);
    setProcessing(false);
    // Increment initKey to force PayPalScriptProvider to re-initialize
    setInitKey(prev => prev + 1);
  }, [orderNo]);

  // 检查是否之前登录过PayPal账号
  useEffect(() => {
    const savedPayPalAccount = localStorage.getItem('paypal_account_logged_in');
    if (savedPayPalAccount === 'true') {

    } else {

    }
  }, []);

  // 获取PayPal Client ID（使用备用配置）
  const PAYPAL_CLIENT_ID = process.env.REACT_APP_PAYPAL_CLIENT_ID || 'AYTzR9jSS9PMF3uEO-d83C0s2oNgkkbtrMGT8mRDaeH5hK-VAvMDrghcGGRhLrGzWXd3HMGFVWiFcg0V';
  
  // 检查是否配置了PayPal（明确转换为boolean类型）
  const isConfigured = Boolean(
    PAYPAL_CLIENT_ID && 
    PAYPAL_CLIENT_ID !== '' &&
    PAYPAL_CLIENT_ID !== 'dummy'
  );

  // Use useEffect to detect PayPal script loading status
  // Removed timeout error - just wait for script to load
  // No error will be shown, component will continue waiting
  useEffect(() => {
    if (!isConfigured) return;
    // Script loading is handled by PayPalButtonWrapper component
    // No timeout error - just wait indefinitely
  }, [scriptLoaded, isConfigured]);

  // 调试输出（开发环境）
  if (process.env.NODE_ENV === 'development') {

  }

  // 如果没有配置，使用模拟模式（不显示警告，因为这是正常的测试模式）
  // if (!isConfigured) {
  //   return (
  //     <Alert severity="warning">
  //       PayPal is not configured. Please set REACT_APP_PAYPAL_CLIENT_ID in your .env file.
  //       The payment will use mock mode for now.
  //     </Alert>
  //   );
  // }

  const createOrder = async (): Promise<string> => {
    // Always create a new order, don't reuse old paypalOrderId
    // This ensures fresh payment flow for each payment attempt
    
    // Ensure script is loaded before creating order
    if (!scriptLoaded) {
      // Wait a bit for script to load
      await new Promise(resolve => setTimeout(resolve, 500));
      if (!scriptLoaded) {
        throw new Error('PayPal script is not ready. Please wait a moment and try again.');
      }
    }

    // PayPal Buttons会自动调用这个函数，不需要手动设置processing
    try {
        // Infer plan type from amount (USD: yearly >= 100, CNY: yearly >= 500)
        const isYearly = (currency === 'USD' && amount >= 100) || (currency === 'CNY' && amount >= 500);
        const planName = isYearly ? 'Pro Yearly' : 'Pro Monthly';
        
        const response = await api.post('/api/v1/payment/create', {
          amount,
          currency,
          payment_method: 'paypal',
          region: 'global',
          description: `Pro Plan - ${planName}`
        }, {
          timeout: 20000 // 20秒超时，减少等待时间
        });

      if (!response.data || !response.data.success) {
        const errorMsg = response.data?.message || 'Failed to create PayPal order';
        throw new Error(errorMsg);
      }

      // PayPal需要order_id，但后端返回的可能不是order_id
      // 如果后端返回了order_id，使用它；否则使用order_no
      const newPaypalOrderId = response.data.data?.order_id || response.data.data?.order_no || response.data.order_id || response.data.order_no;
      
      if (!newPaypalOrderId) {
        throw new Error('No order ID returned from server');
      }

      return newPaypalOrderId;
    } catch (apiError: any) {
      // 如果是超时，不报错，继续等待（重试）
      if (apiError.code === 'ECONNABORTED' || apiError.message?.includes('timeout')) {
        // 不抛出错误，而是等待一段时间后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
        // 静默重试，不显示错误
        return await createOrder();
      }
      if (apiError.code === 'ERR_NETWORK' || apiError.message?.includes('Network Error')) {
        // 网络错误也等待后重试
        await new Promise(resolve => setTimeout(resolve, 2000));
        return await createOrder();
      }
      
      // 其他错误抛出
      const errorMessage = apiError.response?.data?.message || apiError.message || 'Failed to create PayPal order';
      throw new Error(errorMessage);
    }
  };

  const onApprove = async (data: { orderID: string; payerID?: string | null }) => {
    try {
      setProcessing(true);

      // If payment success, user has logged into PayPal account, save login status
      if (data.payerID) {
        localStorage.setItem('paypal_account_logged_in', 'true');

      }
      
      // 调用后端API捕获支付

      const captureResponse = await api.post('/api/v1/payment/paypal/capture', {
        order_id: data.orderID,
        order_no: orderNo
      });

      if (!captureResponse.data || !captureResponse.data.success) {
        const errorMsg = captureResponse.data?.message || 'Failed to capture payment';

        throw new Error(errorMsg);
      }

      const captureData = captureResponse.data.data;

      // After payment success, update order status
      try {
        await api.post('/api/v1/payment/confirm', {
          order_no: orderNo,
          payment_provider_order_id: data.orderID,
          payment_status: 'paid',
          payment_data: captureData
        }, {
          timeout: 15000 // 15秒超时，减少等待时间
        });

        // Wait 1 second after confirmation (reduced from 3 seconds)
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (updateError: any) {
        // Even if update fails, continue with success callback
        // Reduced wait time
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Reset all states before calling onSuccess
      setProcessing(false);
      // Don't reset scriptLoaded here - let the component unmount/remount handle it
      onSuccess(orderNo);
    } catch (err: any) {

      const errorMessage = err.response?.data?.message || err.message || 'Payment capture failed';
      onError(errorMessage);
      setProcessing(false);
      // 重新抛出错误，让 PayPal Buttons 知道支付失败
      throw err;
    }
  };

  const onCancel = (data: any) => {

    setProcessing(false);
    onError('Payment was cancelled by user');
  };

  const handlePayPalError = (err: any) => {
    // 如果是脚本错误或超时错误，不报错，继续等待
    const errorMessage = err.message || err.details?.[0]?.description || '';
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('Script error') || 
        errorMessage.includes('script') ||
        errorMessage.includes('zoid destroyed')) {
      // 静默处理，不显示错误，继续等待
      setProcessing(false);
      return;
    }
    
    // 其他错误才显示
    if (errorMessage) {
      onError(errorMessage);
    }
    setProcessing(false);
  };

  const paypalOptions = {
    clientId: PAYPAL_CLIENT_ID,
    currency: currency,
    intent: 'capture' as const,
    // Force PayPal account login (disable direct credit card payment)
    // This requires login to PayPal account on first use
    disableFunding: 'card,credit,paylater,venmo',
    enableFunding: 'paypal',
    // Don't save user info, force login every time
    // Note: PayPal may save login state in browser (via cookies)
    // If still showing logged in, need to clear browser PayPal cookies
    dataNamespace: undefined, // Don't use namespace, avoid cross-session saving
    // Add components to improve loading
    components: 'buttons',
    // Use sandbox for testing (will be overridden by actual mode in production)
  };

  return (
    <Box>
      {processing && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Processing PayPal payment...
          </Typography>
        </Box>
      )}

      {isConfigured ? (
        <PayPalScriptProvider 
          options={paypalOptions}
          key={`paypal-${orderNo}-${initKey}`} // Force re-render when orderNo or initKey changes
        >
          <PayPalButtonWrapper
            createOrder={createOrder}
            onApprove={onApprove}
            onError={handlePayPalError}
            onCancel={onCancel}
            amount={amount}
            currency={currency}
            orderNo={orderNo}
            onScriptLoad={() => {
              setScriptLoaded(true);
              setScriptError(null);
            }}
            onScriptError={(error) => {
              setScriptError(error);
              setScriptLoaded(false);
            }}
          />
        </PayPalScriptProvider>
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              ⚠️ PayPal未配置，使用模拟支付模式
            </Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              订单已创建（Order Number: {orderNo}），但PayPal支付未配置。
              <br />
              请在项目根目录的.env文件中配置 REACT_APP_PAYPAL_CLIENT_ID
            </Typography>
          </Alert>
        </Box>
      )}

      {isConfigured && orderNo && !scriptLoaded && !scriptError && (
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <CircularProgress size={20} />
          <Alert severity="info" sx={{ flex: 1 }}>
            <Typography variant="body2">
              Loading PayPal payment button... This may take a few seconds.
            </Typography>
          </Alert>
        </Box>
      )}

      {scriptError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          <Typography variant="body2">
            {scriptError}
          </Typography>
          <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
            Please refresh the page and try again. If the problem persists, try using Stripe payment instead.
          </Typography>
        </Alert>
      )}

      {isConfigured && scriptLoaded && (
        <Alert severity="info" sx={{ mt: 0.25, mb: 0, py: 0.75, '& .MuiAlert-message': { py: 0 } }}>
          <Typography variant="caption" sx={{ fontSize: '0.75rem', lineHeight: 1.3, display: 'block' }}>
            <strong>⚠️ Sandbox Test Mode:</strong>
            <br />
            <strong>Test Account:</strong> sb-lhti947118677@personal.example.com
            <br />
            <strong>Password:</strong> Ql+QcAl7
          </Typography>
        </Alert>
      )}
    </Box>
  );
};

export default PayPalPayment;

