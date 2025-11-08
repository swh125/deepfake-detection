import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  NetworkCheck as NetworkIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import ReactECharts from 'echarts-for-react';

interface SystemMetrics {
  cpu: number;
  memory: number;
  gpu: number;
  network: number;
  storage: number;
  temperature: number;
}

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  uptime: string;
  responseTime: number;
  lastCheck: Date;
}

const SystemMonitor: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 65,
    memory: 45,
    gpu: 80,
    network: 30,
    storage: 75,
    temperature: 72,
  });

  const [services] = useState<ServiceStatus[]>([
    {
      name: 'Video Analysis',
      status: 'warning',
      uptime: '2 days',
      responseTime: 1500,
      lastCheck: new Date(),
    },
    {
      name: 'Database',
      status: 'healthy',
      uptime: '1 week',
      responseTime: 500,
      lastCheck: new Date(),
    },
    {
      name: 'Web Server',
      status: 'healthy',
      uptime: '3 days',
      responseTime: 700,
      lastCheck: new Date(),
    },
    {
      name: 'Email Service',
      status: 'healthy',
      uptime: '2 weeks',
      responseTime: 800,
      lastCheck: new Date(),
    },
    {
      name: 'Backup System',
      status: 'healthy',
      uptime: '1 month',
      responseTime: 900,
      lastCheck: new Date(),
    },
  ]);

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(prev => ({
        cpu: Math.max(20, Math.min(95, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(85, prev.memory + (Math.random() - 0.5) * 5)),
        gpu: Math.max(60, Math.min(95, prev.gpu + (Math.random() - 0.5) * 8)),
        network: Math.max(10, Math.min(60, prev.network + (Math.random() - 0.5) * 15)),
        storage: prev.storage,
        temperature: Math.max(65, Math.min(85, prev.temperature + (Math.random() - 0.5) * 3)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 70) return 'success';
    if (temp < 80) return 'warning';
    return 'error';
  };

  const cpuChartOption = {
    title: {
      text: 'CPU Usage (24h)',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      axisLabel: { color: '#fff' },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#fff' },
    },
    series: [
      {
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 40) + 40),
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
      },
    ],
    color: ['#2196f3'],
  };

  const memoryChartOption = {
    title: {
      text: 'Memory Usage (24h)',
      textStyle: { color: '#fff' },
    },
    tooltip: {
      trigger: 'axis',
    },
    xAxis: {
      type: 'category',
      data: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      axisLabel: { color: '#fff' },
    },
    yAxis: {
      type: 'value',
      max: 100,
      axisLabel: { color: '#fff' },
    },
    series: [
      {
        data: Array.from({ length: 24 }, () => Math.floor(Math.random() * 30) + 35),
        type: 'line',
        smooth: true,
        areaStyle: {
          opacity: 0.3,
        },
      },
    ],
    color: ['#4caf50'],
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mb: 4 }}>
        System Monitor
      </Typography>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SpeedIcon sx={{ mr: 1, color: '#2196f3' }} />
                  <Typography variant="h6">CPU Usage</Typography>
                </Box>
                <Typography variant="h4" gutterBottom>
                  {metrics.cpu.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.cpu}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <MemoryIcon sx={{ mr: 1, color: '#4caf50' }} />
                  <Typography variant="h6">Memory Usage</Typography>
                </Box>
                <Typography variant="h4" gutterBottom>
                  {metrics.memory.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.memory}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <StorageIcon sx={{ mr: 1, color: '#ff9800' }} />
                  <Typography variant="h6">GPU Usage</Typography>
                </Box>
                <Typography variant="h4" gutterBottom>
                  {metrics.gpu.toFixed(1)}%
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={metrics.gpu}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <NetworkIcon sx={{ mr: 1, color: '#9c27b0' }} />
                  <Typography variant="h6">Temperature</Typography>
                </Box>
                <Typography variant="h4" gutterBottom>
                  {metrics.temperature.toFixed(1)}°C
                </Typography>
                <Chip
                  label={getTemperatureColor(metrics.temperature) === 'success' ? 'Normal' : 'High'}
                  color={getTemperatureColor(metrics.temperature) as any}
                  size="small"
                />
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <ReactECharts option={cpuChartOption} style={{ height: '300px' }} />
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <ReactECharts option={memoryChartOption} style={{ height: '300px' }} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Service Status */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Service Status
          </Typography>
          
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Service</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Uptime</TableCell>
                  <TableCell>Response Time</TableCell>
                  <TableCell>Last Check</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service, index) => (
                  <motion.tr
                    key={service.name}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <TableCell>
                      <Typography variant="body2">
                        {service.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={service.status}
                        color={getStatusColor(service.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.uptime}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.responseTime}ms
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {service.lastCheck.toLocaleTimeString()}
                      </Typography>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Alerts */}
      <Box sx={{ mt: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Video Analysis service showing increased response times. Consider scaling up resources.
        </Alert>
        <Alert severity="info">
          System performing within normal parameters. All critical services operational.
        </Alert>
      </Box>
    </Box>
  );
};

export default SystemMonitor; 