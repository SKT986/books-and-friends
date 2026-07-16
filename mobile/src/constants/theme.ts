import { Platform } from 'react-native'

export const Colors = {
  paper: '#fbf7f0',
  paperDim: '#f3ecdf',
  ink: '#2a2320',
  inkSoft: '#6f6459',
  line: '#e7ddcd',
  plum: '#7b2d3e',
  plumDark: '#5e2130',
  plumLight: '#f2e3e6',
  gold: '#c9a24b',
  goldLight: '#f6ecd6',
  white: '#ffffff',
  danger: '#dc2626',
} as const

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif' },
  android: { sans: 'sans-serif', serif: 'serif' },
  default: { sans: 'system-ui', serif: 'Georgia' },
}) as { sans: string; serif: string }

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const
