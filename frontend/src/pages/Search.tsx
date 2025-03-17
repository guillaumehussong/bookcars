import React, { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Button, Alert, Skeleton } from '@mui/material'
import { Tune as FiltersIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import * as bookcarsHelper from ':bookcars-helper'
import { strings } from '@/lang/search'
import * as helper from '@/common/helper'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'
import * as SupplierService from '@/services/SupplierService'
import * as GoogleMapsService from '@/services/GoogleMapsService'
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
import SuppliersMap from '@/components/SuppliersMap'
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
  const [suppliers, setSuppliers] = useState<bookcarsTypes.SortedSupplier[]>([]) // Modifier pour SortedSupplier
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

        // Ajouter les coordonnées GPS si disponibles
        if (pickupLocationCoords) {
          payload.pickupCoordinates = pickupLocationCoords
          console.log('Using provided pickup location coordinates:', pickupLocationCoords)
        }

        try {
          setNetworkError(false)
          console.log('Fetching suppliers with payload:', JSON.stringify(payload))
          
          // Essayer d'abord de récupérer les fournisseurs triés par distance
          if (pickupLocationCoords) {
            try {
              const sortedSuppliers = await GoogleMapsService.getSortedSuppliersByDistance(
                { ...pickupLocation, ...pickupLocationCoords } as bookcarsTypes.LocationWithCoordinates,
                payload
              )
              console.log(`Retrieved ${sortedSuppliers.length} suppliers sorted by distance`)
              setSuppliers(sortedSuppliers)
              const sortedIds = sortedSuppliers.map(s => s._id).filter((id): id is string => id !== undefined)
              setSupplierIds(sortedIds)
              setLoading(false)
              return
            } catch (sortError) {
              console.error('Failed to get sorted suppliers by distance:', sortError)
              // Continuer avec la méthode standard si la méthode par distance échoue
            }
          }
          
          // Méthode standard si pas de coordonnées ou si la méthode par distance a échoué
          const frontendSuppliers = await SupplierService.getFrontendSuppliers(payload)
          console.log(`Retrieved ${frontendSuppliers.length} frontend suppliers`)
          
          if (frontendSuppliers.length > 0) {
            // Convertir les fournisseurs en SortedSupplier
            const suppliersWithDistance = frontendSuppliers.map(supplier => ({
              ...supplier,
              distance: 0 // Distance par défaut
            })) as bookcarsTypes.SortedSupplier[]
            
            setSuppliers(suppliersWithDistance)
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

    updateSuppliers()
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
    console.log('Pickup location coordinates from state:', _pickupLocationCoords)
    
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
        console.log('Using provided pickup location coordinates:', _pickupLocationCoords)
      } else if (_pickupLocation.latitude && _pickupLocation.longitude) {
        setPickupLocationCoords({
          latitude: _pickupLocation.latitude,
          longitude: _pickupLocation.longitude
        })
        console.log('Using pickup location coordinates from location object:', {
          latitude: _pickupLocation.latitude,
          longitude: _pickupLocation.longitude
        })
      } else if ((_pickupLocation as any).googleMapsId) {
        // Si nous avons un ID Google Maps, essayer de géocoder l'adresse
        console.log(`Attempting to geocode location with Google Maps ID: ${(_pickupLocation as any).googleMapsId}`)
        try {
          const coords = await GoogleMapsService.geocodeAddress(_pickupLocation.name || '')
          if (coords) {
            setPickupLocationCoords(coords)
            console.log('Successfully geocoded location to:', coords)
          } else {
            console.warn(`Failed to geocode location: ${_pickupLocation.name}`)
          }
        } catch (error) {
          console.error('Error geocoding location:', error)
        }
      } else {
        // Si nous n'avons pas de coordonnées, essayer de géocoder l'adresse par le nom
        console.log(`No coordinates available for pickup location, trying to geocode by name: ${_pickupLocation.name}`)
        try {
          if (_pickupLocation.name) {
            const coords = await GoogleMapsService.geocodeAddress(_pickupLocation.name)
            if (coords) {
              setPickupLocationCoords(coords)
              console.log('Successfully geocoded location by name to:', coords)
            } else {
              console.warn(`Failed to geocode location by name: ${_pickupLocation.name}`)
            }
          }
        } catch (error) {
          console.error('Error geocoding location by name:', error)
        }
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

      let sortedSuppliers: bookcarsTypes.SortedSupplier[] = []
      let _supplierIds: string[] = []
      
      try {
        // Trier les fournisseurs par proximité si les coordonnées sont disponibles
        if (pickupLocationCoords || (_pickupLocation.latitude && _pickupLocation.longitude)) {
          const locationCoords = pickupLocationCoords || {
            latitude: _pickupLocation.latitude!,
            longitude: _pickupLocation.longitude!
          }
          
          const locationWithCoords: bookcarsTypes.LocationWithCoordinates = {
            _id: _pickupLocation._id,
            name: _pickupLocation.name || '',
            ...locationCoords
          }
          
          console.log('Sorting suppliers by distance from location:', locationWithCoords)
          
          try {
            sortedSuppliers = await GoogleMapsService.getSortedSuppliersByDistance(locationWithCoords, payload)
            
            // Afficher les distances pour le débogage
            sortedSuppliers.forEach(supplier => {
              console.log(`Supplier ${supplier.fullName}: ${supplier.distance.toFixed(2)} km`)
            })
          } catch (error) {
            console.error('Error sorting suppliers by distance:', error)
            try {
              const _suppliers = await SupplierService.getFrontendSuppliers(payload)
              const suppliersWithDistance = _suppliers.map(supplier => ({
                ...supplier,
                distance: 0
              })) as bookcarsTypes.SortedSupplier[]
              sortedSuppliers = suppliersWithDistance
            } catch (supplierError) {
              console.error('Error fetching frontend suppliers:', supplierError)
              // Utiliser tous les fournisseurs disponibles comme fallback
              if (allSuppliers.length > 0) {
                sortedSuppliers = allSuppliers.map(supplier => ({
                  ...supplier,
                  distance: 0
                })) as bookcarsTypes.SortedSupplier[]
              }
            }
          }
        } else {
          try {
            const _suppliers = await SupplierService.getFrontendSuppliers(payload)
            const suppliersWithDistance = _suppliers.map(supplier => ({
              ...supplier,
              distance: 0
            })) as bookcarsTypes.SortedSupplier[]
            sortedSuppliers = suppliersWithDistance
          } catch (error) {
            console.error('Error fetching frontend suppliers:', error)
            // Utiliser tous les fournisseurs disponibles comme fallback
            if (allSuppliers.length > 0) {
              sortedSuppliers = allSuppliers.map(supplier => ({
                ...supplier,
                distance: 0
              })) as bookcarsTypes.SortedSupplier[]
            }
          }
        }
        
        // Si nous avons des fournisseurs triés, utiliser leurs IDs
        if (sortedSuppliers.length > 0) {
          _supplierIds = bookcarsHelper.flattenSuppliers(sortedSuppliers)
        } else if (allSuppliersIds.length > 0) {
          // Sinon, utiliser tous les fournisseurs disponibles
          _supplierIds = [...allSuppliersIds]
          console.log('Using all available suppliers as fallback:', _supplierIds)
        }
      } catch (error) {
        console.error('Error processing suppliers:', error)
        // Utiliser tous les fournisseurs disponibles comme fallback ultime
        if (allSuppliersIds.length > 0) {
          _supplierIds = [...allSuppliersIds]
          console.log('Using all available suppliers as ultimate fallback:', _supplierIds)
        }
      }

      setPickupLocation(_pickupLocation)
      setDropOffLocation(_dropOffLocation)
      setFrom(_from)
      setTo(_to)
      setSuppliers(sortedSuppliers)
      setSupplierIds(_supplierIds)

      const { ranges: _ranges } = state
      if (_ranges) {
        setRanges(_ranges)
      }

      setLoading(false)
      if (!user || (user && user.verified)) {
        setVisible(true)
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
            {networkError && (
              <Alert severity="error" className="network-error" sx={{ marginBottom: 2, width: '100%' }}>
                {strings.NETWORK_ERROR}
              </Alert>
            )}
            
            <div className="col-1">
              {!loading && (
                <>
                  {pickupLocationCoords && (
                    <div className="map-container">
                      <SuppliersMap
                        title={strings.SUPPLIERS_MAP}
                        userLocation={[pickupLocationCoords.latitude, pickupLocationCoords.longitude]}
                        suppliers={suppliers}
                        initialZoom={10}
                        className="map full-height"
                        onSelectSupplier={(locationId) => {
                          console.log('Selected supplier location:', locationId)
                        }}
                      />
                      <ViewOnMapButton onClick={() => setOpenMapDialog(true)} />
                    </div>
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
                      <div className="filters-container">
                        {!env.HIDE_SUPPLIERS && <SupplierFilter className="filter" suppliers={suppliers} onChange={handleSupplierFilterChange} />}
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
                      </div>
                    )
                  }
                </>
              )}
            </div>
            <div className="col-2">
              {pickupLocation.name && searchRadius && searchRadius > 0 && !exactLocationOnly && (
                <Alert severity="info" className="search-radius-info">
                  {`${strings.SEARCHING_WITHIN} ${searchRadius} ${strings.KM_AROUND} ${pickupLocation.name}`}
                </Alert>
              )}
              
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
                supplierDistances={suppliers.reduce((acc, supplier) => {
                  if (supplier.distance !== undefined && supplier._id) {
                    acc[supplier._id.toString()] = supplier.distance
                  }
                  return acc
                }, {} as Record<string, number>)}
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
