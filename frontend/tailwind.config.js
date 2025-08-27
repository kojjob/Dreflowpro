/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // DataReflow Brand Colors
        'brand': {
          50: '#f0fdfa',   // Very light teal
          100: '#ccfbf1',  // Light teal
          200: '#99f6e4',  // Lighter teal
          300: '#5eead4',  // Light teal
          400: '#2dd4bf',  // Medium teal
          500: '#14b8a6',  // Primary teal (main brand color)
          600: '#0d9488',  // Darker teal
          700: '#0f766e',  // Dark teal
          800: '#115e59',  // Darker teal
          900: '#134e4a',  // Darkest teal
        },
        'brand-secondary': {
          50: '#f8fafc',   // Very light slate
          100: '#f1f5f9',  // Light slate
          200: '#e2e8f0',  // Lighter slate
          300: '#cbd5e1',  // Light slate
          400: '#94a3b8',  // Medium slate
          500: '#64748b',  // Primary slate
          600: '#475569',  // Darker slate
          700: '#334155',  // Dark slate
          800: '#1e293b',  // Darker slate (main dark background)
          900: '#0f172a',  // Darkest slate
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
}