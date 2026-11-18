/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Neobrutalism bright palette
        'neo-black': '#0a0a0a',
        'neo-white': '#ffffff',
        'neo-gray': '#f5f5f5',
        'neo-cyan': '#00d9ff',
        'neo-magenta': '#ff006e',
        'neo-yellow': '#ffed00',
        'neo-lime': '#00ff00',
        'neo-orange': '#ff8c00',
        'neo-pink': '#ff1493',
        'neo-blue': '#0066ff',
        'neo-purple': '#9d00ff',
      },
      borderWidth: {
        '3': '3px',
        '4': '4px',
        '5': '5px',
      },
      boxShadow: {
        'neo': '4px 4px 0px rgba(0, 0, 0, 0.3)',
        'neo-lg': '8px 8px 0px rgba(0, 0, 0, 0.4)',
        'neo-xl': '12px 12px 0px rgba(0, 0, 0, 0.5)',
        'neo-cyan': '6px 6px 0px #00d9ff, 12px 12px 0px rgba(0, 217, 255, 0.3)',
        'neo-magenta': '6px 6px 0px #ff006e, 12px 12px 0px rgba(255, 0, 110, 0.3)',
        'neo-yellow': '6px 6px 0px #ffed00, 12px 12px 0px rgba(255, 237, 0, 0.3)',
      },
      borderRadius: {
        'none': '0px',
        'neo': '2px',
      },
      fontSize: {
        'neo-xs': ['12px', { lineHeight: '16px', fontWeight: '700' }],
        'neo-sm': ['14px', { lineHeight: '20px', fontWeight: '700' }],
        'neo-md': ['16px', { lineHeight: '24px', fontWeight: '700' }],
        'neo-lg': ['20px', { lineHeight: '28px', fontWeight: '700' }],
        'neo-xl': ['24px', { lineHeight: '32px', fontWeight: '900' }],
        'neo-2xl': ['32px', { lineHeight: '40px', fontWeight: '900' }],
        'neo-3xl': ['40px', { lineHeight: '48px', fontWeight: '900' }],
      },
      fontWeight: {
        'neo-bold': '700',
        'neo-black': '900',
      },
    },
  },
  plugins: [],
}
