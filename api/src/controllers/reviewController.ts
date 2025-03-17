import { Request, Response } from 'express'
import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'
import Review from '../models/Review'
import Car from '../models/Car'
import User from '../models/User'
import * as logger from '../common/logger'
import i18n from '../lang/i18n'
import * as helper from '../common/helper'

/**
 * Create a review.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.Review } = req
    const {
      user,
      booking,
      car,
      supplier,
      rating,
      comment
    } = body

    // Check if the user has already reviewed this booking
    const existingReview = await Review.findOne({ booking })
    if (existingReview) {
      return res.status(400).send(i18n.t('BOOKING_ALREADY_REVIEWED'))
    }

    const review = new Review({
      user,
      booking,
      car,
      supplier,
      rating,
      comment,
      status: bookcarsTypes.ReviewStatus.Pending,
    })

    await review.save()

    // Update car rating
    await updateCarRating(car.toString())

    // Update supplier rating
    await updateSupplierRating(supplier.toString())

    return res.json(review)
  } catch (err) {
    logger.error(`[review.create] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update a review.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.Review } = req
    const { _id, rating, comment } = body

    if (!helper.isValidObjectId(_id)) {
      throw new Error('Invalid review ID')
    }

    const review = await Review.findById(_id)

    if (!review) {
      return res.status(204).send(i18n.t('REVIEW_NOT_FOUND'))
    }

    review.rating = rating
    review.comment = comment
    review.status = bookcarsTypes.ReviewStatus.Pending

    await review.save()

    // Update car rating
    await updateCarRating(review.car.toString())

    // Update supplier rating
    await updateSupplierRating(review.supplier.toString())

    return res.json(review)
  } catch (err) {
    logger.error(`[review.update] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update a review status.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateStatus = async (req: Request, res: Response) => {
  try {
    const { body }: { body: { _id: string; status: string } } = req
    const { _id, status } = body

    if (!helper.isValidObjectId(_id)) {
      throw new Error('Invalid review ID')
    }

    const review = await Review.findById(_id)

    if (!review) {
      return res.status(204).send(i18n.t('REVIEW_NOT_FOUND'))
    }

    review.status = status

    await review.save()

    // Update car rating if review is approved or rejected
    if (status === bookcarsTypes.ReviewStatus.Approved || status === bookcarsTypes.ReviewStatus.Rejected) {
      await updateCarRating(review.car.toString())
      await updateSupplierRating(review.supplier.toString())
    }

    return res.json(review)
  } catch (err) {
    logger.error(`[review.updateStatus] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete a review.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!helper.isValidObjectId(id)) {
      throw new Error('Invalid review ID')
    }

    const review = await Review.findById(id)

    if (!review) {
      return res.status(204).send(i18n.t('REVIEW_NOT_FOUND'))
    }

    const carId = review.car
    const supplierId = review.supplier

    await Review.deleteOne({ _id: id })

    // Update car rating
    await updateCarRating(carId.toString())

    // Update supplier rating
    await updateSupplierRating(supplierId.toString())

    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[review.deleteReview] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get a review by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getReview = async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    if (!helper.isValidObjectId(id)) {
      throw new Error('Invalid review ID')
    }

    const review = await Review.findById(id)
      .populate<{ user: env.UserInfo }>('user')
      .populate<{ car: env.Car }>('car')
      .populate<{ supplier: env.UserInfo }>('supplier')
      .lean()

    if (!review) {
      return res.status(204).send(i18n.t('REVIEW_NOT_FOUND'))
    }

    return res.json(review)
  } catch (err) {
    logger.error(`[review.getReview] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get reviews.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getReviews = async (req: Request, res: Response) => {
  try {
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    const data = await Review.aggregate([
      {
        $lookup: {
          from: 'User',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'Car',
          localField: 'car',
          foreignField: '_id',
          as: 'car',
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$car', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
      {
        $facet: {
          resultData: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * size }, { $limit: size }],
          pageInfo: [
            {
              $count: 'totalRecords',
            },
          ],
        },
      },
    ])

    return res.json(data)
  } catch (err) {
    logger.error(`[review.getReviews] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get car reviews.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCarReviews = async (req: Request, res: Response) => {
  try {
    const { carId } = req.params
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    if (!helper.isValidObjectId(carId)) {
      throw new Error('Invalid car ID')
    }

    const data = await Review.aggregate([
      {
        $match: {
          car: new mongoose.Types.ObjectId(carId),
          status: bookcarsTypes.ReviewStatus.Approved,
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      {
        $facet: {
          resultData: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * size }, { $limit: size }],
          pageInfo: [
            {
              $count: 'totalRecords',
            },
          ],
        },
      },
    ])

    return res.json(data)
  } catch (err) {
    logger.error(`[review.getCarReviews] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get supplier reviews.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getSupplierReviews = async (req: Request, res: Response) => {
  try {
    const { supplierId } = req.params
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    if (!helper.isValidObjectId(supplierId)) {
      throw new Error('Invalid supplier ID')
    }

    const data = await Review.aggregate([
      {
        $match: {
          supplier: new mongoose.Types.ObjectId(supplierId),
          status: bookcarsTypes.ReviewStatus.Approved,
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'user',
          foreignField: '_id',
          as: 'user',
        },
      },
      {
        $lookup: {
          from: 'Car',
          localField: 'car',
          foreignField: '_id',
          as: 'car',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$car', preserveNullAndEmptyArrays: false } },
      {
        $facet: {
          resultData: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * size }, { $limit: size }],
          pageInfo: [
            {
              $count: 'totalRecords',
            },
          ],
        },
      },
    ])

    return res.json(data)
  } catch (err) {
    logger.error(`[review.getSupplierReviews] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get user reviews.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getUserReviews = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    if (!helper.isValidObjectId(userId)) {
      throw new Error('Invalid user ID')
    }

    const data = await Review.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
        },
      },
      {
        $lookup: {
          from: 'Car',
          localField: 'car',
          foreignField: '_id',
          as: 'car',
        },
      },
      {
        $lookup: {
          from: 'User',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplier',
        },
      },
      { $unwind: { path: '$car', preserveNullAndEmptyArrays: false } },
      { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
      {
        $facet: {
          resultData: [{ $sort: { createdAt: -1 } }, { $skip: (page - 1) * size }, { $limit: size }],
          pageInfo: [
            {
              $count: 'totalRecords',
            },
          ],
        },
      },
    ])

    return res.json(data)
  } catch (err) {
    logger.error(`[review.getUserReviews] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Check if a booking has a review.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkBooking = async (req: Request, res: Response) => {
  try {
    const { bookingId } = req.params

    if (!helper.isValidObjectId(bookingId)) {
      throw new Error('Invalid booking ID')
    }

    const review = await Review.findOne({ booking: bookingId })

    return res.json({ exists: !!review, review })
  } catch (err) {
    logger.error(`[review.checkBooking] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Reply to a review.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const reply = async (req: Request, res: Response) => {
  try {
    const { body }: { body: { reviewId: string; comment: string } } = req
    const { reviewId, comment } = body

    if (!helper.isValidObjectId(reviewId)) {
      throw new Error('Invalid review ID')
    }

    const review = await Review.findById(reviewId)

    if (!review) {
      return res.status(204).send(i18n.t('REVIEW_NOT_FOUND'))
    }

    review.reply = {
      comment,
      date: new Date(),
    }

    await review.save()

    return res.json(review)
  } catch (err) {
    logger.error(`[review.reply] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Update car rating.
 *
 * @async
 * @param {string} carId
 * @returns {Promise<void>}
 */
