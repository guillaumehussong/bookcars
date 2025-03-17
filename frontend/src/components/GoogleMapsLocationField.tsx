import React, { useState, useEffect, useRef } from 'react'
import { TextField, CircularProgress, Paper, List, ListItem, ListItemText, InputAdornment, IconButton, Typography, Divider } from '@mui/material'
import { LocationOn, Clear, MyLocation } from '@mui/icons-material'
import { v4 as uuidv4 } from 'uuid'
import { strings as commonStrings } from '@/lang/common'
import * as bookcarsTypes from ':bookcars-types'
import env from '@/config/env.config'
import * as LocationService from '@/services/LocationService'

// Position approximative du centre du Salvador
const SALVADOR_CENTER = { lat: 13.7942, lng: -88.8965 }
const SALVADOR_BOUNDS = {
  north: 14.4505, // Limite nord du Salvador
  south: 13.1526, // Limite sud
  west: -90.1282, // Limite ouest
  east: -87.6839, // Limite est
}

interface GoogleMapsLocationFieldProps {
  label: string
  required?: boolean
  value?: bookcarsTypes.LocationWithCoordinates | null
  onChange: (location: bookcarsTypes.LocationWithCoordinates | null) => void
  variant?: 'outlined' | 'standard' | 'filled'
  error?: boolean
  helperText?: string
  useCurrentLocation?: boolean
  className?: string
}

declare global {
  interface Window {
    google: any
    initGoogleMapsAutocomplete: () => void
    googleMapsLoaded: boolean
  }
}

// Génère un ID compatible avec MongoDB (24 caractères hexadécimaux)
const generateMongoId = (): string => {
  // Utilise une partie d'un UUID (sans les tirets) et s'assure que ça fait 24 caractères
  return uuidv4().replace(/-/g, '').substring(0, 24);
}

