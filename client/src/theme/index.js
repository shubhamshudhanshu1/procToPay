import { createTheme } from '@mui/material/styles';

// Color palette based on app design
const colors = {
  primary: {
    main: '#343A40',
    dark: '#2C2C2C',
    light: '#5A6268',
    contrastText: '#FFFFFF',
  },
  secondary: {
    main: '#6C757D',
    dark: '#5A6268',
    light: '#ADB5BD',
    contrastText: '#FFFFFF',
  },
  background: {
    default: '#F5F5F5',
    paper: '#FFFFFF',
    light: '#FAFAFA',
    hover: '#F0F0F0',
  },
  border: {
    main: '#E0E0E0',
    light: '#F0F0F0',
  },
  text: {
    primary: '#343A40',
    secondary: '#6C757D',
    disabled: '#9E9E9E',
  },
  success: {
    main: '#28A745',
    light: '#E8F5E9',
  },
  error: {
    main: '#DC3545',
    light: '#FFEBEE',
  },
  warning: {
    main: '#FFC107',
    light: '#FFF8E1',
  },
  info: {
    main: '#17A2B8',
    light: '#E0F7FA',
  },
};

// Typography settings
const typography = {
  fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  h1: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '2rem',
  },
  h2: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '1.75rem',
  },
  h3: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '1.5rem',
  },
  h4: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '1.5rem',
  },
  h5: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '1.25rem',
  },
  h6: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '1.125rem',
  },
  subtitle1: {
    fontWeight: 600,
    color: colors.text.primary,
    fontSize: '0.9375rem',
  },
  subtitle2: {
    fontWeight: 500,
    color: colors.text.primary,
    fontSize: '0.875rem',
  },
  body1: {
    color: colors.text.primary,
    fontSize: '0.875rem',
  },
  body2: {
    color: colors.text.secondary,
    fontSize: '0.8125rem',
  },
  caption: {
    color: colors.text.secondary,
    fontSize: '0.75rem',
  },
  button: {
    textTransform: 'none',
    fontWeight: 500,
    fontSize: '0.875rem',
  },
};

// Component overrides
const components = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        fontWeight: 500,
        fontSize: '0.875rem',
        borderRadius: 4, // 8px border radius
        padding: '8px 16px',
        '&.MuiButton-containedPrimary': {
          backgroundColor: colors.primary.main,
          color: colors.primary.contrastText,
          '&:hover': {
            backgroundColor: colors.primary.dark,
          },
          '&:disabled': {
            backgroundColor: colors.border.main,
            color: colors.text.disabled,
          },
        },
        '&.MuiButton-outlined': {
          borderColor: colors.secondary.main,
          color: colors.secondary.main,
          '&:hover': {
            borderColor: colors.secondary.dark,
            backgroundColor: colors.background.hover,
          },
        },
        '&.MuiButton-text': {
          color: colors.secondary.main,
          '&:hover': {
            backgroundColor: colors.background.hover,
          },
        },
      },
      sizeSmall: {
        padding: '6px 12px',
        fontSize: '0.8125rem',
        borderRadius: 4, // 8px border radius for small buttons
      },
      sizeLarge: {
        padding: '10px 20px',
        fontSize: '0.9375rem',
        borderRadius: 4, // 8px border radius for large buttons
      },
    },
  },
  MuiTextField: {
    styleOverrides: {
      root: {
        '& .MuiOutlinedInput-root': {
          '& fieldset': {
            borderColor: colors.border.main,
          },
          '&:hover fieldset': {
            borderColor: colors.secondary.main,
          },
          '&.Mui-focused fieldset': {
            borderColor: colors.primary.main,
          },
        },
        '& .MuiInputLabel-root': {
          color: colors.text.secondary,
          '&.Mui-focused': {
            color: colors.primary.main,
          },
        },
      },
    },
  },
  MuiChip: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.hover,
        color: colors.text.secondary,
        fontSize: '0.75rem',
        height: '22px',
        '&.MuiChip-sizeSmall': {
          height: '22px',
          fontSize: '0.75rem',
        },
      },
    },
  },
  MuiSwitch: {
    styleOverrides: {
      switchBase: {
        color: colors.secondary.main,
        '&.Mui-checked': {
          color: colors.secondary.main,
          '& + .MuiSwitch-track': {
            backgroundColor: colors.secondary.main,
          },
        },
      },
      track: {
        backgroundColor: colors.border.main,
      },
    },
  },
  MuiIconButton: {
    styleOverrides: {
      root: {
        color: colors.secondary.main,
        '&:hover': {
          backgroundColor: colors.background.hover,
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.paper,
        borderRadius: 1,
        border: `1px solid ${colors.border.main}`,
        boxShadow: 'none',
      },
    },
  },
  MuiPaper: {
    styleOverrides: {
      root: {
        backgroundColor: colors.background.paper,
        borderRadius: 1,
        border: `1px solid ${colors.border.main}`,
      },
      elevation0: {
        boxShadow: 'none',
      },
      elevation1: {
        boxShadow: '0px 1px 3px rgba(0, 0, 0, 0.1)',
      },
      elevation3: {
        boxShadow: '0px 2px 6px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  MuiDialog: {
    styleOverrides: {
      paper: {
        borderRadius: 2,
      },
    },
  },
  MuiDrawer: {
    styleOverrides: {
      paper: {
        backgroundColor: colors.background.paper,
        borderRight: `1px solid ${colors.border.main}`,
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        borderRadius: 1,
        '&:hover': {
          backgroundColor: colors.background.hover,
        },
        '&.Mui-selected': {
          backgroundColor: colors.background.hover,
          '&:hover': {
            backgroundColor: colors.background.hover,
          },
        },
      },
    },
  },
  MuiCheckbox: {
    styleOverrides: {
      root: {
        color: colors.secondary.main,
        '&.Mui-checked': {
          color: colors.primary.main,
        },
      },
    },
  },
};

// Create and export theme
export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    background: {
      default: colors.background.default,
      paper: colors.background.paper,
    },
    text: {
      primary: colors.text.primary,
      secondary: colors.text.secondary,
      disabled: colors.text.disabled,
    },
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    // Custom colors
    border: colors.border,
  },
  typography,
  components,
  shape: {
    borderRadius: 8, // 1 unit = 8px in MUI
  },
  spacing: 8, // Base spacing unit
});

// Export color constants for direct use if needed
export { colors };

// Export theme utilities
export const themeUtils = {
  // Card styles
  card: {
    backgroundColor: colors.background.paper,
    borderRadius: 1,
    border: `1px solid ${colors.border.main}`,
    padding: 2.5,
  },
  // Section header styles
  sectionHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 2.5,
  },
  // Icon button styles
  iconButton: {
    color: colors.secondary.main,
    '&:hover': {
      backgroundColor: colors.background.hover,
    },
  },
};

export default theme;
