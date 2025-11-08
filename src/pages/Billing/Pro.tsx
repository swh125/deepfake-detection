import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Divider,
} from '@mui/material';
import {
  CheckCircle,
  Star,
  WorkspacePremium,
  Security,
  Speed,
  Analytics,
  Support,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useRegion } from '../../hooks/useRegion';

const Pro: React.FC = () => {
  const navigate = useNavigate();
  const { isChina } = useRegion();

  const features = [
    {
      icon: <Security />,
      title: 'Unlimited Detections',
      description: 'No limits on detection requests',
    },
    {
      icon: <Speed />,
      title: 'Priority Processing',
      description: 'Faster processing times for all requests',
    },
    {
      icon: <Analytics />,
      title: 'Advanced Analytics',
      description: 'Detailed reports and insights',
    },
    {
      icon: <Support />,
      title: '24/7 Priority Support',
      description: 'Get help whenever you need it',
    },
    {
      icon: <TrendingUp />,
      title: 'Real-time Monitoring',
      description: 'Track your detection history in real-time',
    },
    {
      icon: <Star />,
      title: 'Early Access Features',
      description: 'Be the first to try new features',
    },
  ];

  const plans = isChina
    ? [
        {
          id: 'monthly',
          name: 'Pro Monthly',
          price: 99,
          currency: 'CNY',
          period: 'month',
          popular: false,
        },
        {
          id: 'yearly',
          name: 'Pro Yearly',
          price: 999,
          currency: 'CNY',
          period: 'year',
          popular: true,
          savings: 'Save ¥189',
        },
      ]
    : [
        {
          id: 'monthly',
          name: 'Pro Monthly',
          price: 14.99,
          currency: 'USD',
          period: 'month',
          popular: false,
        },
        {
          id: 'yearly',
          name: 'Pro Yearly',
          price: 149.99,
          currency: 'USD',
          period: 'year',
          popular: true,
          savings: 'Save $29.89',
        },
      ];

  const handleUpgrade = (planId: string) => {
    // 跳转到支付页面，并传递选中的套餐
    navigate(`/pay?plan=${planId}`);
  };

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
      <Box sx={{ textAlign: 'center', mb: 8, position: 'relative' }}>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Box 
            sx={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              mb: 3,
              position: 'relative',
            }}
          >
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2, 
                repeat: Infinity, 
                repeatDelay: 3 
              }}
            >
              <WorkspacePremium
                sx={{
                  fontSize: { xs: 48, md: 72 },
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 4px 8px rgba(102, 126, 234, 0.3))',
                  mr: 2,
                }}
              />
            </motion.div>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                fontSize: { xs: '2rem', md: '3rem' },
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-0.02em',
              }}
            >
              Upgrade to Pro
            </Typography>
          </Box>
          <Typography 
            variant="h5" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              fontWeight: 400,
              fontSize: { xs: '1.1rem', md: '1.5rem' },
            }}
          >
            Unlock the full potential of AI Deepfake Detection
          </Typography>
          <Typography 
            variant="body1" 
            color="text.secondary"
            sx={{
              fontSize: { xs: '0.95rem', md: '1.1rem' },
              maxWidth: 600,
              mx: 'auto',
            }}
          >
            Get unlimited access to advanced features and priority support
          </Typography>
        </motion.div>
      </Box>

      {/* Features Section */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {features.map((feature, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                sx={{
                  height: '100%',
                  background: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                      : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                  border: '1px solid',
                  borderColor: (theme) =>
                    theme.palette.mode === 'dark'
                      ? 'rgba(255, 255, 255, 0.1)'
                      : 'rgba(0, 0, 0, 0.08)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'hidden',
                  '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '4px',
                    background: 'linear-gradient(90deg, #667eea 0%, #764ba2 100%)',
                    transform: 'scaleX(0)',
                    transformOrigin: 'left',
                    transition: 'transform 0.3s ease',
                  },
                  '&:hover': {
                    transform: 'translateY(-8px) scale(1.02)',
                    boxShadow: (theme) =>
                      theme.palette.mode === 'dark'
                        ? '0 12px 40px rgba(102, 126, 234, 0.3)'
                        : '0 12px 40px rgba(102, 126, 234, 0.2)',
                    '&::before': {
                      transform: 'scaleX(1)',
                    },
                  },
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        p: 2,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        mr: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 56,
                        height: 56,
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography 
                        variant="h6" 
                        gutterBottom
                        sx={{ 
                          fontWeight: 600,
                          mb: 1,
                        }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary"
                        sx={{ lineHeight: 1.6 }}
                      >
                        {feature.description}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {/* Pricing Plans */}
      <Box sx={{ mb: 6 }}>
        <Typography
          variant="h4"
          align="center"
          gutterBottom
          sx={{ fontWeight: 700, mb: 4 }}
        >
          Choose Your Plan
        </Typography>
        <Grid container spacing={4} justifyContent="center">
          {plans.map((plan, index) => (
            <Grid item xs={12} md={6} key={plan.id}>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.2 }}
              >
                <Card
                  sx={{
                    height: '100%',
                    position: 'relative',
                    border: plan.popular ? 3 : 2,
                    borderColor: plan.popular 
                      ? 'primary.main' 
                      : (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'rgba(255, 255, 255, 0.12)'
                            : 'rgba(0, 0, 0, 0.12)',
                    background: plan.popular
                      ? (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(145deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%)'
                            : 'linear-gradient(145deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)'
                      : (theme) =>
                          theme.palette.mode === 'dark'
                            ? 'linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)'
                            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(255, 255, 255, 0.7) 100%)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    overflow: 'visible',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: (theme) =>
                        plan.popular
                          ? theme.palette.mode === 'dark'
                            ? '0 20px 60px rgba(102, 126, 234, 0.4)'
                            : '0 20px 60px rgba(102, 126, 234, 0.3)'
                          : theme.palette.mode === 'dark'
                            ? '0 20px 60px rgba(0, 0, 0, 0.5)'
                            : '0 20px 60px rgba(0, 0, 0, 0.15)',
                    },
                  }}
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
                  <CardContent sx={{ p: 4 }}>
                    <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                      {plan.name}
                    </Typography>
                    <Box sx={{ my: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'baseline', mb: 1 }}>
                        <Typography
                          variant="h2"
                          sx={{ 
                            fontWeight: 800, 
                            lineHeight: 1,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontSize: { xs: '2.5rem', md: '3.5rem' },
                          }}
                        >
                          {plan.currency === 'CNY' ? '¥' : '$'}
                          {plan.price}
                        </Typography>
                        <Typography 
                          variant="h6" 
                          color="text.secondary" 
                          sx={{ 
                            ml: 1,
                            fontWeight: 500,
                          }}
                        >
                          / {plan.period}
                        </Typography>
                      </Box>
                      {plan.period === 'month' && (
                        <Typography variant="caption" color="text.secondary">
                          Billed monthly
                        </Typography>
                      )}
                      {plan.period === 'year' && (
                        <Typography variant="caption" color="text.secondary">
                          Billed annually
                        </Typography>
                      )}
                    </Box>
                    {plan.savings && (
                      <Chip
                        label={plan.savings}
                        color="success"
                        size="small"
                        sx={{ mb: 3 }}
                      />
                    )}
                    <Divider sx={{ my: 3 }} />
                    <List>
                      {features.slice(0, 4).map((feature, idx) => (
                        <ListItem key={idx} disablePadding sx={{ py: 1 }}>
                          <ListItemIcon sx={{ minWidth: 40 }}>
                            <CheckCircle color="success" />
                          </ListItemIcon>
                          <ListItemText primary={feature.title} />
                        </ListItem>
                      ))}
                    </List>
                    <Button
                      variant={plan.popular ? 'contained' : 'outlined'}
                      fullWidth
                      size="large"
                      onClick={() => handleUpgrade(plan.id)}
                      sx={{
                        mt: 3,
                        py: 1.8,
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        textTransform: 'none',
                        borderRadius: 2,
                        ...(plan.popular
                          ? {
                              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                              color: 'white',
                              boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                              '&:hover': {
                                background: 'linear-gradient(135deg, #5568d3 0%, #6a4190 100%)',
                                boxShadow: '0 6px 20px rgba(102, 126, 234, 0.5)',
                                transform: 'translateY(-2px)',
                              },
                            }
                          : {
                              borderWidth: 2,
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              '&:hover': {
                                borderWidth: 2,
                                background: 'rgba(102, 126, 234, 0.08)',
                                transform: 'translateY(-2px)',
                              },
                            }),
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      }}
                    >
                      Choose Plan
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* FAQ or Additional Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              mb: 0.5,
            }}
          >
            Frequently Asked Questions
          </Typography>
        </Box>

        <Grid container spacing={2} sx={{ maxWidth: 1000, mx: 'auto' }}>
          {[
            {
              question: 'Can I cancel anytime?',
              answer: 'Yes, you can cancel your subscription at any time. Your access will continue until the end of the billing period.',
            },
            {
              question: 'What payment methods do you accept?',
              answer: isChina
                ? 'We accept WeChat Pay and Alipay for Chinese users.'
                : 'We accept Stripe and PayPal for international users.',
            },
            {
              question: 'Do you offer refunds?',
              answer: 'We offer a 30-day money-back guarantee for all new subscriptions.',
            },
            {
              question: 'Will my data be secure?',
              answer: 'Absolutely. We use industry-standard encryption and never share your data with third parties.',
            },
          ].map((faq, index) => (
            <Grid item xs={12} sm={6} key={index}>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 + index * 0.05 }}
              >
                <Box
                  sx={{
                    p: 2,
                    borderRadius: 2,
                    background: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.03)'
                        : 'rgba(255, 255, 255, 0.6)',
                    border: '1px solid',
                    borderColor: (theme) =>
                      theme.palette.mode === 'dark'
                        ? 'rgba(255, 255, 255, 0.08)'
                        : 'rgba(0, 0, 0, 0.06)',
                    transition: 'all 0.2s ease',
                    height: '100%',
                    '&:hover': {
                      background: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(255, 255, 255, 0.05)'
                          : 'rgba(255, 255, 255, 0.8)',
                      borderColor: (theme) =>
                        theme.palette.mode === 'dark'
                          ? 'rgba(102, 126, 234, 0.4)'
                          : 'rgba(102, 126, 234, 0.3)',
                    },
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        mr: 1.5,
                        mt: 0.25,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(102, 126, 234, 0.3)',
                      }}
                    >
                      <Typography
                        sx={{
                          color: 'white',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                        }}
                      >
                        {index + 1}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="subtitle1"
                        sx={{
                          fontWeight: 600,
                          mb: 0.5,
                          fontSize: '0.95rem',
                          color: (theme) =>
                            theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
                        }}
                      >
                        {faq.question}
                      </Typography>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          lineHeight: 1.6,
                          fontSize: '0.85rem',
                        }}
                      >
                        {faq.answer}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </motion.div>
    </Box>
  );
};

export default Pro;
