import * as bookcarsTypes from ':bookcars-types'
import axiosInstance from './axiosInstance'
import env from '../config/env.config'

/**
 * Create a review.
 *
 * @param {bookcarsTypes.Review} data
 * @returns {Promise<bookcarsTypes.Review>}
 */
export const create = (data: bookcarsTypes.Review): Promise<bookcarsTypes.Review> =>
  axiosInstance
    .post('/api/create-review', data, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((res) => res.data)

/**
 * Update a review.
 *
 * @param {bookcarsTypes.Review} data
 * @returns {Promise<bookcarsTypes.Review>}
 */
export const update = (data: bookcarsTypes.Review): Promise<bookcarsTypes.Review> =>
  axiosInstance
    .put('/api/update-review', data, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((res) => res.data)

/**
 * Delete a review.
 *
 * @param {string} id
 * @returns {Promise<number>}
 */
export const deleteReview = (id: string): Promise<number> =>
  axiosInstance
    .delete(`/api/delete-review/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((res) => res.status)

/**
 * Get a review by ID.
 *
 * @param {string} id
 * @returns {Promise<bookcarsTypes.Review>}
 */
export const getReview = (id: string): Promise<bookcarsTypes.Review> =>
  axiosInstance
    .get(`/api/review/${encodeURIComponent(id)}`)
    .then((res) => res.data)

/**
 * Get car reviews.
 *
 * @param {string} carId
 * @param {number} page
 * @param {number} size
 * @returns {Promise<any>}
 */
export const getCarReviews = (carId: string, page: number, size: number): Promise<any> =>
  axiosInstance
    .get(`/api/car-reviews/${encodeURIComponent(carId)}/${page}/${size}`)
    .then((res) => res.data)

/**
 * Get supplier reviews.
 *
 * @param {string} supplierId
 * @param {number} page
 * @param {number} size
 * @returns {Promise<any>}
 */
export const getSupplierReviews = (supplierId: string, page: number, size: number): Promise<any> =>
  axiosInstance
    .get(`/api/supplier-reviews/${encodeURIComponent(supplierId)}/${page}/${size}`)
    .then((res) => res.data)

/**
 * Check if a booking has been reviewed.
 *
 * @param {string} bookingId
 * @returns {Promise<{exists: boolean, review?: bookcarsTypes.Review}>}
 */
export const checkBookingReview = (bookingId: string): Promise<{exists: boolean, review?: bookcarsTypes.Review}> =>
  axiosInstance
    .get(`/api/check-booking-review/${encodeURIComponent(bookingId)}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((res) => res.data)

/**
 * Reply to a review.
 *
 * @param {string} reviewId
 * @param {string} comment
 * @returns {Promise<bookcarsTypes.Review>}
 */
export const replyToReview = (reviewId: string, comment: string): Promise<bookcarsTypes.Review> =>
  axiosInstance
    .post('/api/reply-review', { reviewId, comment }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
    .then((res) => res.data) 