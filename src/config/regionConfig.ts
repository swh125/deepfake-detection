export type Region = 'cn' | 'global';

export interface RegionConfig {
  region: Region;
  apiBaseUrl: string;
  label: string;
}

export const getRegionConfig = (): RegionConfig => {
  try {
    const cached = localStorage.getItem('ip_info');
    if (cached) {
      const info = JSON.parse(cached);
      const region = info.recommendedRegion || (info.isChina ? 'cn' : 'global');
      return getConfigForRegion(region as Region);
    }
  } catch (error) {

  }
  
  return getConfigForRegion('global');
};

const getConfigForRegion = (region: Region): RegionConfig => {
  if (region === 'cn') {
    return {
      region: 'cn',
      apiBaseUrl: process.env.REACT_APP_API_URL_CN || 'http://localhost:8000',
      label: 'China'
    };
  } else {
    return {
      region: 'global',
      apiBaseUrl: process.env.REACT_APP_API_URL_GLOBAL || 'http://localhost:8001',
      label: 'Global'
    };
  }
};

