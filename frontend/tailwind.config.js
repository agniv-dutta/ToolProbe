/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        primary: {
          light: "#0F67EA",
          50: "#E8EFFE",
          500: "#0052CC",
          DEFAULT: "#0052CC",
          dark: "#003A9B",
        },
        secondary: {
          50: "#FAFAF9",
          100: "#F5F5F4",
          200: "#E7E5E4",
          300: "#D6D3D1",
          400: "#A8A29E",
          500: "#78716C",
          600: "#57534E",
          700: "#44403C",
          800: "#292524",
          900: "#171717",
        },
        accent: {
          light: "#10B981",
          500: "#059669",
          DEFAULT: "#059669",
          dark: "#047857",
        },
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",
      },
      fontFamily: {
        display: ["Sora", "Inter", "system-ui", "sans-serif"],
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "sans-serif"],
        serif: ["Lora", "Merriweather", "Georgia", "serif"],
        mono: ["Fira Code", "Source Code Pro", "monospace"],
      },
      fontSize: {
        h1: ["36px", { lineHeight: "1.2", fontWeight: "600" }],
        h2: ["28px", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["24px", { lineHeight: "1.3", fontWeight: "600" }],
        h4: ["20px", { lineHeight: "1.4", fontWeight: "600" }],
        body: ["15px", { lineHeight: "1.6" }],
        label: ["12px", { lineHeight: "1.4", fontWeight: "500" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "24px",
        "2xl": "32px",
        "3xl": "48px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        "card-sm": "0 1px 2px rgba(17, 24, 39, 0.08)",
        "card-md": "0 4px 6px rgba(17, 24, 39, 0.1), 0 2px 4px rgba(17, 24, 39, 0.06)",
        "card-lg": "0 10px 15px rgba(17, 24, 39, 0.1), 0 4px 6px rgba(17, 24, 39, 0.05)",
        "card-xl": "0 20px 25px rgba(17, 24, 39, 0.1), 0 10px 10px rgba(17, 24, 39, 0.04)",
        focus: "0 0 0 3px rgba(15, 103, 234, 0.1), 0 0 0 1px rgba(15, 103, 234, 0.3)",
      },
      transitionDuration: {
        fast: "150ms",
        base: "250ms",
        slow: "350ms",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      animation: {
        "fade-in": "fadeIn 300ms ease-out forwards",
        "slide-up": "slideUp 300ms ease-out forwards",
        "slide-in-right": "slideInRight 250ms ease-out forwards",
        shimmer: "shimmer 2s infinite",
        "pulse-soft": "pulseSoft 2s ease-in-out infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideInRight: {
          "0%": { opacity: "0", transform: "translateX(20px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        pulseSoft: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.7" },
        },
      },
    },
  },
  plugins: [],
};
