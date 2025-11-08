import React from 'react';
import { Box, Card, CardContent, FormControlLabel, Switch, Typography } from '@mui/material';
import { useColorMode } from '../../theme/ColorModeProvider';

const Settings: React.FC = () => {
  const { mode, toggleColorMode } = useColorMode();

  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <Card sx={{ width: 520 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Settings
          </Typography>
          <FormControlLabel
            control={<Switch checked={mode === 'dark'} onChange={toggleColorMode} />}
            label={`Dark Mode: ${mode === 'dark' ? 'On' : 'Off'}`}
          />
        </CardContent>
      </Card>
    </Box>
  );
};

export default Settings;

