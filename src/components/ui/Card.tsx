import type { ReactNode } from 'react'
import { motion } from 'framer-motion'

interface CardProps {
  children: ReactNode
  className?: string
  hover?: boolean
  onClick?: () => void
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ children, className = '', hover = false, onClick, padding = 'md' }: CardProps) {
  const padMap = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-6' }
  const base = `card ${padMap[padding]} ${hover ? 'card-hover cursor-pointer' : ''} ${className}`

  if (onClick) {
    return (
      <motion.div
        className={base}
        onClick={onClick}
        whileHover={{ y: -2, boxShadow: '0 12px 40px rgba(0,0,0,0.15)' }}
        transition={{ duration: 0.15 }}
      >
        {children}
      </motion.div>
    )
  }

  return <div className={base}>{children}</div>
}
