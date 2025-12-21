/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0C021E',
        'background-light': '#1A0A3A',
        foreground: '#FFFFFF',
        primary: '#9050E9',
        'primary-light': '#A96AFF',
        'primary-dark': '#7038C0',
        'text-secondary': '#9D9FA9',
        'card-bg': 'rgba(144, 80, 233, 0.1)',
        'card-bg-hover': 'rgba(144, 80, 233, 0.15)',
        'border-color': 'rgba(186, 186, 186, 0.4)',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336',
        info: '#2196F3',
      },
      fontFamily: {
        montserrat: ['var(--font-montserrat)', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 4px 10px rgba(0, 0, 0, 0.15)',
        'card-hover': '0 8px 20px rgba(0, 0, 0, 0.2)',
        'button': '0 2px 5px rgba(0, 0, 0, 0.2)',
      },
      spacing: {
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};