import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1600px",
      },
    },
    extend: {
      fontFamily: {
        display: ["'Playfair Display'", "Georgia", "serif"],
        editorial: ["'Instrument Serif'", "'Playfair Display'", "Georgia", "serif"],
        body: ["'Inter'", "'DM Sans'", "system-ui", "sans-serif"],
      },
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
        // Legacy aliases kept so dashboard pages keep working.
        emerald: {
          DEFAULT: "hsl(var(--emerald))",
          light: "hsl(var(--emerald-light))",
          dark: "hsl(var(--emerald-dark))",
        },
        amber: {
          DEFAULT: "hsl(var(--amber))",
          light: "hsl(var(--amber-light))",
        },
        earth: {
          DEFAULT: "hsl(var(--earth))",
          light: "hsl(var(--earth-light))",
        },
        sky: "hsl(var(--sky))",
        sage: "hsl(var(--sage))",
        cream: "hsl(var(--cream))",
        charcoal: "hsl(var(--charcoal))",
        // Ignis tokens
        ignis: {
          DEFAULT: "hsl(var(--ignis))",
          bright: "hsl(var(--ignis-bright))",
          deep: "hsl(var(--ignis-deep))",
        },
        "rich-emerald": "hsl(var(--rich-emerald))",
        "sap-green": "hsl(var(--sap-green))",
        sacramento: "hsl(var(--sacramento))",
        "la-salle": "hsl(var(--la-salle))",
        "hunter-green": "hsl(var(--hunter-green))",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(20px)", filter: "blur(4px)" },
          to: { opacity: "1", transform: "translateY(0)", filter: "blur(0)" },
        },
        "count-up": {
          from: { opacity: "0", transform: "scale(0.8)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "marquee": {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "arrow-pulse": {
          "0%, 100%": { transform: "translateX(0)", opacity: "0.5" },
          "50%": { transform: "translateX(6px)", opacity: "1" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(32px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "flip-down": {
          "0%": { transform: "rotateX(-90deg)", opacity: "0" },
          "60%": { transform: "rotateX(20deg)", opacity: "1" },
          "100%": { transform: "rotateX(0deg)", opacity: "1" },
        },
        "ember-float": {
          "0%, 100%": { transform: "translateY(0) scale(1)", opacity: "0.5" },
          "50%": { transform: "translateY(-12px) scale(1.05)", opacity: "0.9" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.6", filter: "blur(60px)" },
          "50%": { opacity: "1", filter: "blur(40px)" },
        },
        "spin-slow": {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 1.4s ease-out forwards",
        "fade-up": "fade-up 700ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
        "count-up": "count-up 0.8s ease-out forwards",
        "marquee": "marquee 35s linear infinite",
        "arrow-pulse": "arrow-pulse 1.4s ease-in-out infinite",
        "slide-up": "slide-up 1.6s ease-out forwards",
        "flip-down": "flip-down 0.55s cubic-bezier(0.33, 1, 0.68, 1)",
        "ember-float": "ember-float 6s ease-in-out infinite",
        "glow-pulse": "glow-pulse 4s ease-in-out infinite",
        "spin-slow": "spin-slow 30s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
