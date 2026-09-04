import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: '#F5F5F7',
        surface: '#FFFFFF',
        'surface-secondary': '#FAFAFA',
        primary: {
          DEFAULT: '#5856D6',
          hover: '#4644B8',
          active: '#3A38A0',
        },
        'text-primary': '#1D1D1F',
        'text-secondary': '#6E6E73',
        'text-muted': '#86868B',
        border: '#D2D2D7',
        'border-light': '#E8E8ED',
        success: {
          DEFAULT: '#248A3D',
          soft: '#E8F5E9',
        },
        warning: {
          DEFAULT: '#B86E00',
          soft: '#FFF3E0',
        },
        error: {
          DEFAULT: '#C93434',
          soft: '#FFEBEA',
        },
        indigo: {
          soft: '#F0EFFE',
        },
      },
      fontFamily: {
        body: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          '"SF Pro Text"',
          'Inter',
          'sans-serif',
        ],
        heading: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Display"',
          'Inter',
          'sans-serif',
        ],
      },
      fontSize: {
        'display': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        'title': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '600' }],
        'heading': ['1rem', { lineHeight: '1.5rem', fontWeight: '600' }],
        'body': ['0.875rem', { lineHeight: '1.25rem' }],
        'caption': ['0.75rem', { lineHeight: '1rem' }],
        'micro': ['0.6875rem', { lineHeight: '0.875rem' }],
      },
      spacing: {
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
      },
      borderRadius: {
        'sm': '0.375rem',
        'DEFAULT': '0.5rem',
        'md': '0.5rem',
        'lg': '0.75rem',
        'xl': '0.75rem',
      },
      boxShadow: {
        'card': '0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 2px 8px rgba(0,0,0,0.06)',
        'dropdown': '0 4px 16px rgba(0,0,0,0.08)',
        'modal': '0 8px 32px rgba(0,0,0,0.12)',
      },
      transitionDuration: {
        '150': '150ms',
        '200': '200ms',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 150ms ease-out',
        'slide-up': 'slide-up 150ms ease-out',
      },
    },
  },
  plugins: [],
};
export default config;
