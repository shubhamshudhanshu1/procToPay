import { Box, Typography } from '../ui';
import { IconButton } from '@mui/material';
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material';

const AuthHeader = ({ title, subtitle, onBack }) => {
  return (
    <Box sx={{ mb: 3 }}>
      {onBack && (
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <IconButton
            onClick={onBack}
            sx={{
              color: '#6C757D',
              padding: '8px',
              '&:hover': {
                backgroundColor: '#F8F9FA',
              },
            }}
          >
            <ArrowBackIcon />
          </IconButton>
        </Box>
      )}
      <Box>
        <Box
          sx={{
            width: 60,
            height: 60,
            backgroundColor: '#6C757D',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
          }}
        >
          <Typography variant="h4" sx={{ color: 'white', fontWeight: 'bold' }}>
            ₹
          </Typography>
        </Box>
        {title && (
          <Typography
            variant="h4"
            component="h1"
            sx={{ fontWeight: 'bold', color: '#343A40', mb: 1 }}
          >
            {title}
          </Typography>
        )}
        {!title && (
          <div>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 'bold', color: '#343A40', mb: 1 }}
            >
              Proc2Pay
            </Typography>
            <Typography variant="body2" sx={{ color: '#6C757D', mb: 0.5 }}>
              Procure to Pay ToT & Scheme Management System
            </Typography>
            <Typography variant="body2" sx={{ color: '#6C757D' }}>
              by NexProcureAI
            </Typography>
          </div>
        )}
        {subtitle && (
          <Typography variant="body2" sx={{ color: '#6C757D' }}>
            {subtitle}
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default AuthHeader;
