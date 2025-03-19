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
 * @param {number} latitude 
 * @param {number} longitude
 * @returns {Promise<bookcarsTypes.Location>}
 */
export const createLocationFromGoogleMapsId = async (
  googleMapsId: string, 
  name: string = 'Unknown location',
  latitude: number = 0,
  longitude: number = 0
): Promise<bookcarsTypes.Location> => {
  try {    
    // Call the API to create the location in the database
    const response = await axiosInstance.post('/api/create-location-from-google-maps', {
      googleMapsId,
      name,
      latitude,
      longitude
    });
    
    const newLocation = response.data;
    
    // Create a LocationWithCoordinates object to match expected interface
    const locationData: bookcarsTypes.LocationWithCoordinates = {
      _id: newLocation._id,
      name,
      latitude,
      longitude,
      googleMapsId
    };
    
    // Cache the location
    cacheLocation(locationData, googleMapsId);
    
    return locationData;
  } catch (error) {
    console.error('Error creating location from Google Maps ID:', error);
    
    // Fallback to creating a temporary location if the API call fails
    const mongoId = generateMongoId();
    
    const locationData: bookcarsTypes.LocationWithCoordinates = {
      _id: mongoId,
      name,
      latitude,
      longitude,
      googleMapsId
    };
    
    // Cache the temporary location
    cacheLocation(locationData, googleMapsId);
    
    return locationData;
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
      
      // Vérifier si nous avons déjà un mapping pour cet ID
      const mongoId = convertGoogleMapsIdToMongoId(id)
      if (mongoId) {
        id = mongoId
      } else {
        // Si on n'a pas de mapping, chercher dans le localStorage par googleMapsId
        const allKeys = Object.keys(localStorage)
        for (const key of allKeys) {
          if (key.startsWith('location_')) {
            try {
              const location = JSON.parse(localStorage.getItem(key) || '{}')
              if (location.googleMapsId === id) {
                return location
              }
            } catch (e) {
              // Ignorer les erreurs de parsing
            }
          }
        }
      }
    }
    
    // Vérifier si nous avons l'emplacement dans le cache local
    if (locationCache[id]) {
      return locationCache[id]
    }

    // Si ce n'est pas dans le cache ou si c'est un véritable ID MongoDB, récupérer depuis l'API
    const res = await axiosInstance.get(`/api/location/${id}/${UserService.getLanguage()}`)
    return res.data
  } catch (error) {
    console.error('Error getting location by ID:', error)
    throw error
  }
}

/**
 * Cache a location in memory and localStorage
 * 
 * @param {bookcarsTypes.Location} location 
 * @param {string} googleMapsId Optional Google Maps ID to create mapping
 */
export const cacheLocation = (location: bookcarsTypes.Location, googleMapsId?: string): void => {
  try {
    if (!location._id) {
      return
    }
    
    // Stocker dans le cache mémoire
    locationCache[location._id] = location
    
    // Si nous avons un ID Google Maps, créer un mapping
    if (googleMapsId) {
      googleMapsToMongoIdMap[googleMapsId] = location._id
      
      // Ajouter l'ID Google Maps à l'objet location si ce n'est pas déjà fait
      if (!location.googleMapsId) {
        location.googleMapsId = googleMapsId
      }
    }
    
    // Stocker dans le localStorage
    localStorage.setItem(`location_${location._id}`, JSON.stringify(location))
  } catch (error) {
    console.error('Error caching location:', error)
  }
}

/**
 * Get locations. (client side filtering)
 * 
 * @param {string} keyword 
 * @returns {Promise<bookcarsTypes.Location[]>}
 */
export const search = async (keyword: string): Promise<bookcarsTypes.Location[]> => {
  try {
    if (!keyword) {
      return []
    }
    
    // Si le mot-clé ressemble à un ID (MongoDB ou Google Maps), essayer de récupérer directement
    if (isMongoId(keyword) || isGoogleMapsId(keyword)) {
      try {
        const location = await getLocation(keyword)
        return [location]
      } catch (e) {
        // Si on ne trouve pas l'emplacement par ID, continuer avec la recherche par mot-clé
      }
    }
    
    // D'abord chercher dans le cache local
    const cachedResults = searchInCache(keyword)
    if (cachedResults.length > 0) {
      return cachedResults
    }
    
    // Ensuite, chercher via l'API
    const res = await axiosInstance.get(
      `/api/locations/search/${UserService.getLanguage()}/?s=${encodeURIComponent(keyword)}`
    )
    
    return res.data
  } catch (error) {
    console.error('Error searching locations:', error)
    return []
  }
}

