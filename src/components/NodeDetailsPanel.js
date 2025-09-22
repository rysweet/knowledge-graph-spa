import React, { useState, useEffect } from 'react';
import {
  Box,
  Drawer,
  Typography,
  IconButton,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Card,
  CardContent,
  Collapse,
  Button
} from '@mui/material';
import {
  Close as CloseIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  ContentCopy as CopyIcon,
  Link as LinkIcon
} from '@mui/icons-material';

const NodeDetailsPanel = ({ open, onClose, nodeData, neighbors = [] }) => {
  const [expandedSections, setExpandedSections] = useState({
    properties: true,
    relationships: true,
    sources: true
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  if (!nodeData) return null;

  // Extract properties for display
  const {
    id,
    label,
    type,
    description,
    details,
    topic,
    created,
    ...otherProperties
  } = nodeData;

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: '100%', sm: 400, md: 450 },
          bgcolor: 'background.paper',
          borderLeft: '1px solid',
          borderColor: 'divider'
        }
      }}
    >
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'primary.dark',
            color: 'primary.contrastText'
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Node Details
            </Typography>
            <IconButton
              onClick={onClose}
              sx={{ color: 'inherit' }}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Stack>
        </Box>

        {/* Content */}
        <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
          {/* Node Title and Type */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {label || 'Unnamed Node'}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => copyToClipboard(label)}
                  title="Copy name"
                >
                  <CopyIcon fontSize="small" />
                </IconButton>
              </Stack>

              <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                <Chip
                  label={type || 'UNKNOWN'}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                {topic && (
                  <Chip
                    label={`Topic: ${topic}`}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>

              {/* Description */}
              {description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Description
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {description}
                  </Typography>
                </Box>
              )}

              {/* Details */}
              {details && details !== description && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Details
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {details}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Properties Section */}
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                onClick={() => toggleSection('properties')}
                sx={{ cursor: 'pointer' }}
              >
                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                  Properties
                </Typography>
                {expandedSections.properties ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </Stack>

              <Collapse in={expandedSections.properties}>
                <List dense sx={{ mt: 1 }}>
                  <ListItem disablePadding>
                    <ListItemText
                      primary="Node ID"
                      secondary={id}
                      primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                      secondaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>

                  {created && (
                    <ListItem disablePadding>
                      <ListItemText
                        primary="Created"
                        secondary={new Date(created).toLocaleString()}
                        primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                        secondaryTypographyProps={{ variant: 'body2' }}
                      />
                    </ListItem>
                  )}

                  {Object.entries(otherProperties).map(([key, value]) => {
                    if (value && typeof value !== 'object') {
                      return (
                        <ListItem key={key} disablePadding>
                          <ListItemText
                            primary={key.replace(/_/g, ' ').charAt(0).toUpperCase() + key.slice(1)}
                            secondary={String(value)}
                            primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body2' }}
                          />
                        </ListItem>
                      );
                    }
                    return null;
                  })}
                </List>
              </Collapse>
            </CardContent>
          </Card>

          {/* Relationships Section */}
          {neighbors && neighbors.length > 0 && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  onClick={() => toggleSection('relationships')}
                  sx={{ cursor: 'pointer' }}
                >
                  <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                    Relationships ({neighbors.length})
                  </Typography>
                  {expandedSections.relationships ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                </Stack>

                <Collapse in={expandedSections.relationships}>
                  <List dense sx={{ mt: 1 }}>
                    {neighbors.map((neighbor, idx) => (
                      <ListItem key={idx} disablePadding sx={{ mb: 1 }}>
                        <Box sx={{ width: '100%' }}>
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <LinkIcon fontSize="small" color="action" />
                            <Typography variant="body2">
                              {neighbor.relationship?.direction === 'outgoing' ? '→' : '←'}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {neighbor.label}
                            </Typography>
                          </Stack>
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 4 }}>
                            {neighbor.relationship?.type} ({neighbor.type})
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </CardContent>
            </Card>
          )}

          {/* Sources Section (for SOURCE nodes or nodes with sources) */}
          {type === 'SOURCE' && (
            <Card sx={{ mb: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                  Source Information
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  This is a reference source node that provides documentation or information
                  for concepts in the knowledge graph.
                </Typography>
              </CardContent>
            </Card>
          )}
        </Box>

        {/* Footer Actions */}
        <Box
          sx={{
            p: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            onClick={() => {
              const nodeInfo = JSON.stringify(nodeData, null, 2);
              copyToClipboard(nodeInfo);
            }}
            startIcon={<CopyIcon />}
          >
            Copy Node Data as JSON
          </Button>
        </Box>
      </Box>
    </Drawer>
  );
};

export default NodeDetailsPanel;