import React, { useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip, 
  CircularProgress,
  IconButton,
  Collapse,
  alpha
} from '@mui/material';
import { 
  Language, 
  ExpandMore,
  CheckCircle,
  Error as ErrorIcon,
  CloudQueue
} from '@mui/icons-material';
import { useRegion } from '../../hooks/useRegion';

/**
 * IP信息显示组件 - 重新设计版本
 * 更简洁、紧凑的设计，默认折叠，点击展开查看详情
 */
const IPInfoDisplay: React.FC = () => {
  const { region, isChina, label, loading, error, regionInfo } = useRegion();
  const [expanded, setExpanded] = useState(false);

  if (loading) {
    return (
      <Card 
        sx={{ 
          mb: 2,
          border: '1px solid',
          borderColor: (theme) => alpha(theme.palette.primary.main, 0.2),
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.05),
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <CircularProgress size={18} />
            <Typography variant="body2" color="text.secondary">
              Detecting region...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card 
        sx={{ 
          mb: 2, 
          border: '1px solid',
          borderColor: 'error.main',
          bgcolor: (theme) => alpha(theme.palette.error.main, 0.05),
        }}
      >
        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
          <Box display="flex" alignItems="center" gap={1}>
            <ErrorIcon color="error" sx={{ fontSize: 18 }} />
            <Typography variant="body2" color="error" fontWeight={500}>
              {error}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: '1px solid',
        borderColor: (theme) => 
          isChina 
            ? alpha(theme.palette.primary.main, 0.2)
            : alpha(theme.palette.success.main, 0.2),
        bgcolor: (theme) => 
          isChina 
            ? alpha(theme.palette.primary.main, 0.03)
            : alpha(theme.palette.success.main, 0.03),
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: (theme) => 
            isChina 
              ? alpha(theme.palette.primary.main, 0.4)
              : alpha(theme.palette.success.main, 0.4),
          boxShadow: 2
        }
      }}
    >
      <CardContent sx={{ py: 1.5, '&:last-child': { pb: expanded ? 1.5 : 1.5 } }}>
        {/* 紧凑的头部 - 始终显示 */}
        <Box 
          display="flex" 
          alignItems="center" 
          justifyContent="space-between"
          sx={{ cursor: 'pointer' }}
          onClick={() => setExpanded(!expanded)}
        >
          <Box display="flex" alignItems="center" gap={1.5}>
            <Chip
              icon={<Language sx={{ fontSize: 16 }} />}
              label={label}
              size="small"
              color={isChina ? 'primary' : 'success'}
              sx={{
                fontWeight: 600,
                height: 28,
              }}
            />
            <Typography variant="body2" color="text.secondary">
              {regionInfo?.country || 'Unknown'}
            </Typography>
            <Chip
              icon={<CloudQueue sx={{ fontSize: 14 }} />}
              label={isChina ? 'Tencent Cloud' : 'Supabase'}
              size="small"
              variant="outlined"
              sx={{
                height: 24,
                fontSize: '0.7rem',
                borderColor: (theme) => 
                  isChina 
                    ? alpha(theme.palette.primary.main, 0.3)
                    : alpha(theme.palette.success.main, 0.3),
                color: (theme) => 
                  isChina 
                    ? theme.palette.primary.main
                    : theme.palette.success.main,
              }}
            />
          </Box>
          <IconButton 
            size="small"
            sx={{ 
              color: 'text.secondary',
              transition: 'transform 0.2s',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            <ExpandMore />
          </IconButton>
        </Box>

        {/* 可展开的详细信息 */}
        <Collapse in={expanded}>
          <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
            <Box display="flex" flexDirection="column" gap={1.5}>
              <Box display="flex" alignItems="center" gap={1}>
                <CheckCircle sx={{ fontSize: 16, color: 'success.main' }} />
                <Typography variant="caption" color="text.secondary">
                  Region: <strong>{label}</strong>
                </Typography>
              </Box>
              {regionInfo?.ip && (
                <Box display="flex" alignItems="center" gap={1}>
                  <Language sx={{ fontSize: 16, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                    IP: {regionInfo.ip}
                  </Typography>
                </Box>
              )}
              <Box display="flex" alignItems="center" gap={1}>
                <CloudQueue sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  Database: <strong>{isChina ? 'CloudBase (Tencent)' : 'Supabase (Global)'}</strong>
                </Typography>
              </Box>
            </Box>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default IPInfoDisplay;

