import mongoose from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "can't be blank"],
    },
    booking: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Booking',
      required: [true, "can't be blank"],
    },
    car: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Car',
      required: [true, "can't be blank"],
    },
    supplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, "can't be blank"],
    },
    rating: {
      type: Number,
      required: [true, "can't be blank"],
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      trim: true,
    },
    reply: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: Object.values(bookcarsTypes.ReviewStatus),
      default: bookcarsTypes.ReviewStatus.Pending,
    },
  },
  {
    timestamps: true,
    collection: 'Review',
  }
)

const Review = mongoose.model('Review', reviewSchema)

export { Review } 