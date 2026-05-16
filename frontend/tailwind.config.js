/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'brand-orange': '#FF7107',    // SimpliScale tangerine (updated from #FF6B35)
        'brand-gold': '#FFC26B',      // SimpliScale sunrise yellow
        'brand-dark': '#1A1A1A',      // SimpliScale near-black (#1A1A1A per brand spec)
        'brand-surface': '#282828',   // SimpliScale card surface
      },
    },
  },
  plugins: [],
};
