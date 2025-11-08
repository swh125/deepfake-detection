import React from 'react';
import { Chip, Tooltip, alpha } from '@mui/material';
import { Language } from '@mui/icons-material';
import { useRegion } from '../../hooks/useRegion';

const countryCodeToName: Record<string, string> = {
  'US': 'United States',
  'GB': 'United Kingdom',
  'CA': 'Canada',
  'AU': 'Australia',
  'DE': 'Germany',
  'FR': 'France',
  'IT': 'Italy',
  'ES': 'Spain',
  'NL': 'Netherlands',
  'BE': 'Belgium',
  'CH': 'Switzerland',
  'AT': 'Austria',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark',
  'FI': 'Finland',
  'PL': 'Poland',
  'CZ': 'Czech Republic',
  'IE': 'Ireland',
  'PT': 'Portugal',
  'GR': 'Greece',
  'RU': 'Russia',
  'JP': 'Japan',
  'KR': 'South Korea',
  'IN': 'India',
  'SG': 'Singapore',
  'MY': 'Malaysia',
  'TH': 'Thailand',
  'VN': 'Vietnam',
  'PH': 'Philippines',
  'ID': 'Indonesia',
  'BR': 'Brazil',
  'MX': 'Mexico',
  'AR': 'Argentina',
  'CL': 'Chile',
  'CO': 'Colombia',
  'PE': 'Peru',
  'ZA': 'South Africa',
  'EG': 'Egypt',
  'AE': 'United Arab Emirates',
  'SA': 'Saudi Arabia',
  'IL': 'Israel',
  'TR': 'Turkey',
  'NZ': 'New Zealand',
  'HK': 'Hong Kong',
  'TW': 'Taiwan',
  'MO': 'Macau',
};

const getCountryName = (countryCode: string | null): string => {
  if (!countryCode) return 'Unknown';
  if (countryCode === 'CN') return 'China';
  return countryCodeToName[countryCode.toUpperCase()] || countryCode;
};

const RegionIndicator: React.FC = () => {
  const { isChina, loading, regionInfo } = useRegion();

  if (loading) {
    return (
      <Chip
        icon={<Language sx={{ fontSize: 16 }} />}
        label="..."
        size="small"
        sx={{
          bgcolor: (theme) => alpha(theme.palette.action.hover, 0.5),
          height: 28,
        }}
      />
    );
  }

  // 只显示国家，不显示城市
  const displayLabel = isChina 
    ? 'China'
    : getCountryName(regionInfo?.country || null);
  
  const tooltipText = isChina 
    ? `Region: China • Database: CloudBase (Tencent)`
    : `Region: ${displayLabel} • Database: Supabase (Global)`;

  return (
    <Tooltip title={tooltipText} arrow placement="bottom">
      <Chip
        icon={<Language sx={{ fontSize: 16 }} />}
        label={displayLabel}
        size="small"
        sx={{
          bgcolor: 'background.paper',
          color: 'text.primary',
          border: '1px solid',
          borderColor: 'divider',
          fontWeight: 600,
          height: 28,
          transition: 'all 0.2s',
          '&:hover': {
            bgcolor: (theme) => theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.04)',
            borderColor: 'divider',
          },
          '& .MuiChip-icon': {
            color: 'text.secondary',
          }
        }}
      />
    </Tooltip>
  );
};

export default RegionIndicator;

