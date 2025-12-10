import { Card, CardContent, Typography, Box } from '@mui/material';

export default function TemplateSelectionCard({ template, selected, onClick }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        border: selected ? '2px solid #1976D2' : '1px solid #E0E0E0',
        backgroundColor: selected ? '#F5F9FF' : '#FFFFFF',
        borderRadius: 2,
        transition: 'all 0.2s ease',
        '&:hover': {
          borderColor: '#1976D2',
          boxShadow: 2,
        },
        height: '100%',
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 600, mb: 1, color: '#212529' }}>
          {template.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem', lineHeight: 1.6 }}>
          {template.description}
        </Typography>
      </CardContent>
    </Card>
  );
}