const GoogleMapsLocationField = ({
  label,
  required = false,
  value,
  onChange,
  variant = 'outlined',
  error = false,
  helperText = '',
  useCurrentLocation = true,
  className = '',
}: GoogleMapsLocationFieldProps) => {
  const [loading, setLoading] = useState(false)
  const [gettingCurrentLocation, setGettingCurrentLocation] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [predictions, setPredictions] = useState<any[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const [recentLocations, setRecentLocations] = useState<bookcarsTypes.LocationWithCoordinates[]>([])
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)
  const geocoderService = useRef<any>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const scriptRef = useRef<HTMLScriptElement | null>(null)

  useEffect(() => {
    // Fonction d'initialisation appelée par le callback Google Maps
    window.initGoogleMapsAutocomplete = () => {
      window.googleMapsLoaded = true;
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      placesService.current = new window.google.maps.places.PlacesService(document.createElement('div'))
      geocoderService.current = new window.google.maps.Geocoder()
    }

    // Vérifier si Google Maps est déjà chargé
    if (window.google && window.google.maps && window.google.maps.places) {
      window.initGoogleMapsAutocomplete();
    } else if (!window.googleMapsLoaded && !document.getElementById('google-maps-script')) {
      // Charge le script Google Maps seulement s'il n'est pas déjà chargé
      const googleMapsScript = document.createElement('script')
      googleMapsScript.id = 'google-maps-script'
      googleMapsScript.src = `https://maps.googleapis.com/maps/api/js?key=${env.GOOGLE_MAPS_API_KEY}&libraries=places&callback=initGoogleMapsAutocomplete`
      googleMapsScript.async = true
      googleMapsScript.defer = true
      document.head.appendChild(googleMapsScript)
      scriptRef.current = googleMapsScript
    }

    // Charger les emplacements récents depuis le localStorage
    try {
      const savedLocations = localStorage.getItem('recentLocations')
      if (savedLocations) {
        const parsedLocations = JSON.parse(savedLocations)
        setRecentLocations(parsedLocations.slice(0, 3)) // Garder seulement les 3 plus récents
      }
    } catch (error) {
      console.error('Error loading recent locations:', error)
    }

    return () => {
      // Ne pas supprimer le script pour éviter de le recharger à chaque fois
      // Nettoyer la fonction global, mais ne pas utiliser delete
      if (window.initGoogleMapsAutocomplete) {
        window.initGoogleMapsAutocomplete = () => { /* no-op */ }
      }
    }
  }, [])

  useEffect(() => {
    // Met à jour le champ de texte lorsque la valeur change
    if (value) {
      setInputValue(value.name || '')
    } else {
      setInputValue('')
    }
  }, [value])

  // Fonction pour sauvegarder un emplacement récent
  const saveRecentLocation = (location: bookcarsTypes.LocationWithCoordinates) => {
    try {
      // Vérifier si l'emplacement existe déjà dans les emplacements récents
      const existingLocationIndex = recentLocations.findIndex(loc => loc._id === location._id)
      
      let updatedLocations: bookcarsTypes.LocationWithCoordinates[]
      
      if (existingLocationIndex >= 0) {
        // Si l'emplacement existe déjà, le mettre à jour
        const updatedLocation = {
          ...recentLocations[existingLocationIndex],
          ...location,
          // Préserver l'ID Google Maps s'il existe déjà
          googleMapsId: location.googleMapsId || recentLocations[existingLocationIndex].googleMapsId
        }
        
        updatedLocations = [...recentLocations]
        updatedLocations[existingLocationIndex] = updatedLocation
      } else {
        // Sinon, l'ajouter au début de la liste
        updatedLocations = [location, ...recentLocations].slice(0, 3)
      }
      
      setRecentLocations(updatedLocations)
      localStorage.setItem('recentLocations', JSON.stringify(updatedLocations))
      
      // Ajouter également l'emplacement au cache du service
      // Utiliser l'ID Google Maps existant s'il est disponible
      LocationService.cacheLocation(location, location.googleMapsId)
      
      console.log(`Saved recent location: ${location._id}, name: ${location.name}, Google Maps ID: ${location.googleMapsId || 'N/A'}`)
    } catch (error) {
      console.error('Error saving recent location:', error)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    if (newValue.length > 2 && autocompleteService.current) {
      setLoading(true)
      autocompleteService.current.getPlacePredictions(
        {
          input: newValue,
          componentRestrictions: { country: 'sv' }, // 'sv' est le code du Salvador
          bounds: new window.google.maps.LatLngBounds(
            { lat: SALVADOR_BOUNDS.south, lng: SALVADOR_BOUNDS.west },
            { lat: SALVADOR_BOUNDS.north, lng: SALVADOR_BOUNDS.east }
          ),
          types: ['geocode', 'establishment']
        },
        (predictions: any[], status: string) => {
          setLoading(false)
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setPredictions(predictions)
            setShowPredictions(true)
          } else {
            setPredictions([])
            setShowPredictions(false)
          }
        }
      )
    } else {
      setPredictions([])
      setShowPredictions(false)
    }

    // Si la valeur est vide, réinitialiser
    if (!newValue) {
      onChange(null)
    }
  }

  const handlePredictionClick = (prediction: any) => {
    setLoading(true)
    placesService.current.getDetails(
      {
        placeId: prediction.place_id,
        fields: ['name', 'geometry', 'formatted_address']
      },
      (place: any, status: string) => {
        setLoading(false)
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          // Générer un ID compatible avec MongoDB au lieu d'utiliser place_id
          const generatedId = generateMongoId();
          
          const newLocation: bookcarsTypes.LocationWithCoordinates = {
            _id: generatedId,
            name: place.name,
            latitude: place.geometry.location.lat(),
            longitude: place.geometry.location.lng(),
            googleMapsId: prediction.place_id
          }
          
          console.log(`Created new location with MongoDB ID: ${generatedId}, Google Maps ID: ${prediction.place_id}`);
          
          // Enregistrer dans le cache pour future utilisation, en incluant l'ID Google Maps
          LocationService.cacheLocation(newLocation, prediction.place_id)
          
          setInputValue(place.name)
          onChange(newLocation)
          saveRecentLocation(newLocation)
          setShowPredictions(false)
        } else {
          console.error('Error getting place details:', status);
          // Créer un emplacement même en cas d'erreur
          const generatedId = generateMongoId();
          const fallbackLocation: bookcarsTypes.LocationWithCoordinates = {
            _id: generatedId,
            name: prediction.description || 'Selected location',
            latitude: 0,
            longitude: 0,
            googleMapsId: prediction.place_id
          }
          
          console.log(`Created fallback location with MongoDB ID: ${generatedId}, Google Maps ID: ${prediction.place_id}`);
          LocationService.cacheLocation(fallbackLocation, prediction.place_id)
          
          setInputValue(fallbackLocation.name || '')
          onChange(fallbackLocation)
          saveRecentLocation(fallbackLocation)
          setShowPredictions(false)
        }
      }
    )
  }

  const handleRecentLocationClick = (location: bookcarsTypes.LocationWithCoordinates) => {
    setInputValue(location.name || '')
    onChange(location)
    setShowPredictions(false)
  }

  const handleClear = () => {
    setInputValue('')
    setPredictions([])
    setShowPredictions(false)
    onChange(null)
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation && geocoderService.current) {
      setGettingCurrentLocation(true)
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          
          // Utiliser le Geocoder pour obtenir l'adresse à partir des coordonnées
          geocoderService.current.geocode(
            { location: { lat: latitude, lng: longitude } },
            (results: any[], status: string) => {
              setGettingCurrentLocation(false)
              if (status === 'OK' && results[0]) {
                const place = results[0]
                
                // Générer un ID compatible avec MongoDB au lieu d'utiliser place_id
                const generatedId = generateMongoId();
                
                const newLocation: bookcarsTypes.LocationWithCoordinates = {
                  _id: generatedId,
                  name: place.formatted_address.split(',')[0], // Premier élément de l'adresse
                  latitude,
                  longitude,
                  googleMapsId: place.place_id
                }
                
                console.log(`Created new location from current position with MongoDB ID: ${generatedId}, Google Maps ID: ${place.place_id || 'N/A'}`);
                
                // Enregistrer dans le cache pour future utilisation, en incluant l'ID Google Maps si disponible
                LocationService.cacheLocation(newLocation, place.place_id)
                
                setInputValue(newLocation.name || '')
                onChange(newLocation)
                saveRecentLocation(newLocation)
              } else {
                console.error('Geocoder failed due to:', status)
                // Créer un emplacement même en cas d'erreur
                const generatedId = generateMongoId();
                const fallbackLocation: bookcarsTypes.LocationWithCoordinates = {
                  _id: generatedId,
                  name: 'Current location',
                  latitude,
                  longitude
                }
                
                console.log(`Created fallback location from current position with MongoDB ID: ${generatedId}`);
                LocationService.cacheLocation(fallbackLocation)
                
                setInputValue(fallbackLocation.name || '')
                onChange(fallbackLocation)
                saveRecentLocation(fallbackLocation)
              }
            }
          )
        },
        (error) => {
          setGettingCurrentLocation(false)
          console.error('Error getting current location:', error)
          // Informer l'utilisateur de l'erreur
          alert(commonStrings.LOCATION_ERROR)
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      )
    }
  }

  return (
    <div style={{ position: 'relative', width: '100%' }} className={className}>
      <TextField
        inputRef={inputRef}
        label={label}
        required={required}
        fullWidth
        variant={variant}
        value={inputValue}
        onChange={handleInputChange}
        error={error}
        helperText={helperText}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <LocationOn />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              {loading || gettingCurrentLocation ? (
                <CircularProgress size={20} />
              ) : (
                <>
                  {useCurrentLocation && (
                    <IconButton onClick={handleGetCurrentLocation} size="small" title={commonStrings.CURRENT_LOCATION}>
                      <MyLocation />
                    </IconButton>
                  )}
                  {inputValue && (
                    <IconButton onClick={handleClear} size="small" title={commonStrings.CLEAR}>
                      <Clear />
                    </IconButton>
                  )}
                </>
              )}
            </InputAdornment>
          )
        }}
        onBlur={() => {
          // Petit délai pour permettre la sélection d'un élément avant de fermer
          setTimeout(() => setShowPredictions(false), 150)
        }}
        onFocus={() => {
          if ((predictions.length > 0 || recentLocations.length > 0) && inputValue.length > 0) {
            setShowPredictions(true)
          }
        }}
        onClick={() => {
          if ((predictions.length > 0 || recentLocations.length > 0) && inputValue.length > 0) {
            setShowPredictions(true)
          } else if (recentLocations.length > 0 && inputValue.length === 0) {
            setShowPredictions(true)
          }
        }}
      />
      {showPredictions && (predictions.length > 0 || recentLocations.length > 0) && (
        <Paper 
          elevation={3} 
          style={{ 
            position: 'absolute', 
            width: '100%', 
            zIndex: 1000,
            maxHeight: '300px',
            overflow: 'auto'
          }}
        >
          <List>
            {/* Emplacements récents */}
            {recentLocations.length > 0 && (
              <>
                <ListItem>
                  <Typography variant="subtitle2" color="textSecondary">
                    {commonStrings.RECENT_LOCATIONS}
                  </Typography>
                </ListItem>
                {recentLocations.map((location) => (
                  <ListItem 
                    key={location._id}
                    onClick={() => handleRecentLocationClick(location)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText primary={location.name} />
                  </ListItem>
                ))}
                {predictions.length > 0 && <Divider />}
              </>
            )}
            
            {/* Prédictions de l'autocomplétion */}
            {predictions.length > 0 && (
              <>
                {recentLocations.length > 0 && (
                  <ListItem>
                    <Typography variant="subtitle2" color="textSecondary">
                      {commonStrings.SUGGESTIONS}
                    </Typography>
                  </ListItem>
                )}
                {predictions.map((prediction) => (
                  <ListItem 
                    key={prediction.place_id}
                    onClick={() => handlePredictionClick(prediction)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <ListItemText primary={prediction.description} />
                  </ListItem>
                ))}
              </>
            )}
          </List>
        </Paper>
      )}
    </div>
  )
}

export default GoogleMapsLocationField 