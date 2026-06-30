import React from 'react'
import { cn } from '@/lib/utils'

/**
 * The global button — "cartoon" style: rounded-full pill, thick edge, a 3D bottom shadow that
 * presses on click, a hover lift, and a light shine sweep on hover. Used across host/landing/player.
 */
type Variant = 'primary' | 'warn' | 'danger' | 'neutral' | 'ghost'
type Size = 'sm' | 'md' | 'lg'

const VARIANT: Record<Variant, string> = {
  primary:
    'bg-primary text-primary-foreground border-[#0c2a17] shadow-[0_5px_0_0_#0c2a17] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#0c2a17] active:translate-y-1 active:shadow-[0_1px_0_0_#0c2a17]',
  warn:
    'bg-amber-400 text-amber-950 border-[#5b3d06] shadow-[0_5px_0_0_#5b3d06] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#5b3d06] active:translate-y-1 active:shadow-[0_1px_0_0_#5b3d06]',
  danger:
    'bg-red-500 text-white border-[#4c0519] shadow-[0_5px_0_0_#4c0519] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#4c0519] active:translate-y-1 active:shadow-[0_1px_0_0_#4c0519]',
  neutral:
    'bg-secondary text-foreground border-[#0a1020] shadow-[0_5px_0_0_#0a1020] hover:-translate-y-0.5 hover:shadow-[0_7px_0_0_#0a1020] active:translate-y-1 active:shadow-[0_1px_0_0_#0a1020]',
  ghost:
    'bg-transparent text-foreground border-border hover:border-primary/50 hover:bg-secondary/50 active:translate-y-0.5',
}

const SIZE: Record<Size, string> = {
  sm: 'h-10 px-4 text-sm',
  md: 'h-12 px-6 text-base',
  lg: 'h-14 px-8 text-lg',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export function Button({ variant = 'primary', size = 'md', className = '', children, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        'group relative inline-flex cursor-pointer select-none items-center justify-center gap-2 overflow-hidden rounded-full border-2 font-bold tracking-tight transition-all duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        'disabled:pointer-events-none disabled:opacity-50 disabled:!translate-y-0 disabled:shadow-none',
        SIZE[size],
        VARIANT[variant],
        className,
      )}
    >
      {/* shine sweep on hover */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/4 -skew-x-[20deg] bg-white/25 opacity-0 transition-all duration-500 ease-out group-hover:left-[140%] group-hover:opacity-100"
      />
      <span className="relative z-10 inline-flex items-center gap-2">{children}</span>
    </button>
  )
}

export default Button
