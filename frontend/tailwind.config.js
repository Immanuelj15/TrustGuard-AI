/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#070b14',
          900: '#0c1222',
          850: '#11192e',
          800: '#17223b',
          700: '#1f2e4e',
          600: '#2a3d66'
        },
        forensic: {
          cyan: '#06b6d4',
          blue: '#3b82f6',
          amber: '#f59e0b',
          emerald: '#10b981',
          crimson: '#ef4444',
          purple: '#8b5cf6'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Fira Code', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
