import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Switch,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Science as ScienceIcon,
  Update as UpdateIcon,
  PlayArrow as PlayIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

interface ModelConfig {
  id: string;
  name: string;
  version: string;
  status: 'active' | 'inactive' | 'training';
  accuracy: number;
  lastUpdated: Date;
  type: 'image' | 'video' | 'audio' | 'multimodal';
}

interface ABTest {
  id: string;
  name: string;
  status: 'running' | 'paused' | 'completed';
  modelA: string;
  modelB: string;
  startDate: Date;
  endDate?: Date;
  results: {
    modelA: { accuracy: number; performance: number };
    modelB: { accuracy: number; performance: number };
  };
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelConfig | null>(null);

  const [models] = useState<ModelConfig[]>([
    {
      id: '1',
      name: 'Vision Transformer v2.1',
      version: '2.1.0',
      status: 'active',
      accuracy: 98.5,
      lastUpdated: new Date('2024-01-10'),
      type: 'image',
    },
    {
      id: '2',
      name: '3D-ResNet50',
      version: '1.8.2',
      status: 'active',
      accuracy: 96.2,
      lastUpdated: new Date('2024-01-08'),
      type: 'video',
    },
    {
      id: '3',
      name: 'Audio CNN-BiLSTM',
      version: '1.5.0',
      status: 'training',
      accuracy: 94.8,
      lastUpdated: new Date('2024-01-12'),
      type: 'audio',
    },
    {
      id: '4',
      name: 'Cross-Modal Transformer',
      version: '1.0.0',
      status: 'inactive',
      accuracy: 97.1,
      lastUpdated: new Date('2024-01-05'),
      type: 'multimodal',
    },
  ]);

  const [abTests] = useState<ABTest[]>([
    {
      id: '1',
      name: 'Vision Model Comparison',
      status: 'running',
      modelA: 'Vision Transformer v2.0',
      modelB: 'Vision Transformer v2.1',
      startDate: new Date('2024-01-01'),
      results: {
        modelA: { accuracy: 97.2, performance: 85 },
        modelB: { accuracy: 98.5, performance: 82 },
      },
    },
    {
      id: '2',
      name: 'Video Analysis Test',
      status: 'completed',
      modelA: '3D-ResNet50 v1.7',
      modelB: '3D-ResNet50 v1.8',
      startDate: new Date('2023-12-15'),
      endDate: new Date('2024-01-01'),
      results: {
        modelA: { accuracy: 95.1, performance: 78 },
        modelB: { accuracy: 96.2, performance: 75 },
      },
    },
  ]);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleModelUpdate = (modelId: string) => {
    const model = models.find(m => m.id === modelId);
    if (model) {
      setSelectedModel(model);
      setOpenDialog(true);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'default';
      case 'training':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getTestStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'paused':
        return 'warning';
      case 'completed':
        return 'info';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mb: 4 }}>
        Admin Panel
      </Typography>

      <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 3 }}>
        <Tab label="Model Management" />
        <Tab label="A/B Testing" />
        <Tab label="System Config" />
        <Tab label="Security" />
      </Tabs>

      {activeTab === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Model Management
                    </Typography>
                    <Button variant="contained" startIcon={<UpdateIcon />}>
                      Deploy New Model
                    </Button>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Model Name</TableCell>
                          <TableCell>Version</TableCell>
                          <TableCell>Type</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Accuracy</TableCell>
                          <TableCell>Last Updated</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {models.map((model, index) => (
                          <motion.tr
                            key={model.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <TableCell>
                              <Typography variant="body2">
                                {model.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={model.version} size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              <Chip label={model.type} size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={model.status}
                                color={getStatusColor(model.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {model.accuracy}%
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {model.lastUpdated.toLocaleDateString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Button
                                size="small"
                                onClick={() => handleModelUpdate(model.id)}
                              >
                                Update
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {activeTab === 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      A/B Testing
                    </Typography>
                    <Button variant="contained" startIcon={<ScienceIcon />}>
                      Create New Test
                    </Button>
                  </Box>
                  
                  <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Test Name</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Model A</TableCell>
                          <TableCell>Model B</TableCell>
                          <TableCell>Results</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {abTests.map((test, index) => (
                          <motion.tr
                            key={test.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                          >
                            <TableCell>
                              <Typography variant="body2">
                                {test.name}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={test.status}
                                color={getTestStatusColor(test.status) as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {test.modelA}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {test.modelB}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Box>
                                <Typography variant="caption" display="block">
                                  A: {test.results.modelA.accuracy}% | {test.results.modelA.performance}ms
                                </Typography>
                                <Typography variant="caption" display="block">
                                  B: {test.results.modelB.accuracy}% | {test.results.modelB.performance}ms
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Button size="small" startIcon={<PlayIcon />}>
                                {test.status === 'running' ? 'Pause' : 'Start'}
                              </Button>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {activeTab === 2 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    System Configuration
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Auto-scaling enabled"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Real-time monitoring"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="Debug mode"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Backup enabled"
                    />
                  </Box>
                  
                  <Box sx={{ mt: 3 }}>
                    <TextField
                      fullWidth
                      label="Max file size (MB)"
                      defaultValue="100"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Processing timeout (seconds)"
                      defaultValue="300"
                      sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel>Log level</InputLabel>
                      <Select defaultValue="info" label="Log level">
                        <MenuItem value="debug">Debug</MenuItem>
                        <MenuItem value="info">Info</MenuItem>
                        <MenuItem value="warning">Warning</MenuItem>
                        <MenuItem value="error">Error</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Settings
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <TextField
                      fullWidth
                      label="GPU memory limit (GB)"
                      defaultValue="8"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="CPU threads"
                      defaultValue="4"
                      sx={{ mb: 2 }}
                    />
                    <TextField
                      fullWidth
                      label="Batch size"
                      defaultValue="32"
                      sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth>
                      <InputLabel>Model precision</InputLabel>
                      <Select defaultValue="fp16" label="Model precision">
                        <MenuItem value="fp32">FP32</MenuItem>
                        <MenuItem value="fp16">FP16</MenuItem>
                        <MenuItem value="int8">INT8</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {activeTab === 3 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Security Settings
                  </Typography>
                  
                  <Box sx={{ mt: 2 }}>
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Two-factor authentication"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Rate limiting"
                    />
                    <FormControlLabel
                      control={<Switch />}
                      label="IP whitelist"
                    />
                    <FormControlLabel
                      control={<Switch defaultChecked />}
                      label="Audit logging"
                    />
                  </Box>
                  
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Last security scan: 2 hours ago - No threats detected
                  </Alert>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </motion.div>
      )}

      {/* Model Update Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Update Model Configuration</DialogTitle>
        <DialogContent>
          {selectedModel && (
            <Box sx={{ mt: 2 }}>
              <TextField
                fullWidth
                label="Model Name"
                defaultValue={selectedModel.name}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Version"
                defaultValue={selectedModel.version}
                sx={{ mb: 2 }}
              />
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Status</InputLabel>
                <Select defaultValue={selectedModel.status} label="Status">
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                  <MenuItem value="training">Training</MenuItem>
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={() => setOpenDialog(false)}>
            Update
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel; 