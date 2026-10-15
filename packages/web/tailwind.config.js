/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Identidad VS Code (Solo para el logo y acentos puntuales)
        'vs-bg': '#1E1E1E',
        'vs-blue': '#569CD6',
        'vs-yellow': '#DCDCAA',
        'vs-orange': '#CE9178',
        'vs-green': '#4EC9B0',

        // Paleta LMS Minimalista (Clara)
        'lms-bg': '#F9FAFB', // Fondo general gris muy claro
        'lms-card': '#FFFFFF', // Fondos de tarjetas
        'lms-text': '#1F2937', // Texto principal (Gris casi negro)
        'lms-text-dark': '#E5E7EB', //Texto claro para modo oscuro
        'lms-muted': '#6B7280', // Texto secundario
        'lms-border': '#E5E7EB', // Bordes sutiles

        // Paleta LMS Minimalista (Oscura elegante)
        'lms-dark-bg': '#111827',
        'lms-dark-card': '#1F2937',
      },
      fontFamily: {
        code: ['Cascadia Code', 'Fira Code', 'monospace'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
