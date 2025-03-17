import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
import * as bookcarsHelper from ':bookcars-helper'
import env from '@/config/env.config'
import { strings as commonStrings } from '@/lang/common'
import { strings } from '@/lang/search-form'
import * as UserService from '@/services/UserService'
import * as LocationService from '@/services/LocationService'
import GoogleMapsLocationField from '@/components/GoogleMapsLocationField'
import * as GoogleMapsService from '@/services/GoogleMapsService'
import DateTimePicker from '@/components/DateTimePicker'

import '@/assets/css/search-form.css'
import '../types/additional-types'

interface SearchFormProps {
  pickupLocation?: string
  dropOffLocation?: string
  ranges?: bookcarsTypes.CarRange[]
  onCancel?: () => void
}

const SearchForm = ({
  pickupLocation: __pickupLocation,
  dropOffLocation: __dropOffLocation,
  ranges: __ranges,
  onCancel,
}: SearchFormProps) => {
  const navigate = useNavigate()

  let _minDate = new Date()
  _minDate = addHours(_minDate, env.MIN_PICK_UP_HOURS)

  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.LocationWithCoordinates | null>(null)
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.LocationWithCoordinates | null>(null)
  const [minDate, setMinDate] = useState(_minDate)
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [sameLocation, setSameLocation] = useState(true)
  const [fromError, setFromError] = useState(false)
  const [toError, setToError] = useState(false)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [minPickupHoursError, setMinPickupHoursError] = useState(false)
  const [minRentalHoursError, setMinRentalHoursError] = useState(false)
  const [searchRadius, setSearchRadius] = useState(10) // Default search radius: 10km
  const [exactLocationOnly, setExactLocationOnly] = useState(false) // Default: include nearby locations

  useEffect(() => {
    const _from = new Date()
    if (env.MIN_PICK_UP_HOURS < 72) {
      _from.setDate(_from.getDate() + 3)
    } else {
      _from.setDate(_from.getDate() + Math.ceil(env.MIN_PICK_UP_HOURS / 24) + 1)
    }
    _from.setHours(10)
    _from.setMinutes(0)
    _from.setSeconds(0)
    _from.setMilliseconds(0)

    const _to = new Date(_from)
    if (env.MIN_RENTAL_HOURS < 72) {
      _to.setDate(_to.getDate() + 3)
    } else {
      _to.setDate(_to.getDate() + Math.ceil(env.MIN_RENTAL_HOURS / 24) + 1)
    }

    let __minDate = new Date()
    __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)

    setMinDate(__minDate)
    setFrom(_from)
    setTo(_to)
  }, [])

  useEffect(() => {
    const init = async () => {
      if (__pickupLocation) {
        try {
          const location = await LocationService.getLocation(__pickupLocation)
          if (location && location.latitude && location.longitude) {
            const locationWithCoords: bookcarsTypes.LocationWithCoordinates = {
              ...location,
              latitude: location.latitude,
              longitude: location.longitude
            }
            setPickupLocation(locationWithCoords)
            
            if (sameLocation) {
              setDropOffLocation(locationWithCoords)
            }
          }
        } catch (error) {
          console.error('Error loading pickup location:', error)
        }
      }
    }
    init()
  }, [__pickupLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const init = async () => {
      if (__dropOffLocation && !sameLocation) {
        try {
          const location = await LocationService.getLocation(__dropOffLocation)
          if (location && location.latitude && location.longitude) {
            const locationWithCoords: bookcarsTypes.LocationWithCoordinates = {
              ...location,
              latitude: location.latitude,
              longitude: location.longitude
            }
            setDropOffLocation(locationWithCoords)
          }
        } catch (error) {
          console.error('Error loading dropoff location:', error)
        }
      }
    }
    init()
  }, [__dropOffLocation, sameLocation]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (from) {
      let __minDate = new Date(from)
      __minDate = addHours(__minDate, env.MIN_RENTAL_HOURS)
      setMinDate(__minDate)

      if (from.getTime() - Date.now() < env.MIN_PICK_UP_HOURS * 60 * 60 * 1000) {
        setMinPickupHoursError(true)
      } else {
        setMinPickupHoursError(false)
      }
    }

    if (from && to) {
      if (from.getTime() > to.getTime()) {
        const _to = new Date(from)
        if (env.MIN_RENTAL_HOURS < 24) {
          _to.setDate(_to.getDate() + 1)
        } else {
          _to.setDate(_to.getDate() + Math.ceil(env.MIN_RENTAL_HOURS / 24) + 1)
        }
        setTo(_to)
      } else if (to.getTime() - from.getTime() < env.MIN_RENTAL_HOURS * 60 * 60 * 1000) {
        setMinRentalHoursError(true)
      } else {
        setMinRentalHoursError(false)
      }
    }
  }, [from, to])

  useEffect(() => {
    setRanges(__ranges || bookcarsHelper.getAllRanges())
  }, [__ranges])

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
    } else {
      setDropOffLocation(null)
    }
  }

  const handleDropOffLocationChange = (location: bookcarsTypes.LocationWithCoordinates | null) => {
    setDropOffLocation(location)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    if (!pickupLocation || !dropOffLocation || !from || !to || fromError || toError || minPickupHoursError || minRentalHoursError) {
      return
    }

    setTimeout(navigate, 0, '/search', {
      state: {
        pickupLocationId: pickupLocation._id,
        dropOffLocationId: dropOffLocation._id,
        pickupLocationCoords: {
          latitude: pickupLocation.latitude,
          longitude: pickupLocation.longitude
        },
        dropOffLocationCoords: {
          latitude: dropOffLocation.latitude,
          longitude: dropOffLocation.longitude
        },
        from,
        to,
        ranges,
        searchRadius,
        exactLocationOnly,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} className="home-search-form">
      <FormControl className="pickup-location">
        <GoogleMapsLocationField
          label={commonStrings.PICK_UP_LOCATION}
          required
          variant="outlined"
          value={pickupLocation}
          onChange={handlePickupLocationChange}
        />
      </FormControl>
      <FormControl className="from">
        <DateTimePicker
          label={strings.PICK_UP_DATE}
          value={from}
          minDate={_minDate}
          variant="outlined"
          required
          onChange={(date) => {
            if (date) {
              setFrom(date)
              setFromError(false)
            } else {
              setFrom(undefined)
              setMinDate(_minDate)
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
        />
        <FormHelperText error={minPickupHoursError}>{(minPickupHoursError && strings.MIN_PICK_UP_HOURS_ERROR) || ''}</FormHelperText>
      </FormControl>
      <FormControl className="to">
        <DateTimePicker
          label={strings.DROP_OFF_DATE}
          value={to}
          minDate={minDate}
          variant="outlined"
          required
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
        />
        <FormHelperText error={minRentalHoursError}>{(minRentalHoursError && strings.MIN_RENTAL_HOURS_ERROR) || ''}</FormHelperText>
      </FormControl>
      <Button type="submit" variant="contained" className="btn-search">
        {commonStrings.SEARCH}
      </Button>
      {onCancel && (
        <Button
          variant="outlined"
          color="inherit"
          className="btn-cancel"
          onClick={() => {
            onCancel()
          }}
        >
          {commonStrings.CANCEL}
        </Button>
      )}
      {!sameLocation && (
        <FormControl className="drop-off-location">
          <GoogleMapsLocationField
            label={commonStrings.DROP_OFF_LOCATION}
            required
            variant="outlined"
            value={dropOffLocation}
            onChange={handleDropOffLocationChange}
          />
        </FormControl>
      )}
      <FormControl className="chk-same-location">
        <FormControlLabel control={<Checkbox checked={sameLocation} onChange={handleSameLocationChange} />} label={strings.DROP_OFF} />
      </FormControl>
      <FormControl className="chk-exact-location">
        <FormControlLabel 
          control={
            <Checkbox 
              checked={exactLocationOnly} 
              onChange={(e) => setExactLocationOnly(e.target.checked)} 
            />
          } 
          label={strings.EXACT_LOCATION_ONLY || "Exact location only"} 
        />
      </FormControl>
    </form>
  )
}

export default SearchForm
