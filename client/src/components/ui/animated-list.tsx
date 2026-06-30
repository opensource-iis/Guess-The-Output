import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  MouseEventHandler,
  UIEvent,
} from 'react'
import { motion, useInView } from 'motion/react'

interface AnimatedItemProps {
  children: ReactNode
  delay?: number
  index: number
  onMouseEnter?: MouseEventHandler<HTMLDivElement>
  onClick?: MouseEventHandler<HTMLDivElement>
}

const AnimatedItem: React.FC<AnimatedItemProps> = ({ children, delay = 0, index, onMouseEnter, onClick }) => {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: 0.5, once: false })
  return (
    <motion.div
      ref={ref}
      data-index={index}
      onMouseEnter={onMouseEnter}
      onClick={onClick}
      initial={{ scale: 0.85, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.85, opacity: 0 }}
      transition={{ duration: 0.18, delay }}
      className="mb-2 cursor-pointer"
    >
      {children}
    </motion.div>
  )
}

interface AnimatedListProps {
  items?: string[]
  onItemSelect?: (item: string, index: number) => void
  showGradients?: boolean
  enableArrowNavigation?: boolean
  className?: string
  itemClassName?: string
  displayScrollbar?: boolean
  initialSelectedIndex?: number
  maxHeight?: string
}

// Adapted from React Bits AnimatedList — themed to slate/green + flexible width.
const AnimatedList: React.FC<AnimatedListProps> = ({
  items = [],
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = '',
  itemClassName = '',
  displayScrollbar = false,
  initialSelectedIndex = -1,
  maxHeight = '260px',
}) => {
  const listRef = useRef<HTMLDivElement>(null)
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex)
  const [keyboardNav, setKeyboardNav] = useState<boolean>(false)
  const [topGradientOpacity, setTopGradientOpacity] = useState<number>(0)
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState<number>(1)

  const handleItemClick = useCallback(
    (item: string, index: number) => {
      setSelectedIndex(index)
      onItemSelect?.(item, index)
    },
    [onItemSelect]
  )

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target as HTMLDivElement
    setTopGradientOpacity(Math.min(scrollTop / 40, 1))
    const bottomDistance = scrollHeight - (scrollTop + clientHeight)
    setBottomGradientOpacity(scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 40, 1))
  }

  useEffect(() => {
    if (!enableArrowNavigation) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setKeyboardNav(true)
        setSelectedIndex((prev) => {
          const next = Math.min(prev + 1, items.length - 1)
          onItemSelect?.(items[next], next)
          return next
        })
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setKeyboardNav(true)
        setSelectedIndex((prev) => {
          const next = Math.max(prev - 1, 0)
          onItemSelect?.(items[next], next)
          return next
        })
      } else if (e.key === 'Enter') {
        if (selectedIndex >= 0 && selectedIndex < items.length) {
          e.preventDefault()
          onItemSelect?.(items[selectedIndex], selectedIndex)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [items, selectedIndex, onItemSelect, enableArrowNavigation])

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return
    const container = listRef.current
    const selectedItem = container.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement | null
    if (selectedItem) {
      const extraMargin = 40
      const containerScrollTop = container.scrollTop
      const containerHeight = container.clientHeight
      const itemTop = selectedItem.offsetTop
      const itemBottom = itemTop + selectedItem.offsetHeight
      if (itemTop < containerScrollTop + extraMargin) {
        container.scrollTo({ top: itemTop - extraMargin, behavior: 'smooth' })
      } else if (itemBottom > containerScrollTop + containerHeight - extraMargin) {
        container.scrollTo({ top: itemBottom - containerHeight + extraMargin, behavior: 'smooth' })
      }
    }
    setKeyboardNav(false)
  }, [selectedIndex, keyboardNav])

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={listRef}
        className={`overflow-y-auto pr-1 ${displayScrollbar ? '' : 'scrollbar-hide'}`}
        style={{ maxHeight }}
        onScroll={handleScroll}
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            delay={Math.min(index * 0.03, 0.25)}
            index={index}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => handleItemClick(item, index)}
          >
            <div
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                selectedIndex === index
                  ? 'border-primary/60 bg-primary/15 text-foreground'
                  : 'border-border bg-secondary/50 text-muted-foreground hover:text-foreground hover:border-border'
              } ${itemClassName}`}
            >
              {item}
            </div>
          </AnimatedItem>
        ))}
      </div>
      {showGradients && (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-8 bg-gradient-to-b from-card to-transparent transition-opacity duration-300"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card to-transparent transition-opacity duration-300"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  )
}

export default AnimatedList
