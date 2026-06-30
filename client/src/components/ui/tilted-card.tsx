import { ReactNode, useRef } from 'react'
import { motion, useMotionValue, useSpring } from 'motion/react'

const spring = { damping: 30, stiffness: 120, mass: 1.1 }

/**
 * TiltedCard (React Bits, adapted) — applies a 3D mouse-follow tilt + hover scale to its CHILDREN
 * (instead of an image). Honors prefers-reduced-motion. Used for the two main landing cards.
 */
export default function TiltedCard({
  children,
  className = '',
  containerClassName = 'h-full',
  rotateAmplitude = 12,
  scaleOnHover = 1.03,
}: {
  children: ReactNode
  className?: string
  containerClassName?: string
  rotateAmplitude?: number
  scaleOnHover?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const rotateX = useSpring(useMotionValue(0), spring)
  const rotateY = useSpring(useMotionValue(0), spring)
  const scale = useSpring(1, spring)

  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function handleMouse(e: React.MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const offsetX = e.clientX - rect.left - rect.width / 2
    const offsetY = e.clientY - rect.top - rect.height / 2
    rotateX.set((offsetY / (rect.height / 2)) * -rotateAmplitude)
    rotateY.set((offsetX / (rect.width / 2)) * rotateAmplitude)
  }
  function handleEnter() {
    if (!reduced) scale.set(scaleOnHover)
  }
  function handleLeave() {
    rotateX.set(0)
    rotateY.set(0)
    scale.set(1)
  }

  return (
    <div
      ref={ref}
      className={`[perspective:1000px] ${containerClassName}`}
      onMouseMove={handleMouse}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <motion.div className={`h-full [transform-style:preserve-3d] ${className}`} style={{ rotateX, rotateY, scale }}>
        {children}
      </motion.div>
    </div>
  )
}
