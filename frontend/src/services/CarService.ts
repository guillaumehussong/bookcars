import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import * as UserService from './UserService'

/**
 * Get cars.
 *
 * @param {bookcarsTypes.GetCarsPayload} data
 * @returns {Promise<bookcarsTypes.Result<bookcarsTypes.Car>>}
 */
export const getCars = async (data: bookcarsTypes.GetCarsPayload): Promise<bookcarsTypes.Result<bookcarsTypes.Car>> => {
  const language = await UserService.getLanguage()

  console.log('CarService.getCars - Sending request with data:', data)
  
  return axiosInstance
    .post(
      `/api/frontend-cars/1/1000`,
      data,
      { withCredentials: true }
    )
    .then((res) => {
      console.log('CarService.getCars - Received response:', res.data)
      return res.data
    })
    .catch((err) => {
      console.error('Error fetching cars:', err)
      return []
    })
}

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
