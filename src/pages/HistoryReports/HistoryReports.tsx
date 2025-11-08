import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search as SearchIcon,
  Download as DownloadIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { format } from 'date-fns';

interface Report {
  id: string;
  filename: string;
  mediaType: 'image' | 'video' | 'audio';
  status: 'deepfake' | 'authentic' | 'suspicious';
  confidence: number;
  timestamp: Date;
  fileSize: string;
  processingTime: number;
}

const HistoryReports: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const mockReports: Report[] = [
    {
      id: '1',
      filename: 'video_001.mp4',
      mediaType: 'video',
      status: 'deepfake',
      confidence: 0.95,
      timestamp: new Date('2024-01-15T10:30:00'),
      fileSize: '15.2 MB',
      processingTime: 2.3,
    },
    {
      id: '2',
      filename: 'image_002.jpg',
      mediaType: 'image',
      status: 'authentic',
      confidence: 0.98,
      timestamp: new Date('2024-01-15T09:15:00'),
      fileSize: '2.1 MB',
      processingTime: 0.8,
    },
    {
      id: '3',
      filename: 'audio_003.wav',
      mediaType: 'audio',
      status: 'suspicious',
      confidence: 0.72,
      timestamp: new Date('2024-01-15T08:45:00'),
      fileSize: '8.7 MB',
      processingTime: 1.5,
    },
    {
      id: '4',
      filename: 'video_004.mp4',
      mediaType: 'video',
      status: 'deepfake',
      confidence: 0.89,
      timestamp: new Date('2024-01-14T16:20:00'),
      fileSize: '25.6 MB',
      processingTime: 3.1,
    },
  ];

  const filteredReports = mockReports.filter((report) => {
    const matchesSearch = report.filename.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesMediaType = mediaTypeFilter === 'all' || report.mediaType === mediaTypeFilter;
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    
    return matchesSearch && matchesMediaType && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deepfake':
        return 'error';
      case 'authentic':
        return 'success';
      case 'suspicious':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return '🎥';
      case 'image':
        return '🖼️';
      case 'audio':
        return '🎵';
      default:
        return '📄';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ color: 'white', mb: 4 }}>
        History Reports
      </Typography>

      {/* Filters */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Search files"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon sx={{ mr: 1, color: 'text.secondary' }} />,
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Media Type</InputLabel>
                <Select
                  value={mediaTypeFilter}
                  label="Media Type"
                  onChange={(e) => setMediaTypeFilter(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="image">Images</MenuItem>
                  <MenuItem value="video">Videos</MenuItem>
                  <MenuItem value="audio">Audio</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  label="Status"
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="deepfake">Deepfake</MenuItem>
                  <MenuItem value="authentic">Authentic</MenuItem>
                  <MenuItem value="suspicious">Suspicious</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<DownloadIcon />}
              >
                Export
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Total Reports
                </Typography>
                <Typography variant="h4" color="primary">
                  {mockReports.length}
                </Typography>
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
                <Typography variant="h6" gutterBottom>
                  Deepfake Detected
                </Typography>
                <Typography variant="h4" color="error">
                  {mockReports.filter(r => r.status === 'deepfake').length}
                </Typography>
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
                <Typography variant="h6" gutterBottom>
                  Authentic Content
                </Typography>
                <Typography variant="h4" color="success.main">
                  {mockReports.filter(r => r.status === 'authentic').length}
                </Typography>
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
                <Typography variant="h6" gutterBottom>
                  Avg Processing Time
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {(mockReports.reduce((acc, r) => acc + r.processingTime, 0) / mockReports.length).toFixed(1)}s
                </Typography>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Reports Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Detection History
          </Typography>
          
          <TableContainer component={Paper} sx={{ backgroundColor: 'transparent' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>File</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Date</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>Processing Time</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredReports.map((report, index) => (
                  <motion.tr
                    key={report.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ mr: 1 }}>
                          {getMediaTypeIcon(report.mediaType)}
                        </Typography>
                        <Typography variant="body2">
                          {report.filename}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.mediaType}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={report.status}
                        color={getStatusColor(report.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {(report.confidence * 100).toFixed(1)}%
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {format(report.timestamp, 'MMM dd, HH:mm')}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {report.fileSize}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {report.processingTime}s
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Tooltip title="View Details">
                        <IconButton size="small">
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </motion.tr>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HistoryReports; 