/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand-blue': '#00B4D8',
        'brand-blue-dark': '#0284c7',
        'brand-orange': '#FF6B00',
        'sidebar-bg': '#030812',
        'sidebar-hover': '#0f172a',
        'bg-page': '#f8fafc',
        'bg-card': '#ffffff',
        'text-main': '#0f172a',
        'text-muted': '#64748b',
        'border-light': '#e2e8f0',
        'bg-dark-page': '#020617',
        'bg-dark-card': '#0f172a',
        'text-dark-main': '#f8fafc',
        'text-dark-muted': '#94a3b8',
        'border-dark': '#1e293b',
        'success': '#10b981',
        'success-bg': 'rgba(16, 185, 129, 0.1)',
        'warning': '#f59e0b',
        'warning-bg': 'rgba(245, 158, 11, 0.1)',
        'danger': '#ef4444',
        'danger-bg': 'rgba(239, 68, 68, 0.1)',
        'info': '#3b82f6',
        'live-bg': 'rgba(139, 92, 246, 0.15)',
        'live-text': '#a78bfa',
      },
      boxShadow: {
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        'md': '8px',
        'lg': '16px',
      },
      fontFamily: {
        'inter': ['Inter', 'sans-serif'],
        'mono': ['JetBrains Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}
