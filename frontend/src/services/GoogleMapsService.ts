import axiosInstance from './axiosInstance'
import env from '../config/env.config'

/**
 * Interface for Google Maps Place Review
 */
export interface GoogleReview {
  author_name: string
  profile_photo_url: string
  rating: number
  relative_time_description: string
  text: string
  time: number
}

/**
 * Interface for Google Maps Place Details Response
 */
export interface GooglePlaceDetails {
  name: string
  formatted_address: string
  rating: number
  user_ratings_total: number
  reviews: GoogleReview[]
}

/**
 * Interface for Geocoding Result
 */
export interface GeocodeResult {
  lat: number
  lng: number
}

/**
 * Interface for error response
 */
export interface ErrorResponse {
  error: string
}

/**
 * Type guard to check if response is an error
 */
function isErrorResponse(response: GooglePlaceDetails | ErrorResponse): response is ErrorResponse {
  return 'error' in response
}

/**
 * Get reviews for a place from Google Maps
 * 
 * @param {string} placeId - Google Maps Place ID
 * @returns {Promise<GooglePlaceDetails | ErrorResponse>}
 */
export const getPlaceDetails = (placeId: string): Promise<GooglePlaceDetails | ErrorResponse> =>
  axiosInstance
    .get(`/api/google-place-details/${encodeURIComponent(placeId)}`)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error in getPlaceDetails:', error);
      if (error.response) {
        return { error: error.response.data.error || 'Failed to fetch place details' };
      }
      return { error: 'Failed to fetch place details' };
    });

/**
 * Get Google Maps Place ID for a supplier based on name and location
 * 
 * @param {string} supplierName - Name of the supplier
 * @param {string} location - Optional location string
 * @returns {Promise<string>}
 */
export const findPlaceId = (supplierName: string, location?: string): Promise<string> =>
  axiosInstance
    .get(`/api/google-find-place/${encodeURIComponent(supplierName)}${location ? `/${encodeURIComponent(location)}` : ''}`)
    .then((res) => res.data)
    .catch((error) => {
      console.error('Error in findPlaceId:', error);
      throw new Error(error.response?.data?.error || 'Failed to find place ID');
    });

/**
 * Geocode an address to coordinates
 * 
 * @param {string} address - The address to geocode
 * @returns {Promise<GeocodeResult>}
 */
export const geocodeAddress = (address: string): Promise<GeocodeResult> =>
  axiosInstance
    .get(`/api/geocode/${encodeURIComponent(address)}`)
    .then((res) => res.data)

/**
 * Known Place IDs for specific suppliers
 * This helps improve the chances of finding reviews and avoids unnecessary API calls
 */
export const KNOWN_PLACE_IDS: Record<string, string> = {
  // Real place ID for Good Cars Rent A Car in El Salvador
  'Good Cars': 'ChIJIWtvp463fI8RsgQhorC0Ga8',
  // Add more known place IDs here as needed
};

/**
 * Maps that store Place IDs for suppliers to avoid redundant API calls
 */
const supplierPlaceIdMap = new Map<string, string>()

/**
 * Get Google Reviews for a supplier
 * 
 * @param {string} supplierId - Supplier ID
 * @param {string} supplierName - Supplier name
 * @returns {Promise<GoogleReview[]>}
 */
export const getSupplierGoogleReviews = async (supplierId: string, supplierName: string): Promise<GoogleReview[]> => {
  try {
    console.log('Getting Google reviews for supplier:', supplierName, 'with ID:', supplierId);
    
    // Check for known place ID first
    if (KNOWN_PLACE_IDS[supplierName]) {
      console.log(`Using known place ID for ${supplierName}:`, KNOWN_PLACE_IDS[supplierName])
      const placeDetails = await getPlaceDetails(KNOWN_PLACE_IDS[supplierName])
      console.log('Place details from Google Maps:', placeDetails)
      
      if (isErrorResponse(placeDetails)) {
        console.error('Error in place details response:', placeDetails.error)
        return [];
      }
      
      return placeDetails.reviews || []
    }
    
    console.log(`No known place ID for ${supplierName}, attempting to find one`)
    
    // Check if we already have the Place ID stored
    let placeId = supplierPlaceIdMap.get(supplierId)
    
    if (placeId) {
      console.log(`Using cached place ID for ${supplierName}:`, placeId)
    } else {
      // If not, fetch the Place ID
      console.log(`Fetching place ID for ${supplierName}`)
      try {
        placeId = await findPlaceId(supplierName)
        
        if (placeId) {
          console.log(`Found place ID for ${supplierName}:`, placeId)
          supplierPlaceIdMap.set(supplierId, placeId)
        } else {
          console.log(`No place ID found for ${supplierName}`)
          return []
        }
      } catch (error) {
        console.error('Error finding place ID:', error)
        return []
      }
    }
    
    // Get place details including reviews
    console.log(`Fetching place details for ID: ${placeId}`)
    const placeDetails = await getPlaceDetails(placeId)
    
    if (isErrorResponse(placeDetails)) {
      console.error('Error in place details response:', placeDetails.error)
      return []
    }
    
    console.log('Place details:', placeDetails)
    console.log('Number of reviews:', placeDetails.reviews ? placeDetails.reviews.length : 0)
    return placeDetails.reviews || []
  } catch (error) {
    console.error('Error fetching Google reviews:', error)
    return []
  }
} 