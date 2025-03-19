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
import * as UserService from '@/services/UserService'

import '@/assets/css/car-list.css'

interface CarListProps {
  from?: Date
  to?: Date
  suppliers?: string[]
  pickupLocation?: string
  dropOffLocation?: string
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
  ranges?: string[]
  multimedia?: string[]
  rating?: number
  seats?: number
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
  ranges,
  multimedia,
  rating,
  seats,
  includeAlreadyBookedCars,
  includeComingSoonCars,
  searchRadius,
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
      }

      console.log('CarList fetchData payload:', payload)
      const data = await CarService.getCars(payload)
      console.log('CarList fetchData response:', data)

      if (!data || !Array.isArray(data) || data.length === 0) {
        console.log('No data or empty array')
        setRows([])
        setRowCount(0)
        setTotalRecords(0)
        setFetch(false)
        setLoading(false)
        setInit(false)
        return
      }

      const _data = data[0]
      console.log('First item in data array:', _data)
      if (!_data) {
        console.log('No _data object')
        setRows([])
        setRowCount(0)
        setTotalRecords(0)
        setFetch(false)
        setLoading(false)
        setInit(false)
        return
      }
      
      if (!_data.resultData || !Array.isArray(_data.resultData)) {
        console.log('No resultData array')
        setRows([])
        setRowCount(0)
        setTotalRecords(0)
        setFetch(false)
        setLoading(false)
        setInit(false)
        return
      }
      
      let _totalRecords = 0
      if (_data.pageInfo) {
        if (Array.isArray(_data.pageInfo) && _data.pageInfo.length > 0) {
          _totalRecords = _data.pageInfo[0].totalRecords || 0
        } else if (typeof _data.pageInfo === 'object') {
          _totalRecords = _data.pageInfo.totalRecords || 0
        }
      }
      
      if (_totalRecords === 0) {
        _totalRecords = _data.resultData.length
      }
      
      console.log('Total records:', _totalRecords, 'Result data:', _data.resultData)

      let _rows = []
      if (env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) {
        _rows = _page === 1 ? _data.resultData : [...rows, ..._data.resultData]
      } else {
        _rows = _data.resultData
      }

      console.log('Setting rows:', _rows)
      setRows(_rows)
      setRowCount((_page - 1) * env.CARS_PAGE_SIZE + _rows.length)
      setTotalRecords(_totalRecords)
      setFetch(_rows.length > 0)

      if (((env.PAGINATION_MODE === Const.PAGINATION_MODE.INFINITE_SCROLL || env.isMobile) && _page === 1) || (env.PAGINATION_MODE === Const.PAGINATION_MODE.CLASSIC && !env.isMobile)) {
        window.scrollTo(0, 0)
      }

      if (onLoad) {
        onLoad({ rows: _data.resultData, rowCount: _totalRecords })
      }
    } catch (err) {
      if (err && (err as any).code === 'ERR_NETWORK') {
        setNetworkError(true)
      }
      console.error('Error in fetchData:', err)
      helper.error(err)
      
      setLoading(false)
      setInit(false)
    } finally {
      setLoading(false)
      setInit(false)
    }
  }

  useEffect(() => {
    if (suppliers) {
      if (suppliers.length > 0) {
        fetchData(page, suppliers, pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
      } else {
        fetchData(page, [], pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
      }
    } else if (pickupLocation) {
      fetchData(page, [], pickupLocation, carSpecs, _carType, gearbox, mileage, fuelPolicy, deposit, ranges, multimedia, rating, seats)
    } else {
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
                  hidePrice={hidePrice}
                  hideCompany={hideSupplier}
                  days={bookcarsHelper.days(from, to)}
                  language={UserService.getLanguage()}
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
