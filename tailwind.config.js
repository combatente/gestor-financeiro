// tailwind.config.ts
import type { Config } from 'tailwindcss'

export default {
  darkMode: ['class', '[data-theme="pastel-dark"]'], // permite alternar por classe/atributo
  content: [
    './index.html',
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Pastéis base (evita 100% saturação para um look profissional)
        brand: {
          50: '#f4f6ff',
          100: '#e9edff',
          200: '#d6dbff',
          300: '#b8c1ff',
          400: '#98a6ff',  // principal claro
          500: '#7f8fff',  // principal
          600: '#6676e6',
          700: '#545fc0',
          800: '#464f9b',
          900: '#3b457f',
        },
        // Estados (versões suaves)
        success: {
          50: '#effcf6',
          100: '#d8f7e8',
          200: '#b4eccf',
          300: '#89ddb4',
          400: '#5dcf98',
          500: '#36bf81', // podes usar #10B981 se preferires
        },
        warning: {
          50: '#fff8ec',
          100: '#ffeccb',
          200: '#ffdea3',
          300: '#ffd07c',
          400: '#ffc059',
          500: '#ffad33',
        },
        danger: {
          50: '#fff1f2',
          100: '#ffe1e4',
          200: '#ffc6cc',
          300: '#ffa0aa',
          400: '#ff7a89',
          500: '#f95a6a',
        },
        // Neutros (ligeiramente azulados para manter frescura pastel)
        neutral: {
          50:  '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1f2937',
          900: '#0f172a',
        },
      },
      boxShadow: {
        'soft': '0 2px 10px rgba(15, 23, 42, 0.08)',
        'elev': '0 8px 24px rgba(15, 23, 42, 0.10)',
        'ring': '0 0 0 3px rgba(152, 166, 255, 0.25)', // brand-400
      },
      borderRadius: {
        'mdx': '12px',
        'lgx': '16px',
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'), // estiliza inputs/selects base
  ],
} satisfies Config

