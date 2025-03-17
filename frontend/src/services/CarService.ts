import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'

/**
 * Get cars.
 *
 * @param {bookcarsTypes.GetCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Car>>}
 */
export const getCars = async (data: bookcarsTypes.GetCarsPayload, page: number, size: number): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> => {
  console.log(`CarService.getCars: Requesting cars for page ${page}, size ${size}`);
  console.log('Payload:', JSON.stringify({
    ...data,
    suppliers: data.suppliers ? `${data.suppliers.length} suppliers` : 'no suppliers'
  }));
  
  // Maximum number of retry attempts
  const maxRetries = 2;
  let retries = 0;
  let lastError;
  
  while (retries <= maxRetries) {
    try {
      const res = await axiosInstance.post(
        `/api/frontend-cars/${page}/${size}`,
        data
      );
      
      console.log('API response status:', res.status);
      console.log('API response data structure:', res.data ? 
        `Array of length ${res.data.length}, first item has ${res.data[0] ? 
          `resultData (${res.data[0].resultData ? res.data[0].resultData.length : 0} items) and pageInfo` 
          : 'no data'}` 
        : 'no data');
      
      if (res.data && res.data.length > 0 && res.data[0].resultData) {
        console.log(`Found ${res.data[0].resultData.length} cars`);
      } else {
        console.warn('No cars found in response');
      }
      
      return res.data;
    } catch (error: any) {
      lastError = error;
      console.error('Error fetching cars:', error);
      
      // Log detailed error information
      if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('Error response data:', error.response.data);
        console.error('Error response status:', error.response.status);
        console.error('Error response headers:', error.response.headers);
      } else if (error.request) {
        // The request was made but no response was received
        console.error('Error request:', error.request);
        console.error('No response received from server');
      } else {
        // Something happened in setting up the request that triggered an Error
        console.error('Error message:', error.message);
      }
      
      // Only retry on network errors or 5xx server errors
      if (error.code === 'ERR_NETWORK' || (error.response && error.response.status >= 500)) {
        retries++;
        if (retries <= maxRetries) {
          console.log(`Retrying request (${retries}/${maxRetries})...`);
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
          continue;
        }
      }
      
      // If we get here, either we've exhausted our retries or it's not a retryable error
      console.error('Error details:', error.response ? {
        status: error.response.status,
        data: error.response.data
      } : 'No response details');
      
      throw error;
    }
  }
  
  // This should never be reached due to the throw in the catch block,
  // but TypeScript requires a return statement
  throw lastError;
};

/**
 * Get a Car by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Car>}
 */
export const getCar = (id: string): Promise<bookcarsTypes.Car> =>
  axiosInstance
    .get(
      `/api/car/${encodeURIComponent(id)}/${UserService.getLanguage()}`
    )
    .then((res) => res.data)

/**
 * Get cars by agency and location.
 *
 * @param {string} keyword
 * @param {bookcarsTypes.GetBookingCarsPayload} data
 * @param {number} page
 * @param {number} size
 * @returns {Promise<bookcarsTypes.Car[]>}
 */
export const getBookingCars = (keyword: string, data: bookcarsTypes.GetBookingCarsPayload, page: number, size: number): Promise<bookcarsTypes.Car[]> =>
  axiosInstance
    .post(
      `/api/booking-cars/${page}/${size}/?s=${encodeURIComponent(keyword)}`,
      data,
      { withCredentials: true }
    )
    .then((res) => res.data)
