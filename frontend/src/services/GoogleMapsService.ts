import axios from 'axios'
import * as bookcarsTypes from ':bookcars-types'
import Env from '@/config/env.config'
import * as UserService from './UserService'
import * as SupplierService from './SupplierService'

// Cache pour stocker les coordonnées géocodées des adresses
const geocodeCache: Record<string, { latitude: number, longitude: number }> = {}

/**
 * Calcule la distance entre deux points géographiques en utilisant la formule de Haversine
 * @param lat1 Latitude du premier point
 * @param lon1 Longitude du premier point
 * @param lat2 Latitude du deuxième point
 * @param lon2 Longitude du deuxième point
 * @returns Distance en kilomètres
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  // Rayon de la Terre en kilomètres
  const R = 6371
  
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  const distance = R * c
  
  return distance
}

/**
 * Convertit une adresse en coordonnées géographiques à l'aide de l'API Google Maps Geocoding
 * @param address Adresse à convertir
 * @returns Coordonnées (latitude, longitude)
 */
export const geocodeAddress = async (address: string): Promise<{ latitude: number, longitude: number } | null> => {
  try {
    // Vérifier si l'adresse est déjà en cache
    if (geocodeCache[address]) {
      console.log(`Using cached geocode for address: ${address}`);
      return geocodeCache[address];
    }

    if (!Env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured')
    }
    
    console.log(`Geocoding address: ${address}`);
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${Env.GOOGLE_MAPS_API_KEY}`
    const response = await axios.get(url)
    
    if (response.data.status === 'OK' && response.data.results.length > 0) {
      const { lat: latitude, lng: longitude } = response.data.results[0].geometry.location
      
      // Mettre en cache le résultat
      geocodeCache[address] = { latitude, longitude };
      
      // Stocker également dans localStorage pour persister entre les sessions
      try {
        const cachedAddresses = JSON.parse(localStorage.getItem('geocodedAddresses') || '{}');
        cachedAddresses[address] = { latitude, longitude };
        localStorage.setItem('geocodedAddresses', JSON.stringify(cachedAddresses));
      } catch (e) {
        console.error('Error storing geocoded address in localStorage:', e);
      }
      
      return { latitude, longitude }
    }
    
    return null
  } catch (error) {
    console.error('Error geocoding address:', error)
    return null
  }
}

/**
 * Charge les adresses géocodées depuis le localStorage au démarrage
 */
export const loadCachedGeocodedAddresses = (): void => {
  try {
    const cachedAddresses = JSON.parse(localStorage.getItem('geocodedAddresses') || '{}');
    Object.assign(geocodeCache, cachedAddresses);
    console.log(`Loaded ${Object.keys(cachedAddresses).length} cached geocoded addresses`);
  } catch (e) {
    console.error('Error loading cached geocoded addresses:', e);
  }
}

// Charger les adresses en cache au démarrage
loadCachedGeocodedAddresses();

/**
 * Récupère les fournisseurs triés par distance par rapport à un emplacement
 * @param location Emplacement avec coordonnées
 * @param payload Données pour la recherche de voitures
 * @returns Liste des fournisseurs triés par distance
 */
export const getSortedSuppliersByDistance = async (
  location: bookcarsTypes.LocationWithCoordinates,
  payload: bookcarsTypes.GetCarsPayload
): Promise<bookcarsTypes.SortedSupplier[]> => {
  try {
    console.log(`Getting suppliers sorted by distance from location: ${location.name || location._id}`);
    
    // Récupérer tous les fournisseurs qui ont des voitures disponibles
    const suppliers = await SupplierService.getFrontendSuppliers(payload)
    console.log(`Found ${suppliers.length} suppliers with available cars`);
    
    // Récupérer les données complètes des fournisseurs pour avoir leurs adresses
    const suppliersWithCoordinates = await Promise.all(
      suppliers.map(async (supplier) => {
        try {
          const supplierData = await UserService.getUser(supplier._id)
          if (supplierData && supplierData.location) {
            // Géocoder l'adresse du fournisseur si nécessaire
            let supplierCoords = null;
            
            // Vérifier si les coordonnées sont déjà en cache
            if (geocodeCache[supplierData.location]) {
              supplierCoords = geocodeCache[supplierData.location];
              console.log(`Using cached coordinates for supplier ${supplierData.fullName}`);
            } else {
              // Géocoder l'adresse
              supplierCoords = await geocodeAddress(supplierData.location);
              console.log(`Geocoded address for supplier ${supplierData.fullName}: ${supplierData.location}`);
            }
            
            if (supplierCoords) {
              // Calculer la distance entre le lieu de prise en charge et le fournisseur
              let distance = 0;
              if (location.latitude && location.longitude) {
                distance = calculateDistance(
                  location.latitude,
                  location.longitude,
                  supplierCoords.latitude,
                  supplierCoords.longitude
                );
                console.log(`Distance between ${location.name || location._id} and supplier ${supplierData.fullName}: ${distance.toFixed(2)} km`);
              }
              
              return {
                ...supplier,
                distance,
                coordinates: {
                  latitude: supplierCoords.latitude,
                  longitude: supplierCoords.longitude
                }
              } as bookcarsTypes.SortedSupplier;
            }
          }
          
          // Si pas d'adresse ou échec du géocodage, retourner avec distance par défaut
          return {
            ...supplier,
            distance: Number.MAX_VALUE, // Placer à la fin de la liste
            coordinates: {
              latitude: 0,
              longitude: 0
            }
          } as bookcarsTypes.SortedSupplier;
        } catch (error) {
          // Gérer les erreurs d'authentification ou autres erreurs
          if (error.response && error.response.status === 403) {
            console.log(`Authentication required to get supplier ${supplier._id}. Using default coordinates.`);
          } else {
            console.error(`Error processing supplier ${supplier._id}:`, error);
          }
          
          // En cas d'erreur, retourner avec distance par défaut
          return {
            ...supplier,
            distance: Number.MAX_VALUE,
            coordinates: {
              latitude: 0,
              longitude: 0
            }
          } as bookcarsTypes.SortedSupplier;
        }
      })
    );
    
    // Filtrer les fournisseurs null et trier par distance
    const sortedSuppliers = suppliersWithCoordinates
      .filter((supplier): supplier is bookcarsTypes.SortedSupplier => supplier !== null)
      .sort((a, b) => a.distance - b.distance);
    
    console.log(`Sorted ${sortedSuppliers.length} suppliers by distance`);
    return sortedSuppliers;
  } catch (error) {
    console.error('Error getting sorted suppliers:', error);
    throw error;
  }
}

/**
 * Récupère la distance et la durée du trajet entre deux points à l'aide de l'API Google Maps Distance Matrix
 * @param origin Point de départ (latitude, longitude)
 * @param destination Point d'arrivée (latitude, longitude)
 * @returns Distance et durée du trajet
 */
export const getDistanceMatrix = async (
  origin: { latitude: number, longitude: number },
  destination: { latitude: number, longitude: number }
): Promise<{ distance: string, duration: string } | null> => {
  try {
    if (!Env.GOOGLE_MAPS_API_KEY) {
      throw new Error('Google Maps API key not configured')
    }
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin.latitude},${origin.longitude}&destinations=${destination.latitude},${destination.longitude}&key=${Env.GOOGLE_MAPS_API_KEY}`
    
    const response = await axios.get(url)
    
    if (
      response.data.status === 'OK' && 
      response.data.rows.length > 0 && 
      response.data.rows[0].elements.length > 0 && 
      response.data.rows[0].elements[0].status === 'OK'
    ) {
      const { distance, duration } = response.data.rows[0].elements[0]
      
      return {
        distance: distance.text,
        duration: duration.text
      }
    }
    
    return null
  } catch (error) {
    console.error('Error getting distance matrix:', error)
    return null
  }
} 