/**
 * Search for locations in the local cache
 * 
 * @param {string} keyword 
 * @returns {bookcarsTypes.Location[]}
 */
const searchInCache = (keyword: string): bookcarsTypes.Location[] => {
  const normalizedKeyword = keyword.toLowerCase()
  const results: bookcarsTypes.Location[] = []
  
  // Parcourir le cache et trouver les correspondances
  Object.values(locationCache).forEach(location => {
    if (location.name && location.name.toLowerCase().includes(normalizedKeyword)) {
      results.push(location)
    }
  })
  
  return results
}

/**
 * Rechercher des emplacements avec Google Places API
 * 
 * @param {string} keyword 
 * @returns {Promise<bookcarsTypes.Location[]>}
 */
export const searchWithGooglePlaces = async (keyword: string): Promise<bookcarsTypes.Location[]> => {
  try {
    const predictions = await GoogleMapsService.searchPlaces(keyword)
    return predictions.map(prediction => ({
      _id: prediction.place_id, // Utiliser l'ID Google comme ID temporaire
      name: prediction.description,
      googleMapsId: prediction.place_id
    }))
  } catch (error) {
    console.error('Error searching with Google Places:', error)
    return []
  }
}

/**
 * Get a location by name.
 *
 * @param {string} name
 * @param {string} language
 * @returns {Promise<{status: number, data: string}>}
 */
export const getLocationId = async (name: string, _language: string): Promise<{status: number, data: string}> => {
  try {
    // First try to find in the cache
    const locations = Object.values(locationCache).filter(loc => loc.name === name)
    if (locations.length > 0) {
      return { status: 200, data: locations[0]._id }
    }
    
    // Then search in the database
    const res = await axiosInstance.get(`/api/location/name/${encodeURIComponent(name)}`)
    if (res.status === 200 && res.data) {
      return { status: 200, data: res.data._id }
    }
    
    // If not found, create a new location
    const newLocation = await create({ 
      _id: generateMongoId(),
      name
    } as bookcarsTypes.Location)
    return { status: 200, data: newLocation._id }
  } catch (error) {
    console.error(`Error getting location ID for ${name}:`, error)
    return { status: 500, data: '' }
  }
}

/**
 * Create a location.
 *
 * @param {bookcarsTypes.Location} data
 * @returns {Promise<bookcarsTypes.Location>}
 */
export const create = (data: bookcarsTypes.Location) => 
  axiosInstance
    .post(
      '/api/create-location',
      data
    )
    .then((res) => res.data)
    .catch(error => {
      console.error('Error creating location:', error)
      throw error
    })

/**
 * Update a location.
 *
 * @param {bookcarsTypes.Location} data
 * @returns {Promise<number>}
 */
export const update = (data: bookcarsTypes.Location) =>
  axiosInstance
    .put(
      '/api/update-location',
      data
    )
    .then((res) => res.data)
    .catch(error => {
      console.error('Error updating location:', error)
      throw error
    })

/**
 * Delete a location.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteLocation = (id: string) => 
  axiosInstance
    .delete(
      `/api/delete-location/${id}`
    )
    .then((res) => res.data)
    .catch(error => {
      console.error('Error deleting location:', error)
      throw error
    })

/**
 * Convertit un emplacement brut (raw) en objet Location complet
 * 
 * @param {any} rawLocation 
 * @returns {bookcarsTypes.Location}
 */
export const toLocation = (rawLocation: any): bookcarsTypes.Location => {
  if (!rawLocation) return {} as bookcarsTypes.Location
  
  return {
    _id: rawLocation._id || generateMongoId(),
    name: rawLocation.name || '',
    values: rawLocation.values || {},
    googleMapsId: rawLocation.googleMapsId
  }
}
