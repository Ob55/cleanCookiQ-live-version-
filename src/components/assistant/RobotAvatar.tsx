import { motion } from "framer-motion";

/**
 * A friendly little robot that gently hovers in place, with a glowing aura,
 * a blinking antenna and eyes. Pure CSS/SVG — no asset to load.
 *
 * `state="thinking"` makes the eyes pulse so it reads as "working".
 */
export default function RobotAvatar({
  accent,
  size = 56,
  state = "idle",
}: {
  accent: string;
  size?: number;
  state?: "idle" | "thinking";
}) {
  const thinking = state === "thinking";

  return (
    <motion.div
      // The whole robot bobs up and down to read as "floating".
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ width: size, height: size }}
      className="relative grid place-items-center"
      aria-hidden="true"
    >
      {/* soft glow aura */}
      <motion.span
        className="absolute inset-0 rounded-full blur-md"
        style={{ background: accent, opacity: 0.35 }}
        animate={{ opacity: thinking ? [0.25, 0.55, 0.25] : [0.2, 0.4, 0.2] }}
        transition={{ duration: thinking ? 1 : 2.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <svg
        viewBox="0 0 64 64"
        width={size}
        height={size}
        className="relative drop-shadow-sm"
      >
        {/* antenna */}
        <line x1="32" y1="10" x2="32" y2="18" stroke={accent} strokeWidth="2.5" strokeLinecap="round" />
        <motion.circle
          cx="32" cy="8" r="3" fill={accent}
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* head */}
        <rect x="14" y="18" width="36" height="28" rx="9" fill="#ffffff" stroke={accent} strokeWidth="2.5" />

        {/* ears */}
        <rect x="10" y="26" width="4" height="10" rx="2" fill={accent} />
        <rect x="50" y="26" width="4" height="10" rx="2" fill={accent} />

        {/* eyes */}
        <motion.g
          animate={
            thinking
              ? { opacity: [1, 0.35, 1] }
              : { scaleY: [1, 1, 0.1, 1, 1] }
          }
          transition={
            thinking
              ? { duration: 0.9, repeat: Infinity, ease: "easeInOut" }
              : { duration: 4, repeat: Infinity, times: [0, 0.92, 0.95, 0.98, 1], ease: "easeInOut" }
          }
          style={{ transformOrigin: "center 31px" }}
        >
          <circle cx="25" cy="31" r="4" fill={accent} />
          <circle cx="39" cy="31" r="4" fill={accent} />
        </motion.g>

        {/* smile */}
        <path d="M25 39 Q32 43 39 39" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
}
