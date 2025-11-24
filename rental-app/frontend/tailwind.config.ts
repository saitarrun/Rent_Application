import type { Config } from 'tailwindcss';

const config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1rem',
      screens: { '2xl': '1280px' }
    },
    extend: {
      colors: {
        background: '#edf5ff',
        foreground: '#0f172a',
        surface: {
          1: '#ffffff',
          2: '#fdfdff',
          3: '#e3efff'
        },
        brand: {
          DEFAULT: '#1873f0',
          hover: '#0f5ed0',
          subtle: '#dbe8ff',
          fg: '#f6fbff'
        },
        success: '#16a085',
        warning: '#e7a329',
        danger: '#d45757',
        muted: '#5f6b82',
        outline: '#cfd9ea'
      },
      fontFamily: {
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      boxShadow: {
        soft: '0 18px 60px -30px rgba(15,15,15,0.45)',
        ring: '0 0 0 1px rgba(0,0,0,0.06), 0 20px 50px rgba(0,0,0,0.08)'
      },
      spacing: {
        13: '3.25rem',
        15: '3.75rem'
      },
      transitionTimingFunction: {
        smooth: 'cubic-bezier(.22,.61,.36,1)'
      },
      keyframes: {
        pop: {
          '0%': { transform: 'scale(.96)' },
          '100%': { transform: 'scale(1)' }
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' }
        }
      },
      animation: {
        pop: 'pop .24s smooth both',
        slideUp: 'slideUp .28s smooth both'
      }
    }
  },
  plugins: []
} satisfies Config;

export default config;
