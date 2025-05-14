/**
 * Shared component styles for consistency across all pages
 * This ensures uniform padding, spacing, and typography throughout the app
 */

import { alpha } from '@mui/material/styles';

// Common page container styles
export const pageContainerStyles = (theme) => ({
  padding: {
    xs: theme.spacing(2),
    sm: theme.spacing(3),
    md: theme.spacing(4),
  },
  width: '100%',
  maxWidth: '1200px',
  margin: '0 auto',
});

// Card and paper component styling
export const cardStyles = (theme) => ({
  backgroundColor: theme.palette.mode === 'dark' 
    ? alpha(theme.palette.background.paper, 0.8)
    : theme.palette.background.paper,
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[3],
  transition: 'box-shadow 0.3s ease-in-out',
  '&:hover': {
    boxShadow: theme.shadows[6],
  },
  overflow: 'hidden', // Ensures content respects border-radius
});

// Consistent section/paper styling
export const sectionStyles = (theme) => ({
  ...cardStyles(theme),
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
});

// Page heading styles
export const pageHeadingStyles = (theme) => ({
  marginBottom: theme.spacing(3),
  fontWeight: 600,
  color: theme.palette.mode === 'dark'
    ? theme.palette.text.primary
    : theme.palette.primary.main,
  fontSize: {
    xs: '1.5rem',
    sm: '1.75rem',
    md: '2rem'
  },
});

// Section heading styles
export const sectionHeadingStyles = (theme) => ({
  marginBottom: theme.spacing(2),
  fontWeight: 500,
  fontSize: {
    xs: '1.25rem',
    sm: '1.35rem',
    md: '1.5rem'
  },
});

// Table container styles
export const tableContainerStyles = (theme) => ({
  ...cardStyles(theme),
  overflow: 'hidden',
  marginBottom: theme.spacing(3),
});

// Table styles for consistent look across pages
export const tableStyles = (theme) => ({
  '& .MuiTableCell-head': {
    fontWeight: 600,
    backgroundColor: theme.palette.mode === 'dark'
      ? alpha(theme.palette.primary.main, 0.15)
      : alpha(theme.palette.primary.main, 0.05),
  },
  '& .MuiTableRow-root': {
    '&:nth-of-type(odd)': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.action.hover, 0.1)
        : alpha(theme.palette.action.hover, 0.05),
    },
    '&:hover': {
      backgroundColor: theme.palette.mode === 'dark'
        ? alpha(theme.palette.action.hover, 0.2)
        : alpha(theme.palette.action.hover, 0.1),
    },
  },
});

// Toolbar styles for actions
export const toolbarStyles = (theme) => ({
  display: 'flex',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  gap: theme.spacing(2),
  padding: theme.spacing(2),
  backgroundColor: theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.6)
    : alpha(theme.palette.background.default, 0.5),
});

// Button group styles
export const buttonGroupStyles = (theme) => ({
  display: 'flex', 
  gap: theme.spacing(1),
  flexWrap: 'wrap',
});

// Form section styles
export const formSectionStyles = (theme) => ({
  ...sectionStyles(theme),
  padding: theme.spacing(3),
});

// Alert/notification styles
export const alertStyles = (theme) => ({
  marginBottom: theme.spacing(3),
});

// Loading overlay styles
export const loadingOverlayStyles = (theme) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: theme.spacing(4),
  backgroundColor: alpha(theme.palette.background.paper, 0.7),
  borderRadius: theme.shape.borderRadius,
});

// Empty state styles
export const emptyStateStyles = (theme) => ({
  textAlign: 'center',
  padding: theme.spacing(6),
  color: theme.palette.text.secondary,
});

export default {
  pageContainer: pageContainerStyles,
  card: cardStyles,
  section: sectionStyles,
  pageHeading: pageHeadingStyles,
  sectionHeading: sectionHeadingStyles,
  tableContainer: tableContainerStyles,
  table: tableStyles,
  toolbar: toolbarStyles,
  buttonGroup: buttonGroupStyles,
  formSection: formSectionStyles,
  alert: alertStyles,
  loadingOverlay: loadingOverlayStyles,
  emptyState: emptyStateStyles,
};