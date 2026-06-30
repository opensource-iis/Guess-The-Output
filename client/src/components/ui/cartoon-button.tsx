interface CartoonButtonProps {
  label: string
  color?: string
  hasHighlight?: boolean
  disabled?: boolean
  onClick?: () => void
  type?: 'button' | 'submit'
  className?: string
}

// React Bits / shadcn "cartoon button" — defaulted to the green brand palette for this app.
export function CartoonButton({
  label,
  color = 'bg-green-500',
  hasHighlight = true,
  disabled = false,
  onClick,
  type = 'button',
  className = '',
}: CartoonButtonProps) {
  const handleClick = () => {
    if (disabled) return
    onClick?.()
  }

  return (
    <div className={`inline-block ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} ${className}`}>
      <button
        type={type}
        disabled={disabled}
        onClick={handleClick}
        className={`relative h-12 px-6 text-lg rounded-full font-bold text-neutral-950 border-2 border-neutral-900 transition-all duration-150 overflow-hidden group
          ${color} hover:shadow-[0_4px_0_0_#0a1f12]
          ${disabled ? 'opacity-50 pointer-events-none' : 'hover:-translate-y-1 active:translate-y-0 active:shadow-none'}`}
      >
        <span className="relative z-10 whitespace-nowrap">{label}</span>
        {hasHighlight && !disabled && (
          <div className="absolute top-1/2 left-[-100%] w-16 h-24 bg-white/50 -translate-y-1/2 rotate-12 transition-all duration-500 ease-in-out group-hover:left-[200%]"></div>
        )}
      </button>
    </div>
  )
}

export default CartoonButton
