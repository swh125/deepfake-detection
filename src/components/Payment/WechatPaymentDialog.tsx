import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  IconButton,
  Typography,
} from '@mui/material';
import {
  Close,
  CheckCircle,
} from '@mui/icons-material';
import api from '../../services/api';

interface WechatPaymentDialogProps {
  open: boolean;
  onClose: () => void;
  amount: number;
  currency: string;
  orderNo: string;
  qrCode: string;
  onSuccess: (orderNo: string) => void;
  onError: (error: string) => void;
  isMockMode?: boolean;
}

const WechatPaymentDialog: React.FC<WechatPaymentDialogProps> = ({
  open,
  onClose,
  amount,
  currency,
  orderNo,
  qrCode,
  onSuccess,
  onError,
  isMockMode = false,
}) => {
  const [showSuccess, setShowSuccess] = useState(false);

  // 生成真实二维码URL
  const getQRCodeUrl = () => {
    if (qrCode && !qrCode.includes('example.com')) {
      return qrCode;
    }
    // 如果没有二维码，使用订单号生成
    const qrData = `wechatpay://pay?order_no=${orderNo}&amount=${amount}&currency=${currency}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
  };

  // Mock payment: automatically complete after showing QR code
  useEffect(() => {
    if (open && isMockMode) {
      setShowSuccess(false);
      // After 3 seconds, show success, then close
      const timer = setTimeout(async () => {
        setShowSuccess(true);
        
        // Call backend to confirm payment and update subscription
        try {
          await api.post('/api/v1/payment/confirm', {
            order_no: orderNo,
            payment_provider_order_id: `MOCK_${orderNo}_${Date.now()}`,
            payment_status: 'paid',
            payment_data: { mock: true, completed_at: new Date().toISOString() }
          });
          
          // Wait 2 seconds after confirmation to allow backend to update subscription
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          // Even if confirmation fails, continue with success callback
        }
        
        setTimeout(() => {
          onSuccess(orderNo);
          onClose();
        }, 1500);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [open, orderNo, onSuccess, onClose, isMockMode]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      PaperProps={{
        sx: {
          borderRadius: 1,
          p: 2,
        },
      }}
    >
      <Box sx={{ position: 'relative', textAlign: 'center' }}>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            position: 'absolute',
            right: 0,
            top: 0,
            color: '#666',
          }}
        >
          <Close />
        </IconButton>
        
        {showSuccess ? (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: '#07C160', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#000' }}>
              Payment Successful
            </Typography>
          </Box>
        ) : (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, textAlign: 'center' }}>
              Scan QR Code to Pay
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Open WeChat and scan the QR code below
            </Typography>
            <img
              src={getQRCodeUrl()}
              alt="WeChat Pay QR Code"
              style={{
                width: 300,
                height: 300,
                display: 'block',
                margin: '0 auto',
                marginBottom: '24px',
              }}
            />
          </Box>
        )}
      </Box>
    </Dialog>
  );
};

export default WechatPaymentDialog;
