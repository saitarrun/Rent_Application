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
        background: 'hsl(222 24% 8%)',
        foreground: 'hsl(210 20% 98%)',
        surface: {
          1: 'hsl(222 22% 11%)',
          2: 'hsl(222 22% 13%)',
          3: 'hsl(222 22% 16%)'
        },
        brand: {
          DEFAULT: 'hsl(258 90% 66%)',
          hover: 'hsl(258 90% 60%)',
          subtle: 'hsl(258 60% 22%)',
          fg: '#fff'
        },
        success: 'hsl(150 70% 45%)',
        warning: 'hsl(40 95% 55%)',
        danger: 'hsl(350 85% 55%)',
        muted: 'hsl(220 8% 60%)',
        outline: 'hsl(220 12% 20%)'
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
        soft: '0 8px 28px -8px rgba(0,0,0,.45)',
        ring: '0 0 0 1px hsl(220 12% 22%), 0 8px 30px -10px rgba(0,0,0,.55)'
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
