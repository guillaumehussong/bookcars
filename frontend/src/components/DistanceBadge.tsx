import React from 'react'
import { Chip, ChipProps, Typography, Tooltip } from '@mui/material'
import { Room as LocationIcon } from '@mui/icons-material'
import * as bookcarsHelper from ':bookcars-helper'
import { strings as commonStrings } from '@/lang/common'

interface DistanceBadgeProps {
  distance?: number
  color?: ChipProps['color']
  className?: string
  showIcon?: boolean
  tooltipPlacement?: 'bottom' | 'left' | 'right' | 'top'
  iconOnly?: boolean
  unit?: string
  language?: string
  supplier?: { name: string }
}

const getDistanceColor = (distance?: number): ChipProps['color'] => {
  if (!distance) return 'default'
  
  if (distance < 5) return 'success'
  if (distance < 10) return 'success'
  if (distance < 20) return 'info'
  if (distance < 50) return 'warning'
  return 'error'
}

const formatDistance = (distance?: number): string => {
  if (distance === undefined) return ''
  
  if (distance < 1) {
    // Convertir en mètres
    const meters = Math.round(distance * 1000)
    return `${meters} m`
  }
  
  // Afficher en km avec 1 décimale
  return `${distance.toFixed(1)} km`
}

const getDistanceLabel = (distance?: number): string => {
  if (!distance) return ''
  
  if (distance < 5) return commonStrings.VERY_CLOSE
  if (distance < 10) return commonStrings.CLOSE
  if (distance < 20) return commonStrings.MEDIUM
  if (distance < 50) return commonStrings.FAR
  return commonStrings.VERY_FAR
}

const DistanceBadge: React.FC<DistanceBadgeProps> = ({
  distance,
  color,
  className = '',
  showIcon = true,
  tooltipPlacement = 'top',
  iconOnly = false,
}) => {
  const distanceColor = color || getDistanceColor(distance)
  const formattedDistance = formatDistance(distance)
  const distanceLabel = getDistanceLabel(distance)
  const tooltipTitle = `${distanceLabel}: ${formattedDistance}`
  
  if (!distance) return null
  
  if (iconOnly) {
    return (
      <Tooltip title={tooltipTitle} placement={tooltipPlacement} arrow>
        <LocationIcon 
          sx={{ color: distanceColor === 'default' ? 'action.active' : `${distanceColor}.main` }} 
          fontSize="small" 
          className={className} 
        />
      </Tooltip>
    )
  }
  
  return (
    <Tooltip title={distanceLabel} placement={tooltipPlacement} arrow>
      <Chip
        icon={showIcon ? <LocationIcon /> : undefined}
        label={
          <Typography variant="caption" component="span">
            {formattedDistance}
          </Typography>
        }
        color={distanceColor}
        size="small"
        className={className}
      />
    </Tooltip>
  )
}

export default DistanceBadge 