import express, { Request, Response } from 'express'
import axios from 'axios'
import mongoose from 'mongoose'
import config from '../config/env.config'
import * as helper from '../common/helper'
import i18n from '../lang/i18n'
import Location from '../models/Location'
import LocationValue from '../models/LocationValue'
import * as logger from '../common/logger'

const router = express.Router()

// Google Maps API Key from environment variables
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || ''

// Get Google Maps Place Details including reviews
router.get('/api/google-place-details/:placeId', async (req: Request, res: Response) => {
  try {
    const { placeId } = req.params
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' })
    }
    
    console.log(`Fetching place details for place ID: ${placeId}`)
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,rating,user_ratings_total,reviews&key=${GOOGLE_MAPS_API_KEY}`
    
    const response = await axios.get(url)
    const data = response.data
    
    if (data.status === 'OK') {
      console.log(`Successfully fetched place details for ${data.result.name}`)
      console.log(`Number of reviews: ${data.result.reviews ? data.result.reviews.length : 0}`)
      return res.json(data.result)
    } else {
      console.error(`Failed to fetch place details: ${data.status}, ${data.error_message || 'No error message'}`)
      return res.status(404).json({ error: 'Place not found', status: data.status, message: data.error_message })
    }
  } catch (error) {
    console.error('Error fetching place details:', error)
    return res.status(500).json({ error: 'Failed to fetch place details' })
  }
})

// Find a place ID based on name and location
router.get('/api/google-find-place/:name/:location?', async (req: Request, res: Response) => {
  try {
    const { name, location } = req.params
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' })
    }
    
    const query = location ? `${name} ${location}` : name
    console.log(`Searching for place: "${query}"`)
    const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=place_id,name,formatted_address&key=${GOOGLE_MAPS_API_KEY}`
    
    const response = await axios.get(url)
    const data = response.data
    
    if (data.status === 'OK' && data.candidates && data.candidates.length > 0) {
      console.log(`Found place: ${data.candidates[0].name || data.candidates[0].place_id}`)
      return res.json(data.candidates[0].place_id)
    } else {
      console.error(`Place not found: ${data.status}, ${data.error_message || 'No error message'}`)
      return res.status(404).json({ error: 'Place not found', status: data.status, message: data.error_message })
    }
  } catch (error) {
    console.error('Error finding place:', error)
    return res.status(500).json({ error: 'Failed to find place' })
  }
})

// Geocode an address to coordinates
router.get('/api/geocode/:address', async (req: Request, res: Response) => {
  try {
    const { address } = req.params
    
    if (!GOOGLE_MAPS_API_KEY) {
      return res.status(500).json({ error: 'Google Maps API key not configured' })
    }
    
    console.log(`Geocoding address: "${address}"`)
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`
    
    const response = await axios.get(url)
    const data = response.data
    
    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location
      console.log(`Geocoded to: (${location.lat}, ${location.lng})`)
      return res.json({ lat: location.lat, lng: location.lng })
    } else {
      console.error(`Address not found: ${data.status}, ${data.error_message || 'No error message'}`)
      return res.status(404).json({ error: 'Address not found', status: data.status, message: data.error_message })
    }
  } catch (error) {
    console.error('Error geocoding address:', error)
    return res.status(500).json({ error: 'Failed to geocode address' })
  }
})

// Create a location from Google Maps data (no authentication required)
router.post('/api/create-location-from-google-maps', async (req: Request, res: Response) => {
  try {
    const { googleMapsId, name, latitude, longitude } = req.body
    
    if (!googleMapsId || !name || latitude === undefined || longitude === undefined) {
      return res.status(400).json({ error: 'Missing required fields' })
    }
    
    // Check if location with this Google Maps ID already exists
    const existingLocation = await Location.findOne({ googleMapsId })
    
    if (existingLocation) {
      logger.info(`[googleMaps.createLocationFromGoogleMaps] Location with Google Maps ID ${googleMapsId} already exists`)
      return res.json(existingLocation)
    }
    
    // Create location value for the default language
    const locationValue = new LocationValue({
      language: 'en',
      value: name,
    })
    await locationValue.save()
    
    // Create the location
    const location = new Location({
      googleMapsId,
      values: [locationValue.id],
      latitude,
      longitude,
    })
    
    await location.save()
    logger.info(`[googleMaps.createLocationFromGoogleMaps] Created new location: ${location._id} with name: ${name}`)
    
    return res.json(location)
  } catch (err) {
    logger.error(`[googleMaps.createLocationFromGoogleMaps] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
})

export default router 