import React from 'react'
import { CircularProgress } from '@mui/material'

import '@/assets/css/progress.css'

interface ProgressProps {
  color?: 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' | 'inherit'
  className?: string
}

const Progress = ({ color, className }: ProgressProps) => (
  <div className={`progress${className ? ` ${className}` : ''}`}>
    <CircularProgress color={color || 'inherit'} size={24} />
  </div>
)

export default Progress
