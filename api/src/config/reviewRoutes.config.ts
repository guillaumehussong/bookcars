const routes = {
  create: '/api/create-review',
  update: '/api/update-review',
  updateStatus: '/api/update-review-status',
  delete: '/api/delete-review/:id',
  getReview: '/api/review/:id',
  getReviews: '/api/reviews/:page/:size',
  getCarReviews: '/api/car-reviews/:carId/:page/:size',
  getSupplierReviews: '/api/supplier-reviews/:supplierId/:page/:size',
  getUserReviews: '/api/user-reviews/:userId/:page/:size',
  checkBooking: '/api/check-booking-review/:bookingId',
  reply: '/api/reply-review',
}

export default routes 