import React, { useState, useCallback } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  CameraAlt as CameraIcon,
  Stop as StopIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import { motion } from 'framer-motion';

interface DetectionResult {
  frameIdx: number;
  timestamp: number;
  deepfakeScore: number;
  artifactTypes: string[];
  heatmapUrl?: string;
}

const DetectionPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>([]);
  const [webcamActive, setWebcamActive] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {

    // Handle file upload and start detection
    startDetection(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.avi', '.mov', '.mkv'],
      'audio/*': ['.wav', '.mp3', '.aac', '.flac'],
    },
    multiple: false,
  });

  const startDetection = async (file: File) => {
    setIsDetecting(true);
    setDetectionProgress(0);
    setDetectionResults([]);

    // Simulate detection process
    const interval = setInterval(() => {
      setDetectionProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsDetecting(false);
          // Simulate results
          const mockResults: DetectionResult[] = [
            {
              frameIdx: 1,
              timestamp: 0.5,
              deepfakeScore: 0.85,
              artifactTypes: ['face_swap', 'lip_sync'],
            },
            {
              frameIdx: 2,
              timestamp: 1.0,
              deepfakeScore: 0.92,
              artifactTypes: ['face_swap'],
            },
          ];
          setDetectionResults(mockResults);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const toggleWebcam = () => {
    setWebcamActive(!webcamActive);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Detection Panel
      </Typography>

      <Grid container spacing={3}>
        {/* Upload Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upload Media
              </Typography>
              
              <Tabs value={activeTab} onChange={handleTabChange} sx={{ mb: 2 }}>
                <Tab label="File Upload" />
                <Tab label="Camera" />
              </Tabs>

              {activeTab === 0 && (
                <Box
                  {...getRootProps()}
                  sx={{
                    border: (theme) => `2px dashed ${theme.palette.divider}`,
                    borderRadius: 2,
                    p: 4,
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: (theme) => isDragActive ? theme.palette.action.hover : 'transparent',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: (theme) => theme.palette.primary.main,
                      backgroundColor: (theme) => theme.palette.action.hover,
                    },
                  }}
                >
                  <input {...getInputProps()} />
                  <UploadIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    {isDragActive ? 'Drop files here' : 'Drag & drop files here'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    or click to select files
                  </Typography>
                  <Typography variant="caption" display="block" sx={{ mt: 2 }}>
                    Supports: Images (JPEG, PNG), Videos (MP4, AVI), Audio (WAV, MP3)
                  </Typography>
                </Box>
              )}

              {activeTab === 1 && (
                <Box sx={{ textAlign: 'center' }}>
                  <Button
                    variant="contained"
                    startIcon={webcamActive ? <StopIcon /> : <CameraIcon />}
                    onClick={toggleWebcam}
                    sx={{ mb: 2 }}
                  >
                    {webcamActive ? 'Stop Camera' : 'Start Camera'}
                  </Button>
                  
                  {webcamActive && (
                    <Box sx={{ mt: 2 }}>
                      <Webcam
                        audio={false}
                        width="100%"
                        height={300}
                        style={{ borderRadius: 8 }}
                      />
                    </Box>
                  )}
                </Box>
              )}

              {isDetecting && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="body2" gutterBottom>
                    Analyzing media...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={detectionProgress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {detectionProgress}% complete
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Results Section */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detection Results
              </Typography>
              
              {detectionResults.length > 0 ? (
                <Box>
                  {detectionResults.map((result, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Paper sx={{ p: 2, mb: 2, backgroundColor: (theme) => theme.palette.background.paper }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                          <Typography variant="subtitle1">
                            Frame {result.frameIdx}
                          </Typography>
                          <Chip
                            label={`${(result.deepfakeScore * 100).toFixed(1)}%`}
                            color={result.deepfakeScore > 0.8 ? 'error' : 'success'}
                            size="small"
                          />
                        </Box>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Timestamp: {result.timestamp}s
                        </Typography>
                        
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="body2" gutterBottom>
                            Artifacts detected:
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                            {result.artifactTypes.map((artifact, idx) => (
                              <Chip
                                key={idx}
                                label={artifact.replace('_', ' ')}
                                size="small"
                                variant="outlined"
                              />
                            ))}
                          </Box>
                        </Box>
                      </Paper>
                    </motion.div>
                  ))}
                </Box>
              ) : (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    Upload a file or start camera to begin detection
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Visualization Section */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Detection Visualization
              </Typography>
              
              <Box sx={{ height: 300, backgroundColor: (theme) => theme.palette.background.paper, borderRadius: 2, p: 2, border: (theme) => `1px solid ${theme.palette.divider}` }}>
                <Typography variant="body2" color="text.secondary" align="center">
                  Heatmap and analysis visualization will appear here
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DetectionPanel; 