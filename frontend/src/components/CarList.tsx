import React, { useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  Typography,
  Alert,
  Grid,
  Box,
  Container,
  Paper,
  Divider,
  Chip
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import Const from '@/config/const'
import env from '@/config/env.config'
import * as helper from '@/common/helper'
import { strings } from '@/lang/cars'
import * as CarService from '@/services/CarService'
import Pager from '@/components/Pager'
import Car from '@/components/Car'
import Progress from '@/components/Progress'

import '@/assets/css/car-list.css'

interface CarListProps {
  from?: Date
  to?: Date
  suppliers?: string[]
  pickupLocation?: string
  dropOffLocation?: string
  pickupLocationName?: string
  carSpecs?: bookcarsTypes.CarSpecs
  carType?: string[]
  gearbox?: string[]
  mileage?: string[]
  fuelPolicy?: string[]
  deposit?: number
  cars?: bookcarsTypes.Car[]
  reload?: boolean
  booking?: bookcarsTypes.Booking
  className?: string
  hidePrice?: boolean
  hideSupplier?: boolean
  loading?: boolean
  sizeAuto?: boolean
  ranges?: string[]
  multimedia?: string[]
  rating?: number
  seats?: number
  supplierDistances?: Record<string, number>
  includeAlreadyBookedCars?: boolean
  includeComingSoonCars?: boolean
  searchRadius?: number
  exactLocationOnly?: boolean
  onLoad?: bookcarsTypes.DataEvent<bookcarsTypes.Car>
}

const CarList = ({
  from,
  to,
  suppliers,
  pickupLocation,
  dropOffLocation,
  pickupLocationName,
  carSpecs,
  carType: _carType,
  gearbox,
  mileage,
  fuelPolicy,
  deposit,
  cars,
  reload,
  booking,
  className,
  hidePrice,
  hideSupplier,
  loading: carListLoading,
  sizeAuto,
  ranges,
  multimedia,
  rating,
  seats,
  supplierDistances,
  includeAlreadyBookedCars,
  includeComingSoonCars,
  searchRadius,
  exactLocationOnly,
  onLoad,
}: CarListProps) => {
  const [init, setInit] = useState(true)
  const [loading, setLoading] = useState(false)
  const [fetch, setFetch] = useState(false)
  const [rows, setRows] = useState<bookcarsTypes.Car[]>([])
  const [rowCount, setRowCount] = useState(0)
  const [totalRecords, setTotalRecords] = useState(0)
  const [page, setPage] = useState(1)
  const [networkError, setNetworkError] = useState(false)

  useEffect(() => {
    if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
      const element = document.querySelector('body')

      if (element) {
        element.onscroll = () => {
          if (fetch
            && !loading
            && window.scrollY > 0
            && window.scrollY + window.innerHeight + env.INFINITE_SCROLL_OFFSET >= document.body.scrollHeight) {
            setLoading(true)
            setPage(page + 1)
          }
        }
      }
    }
  }, [fetch, loading, page])

  const fetchData = async (
    _page: number,
    _suppliers?: string[],
    _pickupLocation?: string,
    _carSpecs?: bookcarsTypes.CarSpecs,
    __carType?: string[],
    _gearbox?: string[],
    _mileage?: string[],
    _fuelPolicy?: string[],
    _deposit?: number,
    _ranges?: string[],
    _multimedia?: string[],
    _rating?: number,
    _seats?: number,
  ) => {
    try {
      setLoading(true)
      setNetworkError(false)

      const payload: bookcarsTypes.GetCarsPayload = {
        suppliers: _suppliers ?? [],
        pickupLocation: _pickupLocation,
        carSpecs: _carSpecs,
        carType: __carType,
        gearbox: _gearbox,
        mileage: _mileage,
        fuelPolicy: _fuelPolicy,
        deposit: _deposit,
        ranges: _ranges,
        multimedia: _multimedia,
        rating: _rating,
        seats: _seats,
        days: bookcarsHelper.days(from, to),
        includeAlreadyBookedCars,
        includeComingSoonCars,
        searchRadius,
        exactLocationOnly,
      }

      console.log('Sending search payload:', JSON.stringify(payload))

      const data = await CarService.getCars(payload, _page, env.CARS_PAGE_SIZE)
      console.log('Received data from API:', JSON.stringify(data))

      const _data = data && data.length > 0 ? data[0] : { pageInfo: { totalRecords: 0 }, resultData: [] }
      if (!_data) {
        console.error('No data returned from API')
        helper.error()
        return
      }
      
      console.log('Processed data:', JSON.stringify(_data))
      
      let _totalRecords = 0
      if (Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0) {
        _totalRecords = _data.pageInfo[0].totalRecords
      } else if (_data.pageInfo && typeof _data.pageInfo === 'object') {
        _totalRecords = _data.pageInfo.totalRecords || 0
      }

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      console.log(`Received ${_rows.length} cars from API, total records: ${_totalRecords}`)
      if (_rows.length > 0) {
        console.log('First car:', JSON.stringify(_rows[0]))
      }

      setRows(_rows)
      setRowCount((_page - 1) * env.CARS_PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_data.resultData.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
        window.scrollTo(0, 0)
      }

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      console.error('Error in fetchData:', err)
      // Check if it's a network error
      if (err && (err as any).code === 'ERR_NETWORK') {
        setNetworkError(true)
      }
      helper.error(err)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (suppliers) {
      if (suppliers.length > 0) {
        console.log(`Fetching cars with ${suppliers.length} suppliers for location ${pickupLocation}`)
        fetchData(page, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
      } else {
        console.log('No suppliers provided, fetching cars without supplier filter')
        fetchData(page, [], pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
      }
    } else if (pickupLocation) {
      console.log('No suppliers array provided, fetching cars without supplier filter')
      fetchData(page, [], pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
    } else {
      console.log('No suppliers and no location, setting empty rows')
      setRows([])
      setFetch(false)
      if (onLoad) {
        onLoad({ rows: [], rowCount: 0 })
      }
      setInit(false)
    }
  }, [page, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cars) {
      console.log(`Setting ${cars.length} cars from props`)
      setRows(cars)
      setFetch(false)
      if (onLoad) {
        onLoad({ rows: cars, rowCount: cars.length })
      }
      setLoading(false)
    }
  }, [cars]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    setPage(1)
  }, [suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats, from, to])

  useEffect(() => {
    if (reload) {
      setPage(1)
      fetchData(1, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
    }
  }, [reload, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className={`car-list-container${className ? ` ${className}` : ''}`}>
      {networkError && (
        <Alert severity="error" className="network-error">
          {strings.NETWORK_ERROR}
        </Alert>
      )}

      {pickupLocationName && searchRadius && searchRadius > 0 && !exactLocationOnly && (
        <Alert severity="info" className="search-radius-info">
          {`${strings.SEARCHING_WITHIN} ${searchRadius} ${strings.KM_AROUND} ${pickupLocationName}`}
        </Alert>
      )}

      {(loading || init || carListLoading) && (
        <div className="car-list-progress">
          <Progress />
        </div>
      )}

      {!(loading || init || carListLoading) && rows.length === 0 && (
        <Paper elevation={1} className="empty-list">
          <Typography>{strings.EMPTY_LIST}</Typography>
        </Paper>
      )}

      {!(loading || init || carListLoading) && rows.length > 0 && (
        <>
          <section className="car-list">
            {rows.map((car) => (
              <div className="car-container" key={car._id}>
                <Car
                  car={car}
                  booking={booking}
                  from={from as Date}
                  to={to as Date}
                  pickupLocation={pickupLocation}
                  dropOffLocation={dropOffLocation}
                  pickupLocationName={pickupLocationName}
                  distance={supplierDistances?.[car.supplier?._id || ''] || undefined}
                  hidePrice={hidePrice}
                  hideSupplier={hideSupplier}
                  sizeAuto={sizeAuto}
                />
              </div>
            ))}
          </section>

          {env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile && (
            <Pager
              page={page}
              pageSize={env.CARS_PAGE_SIZE}
              rowCount={totalRecords}
              totalRecords={totalRecords}
              onNext={() => {
                setPage(page + 1)
              }}
              onPrevious={() => {
                setPage(page - 1)
              }}
            />
          )}
        </>
      )}
    </div>
  )
}

export default CarList
