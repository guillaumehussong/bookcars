import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button } from '@mui/material'
import { Tune as FiltersIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/search'
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
// import * as UserService from '@/services/UserService'
import Layout from '@/components/Layout'
import NoMatch from './NoMatch'
import CarFilter from '@/components/CarFilter'
import CarSpecsFilter from '@/components/CarSpecsFilter'
import SupplierFilter from '@/components/SupplierFilter'
import CarType from '@/components/CarTypeFilter'
import GearboxFilter from '@/components/GearboxFilter'
import MileageFilter from '@/components/MileageFilter'
import FuelPolicyFilter from '@/components/FuelPolicyFilter'
import DepositFilter from '@/components/DepositFilter'
import CarList from '@/components/CarList'
import CarRatingFilter from '@/components/CarRatingFilter'
import CarRangeFilter from '@/components/CarRangeFilter'
import CarMultimediaFilter from '@/components/CarMultimediaFilter'
import CarSeatsFilter from '@/components/CarSeatsFilter'
import Map from '@/components/Map'
// import Progress from '@/components/Progress'
import ViewOnMapButton from '@/components/ViewOnMapButton'
import MapDialog from '@/components/MapDialog'

import '@/assets/css/search.css'
import '../types/additional-types' // Importer les types additionnels

const Search = () => {
  const location = useLocation()

  const [visible, setVisible] = useState(false)
  const [noMatch, setNoMatch] = useState(false)
  const [pickupLocation, setPickupLocation] = useState<bookcarsTypes.Location>()
  const [dropOffLocation, setDropOffLocation] = useState<bookcarsTypes.Location>()
  const [pickupLocationCoords, setPickupLocationCoords] = useState<{ latitude: number, longitude: number }>()
  const [from, setFrom] = useState<Date>()
  const [to, setTo] = useState<Date>()
  const [allSuppliers, setAllSuppliers] = useState<bookcarsTypes.User[]>([])
  const [allSuppliersIds, setAllSuppliersIds] = useState<string[]>([])
  const [suppliers, setSuppliers] = useState<bookcarsTypes.User[]>([])
  const [supplierIds, setSupplierIds] = useState<string[]>()
  const [loading, setLoading] = useState(true)
  const [carSpecs, setCarSpecs] = useState<bookcarsTypes.CarSpecs>({})
  const [carType, setCarType] = useState(bookcarsHelper.getAllCarTypes())
  const [gearbox, setGearbox] = useState([bookcarsTypes.GearboxType.Automatic, bookcarsTypes.GearboxType.Manual])
  const [mileage, setMileage] = useState([bookcarsTypes.Mileage.Limited, bookcarsTypes.Mileage.Unlimited])
  const [fuelPolicy, setFuelPolicy] = useState(bookcarsHelper.getAllFuelPolicies())
  const [deposit, setDeposit] = useState(-1)
  const [ranges, setRanges] = useState(bookcarsHelper.getAllRanges())
  const [multimedia, setMultimedia] = useState<bookcarsTypes.CarMultimedia[]>([])
  const [rating, setRating] = useState(-1)
  const [seats, setSeats] = useState(-1)
  const [openMapDialog, setOpenMapDialog] = useState(false)
  const [searchRadius, setSearchRadius] = useState(10) // Default search radius: 10km
  const [exactLocationOnly, setExactLocationOnly] = useState(false) // Default: include nearby locations
  const [showFilters, setShowFilters] = useState(false)
  const [networkError, setNetworkError] = useState(false)
  // const [loadingPage, setLoadingPage] = useState(true)

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        setNetworkError(false)
        const fetchedSuppliers = await SupplierService.getAllSuppliers()
        setAllSuppliers(fetchedSuppliers)
        const allIds = bookcarsHelper.flattenSuppliers(fetchedSuppliers)
        setAllSuppliersIds(allIds)
        // Définir tous les fournisseurs comme sélectionnés par défaut
        setSupplierIds(allIds)
      } catch (err) {
        console.error('Failed to fetch suppliers:', err)
        if ((err as any)?.code === 'ERR_NETWORK') {
          setNetworkError(true)
        }
        helper.error(err, 'Failed to fetch suppliers')
      }
    }

    fetchSuppliers()
  }, [])

  useEffect(() => {
    const updateSuppliers = async () => {
      if (pickupLocation) {
        const payload: bookcarsTypes.GetCarsPayload = {
          pickupLocation: pickupLocation._id,
          carSpecs,
          carType,
          gearbox,
          mileage,
          fuelPolicy,
          deposit,
          ranges,
          multimedia,
          rating,
          seats,
          days: bookcarsHelper.days(from, to),
          searchRadius,
          exactLocationOnly,
        }

        try {
          setNetworkError(false)
          console.log('Fetching suppliers with payload:', JSON.stringify(payload))
          
          // Méthode standard
          const frontendSuppliers = await SupplierService.getFrontendSuppliers(payload)
          console.log(`Retrieved ${frontendSuppliers.length} frontend suppliers`)
          
          if (frontendSuppliers.length > 0) {
            setSuppliers(frontendSuppliers)
            const ids = bookcarsHelper.flattenSuppliers(frontendSuppliers)
            setSupplierIds(ids.filter(id => id !== undefined) as string[])
          } else {
            // Si aucun fournisseur n'est trouvé, essayer de récupérer tous les fournisseurs
            console.log('No suppliers found, falling back to all suppliers')
            setSupplierIds(allSuppliersIds)
          }
          
          setLoading(false)
        } catch (err) {
          console.error('Failed to fetch suppliers:', err)
          if ((err as any)?.code === 'ERR_NETWORK') {
            setNetworkError(true)
          }
          // En cas d'erreur, utiliser tous les fournisseurs disponibles
          setSupplierIds(allSuppliersIds)
          setLoading(false)
        }
      }
    }

    if (from && to) {
      updateSuppliers()
    }
  }, [
    pickupLocation,
    pickupLocationCoords,
    carSpecs,
    carType,
    gearbox,
    mileage,
    fuelPolicy,
    deposit,
    ranges,
    multimedia,
    rating,
    seats,
    from,
    to,
    allSuppliersIds,
    searchRadius,
    exactLocationOnly,
  ])

  const handleCarFilterSubmit = async (filter: bookcarsTypes.CarFilter) => {
    if (suppliers.length < allSuppliers.length) {
      const _supplierIds = bookcarsHelper.clone(allSuppliersIds)
      setSupplierIds(_supplierIds)
    }

    setPickupLocation(filter.pickupLocation)
    setDropOffLocation(filter.dropOffLocation)
    // Extraire les coordonnées de filter si disponibles
    if (filter.pickupLocationCoords) {
      setPickupLocationCoords(filter.pickupLocationCoords)
    }
    setFrom(filter.from)
    setTo(filter.to)
  }

  const handleSupplierFilterChange = (newSuppliers: string[]) => {
    setSupplierIds(newSuppliers)
  }

  const handleRatingFilterChange = (value: number) => {
    setRating(value)
  }

  const handleRangeFilterChange = (value: bookcarsTypes.CarRange[]) => {
    setRanges(value)
  }

  const handleMultimediaFilterChange = (value: bookcarsTypes.CarMultimedia[]) => {
    setMultimedia(value)
  }

  const handleSeatsFilterChange = (value: number) => {
    setSeats(value)
  }

  const handleCarSpecsFilterChange = (value: bookcarsTypes.CarSpecs) => {
    setCarSpecs(value)
  }

  const handleCarTypeFilterChange = (values: bookcarsTypes.CarType[]) => {
    setCarType(values)
  }

  const handleGearboxFilterChange = (values: bookcarsTypes.GearboxType[]) => {
    setGearbox(values)
  }

  const handleMileageFilterChange = (values: bookcarsTypes.Mileage[]) => {
    setMileage(values)
  }

  const handleFuelPolicyFilterChange = (values: bookcarsTypes.FuelPolicy[]) => {
    setFuelPolicy(values)
  }

  const handleDepositFilterChange = (value: number) => {
    setDeposit(value)
  }

  const onLoad = async (user?: bookcarsTypes.User) => {
    const { state } = location
    if (!state) {
      setNoMatch(true)
      return
    }

    const { pickupLocationId } = state
    const { dropOffLocationId } = state
    const { pickupLocationCoords: _pickupLocationCoords } = state
    const { from: _from } = state
    const { to: _to } = state
    const { searchRadius: _searchRadius } = state
    const { exactLocationOnly: _exactLocationOnly } = state

    if (!pickupLocationId || !dropOffLocationId || !_from || !_to) {
      setLoading(false)
      setNoMatch(true)
      return
    }

    console.log(`Loading search with pickupLocationId: ${pickupLocationId}, dropOffLocationId: ${dropOffLocationId}`)
    
    // Set search parameters
    if (_searchRadius !== undefined) {
      setSearchRadius(_searchRadius)
    }
    
    if (_exactLocationOnly !== undefined) {
      setExactLocationOnly(_exactLocationOnly)
    }

    let _pickupLocation
    let _dropOffLocation
    try {
      _pickupLocation = await LocationService.getLocation(pickupLocationId)
      console.log('Retrieved pickup location:', _pickupLocation)

      if (!_pickupLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      if (dropOffLocationId !== pickupLocationId) {
        _dropOffLocation = await LocationService.getLocation(dropOffLocationId)
        console.log('Retrieved dropoff location:', _dropOffLocation)
      } else {
        _dropOffLocation = _pickupLocation
      }

      if (!_dropOffLocation) {
        setLoading(false)
        setNoMatch(true)
        return
      }

      // Stocker les coordonnées de l'emplacement de prise en charge
      if (_pickupLocationCoords) {
        setPickupLocationCoords(_pickupLocationCoords)
      }

      const payload: bookcarsTypes.GetCarsPayload = {
        pickupLocation: _pickupLocation._id,
        carSpecs,
        carType,
        gearbox,
        mileage,
        fuelPolicy,
        deposit,
        ranges,
        multimedia,
        rating,
        seats,
        days: bookcarsHelper.days(_from, _to),
      }

      try {
        const _suppliers = await SupplierService.getFrontendSuppliers(payload)
        const _supplierIds = bookcarsHelper.flattenSuppliers(_suppliers)

        setPickupLocation(_pickupLocation)
        setDropOffLocation(_dropOffLocation)
        setFrom(_from)
        setTo(_to)
        setSuppliers(_suppliers)
        setSupplierIds(_supplierIds)

        const { ranges: _ranges } = state
        if (_ranges) {
          setRanges(_ranges)
        }

        setLoading(false)
        if (!user || (user && user.verified)) {
          setVisible(true)
        }
      } catch (error) {
        console.error('Error fetching frontend suppliers:', error)
        // Utiliser tous les fournisseurs disponibles comme fallback
        setPickupLocation(_pickupLocation)
        setDropOffLocation(_dropOffLocation)
        setFrom(_from)
        setTo(_to)
        setSupplierIds(allSuppliersIds)
        
        setLoading(false)
        if (!user || (user && user.verified)) {
          setVisible(true)
        }
      }
    } catch (err) {
      console.error('Error in onLoad:', err)
      setLoading(false)
      // Même en cas d'erreur, essayer d'afficher l'interface si possible
      if (allSuppliersIds.length > 0) {
        setSupplierIds(allSuppliersIds)
        if (!user || (user && user.verified)) {
          setVisible(true)
        }
      } else {
        helper.error(err)
      }
    }
  }

  return (
    <>
      <Layout onLoad={onLoad} strict={false}>
        {visible && supplierIds && pickupLocation && dropOffLocation && from && to && (
          <div className="search">          
            <div className="col-1">
              {!loading && (
                <>
                  {((pickupLocation.latitude && pickupLocation.longitude)
                    || (pickupLocation.parkingSpots && pickupLocation.parkingSpots.length > 0)) && (
                      <Map
                        position={[pickupLocation.latitude || 36.191113, pickupLocation.longitude || 44.009167]}
                        initialZoom={pickupLocation.latitude && pickupLocation.longitude ? 10 : 2.5}
                        locations={[pickupLocation]}
                        parkingSpots={pickupLocation.parkingSpots}
                        className="map"
                      >
                        <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
                      </Map>
                    )}

                  <CarFilter
                    className="filter"
                    pickupLocation={pickupLocation}
                    dropOffLocation={dropOffLocation}
                    from={from}
                    to={to}
                    collapse
                    onSubmit={handleCarFilterSubmit}
                  />

                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<FiltersIcon />}
                    disableElevation
                    fullWidth
                    className="btn btn-filters"
                    onClick={() => setShowFilters((prev) => !prev)}
                  >
                    {showFilters ? strings.HIDE_FILTERS : strings.SHOW_FILTERS}
                  </Button>

                  {
                    showFilters && (
                      <>
                        <SupplierFilter className="filter" suppliers={suppliers} onChange={handleSupplierFilterChange} />
                        <CarRatingFilter className="filter" onChange={handleRatingFilterChange} />
                        <CarRangeFilter className="filter" onChange={handleRangeFilterChange} />
                        <CarMultimediaFilter className="filter" onChange={handleMultimediaFilterChange} />
                        <CarSeatsFilter className="filter" onChange={handleSeatsFilterChange} />
                        <CarSpecsFilter className="filter" onChange={handleCarSpecsFilterChange} />
                        <CarType className="filter" onChange={handleCarTypeFilterChange} />
                        <GearboxFilter className="filter" onChange={handleGearboxFilterChange} />
                        <MileageFilter className="filter" onChange={handleMileageFilterChange} />
                        <FuelPolicyFilter className="filter" onChange={handleFuelPolicyFilterChange} />
                        <DepositFilter className="filter" onChange={handleDepositFilterChange} />
                      </>
                    )
                  }
                </>
              )}
            </div>
            <div className="col-2">
              <CarList
                carSpecs={carSpecs}
                suppliers={supplierIds || []}
                carType={carType}
                gearbox={gearbox}
                mileage={mileage}
                fuelPolicy={fuelPolicy}
                deposit={deposit}
                pickupLocation={pickupLocation._id}
                dropOffLocation={dropOffLocation._id}
                pickupLocationName={pickupLocation.name}
                loading={loading}
                from={from}
                to={to}
                ranges={ranges}
                multimedia={multimedia}
                rating={rating}
                seats={seats}
                searchRadius={searchRadius}
                exactLocationOnly={exactLocationOnly}
                hideSupplier={env.HIDE_SUPPLIERS}
                includeComingSoonCars
              />
            </div>
          </div>
        )}

        <MapDialog
          pickupLocation={pickupLocation}
          openMapDialog={openMapDialog}
          onClose={() => setOpenMapDialog(false)}
        />

        {noMatch && <NoMatch hideHeader />}
      </Layout>
    </>
  )
}

export default Search
