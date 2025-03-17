import { Schema, model } from 'mongoose'
import * as bookcarsTypes from ':bookcars-types'
import * as env from '../config/env.config'

const reviewSchema = new Schema<env.Review>(
  {
    user: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
    },
    booking: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Booking',
      index: true,
    },
    car: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'Car',
      index: true,
    },
    supplier: {
      type: Schema.Types.ObjectId,
      required: [true, "can't be blank"],
      ref: 'User',
      index: true,
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
    status: {
      type: String,
      enum: [
        bookcarsTypes.ReviewStatus.Pending,
        bookcarsTypes.ReviewStatus.Approved,
        bookcarsTypes.ReviewStatus.Rejected,
      ],
      default: bookcarsTypes.ReviewStatus.Pending,
    },
    reply: {
      comment: {
        type: String,
        trim: true,
      },
      date: {
        type: Date,
      },
    },
  },
  {
    timestamps: true,
    strict: true,
    collection: 'Review',
  },
)

const Review = model<env.Review>('Review', reviewSchema)

export default Review 