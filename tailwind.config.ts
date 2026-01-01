import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Custom colors from the dashboard HTML snippet
        "primary-dark": "#25bdb1",
        "background-light": "#f8fcfb",
        "background-dark": "#112120",
        "surface-light": "#ffffff",
        "surface-dark": "#1a2c2b",
        "text-main": "#0e1b1a",
        "text-secondary": "#4e9791",
        // Badge colors for Doctors page
        'badge-blue-light': '#DBEAFE', // blue-100
        'badge-blue-dark-bg': 'rgba(30, 58, 138, 0.3)', // blue-900/30
        'badge-blue-light-text': '#1E40AF', // blue-800
        'badge-blue-dark-text': '#93C5FD', // blue-300

        'badge-emerald-light': '#D1FAE5', // emerald-100
        'badge-emerald-dark-bg': 'rgba(6, 95, 70, 0.3)', // emerald-900/30
        'badge-emerald-light-text': '#047857', // emerald-800
        'badge-emerald-dark-text': '#6EE7B7', // emerald-300

        'badge-purple-light': '#EDE9FE', // purple-100
        'badge-purple-dark-bg': 'rgba(76, 29, 149, 0.3)', // purple-900/30
        'badge-purple-light-text': '#6D28D9', // purple-800
        'badge-purple-dark-text': '#C4B5FD', // purple-300

        'badge-amber-light': '#FEF3C7', // amber-100
        'badge-amber-dark-bg': 'rgba(146, 64, 14, 0.3)', // amber-900/30
        'badge-amber-light-text': '#B45309', // amber-800
        'badge-amber-dark-text': '#FCD34D', // amber-300

        // Specific hover red for delete button
        'hover-red-light-bg': '#FEF2F2', // red-50
        'hover-red-dark-bg': 'rgba(127, 29, 29, 0.2)', // red-900/20
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xl: "var(--radius-xl)", // New
        "2xl": "var(--radius-2xl)", // New
      },
      fontFamily: { // New
        display: ["Plus Jakarta Sans", "sans-serif"],
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
        "pulse": { // Added for skeleton loading
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: ".5" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite', // New
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;