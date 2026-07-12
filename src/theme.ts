// Defines the visual language shared by every Côte Tennis screen.

export const colors = {
  clay: '#E96B43',
  clayDark: '#B94625',
  court: '#205C46',
  courtLight: '#DCEBE4',
  ball: '#D8F24A',
  ink: '#15211C',
  muted: '#66736D',
  canvas: '#F7F5F0',
  surface: '#FFFFFF',
  border: '#DDE2DE',
  danger: '#B42318',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const radius = {
  sm: 12,
  md: 20,
  lg: 28,
  pill: 999,
} as const;
