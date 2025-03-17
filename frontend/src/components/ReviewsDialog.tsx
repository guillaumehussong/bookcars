import React, { useEffect, useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Button,
  IconButton,
  Typography,
  Box,
  Rating,
  Avatar,
  Divider,
  CircularProgress,
} from '@mui/material'
import { Close as CloseIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '../lang/reviews'
import { strings as commonStrings } from '../lang/common'
import * as ReviewService from '../services/ReviewService'
import env from '../config/env.config'
import * as helper from '../common/helper'
import * as bookcarsHelper from ':bookcars-helper'

import '../assets/css/reviews-dialog.css'

interface ReviewsDialogProps {
  open: boolean
  onClose: () => void
  carId?: string
  supplierId?: string
}

const ReviewsDialog = ({
  open,
  onClose,
  carId,
  supplierId,
}: ReviewsDialogProps) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [reviews, setReviews] = useState<bookcarsTypes.Review[]>([])
  const [page, setPage] = useState<number>(1)
  const [totalRecords, setTotalRecords] = useState<number>(0)
  const [fetchingMore, setFetchingMore] = useState<boolean>(false)
  const pageSize = 10

  useEffect(() => {
    if (open && (carId || supplierId)) {
      fetchReviews()
    } else {
      resetState()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, carId, supplierId])

  const resetState = () => {
    setReviews([])
    setPage(1)
    setTotalRecords(0)
    setLoading(true)
    setFetchingMore(false)
  }

  const fetchReviews = async () => {
    try {
      if (!carId && !supplierId) return

      setLoading(true)
      let result

      console.log('Fetching reviews for:', carId || supplierId)

      if (carId) {
        result = await ReviewService.getCarReviews(carId, page, pageSize)
      } else if (supplierId) {
        result = await ReviewService.getSupplierReviews(supplierId, page, pageSize)
      }

      console.log('API result:', result)

      if (result && result.length > 0 && result[0].resultData) {
        console.log('Setting reviews:', result[0].resultData)
        setReviews(result[0].resultData)
        if (result[0].pageInfo.length > 0) {
          setTotalRecords(result[0].pageInfo[0].totalRecords)
        }
      } else {
        console.log('No reviews found in the result')
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      helper.error(err)
      setLoading(false)
    }
  }

  const loadMore = async () => {
    try {
      const nextPage = page + 1
      setFetchingMore(true)
      setPage(nextPage)

      let result
      if (carId) {
        result = await ReviewService.getCarReviews(carId, nextPage, pageSize)
      } else if (supplierId) {
        result = await ReviewService.getSupplierReviews(supplierId, nextPage, pageSize)
      }

      if (result && result.length > 0 && result[0].resultData) {
        setReviews([...reviews, ...result[0].resultData])
      }
      setFetchingMore(false)
    } catch (err) {
      helper.error(err)
      setFetchingMore(false)
    }
  }

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  console.log('Current reviews state:', reviews)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      className="reviews-dialog"
    >
      <DialogTitle>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Typography variant="h6">{strings.REVIEWS}</Typography>
          <IconButton onClick={onClose} size="large">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent dividers>
        {loading ? (
          <Box display="flex" justifyContent="center" p={3}>
            <CircularProgress />
          </Box>
        ) : reviews.length === 0 ? (
          <Typography align="center" p={3}>
            {strings.NO_REVIEWS}
          </Typography>
        ) : (
          <>
            {reviews.map((review) => (
              <Box key={review._id} className="review-item">
                <Box display="flex" alignItems="flex-start" mb={1}>
                  <Avatar
                    src={
                      typeof review.user === 'object' && review.user.avatar
                        ? bookcarsHelper.joinURL(env.CDN_USERS, review.user.avatar)
                        : undefined
                    }
                    alt={typeof review.user === 'object' ? review.user.fullName : ''}
                    className="review-avatar"
                  />
                  <Box ml={2} flexGrow={1}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {typeof review.user === 'object' ? review.user.fullName : ''}
                    </Typography>
                    <Box display="flex" alignItems="center">
                      <Rating value={review.rating} precision={0.5} readOnly size="small" />
                      <Typography variant="body2" color="textSecondary" ml={1}>
                        {review.createdAt && formatDate(review.createdAt)}
                      </Typography>
                    </Box>
                    <Typography variant="body1" mt={1}>
                      {review.comment}
                    </Typography>

                    {review.reply && (
                      <Box mt={2} p={2} bgcolor="#f5f5f5" borderRadius={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {typeof review.supplier === 'object' ? review.supplier.fullName : strings.SUPPLIER_REPLY}
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                          {review.reply.date && formatDate(review.reply.date)}
                        </Typography>
                        <Typography variant="body2" mt={1}>
                          {review.reply.comment}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </Box>
                <Divider />
              </Box>
            ))}

            {reviews.length < totalRecords && (
              <Box display="flex" justifyContent="center" mt={2}>
                <Button
                  onClick={loadMore}
                  variant="outlined"
                  disabled={fetchingMore}
                  startIcon={fetchingMore ? <CircularProgress size={20} /> : null}
                >
                  {fetchingMore ? commonStrings.LOADING : strings.LOAD_MORE}
                </Button>
              </Box>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ReviewsDialog 