import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Box,
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
  LocalGasStation,
} from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/cars'
import Badge from '@/components/Badge'
import DistanceBadge from '@/components/DistanceBadge'
import * as UserService from '@/services/UserService'
import * as PaymentService from '@/services/PaymentService'

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
}

const Car = ({
  car,
  pickupLocation,
  dropOffLocation,
  from,
  to,
  pickupLocationName,
  distance,
  hideSupplier,
  sizeAuto,
  hidePrice,
}: CarProps) => {
  const navigate = useNavigate()

  const [language, setLanguage] = useState('')
  const [days, setDays] = useState(0)
  const [totalPrice, setTotalPrice] = useState(0)
  const [cancellation, setCancellation] = useState('')
  const [amendments, setAmendments] = useState('')
  const [theftProtection, setTheftProtection] = useState('')
  const [collisionDamageWaiver, setCollisionDamageWaiver] = useState('')
  const [fullInsurance, setFullInsurance] = useState('')
  const [additionalDriver, setAdditionalDriver] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLanguage(UserService.getLanguage())
  }, [])

  useEffect(() => {
    const fetchPrice = async () => {
      if (from && to) {
        const _totalPrice = await PaymentService.convertPrice(bookcarsHelper.calculateTotalPrice(car, from as Date, to as Date))
        setTotalPrice(_totalPrice)
        setDays(bookcarsHelper.days(from, to))
      }
    }

    fetchPrice()
  }, [from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      const _cancellation = (car.cancellation > -1 && (await helper.getCancellation(car.cancellation, language))) || ''
      const _amendments = (car.amendments > -1 && (await helper.getAmendments(car.amendments, language))) || ''
      const _theftProtection = (car.theftProtection > -1 && (await helper.getTheftProtection(car.theftProtection, language))) || ''
      const _collisionDamageWaiver = (car.collisionDamageWaiver > -1 && (await helper.getCollisionDamageWaiver(car.collisionDamageWaiver, language))) || ''
      const _fullInsurance = (car.fullInsurance > -1 && (await helper.getFullInsurance(car.fullInsurance, language))) || ''
      const _additionalDriver = (car.additionalDriver > -1 && (await helper.getAdditionalDriver(car.additionalDriver, language))) || ''

      setCancellation(_cancellation)
      setAmendments(_amendments)
      setTheftProtection(_theftProtection)
      setCollisionDamageWaiver(_collisionDamageWaiver)
      setFullInsurance(_fullInsurance)
      setAdditionalDriver(_additionalDriver)
      setLoading(false)
    }

    if (language) {
      init()
    }
  }, [language]) // eslint-disable-line react-hooks/exhaustive-deps

  const getExtraIcon = (option: string, extra: number) => {
    if (extra === -1) {
      return ''
    }

    if (extra === 0) {
      return option === 'cancellation'
        ? strings.CANCELLATION_NOT_ALLOWED
        : option === 'amendments'
          ? strings.AMENDMENTS_NOT_ALLOWED
          : option === 'theftProtection'
            ? strings.THEFT_PROTECTION_NOT_INCLUDED
            : option === 'collisionDamageWaiver'
              ? strings.COLLISION_DAMAGE_WAVIER_NOT_INCLUDED
              : option === 'fullInsurance'
                ? strings.FULL_INSURANCE_NOT_INCLUDED
                : strings.ADDITIONAL_DRIVER_NOT_ALLOWED
    }

    if (extra === 1) {
      return option === 'cancellation'
        ? strings.CANCELLATION_ALLOWED
        : option === 'amendments'
          ? strings.AMENDMENTS_ALLOWED
          : option === 'theftProtection'
            ? strings.THEFT_PROTECTION_INCLUDED
            : option === 'collisionDamageWaiver'
              ? strings.COLLISION_DAMAGE_WAVIER_INCLUDED
              : option === 'fullInsurance'
                ? strings.FULL_INSURANCE_INCLUDED
                : strings.ADDITIONAL_DRIVER_ALLOWED
    }

    if (extra === 2) {
      return option === 'cancellation'
        ? strings.CANCELLATION_PARTIAL_REFUND
        : option === 'amendments'
          ? strings.AMENDMENTS_PARTIAL_REFUND
          : strings.ADDITIONAL_DRIVER_PARTIAL_REFUND
    }

    return ''
  }

  const getExtras = () => (
    <>
      {(car.cancellation > -1 || car.amendments > -1 || car.theftProtection > -1 || car.collisionDamageWaiver > -1 || car.fullInsurance > -1 || car.additionalDriver > -1) && (
        <Accordion className="accordion">
          <AccordionSummary expandIcon={<ExpandMoreIcon />} className="accordion-summary">
            <span className="accordion-heading">{strings.EXTRAS}</span>
          </AccordionSummary>
          <AccordionDetails className="accordion-details">
            <div className="extras">
              {car.cancellation > -1 && (
                <div className="extra">
                  {car.cancellation === 0 ? <UncheckIcon color="error" className="extra-icon" /> : car.cancellation === 1 ? <CheckIcon color="success" className="extra-icon" /> : <InfoIcon color="primary" className="extra-icon" />}
                  <span className="extra-title">{cancellation}</span>
                </div>
              )}
              {car.amendments > -1 && (
                <div className="extra">
                  {car.amendments === 0 ? <UncheckIcon color="error" className="extra-icon" /> : car.amendments === 1 ? <CheckIcon color="success" className="extra-icon" /> : <InfoIcon color="primary" className="extra-icon" />}
                  <span className="extra-title">{amendments}</span>
                </div>
              )}
              {car.theftProtection > -1 && (
                <div className="extra">
                  {car.theftProtection === 0 ? <UncheckIcon color="error" className="extra-icon" /> : <CheckIcon color="success" className="extra-icon" />}
                  <span className="extra-title">{theftProtection}</span>
                </div>
              )}
              {car.collisionDamageWaiver > -1 && (
                <div className="extra">
                  {car.collisionDamageWaiver === 0 ? <UncheckIcon color="error" className="extra-icon" /> : <CheckIcon color="success" className="extra-icon" />}
                  <span className="extra-title">{collisionDamageWaiver}</span>
                </div>
              )}
              {car.fullInsurance > -1 && (
                <div className="extra">
                  {car.fullInsurance === 0 ? <UncheckIcon color="error" className="extra-icon" /> : <CheckIcon color="success" className="extra-icon" />}
                  <span className="extra-title">{fullInsurance}</span>
                </div>
              )}
              {car.additionalDriver > -1 && (
                <div className="extra">
                  {car.additionalDriver === 0 ? <UncheckIcon color="error" className="extra-icon" /> : car.additionalDriver === 1 ? <CheckIcon color="success" className="extra-icon" /> : <InfoIcon color="primary" className="extra-icon" />}
                  <span className="extra-title">{additionalDriver}</span>
                </div>
              )}
            </div>
          </AccordionDetails>
        </Accordion>
      )}
    </>
  )

  if (loading || !language || (!hidePrice && (!days || !totalPrice))) {
    return null
  }

  const fr = language === 'fr'
  const distanceNumber = distance || 0
  const distanceUnit = 'km'

  return (
    <div className={`car${sizeAuto ? ' car-size-auto' : ''}`}>
      <div className="car-right">
        {pickupLocationName && (
          <div className="car-header">
            <div className="location">
              <LocationIcon />
              <span className="location-name">{pickupLocationName}</span>
            </div>
            {distance !== undefined && (
              <div className="distance">
                <DistanceBadge 
                  distance={distanceNumber} 
                  unit={distanceUnit} 
                  language={language} 
                />
              </div>
            )}
          </div>
        )}
        <article>
          <div className="car">
            <img 
              src={bookcarsHelper.joinURL(env.CDN_CARS, car.image)} 
              alt={car.name} 
              className="car-img" 
            />
            {!hideSupplier && car.supplier && (
              <div className="car-supplier" title={car.supplier.fullName}>
                <span className="car-supplier-logo">
                  <img src={bookcarsHelper.joinURL(env.CDN_USERS, car.supplier.avatar)} alt={car.supplier.fullName} />
                </span>
                <span className="car-supplier-info">{car.supplier.fullName}</span>
              </div>
            )}
            {car.rating !== undefined && car.rating > 0 && (
              <div className="car-footer">
                <div className="rating">
                  <img src={RatingIcon} alt="" />
                  <span className="value">{car.rating.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          <div className="car-info">
            <div className="car-name">
              <h2>{car.name}</h2>
            </div>
            <div className="car-info-specs">
              <ul className="car-info-list">
                {car.type && (
                  <li className="car-type">
                    <div className="car-info-list-item">
                      <CarTypeIcon />
                      <span className="car-info-list-text">{helper.getCarTypeShort(car.type)}</span>
                    </div>
                  </li>
                )}
                {car.gearbox && (
                  <li className="gearbox">
                    <div className="car-info-list-item">
                      <GearboxIcon />
                      <span className="car-info-list-text">{helper.getGearboxTypeShort(car.gearbox)}</span>
                    </div>
                  </li>
                )}
                {car.seats > 0 && (
                  <li className="seats">
                    <div className="car-info-list-item">
                      <SeatsIcon />
                      <span className="car-info-list-text">{car.seats}</span>
                    </div>
                  </li>
                )}
                {car.doors > 0 && (
                  <li className="doors">
                    <div className="car-info-list-item">
                      <img src={DoorsIcon} alt="" />
                      <span className="car-info-list-text">{car.doors}</span>
                    </div>
                  </li>
                )}
                {car.aircon && (
                  <li className="aircon">
                    <div className="car-info-list-item">
                      <AirconIcon />
                      <span className="car-info-list-text">{commonStrings.AIRCON}</span>
                    </div>
                  </li>
                )}
                {car.mileage && (
                  <li className="mileage">
                    <div className="car-info-list-item">
                      <MileageIcon />
                      <span className="car-info-list-text">{helper.getMileage(car.mileage, language)}</span>
                    </div>
                  </li>
                )}
                {car.fuelPolicy && (
                  <li className="fuel-policy">
                    <div className="car-info-list-item">
                      <LocalGasStation />
                      <span className="car-info-list-text">{helper.getFuelPolicy(car.fuelPolicy)}</span>
                    </div>
                  </li>
                )}
              </ul>
            </div>
            {getExtras()}
          </div>

          {!hidePrice && (
            <div className="price">
              <span className="price-days">{`${strings.PRICE_FOR_1} ${days} ${days > 1 ? strings.DAYS : strings.DAY}`}</span>
              <div className="price-total">
                <span className="price-total-label">{`${env.CURRENCIES.find(c => c.code === env.BASE_CURRENCY)?.symbol || '$'}${totalPrice}`}</span>
              </div>
              <span className="price-day">{`${strings.PRICE_PER_DAY}: ${env.CURRENCIES.find(c => c.code === env.BASE_CURRENCY)?.symbol || '$'}${bookcarsHelper.formatNumber(totalPrice / days, language)}`}</span>
            </div>
          )}

          <div className="action">
            {car.available ? (
              <Button
                type="submit"
                variant="contained"
                className="btn-book"
                href={`/checkout?c=${car._id}&p=${pickupLocation}&d=${dropOffLocation}&f=${from.getTime()}&t=${to.getTime()}`}
              >
                {strings.BOOK}
              </Button>
            ) : car.comingSoon ? (
              <span className="coming-soon">{strings.COMING_SOON}</span>
            ) : (
              <span className="fully-booked">{strings.FULLY_BOOKED}</span>
            )}
          </div>
        </article>
      </div>
    </div>
  )
}

export default Car

