import React, { useState, useEffect } from 'react';
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
} from '@mui/material';
import {
  QrCode2,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import axios from 'axios';
import { getRegionConfig } from '../../config/regionConfig';

interface WechatQRPaymentProps {
  amount: number;
  currency: string;
  orderNo: string;
  qrCode: string;
  onSuccess: (orderNo: string) => void;
  onError: (error: string) => void;
  isMockMode?: boolean;
}

const WechatQRPayment: React.FC<WechatQRPaymentProps> = ({
  amount,
  currency,
  orderNo,
  qrCode,
  onSuccess,
  onError,
  isMockMode = false,
}) => {
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'checking' | 'paid' | 'failed'>('pending');
  const [checking, setChecking] = useState(false);
  const checkIntervalRef = React.useRef<NodeJS.Timeout | null>(null);

  // 轮询检查支付状态
  const checkPaymentStatus = async () => {
    if (checking || paymentStatus === 'paid' || paymentStatus === 'failed') return;

    setChecking(true);
    try {
      const regionConfig = getRegionConfig();
      const response = await axios.get(
        `${regionConfig.apiBaseUrl}/api/v1/payment/status/${orderNo}`,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.success && response.data.data) {
        const status = response.data.data.payment_status;
        if (status === 'paid') {
          setPaymentStatus('paid');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          onSuccess(orderNo);
        } else if (status === 'failed' || status === 'cancelled') {
          setPaymentStatus('failed');
          if (checkIntervalRef.current) {
            clearInterval(checkIntervalRef.current);
            checkIntervalRef.current = null;
          }
          onError('Payment was cancelled or failed');
        }
      }
    } catch (err: any) {
      // 不阻止轮询，继续检查
    } finally {
      setChecking(false);
    }
  };

  // 启动轮询
  useEffect(() => {
    if (paymentStatus === 'pending' && !isMockMode) {
      // 每3秒检查一次支付状态
      checkIntervalRef.current = setInterval(() => {
        checkPaymentStatus();
      }, 3000);

      // 首次检查延迟1秒
      setTimeout(() => {
        checkPaymentStatus();
      }, 1000);
    }

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [orderNo, paymentStatus, isMockMode]);

  // Mock模式：自动完成支付
  useEffect(() => {
    if (isMockMode && paymentStatus === 'pending') {
      const timer = setTimeout(() => {
        setPaymentStatus('paid');
        onSuccess(orderNo);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isMockMode, paymentStatus, orderNo, onSuccess]);

  const handleCancelPayment = () => {
    if (checkIntervalRef.current) {
      clearInterval(checkIntervalRef.current);
      checkIntervalRef.current = null;
    }
    setPaymentStatus('failed');
    onError('Payment was cancelled by user');
  };

  return (
    <Paper
      elevation={3}
      sx={{
        p: 4,
        textAlign: 'center',
        maxWidth: 500,
        mx: 'auto',
        background: (theme) =>
          theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(7, 193, 96, 0.1) 0%, rgba(7, 193, 96, 0.05) 100%)'
            : 'linear-gradient(135deg, rgba(7, 193, 96, 0.05) 0%, rgba(7, 193, 96, 0.02) 100%)',
        borderRadius: 4,
        border: (theme) => `2px solid ${theme.palette.mode === 'dark' ? 'rgba(7, 193, 96, 0.3)' : 'rgba(7, 193, 96, 0.2)'}`,
      }}
    >
      {paymentStatus === 'paid' ? (
        <Box>
          <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Order Number: {orderNo}
          </Typography>
        </Box>
      ) : paymentStatus === 'failed' ? (
        <Box>
          <Cancel sx={{ fontSize: 64, color: 'error.main', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: 'error.main' }}>
            Payment Failed
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Please try again or contact support.
          </Typography>
        </Box>
      ) : (
        <>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: 2,
              background: (theme) =>
                theme.palette.mode === 'dark'
                  ? 'rgba(7, 193, 96, 0.2)'
                  : 'rgba(7, 193, 96, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mx: 'auto',
              mb: 3,
            }}
          >
            <QrCode2 sx={{ fontSize: 40, color: '#07C160' }} />
          </Box>

          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Scan QR Code to Pay
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Open WeChat and scan the QR code below
          </Typography>

          {isMockMode ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              Mock Payment Mode: Payment will be automatically completed in 2 seconds.
            </Alert>
          ) : (
            <Box
              sx={{
                p: 2,
                mb: 3,
                borderRadius: 2,
                background: (theme) =>
                  theme.palette.mode === 'dark'
                    ? 'rgba(0, 0, 0, 0.3)'
                    : 'rgba(0, 0, 0, 0.02)',
              }}
            >
              <Typography variant="caption" color="text.secondary">
                {checking ? 'Checking payment status...' : 'Waiting for payment...'}
              </Typography>
            </Box>
          )}

          {/* QR Code Display */}
          <Box
            sx={{
              p: 3,
              mb: 3,
              borderRadius: 2,
              background: '#fff',
              display: 'inline-block',
              border: '2px solid #07C160',
            }}
          >
            {qrCode && !qrCode.includes('example.com') ? (
              <img
                src={qrCode}
                alt="WeChat Pay QR Code"
                style={{
                  width: 256,
                  height: 256,
                  display: 'block',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 256,
                  height: 256,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f5f5f5',
                  borderRadius: 1,
                }}
              >
                <Typography variant="body2" color="text.secondary">
                  Mock QR Code
                </Typography>
              </Box>
            )}
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
              {amount} {currency}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Order: {orderNo}
            </Typography>
          </Box>

          {checking && (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="caption" color="text.secondary">
                Checking payment status...
              </Typography>
            </Box>
          )}

          <Button
            variant="outlined"
            color="error"
            onClick={handleCancelPayment}
            sx={{ mt: 2 }}
          >
            Cancel Payment
          </Button>
        </>
      )}
    </Paper>
  );
};

export default WechatQRPayment;









