import { cn } from '@/lib/utils';

interface GoLabLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function GoLabLogo({ size = 'md', className }: GoLabLogoProps) {
  const dims = { sm: 28, md: 32, lg: 40 }[size];

  return (
    <svg
      width={dims}
      height={dims}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('shrink-0', className)}
    >
      {/* Rounded square background */}
      <rect width="40" height="40" rx="10" fill="url(#logo-gradient)" />

      {/* Flask / beaker shape */}
      <path
        d="M16 10V17.5L11 27C10.3 28.2 11.2 30 12.6 30H27.4C28.8 30 29.7 28.2 29 27L24 17.5V10"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />

      {/* Flask neck */}
      <path d="M15 10H25" stroke="white" strokeWidth="2" strokeLinecap="round" />

      {/* Liquid line inside flask */}
      <path
        d="M13.5 24H26.5"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />

      {/* Small bubbles */}
      <circle cx="17" cy="26" r="1.2" fill="rgba(255,255,255,0.6)" />
      <circle cx="22" cy="27.5" r="0.8" fill="rgba(255,255,255,0.4)" />
      <circle cx="20" cy="25" r="1" fill="rgba(255,255,255,0.5)" />

      <defs>
        <linearGradient
          id="logo-gradient"
          x1="0"
          y1="0"
          x2="40"
          y2="40"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563EB" />
          <stop offset="1" stopColor="#1D4ED8" />
        </linearGradient>
      </defs>
    </svg>
  );
}
