import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'
import * as GoogleMapsService from './GoogleMapsService'
import { v4 as uuidv4 } from 'uuid'

// Cache local pour stocker les emplacements créés par l'utilisateur avec GoogleMaps
const locationCache: Record<string, bookcarsTypes.Location> = {}
// Cache pour mapper les IDs Google Maps vers les IDs MongoDB
const googleMapsToMongoIdMap: Record<string, string> = {}

/**
 * Vérifie si un ID ressemble à un ID Google Maps (plus de 24 caractères)
 */
const isGoogleMapsId = (id: string): boolean => {
  return id.length > 24
}

/**
 * Vérifie si un ID ressemble à un ID MongoDB (24 caractères hexadécimaux)
 */
const isMongoId = (id: string): boolean => {
  return id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Génère un ID compatible avec MongoDB (24 caractères hexadécimaux)
 */
const generateMongoId = (): string => {
  // Utilise une partie d'un UUID (sans les tirets) et s'assure que ça fait 24 caractères
  return uuidv4().replace(/-/g, '').substring(0, 24);
}

/**
 * Charge les emplacements en cache depuis le localStorage
 */
const loadCachedLocations = (): void => {
  try {
    const allKeys = Object.keys(localStorage)
    let count = 0
    
    for (const key of allKeys) {
      if (key.startsWith('location_')) {
        try {
          const locationId = key.replace('location_', '')
          const locationData = localStorage.getItem(key)
          
          if (locationData) {
            const location = JSON.parse(locationData)
            locationCache[locationId] = location
            
            // Si l'emplacement a un ID Google Maps, créer un mapping
            if (location.googleMapsId) {
              googleMapsToMongoIdMap[location.googleMapsId] = locationId
            }
            
            count++
          }
        } catch (e) {
          console.error('Error loading cached location:', e)
        }
      }
    }
    
    console.log(`Loaded ${count} cached locations from localStorage`)
  } catch (e) {
    console.error('Error loading cached locations:', e)
  }
}

// Charger les emplacements en cache au démarrage
loadCachedLocations()

/**
 * Get locations.
 *
 * @param {string} keyword
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Location>>}
 */
export const getLocations = (keyword: string, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Location>> =>
  axiosInstance
    .get(
      `/api/locations/${page}/${size}/${UserService.getLanguage()}/?s=${encodeURIComponent(keyword)}`
    )
    .then((res) => res.data)
    .catch(error => {
      console.error('Error fetching locations:', error)
      return { resultData: [], pageInfo: { totalRecords: 0 } }
    })

/**
 * Get locations with position.
 *
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Location>>}
 */
export const getLocationsWithPosition = (): Promise<bookcarsTypes.Location[]> =>
  axiosInstance
    .get(
      `/api/locations-with-position/${UserService.getLanguage()}`
    )
    .then((res) => res.data)
    .catch(error => {
      console.error('Error fetching locations with position:', error)
      return []
    })

/**
 * Convertit un ID Google Maps en ID MongoDB s'il existe dans le cache
 * 
 * @param {string} googleMapsId 
 * @returns {string|null} L'ID MongoDB correspondant ou null
 */
export const convertGoogleMapsIdToMongoId = (googleMapsId: string): string | null => {
  // Vérifier si nous avons déjà un mapping pour cet ID
  if (googleMapsToMongoIdMap[googleMapsId]) {
    return googleMapsToMongoIdMap[googleMapsId]
  }
  
  // Chercher dans le localStorage
  const allKeys = Object.keys(localStorage)
  for (const key of allKeys) {
    if (key.startsWith('location_')) {
      try {
        const location = JSON.parse(localStorage.getItem(key) || '{}')
        if (location.googleMapsId === googleMapsId) {
          return location._id
        }
      } catch (e) {
        // Ignorer les erreurs de parsing
      }
    }
  }
  
  return null
}

/**
 * Crée un nouvel emplacement à partir d'un ID Google Maps
 * 
 * @param {string} googleMapsId 
 * @param {string} name 
 * @returns {Promise<bookcarsTypes.Location>}
 */
export const createLocationFromGoogleMapsId = async (googleMapsId: string, name?: string): Promise<bookcarsTypes.Location> => {
  try {
    console.log(`Creating new location from Google Maps ID: ${googleMapsId}`)
    
    // Générer un ID MongoDB
    const mongoId = generateMongoId()
    
    // Si nous avons un nom, essayer de géocoder pour obtenir les coordonnées
    let latitude = 0
    let longitude = 0
    let locationName = name || 'Unknown location'
    
    if (name) {
      try {
        const coords = await GoogleMapsService.geocodeAddress(name)
        if (coords) {
          latitude = coords.latitude
          longitude = coords.longitude
        }
      } catch (error) {
        console.error('Error geocoding location name:', error)
      }
    }
    
    // Créer un nouvel emplacement
    const newLocation: bookcarsTypes.Location = {
      _id: mongoId,
      name: locationName,
      latitude,
      longitude,
      googleMapsId
    }
    
    // Mettre en cache
    cacheLocation(newLocation as bookcarsTypes.LocationWithCoordinates, googleMapsId)
    
    return newLocation
  } catch (error) {
    console.error('Error creating location from Google Maps ID:', error)
    throw error
  }
}

/**
 * Get a Location by ID.
 * If the location is not found in the database but is in the local cache,
 * return the cached location.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Location>}
 */
export const getLocation = async (id: string): Promise<bookcarsTypes.Location> => {
  try {
    // Si c'est un ID Google Maps, essayer de le convertir en ID MongoDB
    if (isGoogleMapsId(id)) {
      console.log(`Handling Google Maps ID: ${id}`)
      
      // Vérifier si nous avons déjà un mapping pour cet ID
      const mongoId = convertGoogleMapsIdToMongoId(id)
      if (mongoId) {
        console.log(`Converted Google Maps ID ${id} to MongoDB ID ${mongoId}`)
        id = mongoId
      } else {
        // Si on n'a pas de mapping, chercher dans le localStorage par googleMapsId
        const allKeys = Object.keys(localStorage)
        for (const key of allKeys) {
          if (key.startsWith('location_')) {
            try {
              const location = JSON.parse(localStorage.getItem(key) || '{}')
              if (location.googleMapsId === id) {
                console.log(`Found location in localStorage by Google Maps ID: ${id}`)
                return location
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
        
        // Si nous n'avons pas trouvé l'emplacement, en créer un nouveau
        console.log(`No cached location found for Google Maps ID: ${id}, creating a new one`)
        return await createLocationFromGoogleMapsId(id)
      }
    }
    
    // Vérifier si l'emplacement est en cache
    if (locationCache[id]) {
      console.log(`Found location in memory cache: ${id}`)
      return locationCache[id]
    }
    
    // Vérifier dans le localStorage
    const cachedLocation = localStorage.getItem(`location_${id}`)
    if (cachedLocation) {
      try {
        const location = JSON.parse(cachedLocation)
        locationCache[id] = location
        console.log(`Found location in localStorage: ${id}`)
        return location
      } catch (e) {
        console.error('Error parsing cached location:', e)
      }
    }
    
    // Sinon, essayer de le récupérer depuis l'API
    try {
      console.log(`Fetching location from API: ${id}`)
      const response = await axiosInstance.get(
        `/api/location/${encodeURIComponent(id)}/${UserService.getLanguage()}`
      )
      
      // Mettre en cache le résultat
      const location = response.data
      if (location) {
        locationCache[id] = location
        localStorage.setItem(`location_${id}`, JSON.stringify(location))
      }
      
      return location
    } catch (apiError) {
      console.error(`API error fetching location with ID ${id}:`, apiError)
      
      // Afficher plus d'informations sur l'erreur
      console.log('Error type:', typeof apiError)
      if (apiError && typeof apiError === 'object') {
        console.log('Error has message property:', 'message' in apiError)
        if ('message' in apiError) {
          console.log('Error message:', (apiError as any).message)
          console.log('Error message type:', typeof (apiError as any).message)
        }
      }
      
      // Si c'est une erreur de connexion, essayer de créer un emplacement temporaire
      // Vérifier si l'erreur est une erreur Axios avec un message "Network Error"
      if (apiError && 
          typeof apiError === 'object' && 
          'message' in apiError && 
          typeof (apiError as any).message === 'string' && 
          (apiError as any).message === 'Network Error') {
        console.log(`Network error, creating temporary location for ID: ${id}`)
        
        // Créer un emplacement temporaire avec l'ID fourni
        const tempLocation: bookcarsTypes.Location = {
          _id: id,
          name: `Location ${id.substring(0, 8)}...`,
        }
        
        // Mettre en cache
        locationCache[id] = tempLocation
        localStorage.setItem(`location_${id}`, JSON.stringify(tempLocation))
        
        return tempLocation
      }
      
      throw apiError
    }
  } catch (error) {
    console.error(`Error in getLocation for ID ${id}:`, error)
    
    // Si l'emplacement n'est pas trouvé dans la base de données, vérifier le cache local
    if (isMongoId(id)) {
      // Chercher dans le localStorage
      const cachedLocation = localStorage.getItem(`location_${id}`)
      if (cachedLocation) {
        try {
          const location = JSON.parse(cachedLocation)
          locationCache[id] = location
          console.log(`Recovered location from localStorage after error: ${id}`)
          return location
        } catch (e) {
          console.error('Error parsing cached location:', e)
        }
      }
    }
    
    // Créer un emplacement temporaire en dernier recours
    console.log(`Creating fallback temporary location for ID: ${id}`)
    const fallbackLocation: bookcarsTypes.Location = {
      _id: id,
      name: `Temporary Location (${id.substring(0, 6)}...)`,
    }
    
    // Mettre en cache
    locationCache[id] = fallbackLocation
    localStorage.setItem(`location_${id}`, JSON.stringify(fallbackLocation))
    
    return fallbackLocation
  }
}

/**
 * Store a temporary location in the local cache
 * 
 * @param {bookcarsTypes.LocationWithCoordinates} location 
 * @param {string} googleMapsId - Optional Google Maps ID to associate with this location
 */
export const cacheLocation = (location: bookcarsTypes.LocationWithCoordinates, googleMapsId?: string) => {
  if (!location || !location._id) return
  
  // Ajouter l'ID Google Maps si fourni
  const locationToCache = {
    ...location,
    googleMapsId: googleMapsId || location.googleMapsId
  }
  
  // Stocker dans le cache en mémoire
  locationCache[location._id] = locationToCache as bookcarsTypes.Location
  
  // Si nous avons un ID Google Maps, créer un mapping
  if (googleMapsId || locationToCache.googleMapsId) {
    const gmapsId = googleMapsId || locationToCache.googleMapsId
    if (gmapsId) {
      googleMapsToMongoIdMap[gmapsId] = location._id
      console.log(`Mapped Google Maps ID ${gmapsId} to MongoDB ID ${location._id}`)
    }
  }
  
  // Stocker dans localStorage pour persister entre les rechargements de page
  localStorage.setItem(`location_${location._id}`, JSON.stringify(locationToCache))
  console.log(`Cached location: ${location._id}, name: ${location.name}`)
}

/**
 * Get Loaction ID by name (en).
 *
 * @param {string} name
 * @param {string} language
 * @returns {Promise<{ status: number, data: string }>}
 */
export const getLocationId = (name: string, language: string): Promise<{ status: number, data: string }> =>
  axiosInstance
    .get(
      `/api/location-id/${encodeURIComponent(name)}/${language}`
    )
    .then((res) => ({ status: res.status, data: res.data }))
    .catch(error => {
      console.error('Error getting location ID:', error)
      return { status: 500, data: '' }
    })
