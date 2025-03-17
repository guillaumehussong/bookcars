import React, { useState, useEffect } from 'react'
import {
  FormControl,
  Button,
  FormControlLabel,
  Checkbox,
  FormHelperText,
} from '@mui/material'
import { DateTimeValidationError } from '@mui/x-date-pickers'
import { addHours } from 'date-fns'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import GoogleMapsLocationField from './GoogleMapsLocationField'
import DateTimePicker from './DateTimePicker'
import Accordion from './Accordion'

import '@/assets/css/car-filter.css'
import '../types/additional-types' // Importer les types additionnels

interface CarFilterProps {
  from: Date
  to: Date
  pickupLocation: bookcarsTypes.Location
  dropOffLocation: bookcarsTypes.Location
  className?: string
  collapse?: boolean
  onSubmit: bookcarsTypes.CarFilterSubmitEvent
}

const OFFSET_HEIGHT = 100

const CarFilter = ({
  from: filterFrom,
  to: filterTo,
  pickupLocation: filterPickupLocation,
  dropOffLocation: filterDropOffLocation,
  className,
  collapse,
  onSubmit
}: CarFilterProps) => {
  let _minDate = new Date()
  _minDate = addHours(_minDate, env.MIN_PICK_UP_HOURS)

  const [from, setFrom] = useState<Date | undefined>(filterFrom)
  const [to, setTo] = useState<Date | undefined>(filterTo)
  const [minDate, setMinDate] = useState<Date>()
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.LocationWithCoordinates | null | undefined>(
    filterPickupLocation && filterPickupLocation.latitude && filterPickupLocation.longitude
      ? {
          ...filterPickupLocation,
          latitude: filterPickupLocation.latitude,
          longitude: filterPickupLocation.longitude
        } as bookcarsTypes.LocationWithCoordinates
      : undefined
  )
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.LocationWithCoordinates | null | undefined>(
    filterDropOffLocation && filterDropOffLocation.latitude && filterDropOffLocation.longitude
      ? {
          ...filterDropOffLocation,
          latitude: filterDropOffLocation.latitude,
          longitude: filterDropOffLocation.longitude
        } as bookcarsTypes.LocationWithCoordinates
      : undefined
  )
  const [sameLocation, setSameLocation] = useState(true)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [minPickupHoursError, setMinPickupHoursError] = useState(false)
  const [minRentalHoursError, setMinRentalHoursError] = useState(false)
  const [accordionHeight, setAccordionHeight] = useState(0)

  useEffect(() => {
    setAccordionHeight(collapse ? 0 : OFFSET_HEIGHT)
  }, [collapse])

  useEffect(() => {
    setPickupLocation(
      filterPickupLocation && filterPickupLocation.latitude && filterPickupLocation.longitude
        ? {
            ...filterPickupLocation,
            latitude: filterPickupLocation.latitude,
            longitude: filterPickupLocation.longitude
          } as bookcarsTypes.LocationWithCoordinates
        : undefined
    )
  }, [filterPickupLocation])

  useEffect(() => {
    setDropOffLocation(
      filterDropOffLocation && filterDropOffLocation.latitude && filterDropOffLocation.longitude
        ? {
            ...filterDropOffLocation,
            latitude: filterDropOffLocation.latitude,
            longitude: filterDropOffLocation.longitude
          } as bookcarsTypes.LocationWithCoordinates
        : undefined
    )
  }, [filterDropOffLocation])

  useEffect(() => {
    setFrom(filterFrom)
  }, [filterFrom])

  useEffect(() => {
    setTo(filterTo)
  }, [filterTo])

  useEffect(() => {
    let _minDate = new Date()
    _minDate = addHours(_minDate, env.MIN_RENTAL_HOURS)
    setMinDate(_minDate)
  }, [])

  useEffect(() => {
    if (!from) {
      return
    }

    let __minDate = new Date(from)
    __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
    setMinDate(__minDate)

    if (from.getTime() - Date.now() < env.MIN_PICK_UP_HOURS * 60 * 60 * 1000) {
      setMinPickupHoursError(true)
    } else {
      setMinPickupHoursError(false)
    }

    if (to && from.getTime() > to.getTime()) {
      const _to = new Date(from)
      _to.setDate(_to.getDate() + 1)
      setTo(_to)
    }

    if (to && to.getTime() - from.getTime() < env.MIN_RENTAL_HOURS * 60 * 60 * 1000) {
      setMinRentalHoursError(true)
    } else {
      setMinRentalHoursError(false)
    }
  }, [from, to])

  const handlePickupLocationChange = (location: bookcarsTypes.LocationWithCoordinates | null) => {
    setPickupLocation(location)
    if (sameLocation) {
      setDropOffLocation(location)
    }
  }

  const handleSameLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSameLocation(e.target.checked)

    if (e.target.checked) {
      setDropOffLocation(pickupLocation)
    }
  }

  const handleDropOffLocationChange = (location: bookcarsTypes.LocationWithCoordinates | null) => {
    setDropOffLocation(location)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to || fromError || toError) {
      return
    }

    const filter: bookcarsTypes.CarFilter = {
      from,
      to,
      pickupLocation,
      dropOffLocation
    }

    if (pickupLocation && pickupLocation.latitude && pickupLocation.longitude) {
      filter.pickupLocationCoords = {
        latitude: pickupLocation.latitude,
        longitude: pickupLocation.longitude
      }
    }

    if (dropOffLocation && dropOffLocation.latitude && dropOffLocation.longitude) {
      filter.dropOffLocationCoords = {
        latitude: dropOffLocation.latitude,
        longitude: dropOffLocation.longitude
      }
    }

    onSubmit(filter)
  }

  const dropOffForm = (
    <FormControl className="drop-off-location">
      <GoogleMapsLocationField
        label={commonStrings.DROP_OFF_LOCATION}
        value={dropOffLocation as bookcarsTypes.LocationWithCoordinates | null}
        onChange={handleDropOffLocationChange}
        required
        variant="outlined"
      />
    </FormControl>
  )

  const filterContent = (
    <form onSubmit={handleSubmit}>
      <div className="filter-container">
        <div className="filter-row pickup-location">
          <FormControl>
            <GoogleMapsLocationField
              label={commonStrings.PICK_UP_LOCATION}
              value={pickupLocation as bookcarsTypes.LocationWithCoordinates | null}
              onChange={handlePickupLocationChange}
              required
              variant="outlined"
            />
          </FormControl>
          <FormControl>
            <DateTimePicker
              label={strings.PICK_UP_DATE}
              value={from}
              minDate={_minDate}
              onChange={(date) => {
                if (date) {
                  setFrom(date)
                  setFromError(false)
                } else {
                  setFrom(undefined)
                }
              }}
              onError={(err: DateTimeValidationError) => {
                if (err) {
                  setFromError(true)
                } else {
                  setFromError(false)
                }
              }}
              language={UserService.getLanguage()}
              required
              variant="outlined"
            />
            <FormHelperText error={minPickupHoursError}>{(minPickupHoursError && strings.MIN_PICK_UP_HOURS_ERROR) || ''}</FormHelperText>
          </FormControl>
        </div>
        <div className="filter-row">
          <FormControlLabel
            className="checkboxLabel"
            control={<Checkbox checked={sameLocation} onChange={handleSameLocationChange} />}
            label={strings.DROP_OFF}
          />
          {!sameLocation && dropOffForm}
          <FormControl className="datetime">
            <DateTimePicker
              label={strings.DROP_OFF_DATE}
              value={to}
              minDate={minDate}
              onChange={(date) => {
                if (date) {
                  setTo(date)
                  setToError(false)
                } else {
                  setTo(undefined)
                }
              }}
              onError={(err: DateTimeValidationError) => {
                if (err) {
                  setToError(true)
                } else {
                  setToError(false)
                }
              }}
              language={UserService.getLanguage()}
              required
              variant="outlined"
            />
            <FormHelperText error={minRentalHoursError}>{(minRentalHoursError && strings.MIN_RENTAL_HOURS_ERROR) || ''}</FormHelperText>
          </FormControl>
          <div className="action">
            <Button
              type="submit"
              variant="contained"
              className="btn-search"
              size="small"
              disableElevation
            >
              {commonStrings.SEARCH}
            </Button>
          </div>
        </div>
      </div>
    </form>
  )

  return collapse ? (
    <Accordion title={strings.SEARCH_FORM} className={className} offsetHeight={accordionHeight}>
      {filterContent}
    </Accordion>
  ) : (
    <div className={className}>{filterContent}</div>
  )
}

export default CarFilter
