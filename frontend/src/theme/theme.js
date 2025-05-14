import { createTheme } from '@mui/material';

// Create light theme with modern color palette
export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // Modernized blue
      light: '#63a4ff',
      dark: '#004ba0',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#dc004e', // Vibrant pink for accents
      light: '#ff5c8d',
      dark: '#a4001e',
      contrastText: '#ffffff',
    },
    success: {
      main: '#4caf50',
      light: '#80e27e',
      dark: '#087f23',
    },
    warning: {
      main: '#ff9800',
      light: '#ffc947',
      dark: '#c66900',
    },
    error: {
      main: '#f44336',
      light: '#ff7961',
      dark: '#ba000d',
    },
    background: {
      default: '#ffffff', // Pure white background like Airtable
      paper: '#ffffff',
    },
    text: {
      primary: '#172b4d', // Dark blue-gray for primary text
      secondary: '#5e6c84', // Medium blue-gray for secondary text
    },
  },
  typography: {
    fontFamily: '"Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
      fontSize: '2.25rem',
    },
    h2: {
      fontWeight: 600,
      fontSize: '1.875rem',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.5rem',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
    },
    body1: {
      fontSize: '1rem',
    },
    body2: {
      fontSize: '0.875rem',
    },
    button: {
      textTransform: 'none',
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  shadows: [
    'none',
    '0px 1px 3px rgba(0, 0, 0, 0.04), 0px 1px 2px rgba(0, 0, 0, 0.08)',
    '0px 2px 4px rgba(0, 0, 0, 0.04), 0px 3px 8px rgba(0, 0, 0, 0.08)',
    '0px 3px 5px rgba(0, 0, 0, 0.04), 0px 5px 8px rgba(0, 0, 0, 0.08)',
    ...Array(21).fill('none'), // Fill the rest with placeholders
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.12)',
          },
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(25, 118, 210, 0.24)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.04), 0px 3px 8px rgba(0, 0, 0, 0.08)',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.08), 0px 8px 16px rgba(0, 0, 0, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
  },
});

// Dark theme version - Airtable inspired
export const darkTheme = createTheme({
  ...lightTheme,
  palette: {
    mode: 'dark',
    primary: {
      main: '#2196f3', // More vibrant blue for dark mode
      dark: '#1976d2', 
      light: '#64b5f6',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#f50057', // Vibrant pink for dark mode
      light: '#ff4081',
      dark: '#c51162',
      contrastText: '#ffffff',
    },
    background: {
      default: '#121212', // Standard Material dark theme background
      paper: '#1e1e1e',   // Slightly lighter for paper elements
    },
    text: {
      primary: '#ffffff',  // Pure white for primary text
      secondary: '#b0bec5', // Light blue-grey for secondary text
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  components: {
    ...lightTheme.components,
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none', // Remove the default paper pattern
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2), 0px 4px 8px rgba(0, 0, 0, 0.2)',
          borderColor: 'rgba(255, 255, 255, 0.12)',
        },
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#242424',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)'
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundColor: '#212121', // Airtable-like dark card color
          borderColor: 'rgba(255, 255, 255, 0.08)',
          boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.2), 0px 4px 6px rgba(0, 0, 0, 0.2)',
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.25), 0px 8px 16px rgba(0, 0, 0, 0.25)',
            backgroundColor: '#252525', // Slightly lighter on hover for feedback
          },
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          '&:hover': {
            boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
          },
        },
        containedPrimary: {
          '&:hover': {
            boxShadow: '0px 4px 8px rgba(33, 150, 243, 0.4)',
          },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          color: '#90caf9',
          '&.Mui-checked': {
            color: '#2196f3',
          },
          '&.Mui-checked + .MuiSwitch-track': {
            backgroundColor: '#2196f3',
          },
        },
        track: {
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
        },
      },
    },
  },
});