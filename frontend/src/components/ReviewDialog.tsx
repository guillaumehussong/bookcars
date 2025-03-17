import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Rating,
  TextField,
  Box,
  Typography,
} from '@mui/material'
import * as bookcarsTypes from ':bookcars-types'
import * as ReviewService from '../services/ReviewService'
import { strings } from '../lang/reviews'
import { strings as commonStrings } from '../lang/common'
import * as helper from '../common/helper'

import '../assets/css/review-dialog.css'

interface ReviewDialogProps {
  open: boolean
  onClose: () => void
  booking: bookcarsTypes.Booking
  onSubmitSuccess: () => void
}

const ReviewDialog = ({
  open,
  onClose,
  booking,
  onSubmitSuccess,
}: ReviewDialogProps) => {
  const [rating, setRating] = useState<number>(5)
  const [comment, setComment] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<boolean>(false)

  const handleRatingChange = (_event: React.SyntheticEvent, newValue: number | null) => {
    if (newValue !== null) {
      setRating(newValue)
    }
  }

  const handleCommentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setComment(e.target.value)
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      setError(false)

      if (!booking?._id || !booking.car || !booking.supplier || !booking.driver) {
        helper.error()
        setError(true)
        return
      }

      const reviewData: bookcarsTypes.Review = {
        booking: booking._id,
        car: booking.car,
        supplier: booking.supplier,
        user: booking.driver,
        rating,
        comment,
        status: bookcarsTypes.ReviewStatus.Pending,
      }

      await ReviewService.create(reviewData)
      setLoading(false)
      
      if (onSubmitSuccess) {
        onSubmitSuccess()
      }
      
      onClose()
    } catch (err) {
      setLoading(false)
      setError(true)
      helper.error(err)
    }
  }

  return (
    <Dialog open={open} onClose={onClose} className="review-dialog">
      <DialogTitle>{strings.REVIEW_EXPERIENCE}</DialogTitle>
      <DialogContent>
        <Box className="rating-container">
          <Typography component="legend">{strings.YOUR_RATING}</Typography>
          <Rating
            name="rating"
            value={rating}
            precision={0.5}
            onChange={handleRatingChange}
            size="large"
          />
        </Box>
        <TextField
          autoFocus
          margin="dense"
          id="comment"
          label={strings.YOUR_REVIEW}
          type="text"
          fullWidth
          multiline
          rows={4}
          variant="outlined"
          value={comment}
          onChange={handleCommentChange}
        />
        {error && (
          <Typography color="error" className="error-message">
            {commonStrings.GENERIC_ERROR}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="primary" disabled={loading}>
          {commonStrings.CANCEL}
        </Button>
        <Button
          onClick={handleSubmit}
          color="primary"
          variant="contained"
          disabled={loading}
        >
          {loading ? commonStrings.LOADING : strings.SUBMIT_REVIEW}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default ReviewDialog 