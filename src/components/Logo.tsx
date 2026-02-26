import { type SVGProps } from "react";

/**
 * CarePilot / Clinic System logo.
 *
 * A modern medical icon: rounded shield shape with a heartbeat pulse line.
 * Works at any size — pass `className` with Tailwind width/height.
 *
 * Usage:
 *   <Logo className="h-8 w-8" />
 *   <Logo className="h-5 w-5 text-sky-500" />
 */
export function Logo({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Rounded shield / badge background */}
      <rect
        x="4"
        y="4"
        width="40"
        height="40"
        rx="14"
        fill="url(#logo-gradient)"
      />

      {/* Inner glow */}
      <rect
        x="7"
        y="7"
        width="34"
        height="34"
        rx="11"
        fill="white"
        fillOpacity="0.15"
      />

      {/* Heartbeat / pulse line */}
      <path
        d="M11 26h5.5l2.5-6 3 12 3-8 2 4h2.5l2.5-6 3 10 2-6H43"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Small medical cross at top-right */}
      <rect x="33" y="10" width="6" height="2" rx="1" fill="white" fillOpacity="0.7" />
      <rect x="35" y="8" width="2" height="6" rx="1" fill="white" fillOpacity="0.7" />

      <defs>
        <linearGradient
          id="logo-gradient"
          x1="4"
          y1="4"
          x2="44"
          y2="44"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Smaller, simpler version for favicons and tiny contexts.
 */
export function LogoMark({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      <rect width="32" height="32" rx="8" fill="url(#mark-gradient)" />
      <path
        d="M6 17h3.5l2-5 2.5 10 2.5-7 1.5 3h2l2-5 2.5 8.5 1.5-4.5H30"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <defs>
        <linearGradient
          id="mark-gradient"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#0ea5e9" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
