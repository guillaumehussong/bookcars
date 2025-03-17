import express, { Request, Response } from 'express'
import * as reviewController from '../controllers/reviewController'
import authJwt from '../middlewares/authJwt'

const router = express.Router()

// Create a review
router.post('/api/create-review', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.create(req, res))

// Update a review
router.put('/api/update-review', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.update(req, res))

// Update review status (admin or supplier only)
router.put('/api/update-review-status', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.updateStatus(req, res))

// Delete a review
router.delete('/api/delete-review/:id', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.deleteReview(req, res))

// Get a review by ID
router.get('/api/review/:id', (req: Request, res: Response) => reviewController.getReview(req, res))

// Get all reviews (admin only)
router.get('/api/reviews/:page/:size', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.getReviews(req, res))

// Get car reviews
router.get('/api/car-reviews/:carId/:page/:size', (req: Request, res: Response) => reviewController.getCarReviews(req, res))

// Get supplier reviews
router.get('/api/supplier-reviews/:supplierId/:page/:size', (req: Request, res: Response) => reviewController.getSupplierReviews(req, res))

// Get user reviews
router.get('/api/user-reviews/:userId/:page/:size', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.getUserReviews(req, res))

// Check if a booking has been reviewed
router.get('/api/check-booking-review/:bookingId', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.checkBooking(req, res))

// Reply to a review (supplier only)
router.post('/api/reply-review', [authJwt.verifyToken], (req: Request, res: Response) => reviewController.reply(req, res))

export default router 