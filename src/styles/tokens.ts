export const tokens = {
  bg: '#0f1117',
  surface: '#1a1d27',
  surfaceRaised: '#21253a',
  border: '#2e3350',
  accent: '#f97316',
  accentHover: '#ea6c0a',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  textMuted: '#475569',
  success: '#22c55e',
  error: '#ef4444',
} as const;

export const inputCls = 'w-full text-sm rounded-md px-2.5 py-1.5 focus:outline-none transition-colors'
  + ' bg-[#21253a] border border-[#2e3350] text-[#f1f5f9] focus:border-[#f97316]';

export const labelCls = 'block text-[10px] uppercase tracking-widest text-[#475569] font-medium mb-1';