const updateCarRating = async (carId: string): Promise<void> => {
  try {
    const reviews = await Review.find({ car: carId, status: bookcarsTypes.ReviewStatus.Approved })
    if (reviews.length === 0) {
      // If no approved reviews, set the car rating to null
      await Car.findByIdAndUpdate(carId, { rating: undefined })
      return
    }

    // Calculate the average rating
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0)
    const averageRating = totalRating / reviews.length

    // Update the car rating
    await Car.findByIdAndUpdate(carId, { rating: averageRating })
  } catch (err) {
    logger.error(`[review.updateCarRating] Error updating car rating`, err)
    throw err
  }
}

/**
 * Update supplier rating.
 *
 * @async
 * @param {string} supplierId
 * @returns {Promise<void>}
 */
const updateSupplierRating = async (supplierId: string): Promise<void> => {
  try {
    const reviews = await Review.find({ supplier: supplierId, status: bookcarsTypes.ReviewStatus.Approved })
    if (reviews.length === 0) {
      // If no approved reviews, don't override the Google Maps rating
      return
    }

    // Calculate the average rating
    const totalRating = reviews.reduce((acc, review) => acc + review.rating, 0)
    const averageRating = totalRating / reviews.length

    // Get the supplier
    const supplier = await User.findById(supplierId)
    if (!supplier) {
      return
    }

    // Create or update the supplier's Google Maps reviews
    if (!supplier.googleMapReviews) {
      supplier.googleMapReviews = {
        rating: averageRating,
        count: reviews.length,
      }
    } else {
      // Combine platform reviews with Google Maps reviews if available
      const googleRating = supplier.googleMapReviews.rating
      const googleCount = supplier.googleMapReviews.count || 0
      const googleUrl = supplier.googleMapReviews.url

      if (googleCount > 0) {
        // Calculate a weighted average between Google Maps and platform reviews
        const totalWeight = googleCount + reviews.length
        const weightedRating = ((googleRating * googleCount) + (averageRating * reviews.length)) / totalWeight
        
        supplier.googleMapReviews = {
          rating: weightedRating,
          count: totalWeight,
          url: googleUrl,
        }
      } else {
        // If there are no Google reviews, just use platform reviews
        supplier.googleMapReviews = {
          rating: averageRating,
          count: reviews.length,
          url: googleUrl,
        }
      }
    }

    await supplier.save()
  } catch (err) {
    logger.error(`[review.updateSupplierRating] Error updating supplier rating`, err)
    throw err
  }
} 