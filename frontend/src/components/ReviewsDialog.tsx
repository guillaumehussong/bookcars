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
  ToggleButtonGroup,
  ToggleButton,
  Link,
} from '@mui/material'
import { Close as CloseIcon, Google as GoogleIcon } from '@mui/icons-material'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '../lang/reviews'
import { strings as commonStrings } from '../lang/common'
import * as ReviewService from '../services/ReviewService'
import * as GoogleMapsService from '../services/GoogleMapsService'
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

// Review source type
type ReviewSource = 'website' | 'google' | 'all'

const ReviewsDialog = ({
  open,
  onClose,
  carId,
  supplierId,
}: ReviewsDialogProps) => {
  const [loading, setLoading] = useState<boolean>(true)
  const [reviews, setReviews] = useState<bookcarsTypes.Review[]>([])
  const [googleReviews, setGoogleReviews] = useState<GoogleMapsService.GoogleReview[]>([])
  const [loadingGoogleReviews, setLoadingGoogleReviews] = useState<boolean>(false)
  const [page, setPage] = useState<number>(1)
  const [totalRecords, setTotalRecords] = useState<number>(0)
  const [fetchingMore, setFetchingMore] = useState<boolean>(false)
  const [reviewSource, setReviewSource] = useState<ReviewSource>('all')
  const [supplierName, setSupplierName] = useState<string>('')
  const pageSize = 10

  useEffect(() => {
    if (open) {
      setPage(1)
      setReviews([])
      setGoogleReviews([])
      setTotalRecords(0)
      setLoading(true)
      
      // Log the API key usage
      console.log('Dialog opened, will use Google Maps API for supplier reviews')
      
      // Set default review source to 'all' regardless of type
      setReviewSource('all')
      
      fetchReviews()
      
      // Directly call fetchGoogleReviews if we have a supplierId
      if (supplierId) {
        // Try to get the supplier name from the URL or a default value
        const supplierNameFromUrl = new URLSearchParams(window.location.search).get('supplier')
        const supplierName = supplierNameFromUrl || 'Good Cars' // Use 'Good Cars' as fallback
        console.log('Directly fetching Google reviews with supplier name:', supplierName)
        console.log('Using supplier ID:', supplierId)
        fetchGoogleReviews(supplierId, supplierName)
      }
    } else {
      resetState()
    }
  }, [open])

  const resetState = () => {
    setReviews([])
    setGoogleReviews([])
    setPage(1)
    setTotalRecords(0)
    setLoading(true)
    setFetchingMore(false)
    setReviewSource('all')
    setSupplierName('')
    setLoadingGoogleReviews(false)
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
        
        // Get supplier name for Google reviews if this is a supplier review
        if (supplierId && result[0].resultData.length > 0) {
          const review = result[0].resultData[0]
          if (review.supplier && typeof review.supplier === 'object') {
            setSupplierName(review.supplier.fullName)
            // Fetch Google reviews if we have the supplier name
            fetchGoogleReviews(supplierId, review.supplier.fullName)
          }
        }
        
        if (result[0].pageInfo.length > 0) {
          setTotalRecords(result[0].pageInfo[0].totalRecords)
        }
      } else {
        console.log('No reviews found in the result')
        setReviews([])
        
        // Still try to fetch Google reviews even if there are no website reviews
        if (supplierId) {
          // Try to get supplier name from URL or use default
          const supplierNameFromUrl = new URLSearchParams(window.location.search).get('supplier')
          const supplierName = supplierNameFromUrl || 'Good Cars' // Use 'Good Cars' as fallback
          console.log('No website reviews, but trying Google reviews with supplier name:', supplierName)
          fetchGoogleReviews(supplierId, supplierName)
        }
      }
      setLoading(false)
    } catch (err) {
      console.error('Error fetching reviews:', err)
      setReviews([])
      setLoading(false)
    }
  }

  const fetchGoogleReviews = async (supplierId: string, name: string) => {
    try {
      setLoadingGoogleReviews(true)
      console.log('Fetching Google reviews for supplier:', name, 'with ID:', supplierId)
      
      // Normalize the supplier name a bit (trim, etc.)
      const normalizedName = name.trim()
      if (!normalizedName) {
        console.warn('Empty supplier name provided, unable to fetch Google reviews')
        setGoogleReviews([])
        setLoadingGoogleReviews(false)
        return
      }
      
      // Log the known place IDs
      console.log('Known place IDs mapping:', GoogleMapsService.KNOWN_PLACE_IDS)
      
      // Log if the supplier name is in the known IDs
      if (normalizedName in GoogleMapsService.KNOWN_PLACE_IDS) {
        console.log(`Found known place ID for ${normalizedName}: ${GoogleMapsService.KNOWN_PLACE_IDS[normalizedName]}`)
      } else {
        console.log(`No known place ID for ${normalizedName}, will need to search for it`)
      }
      
      const result = await GoogleMapsService.getSupplierGoogleReviews(supplierId, normalizedName)
      console.log('Google reviews result raw:', result)
      console.log('Number of Google reviews returned:', result ? result.length : 0)
      
      setGoogleReviews(result)
      setLoadingGoogleReviews(false)
    } catch (err) {
      console.error('Error fetching Google reviews:', err)
      setGoogleReviews([])
      setLoadingGoogleReviews(false)
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

  const handleReviewSourceChange = (_: React.MouseEvent<HTMLElement>, newSource: ReviewSource | null) => {
    if (newSource) {
      setReviewSource(newSource)
    }
  }

  console.log('Current reviews state:', reviews)
  console.log('Current Google reviews state:', googleReviews)

  // Filter reviews based on the selected source
  const displayedReviews = reviewSource === 'website' ? reviews : 
                          reviewSource === 'google' ? [] : 
                          reviews

  // Determine if we should show Google reviews section
  const showGoogleReviews = reviewSource === 'google' || reviewSource === 'all'

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
        {/* Review source filter */}
        {supplierId && (
          <Box display="flex" justifyContent="center" mb={3}>
            <ToggleButtonGroup
              value={reviewSource}
              exclusive
              onChange={handleReviewSourceChange}
              aria-label={strings.REVIEW_SOURCE}
              size="small"
              sx={{
                '& .MuiToggleButton-root.Mui-selected': {
                  backgroundColor: '#FF9800', // Orange
                  color: '#FFFFFF', // White
                  '&:hover': {
                    backgroundColor: '#F57C00', // Darker orange on hover
                  }
                }
              }}
            >
              <ToggleButton value="all" aria-label={strings.ALL_REVIEWS}>
                {strings.ALL_REVIEWS}
              </ToggleButton>
              <ToggleButton value="website" aria-label={strings.WEBSITE_REVIEWS}>
                {strings.WEBSITE_REVIEWS}
              </ToggleButton>
              <ToggleButton value="google" aria-label={strings.GOOGLE_REVIEWS}>
                <Box display="flex" alignItems="center">
                  <GoogleIcon fontSize="small" sx={{ mr: 1 }} />
                  {strings.GOOGLE_REVIEWS}
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        )}

        {/* Website reviews section */}
        {reviewSource !== 'google' && (
          <>
            {loading ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
              </Box>
            ) : displayedReviews.length === 0 ? (
              <Typography align="center" p={3}>
                {strings.NO_REVIEWS}
              </Typography>
            ) : (
              <>
                {reviewSource === 'all' && displayedReviews.length > 0 && (
                  <Typography variant="subtitle1" fontWeight="bold" ml={2} mb={2}>
                    {strings.WEBSITE_REVIEWS}
                  </Typography>
                )}
                
                {displayedReviews.map((review) => (
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

                {displayedReviews.length < totalRecords && (
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
          </>
        )}

        {/* Google reviews section */}
        {showGoogleReviews && (
          <Box mt={reviewSource === 'all' ? 4 : 0}>
            {reviewSource === 'all' && (
              <Typography variant="subtitle1" fontWeight="bold" ml={2} mb={2}>
                {strings.GOOGLE_REVIEWS}
              </Typography>
            )}
            
            {loadingGoogleReviews ? (
              <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
                <Typography ml={2}>{strings.LOADING_GOOGLE_REVIEWS}</Typography>
              </Box>
            ) : googleReviews.length === 0 ? (
              <Typography align="center" p={3}>
                {strings.NO_GOOGLE_REVIEWS}
              </Typography>
            ) : (
              <>
                {googleReviews.map((review, index) => (
                  <Box key={`google-${index}`} className="review-item">
                    <Box display="flex" alignItems="flex-start" mb={1}>
                      <Avatar
                        src={review.profile_photo_url}
                        alt={review.author_name}
                        className="review-avatar"
                      />
                      <Box ml={2} flexGrow={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {review.author_name}
                        </Typography>
                        <Box display="flex" alignItems="center">
                          <Rating value={review.rating} precision={0.5} readOnly size="small" />
                          <Typography variant="body2" color="textSecondary" ml={1}>
                            {review.relative_time_description}
                          </Typography>
                          <Box display="flex" alignItems="center" ml={2}>
                            <GoogleIcon fontSize="small" sx={{ mr: 0.5 }} />
                            <Typography variant="body2" color="textSecondary">
                              {strings.POSTED_ON_GOOGLE}
                            </Typography>
                          </Box>
                        </Box>
                        <Typography variant="body1" mt={1}>
                          {review.text}
                        </Typography>
                      </Box>
                    </Box>
                    <Divider />
                  </Box>
                ))}
                
                <Box display="flex" justifyContent="center" mt={2}>
                  <Link 
                    href={`https://www.google.com/search?q=${encodeURIComponent(supplierName)}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="outlined"
                      startIcon={<GoogleIcon />}
                    >
                      {strings.VIEW_ON_GOOGLE}
                    </Button>
                  </Link>
                </Box>
              </>
            )}
          </Box>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default ReviewsDialog 