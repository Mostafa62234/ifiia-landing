module.exports = {
  content: ['./index.html'],
  safelist: [
    'hidden', 'active', 'opacity-0', 'translate-y-4',
    'bg-navy-700', 'bg-transparent', 'text-white', 'border-navy-700',
    'text-navy/70', 'border-navy-700/25'
  ],
  theme: {
    extend: {
      colors: {
        navy:   { DEFAULT: '#1A365D', 900: '#0B1B33', 700: '#1A365D', 500: '#2C4E7A', 300: '#4A6D99' },
        gold:   { DEFAULT: '#C5A880', light: '#E0CDA9', dark: '#8F7550', tint: '#F3EBDD' },
        cloud:  '#F7FAFC',
        bone:   '#EDE9E1',
        charcoal:'#2D3748'
      },
      fontFamily: {
        display: ['Amiri', 'Georgia', 'serif'],
        body:    ['Cairo', 'system-ui', 'sans-serif']
      },
      borderRadius: { none:'0', sm:'0', DEFAULT:'0', md:'0', lg:'0', xl:'0', '2xl':'0', '3xl':'0', full:'9999px' },
      fontSize: {
        'display': ['clamp(2.75rem, 7vw, 5rem)', { lineHeight: '1.04', letterSpacing: '-0.015em' }],
        'title':   ['clamp(1.85rem, 3.6vw, 2.9rem)', { lineHeight: '1.12' }],
        'lead':    ['clamp(1.05rem, 1.6vw, 1.25rem)', { lineHeight: '1.75' }]
      },
      letterSpacing: { 'wider2': '0.18em' },
      boxShadow: {
        panel: '0 24px 60px -30px rgba(11,27,51,0.45)'
      }
    }
  }
}
