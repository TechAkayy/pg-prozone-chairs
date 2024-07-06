/* Pinegrow generated Design Panel Begin */

const pg_colors = {
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  red: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  yellow: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  green: {
    50: '#ecfdf5',
    100: '#d1fae5',
    200: '#a7f3d0',
    300: '#6ee7b7',
    400: '#34d399',
    500: '#10b981',
    600: '#059669',
    700: '#047857',
    800: '#065f46',
    900: '#064e3b',
  },
  blue: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
  indigo: {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5',
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
  },
  purple: {
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  pink: {
    50: '#fdf2f8',
    100: '#fce7f3',
    200: '#fbcfe8',
    300: '#f9a8d4',
    400: '#f472b6',
    500: '#ec4899',
    600: '#db2777',
    700: '#be185d',
    800: '#9d174d',
    900: '#831843',
  },
  primary: {
    50: '#f7eedf',
    100: '#f2d9bb',
    200: '#ebc598',
    300: '#e2b175',
    400: '#d79e52',
    500: '#cb8b2d',
    600: '#a87325',
    700: '#865c1e',
    800: '#664617',
    900: '#473110',
  },
  secondary: {
    50: '#f3e6df',
    100: '#e8c9ba',
    200: '#dcad95',
    300: '#cd9171',
    400: '#be754f',
    500: '#ac5a2d',
    600: '#8e4b26',
    700: '#723c1e',
    800: '#562d17',
    900: '#3c2010',
  },
  color3: {
    50: '#faf5e6',
    100: '#f7e9ca',
    200: '#f3deaf',
    300: '#edd293',
    400: '#e7c777',
    500: '#e0bc5b',
    600: '#b99b4b',
    700: '#947c3c',
    800: '#705e2e',
    900: '#4e4220',
  },
  color4: {
    50: '#eeeae6',
    100: '#dcd1c9',
    200: '#c9b9ac',
    300: '#b6a190',
    400: '#a38a75',
    500: '#90745b',
    600: '#77604b',
    700: '#5f4d3c',
    800: '#483a2e',
    900: '#322920',
  },
}

const pg_fonts = {
  sans: ["'Titillium Web', sans-serif"],
  serif: ["'Cabin', sans-serif"],
}

const pg_backgrounds = {
  'design-image':
    "url('https://images.unsplash.com/photo-1584901723137-bde3633dc2c2?ixid=MnwyMDkyMnwwfDF8c2VhcmNofDE4OXx8ZnVybml0dXJlfGVufDB8fHx8MTYyNzMzMDA1MA&ixlib=rb-1.2.1q=85&fm=jpg&crop=faces&cs=srgb&w=2000&fit=max')",
  'design-image-large':
    "url('https://images.unsplash.com/photo-1584901723137-bde3633dc2c2?ixid=MnwyMDkyMnwwfDF8c2VhcmNofDE4OXx8ZnVybml0dXJlfGVufDB8fHx8MTYyNzMzMDA1MA&ixlib=rb-1.2.1q=85&fm=jpg&crop=faces&cs=srgb&w=2000&fit=max')",
}

/* Pinegrow generated Design Panel End */
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/forms'),
    require('tailwindcss-animate'),
    require('daisyui'),
  ],

  daisyui: {
    base: false,
    themes: [
      {
        mytheme: {
          primary: pg_colors.primary[500],
          secondary: pg_colors.secondary[500],
          accent: '#37cdbe',
          neutral: '#3d4451',
          'base-100': '#ffffff',
        },
      },
    ],
  },

  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      colors: pg_colors,
      fontFamily: pg_fonts,
      backgrounds: pg_backgrounds,
    },
  },

  /* Please ensure that you update the filenames and paths to accurately match those used in your project. */
  get content() {
    let _content = [
      './index.html',
      './src/**/*.{html,vue,svelte,astro,js,cjs,ts,cts,mts,jsx,tsx,md,mdx}',
    ]
    return {
      relative: true,
      files:
        process.env.NODE_ENV === 'production'
          ? _content
          : [..._content, './_pginfo/**/*.{html,js}'], // used by Vue Desginer for live-designing during development,
    }
  },
}
