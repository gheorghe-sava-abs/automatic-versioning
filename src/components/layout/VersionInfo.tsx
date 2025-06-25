import React from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import packageJson from '../../../package.json';

interface VersionInfoProps {
  variant?: 'text' | 'icon' | 'full' | 'detailed';
  color?: string;
  showEnvironment?: boolean;
  showBuildDate?: boolean;
}

export const VersionInfo: React.FC<VersionInfoProps> = ({ 
  variant = 'full',
  color = 'text.secondary',
  showEnvironment = true,
  showBuildDate = true
}) => {
  const appEnv = import.meta.env.VITE_APP_ENV || 'development';
  const appVersion = packageJson.version;
  const buildDate = import.meta.env.VITE_BUILD_DATE || new Date().toISOString().split('T')[0];
  
  // Format build date for display
  const formatBuildDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  // Get environment color
  const getEnvironmentColor = (env: string) => {
    switch (env.toLowerCase()) {
      case 'production':
      case 'production-eu':
        return 'error';
      case 'staging':
        return 'warning';
      case 'qa':
        return 'info';
      case 'demo':
        return 'secondary';
      default:
        return 'default';
    }
  };

  // Different display variants
  if (variant === 'icon') {
    return (
      <Tooltip 
        title={
          <Box>
            <Typography variant="body2">
              <strong>Version:</strong> {appVersion}
            </Typography>
            {showEnvironment && (
              <Typography variant="body2">
                <strong>Environment:</strong> {appEnv}
              </Typography>
            )}
            {showBuildDate && (
              <Typography variant="body2">
                <strong>Build Date:</strong> {formatBuildDate(buildDate)}
              </Typography>
            )}
          </Box>
        }
        arrow
      >
        <Box sx={{ display: 'inline-flex', alignItems: 'center', cursor: 'help' }}>
          <InfoOutlinedIcon sx={{ fontSize: '1rem', color }} />
        </Box>
      </Tooltip>
    );
  }
  
  if (variant === 'text') {
    return (
      <Tooltip 
        title={
          <Box>
            {showEnvironment && (
              <Typography variant="body2">
                <strong>Environment:</strong> {appEnv}
              </Typography>
            )}
            {showBuildDate && (
              <Typography variant="body2">
                <strong>Build Date:</strong> {formatBuildDate(buildDate)}
              </Typography>
            )}
          </Box>
        } 
        arrow
      >
        <Typography 
          variant="caption" 
          component="span" 
          sx={{ color, cursor: 'help' }}
        >
          v{appVersion}
        </Typography>
      </Tooltip>
    );
  }

  if (variant === 'detailed') {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
        <Typography variant="caption" sx={{ color }}>
          v{appVersion}
        </Typography>
        
        {showEnvironment && (
          <Chip
            label={appEnv}
            size="small"
            color={getEnvironmentColor(appEnv) as any}
            variant="outlined"
          />
        )}
        
        {showBuildDate && (
          <Typography variant="caption" sx={{ color: 'text.disabled' }}>
            {formatBuildDate(buildDate)}
          </Typography>
        )}
      </Box>
    );
  }
  
  // Full version (default)
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" sx={{ color }}>
        v{appVersion}
      </Typography>
      {showEnvironment && (
        <Chip
          label={appEnv}
          size="small"
          color={getEnvironmentColor(appEnv) as any}
          variant="outlined"
        />
      )}
    </Box>
  );
};