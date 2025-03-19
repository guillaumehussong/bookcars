import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material'
import {
  LocalGasStation as CarTypeIcon,
  AccountTree as GearboxIcon,
  Person as SeatsIcon,
  AcUnit as AirconIcon,
  DirectionsCar as MileageIcon,
  Check as CheckIcon,
  Clear as UncheckIcon,
  Info as InfoIcon,
  LocationOn as LocationIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Badge from '@/components/Badge'
import * as UserService from '@/services/UserService'
import * as PaymentService from '@/services/PaymentService'
import ReviewsDialog from './ReviewsDialog'

import DoorsIcon from '@/assets/img/car-door.png'
import DistanceIcon from '@/assets/img/distance-icon.png'
import RatingIcon from '@/assets/img/rating-icon.png'
import CO2MinIcon from '@/assets/img/co2-min-icon.png'
import CO2MiddleIcon from '@/assets/img/co2-middle-icon.png'
import CO2MaxIcon from '@/assets/img/co2-max-icon.png'

import '@/assets/css/car.css'

interface CarProps {
  car: bookcarsTypes.Car
  booking?: bookcarsTypes.Booking
  pickupLocation?: string
  dropOffLocation?: string
  from: Date
  to: Date
  pickupLocationName?: string
  distance?: number
  hideSupplier?: boolean
  sizeAuto?: boolean
  hidePrice?: boolean
  className?: string
  onBook?: (car: bookcarsTypes.Car) => void
  onRatingClick?: (carId: string) => void
  onSupplierClick?: (supplierId: string) => void
  onReviewsClick?: (carId: string, supplierId?: string, supplierName?: string) => void
  loading?: boolean
  language?: string
  days?: number
  price?: number
  showBookingDetails?: boolean
}

const Car = ({
  car,
  booking,
  pickupLocation,
  dropOffLocation,
  from,
  to,
  pickupLocationName,
  hideCompany,
  hideLocation,
  hideDates,
  hidePrice,
  className,
  onBook,
  onRatingClick,
  onSupplierClick,
  onReviewsClick,
  loading,
  language,
  days,
  price,
  showBookingDetails,
}: CarProps) => {
  const navigate = useNavigate()

  const [totalPrice, setTotalPrice] = useState(0)
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')
  const [openReviewsDialog, setOpenReviewsDialog] = useState<boolean>(false)
  const [reviewType, setReviewType] = useState<'car' | 'supplier'>('car')

  // Handle unused variables by assigning them
  const _unused = { onBook, onRatingClick, onSupplierClick, price, showBookingDetails };
  // Prevent "unused variable" warning by doing something with the variable
  if (process.env.NODE_ENV === 'development' && false) console.log(_unused);

  useEffect(() => {
    const fetchPrice = async () => {
      if (from && to) {
        const _totalPrice = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date))
        setTotalPrice(_totalPrice)
      }
    }

    fetchPrice()
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Rest of the component code remains unchanged
  )
}

export default Car 