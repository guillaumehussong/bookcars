import fs from 'node:fs/promises'
import path from 'node:path'
import { nanoid } from 'nanoid'
import escapeStringRegexp from 'escape-string-regexp'
import mongoose from 'mongoose'
import { Request, Response } from 'express'
import * as bookcarsTypes from ':bookcars-types'
import Booking from '../models/Booking'
import Car from '../models/Car'
import i18n from '../lang/i18n'
import * as env from '../config/env.config'
import * as helper from '../common/helper'
import * as logger from '../common/logger'
import DateBasedPrice from '../models/DateBasedPrice'
import Location from '../models/Location'

/**
 * Create a Car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const create = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.CreateCarPayload } = req

  try {
    if (!body.image) {
      throw new Error('Image not found in payload')
    }

    // date based price
    const { dateBasedPrices, ...carFields } = body
    const dateBasedPriceIds: string[] = []
    if (body.isDateBasedPrice) {
      for (const dateBasePrice of dateBasedPrices) {
        const dbp = new DateBasedPrice(dateBasePrice)
        await dbp.save()
        dateBasedPriceIds.push(dbp.id)
      }
    }

    const car = new Car({ ...carFields, dateBasedPrices: dateBasedPriceIds })
    await car.save()

    const image = path.join(env.CDN_TEMP_CARS, body.image)

    if (await helper.exists(image)) {
      const filename = `${car._id}_${Date.now()}${path.extname(body.image)}`
      const newPath = path.join(env.CDN_CARS, filename)

      await fs.rename(image, newPath)
      car.image = filename
      await car.save()
    } else {
      await Car.deleteOne({ _id: car._id })
      throw new Error(`Image ${body.image} not found`)
    }

    return res.json(car)
  } catch (err) {
    logger.error(`[car.create] ${i18n.t('DB_ERROR')} ${JSON.stringify(body)}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

const createDateBasedPrice = async (dateBasedPrice: bookcarsTypes.DateBasedPrice): Promise<string> => {
  const dbp = new DateBasedPrice({
    startDate: dateBasedPrice.startDate,
    endDate: dateBasedPrice.endDate,
    dailyPrice: dateBasedPrice.dailyPrice,
  })
  await dbp.save()
  return dbp.id
}

/**
 * Update a Car.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const update = async (req: Request, res: Response) => {
  const { body }: { body: bookcarsTypes.UpdateCarPayload } = req
  const { _id } = body

  try {
    if (!helper.isValidObjectId(_id)) {
      throw new Error('body._id is not valid')
    }
    const car = await Car.findById(_id)

    if (car) {
      const {
        supplier,
        name,
        minimumAge,
        available,
        fullyBooked,
        comingSoon,
        type,
        locations,
        dailyPrice,
        discountedDailyPrice,
        biWeeklyPrice,
        discountedBiWeeklyPrice,
        weeklyPrice,
        discountedWeeklyPrice,
        monthlyPrice,
        discountedMonthlyPrice,
        deposit,
        seats,
        doors,
        aircon,
        gearbox,
        fuelPolicy,
        mileage,
        cancellation,
        amendments,
        theftProtection,
        collisionDamageWaiver,
        fullInsurance,
        additionalDriver,
        range,
        multimedia,
        rating,
        co2,
        isDateBasedPrice,
        dateBasedPrices,
      } = body

      car.supplier = new mongoose.Types.ObjectId(supplier)
      car.minimumAge = minimumAge
      car.locations = locations.map((l) => new mongoose.Types.ObjectId(l))
      car.name = name
      car.available = available
      car.fullyBooked = fullyBooked
      car.comingSoon = comingSoon
      car.type = type as bookcarsTypes.CarType
      car.dailyPrice = dailyPrice
      car.discountedDailyPrice = discountedDailyPrice
      car.biWeeklyPrice = biWeeklyPrice
      car.discountedBiWeeklyPrice = discountedBiWeeklyPrice
      car.weeklyPrice = weeklyPrice
      car.discountedWeeklyPrice = discountedWeeklyPrice
      car.monthlyPrice = monthlyPrice
      car.discountedMonthlyPrice = discountedMonthlyPrice
      car.deposit = deposit
      car.seats = seats
      car.doors = doors
      car.aircon = aircon
      car.gearbox = gearbox as bookcarsTypes.GearboxType
      car.fuelPolicy = fuelPolicy as bookcarsTypes.FuelPolicy
      car.mileage = mileage
      car.cancellation = cancellation
      car.amendments = amendments
      car.theftProtection = theftProtection
      car.collisionDamageWaiver = collisionDamageWaiver
      car.fullInsurance = fullInsurance
      car.additionalDriver = additionalDriver
      car.range = range
      car.multimedia = multimedia
      car.rating = rating
      car.co2 = co2
      car.isDateBasedPrice = isDateBasedPrice

      //
      // Date based prices
      //

      // Remove all date based prices not in body.dateBasedPrices
      const dateBasedPriceIds = dateBasedPrices.filter((dbp) => !!dbp._id).map((dbp) => dbp._id)
      const dateBasedPriceIdsToDelete = car.dateBasedPrices.filter((id) => !dateBasedPriceIds.includes(id.toString()))
      if (dateBasedPriceIdsToDelete.length > 0) {
        for (const dbpId of dateBasedPriceIdsToDelete) {
          car.dateBasedPrices.splice(car.dateBasedPrices.indexOf(dbpId), 1)
        }

        await DateBasedPrice.deleteMany({ _id: { $in: dateBasedPriceIdsToDelete } })
      }

      // Add all new date based prices
      for (const dateBasedPrice of dateBasedPrices.filter((dbp) => dbp._id === undefined)) {
        const dbpId = await createDateBasedPrice(dateBasedPrice)
        car.dateBasedPrices.push(new mongoose.Types.ObjectId(dbpId))
      }

      // Update existing date based prices
      for (const dateBasedPrice of dateBasedPrices.filter((dbp) => !!dbp._id)) {
        const dbp = await DateBasedPrice.findById(dateBasedPrice._id)
        if (dbp) {
          dbp.startDate = new Date(dateBasedPrice.startDate!)
          dbp.endDate = new Date(dateBasedPrice.endDate!)
          dbp.dailyPrice = Number(dateBasedPrice.dailyPrice)

          await dbp.save()
        }
      }

      await car.save()

      return res.json(car)
    }

    logger.error('[car.update] Car not found:', _id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.update] ${i18n.t('DB_ERROR')} ${_id}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Check if a Car is related to bookings.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const checkCar = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const _id = new mongoose.Types.ObjectId(id)
    const count = await Booking
      .find({ car: _id })
      .limit(1)
      .countDocuments()

    if (count === 1) {
      return res.sendStatus(200)
    }

    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.check] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Delete a Car by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteCar = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const car = await Car.findById(id)
    if (car) {
      await Car.deleteOne({ _id: id })

      if (car.dateBasedPrices?.length > 0) {
        await DateBasedPrice.deleteMany({ _id: { $in: car.dateBasedPrices } })
      }

      if (car.image) {
        const image = path.join(env.CDN_CARS, car.image)
        if (await helper.exists(image)) {
          await fs.unlink(image)
        }
      }
      await Booking.deleteMany({ car: car._id })
    } else {
      return res.sendStatus(204)
    }
    return res.sendStatus(200)
  } catch (err) {
    logger.error(`[car.delete] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Upload a Car image to temp folder.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const createImage = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      throw new Error('[car.createImage] req.file not found')
    }

    const filename = `${helper.getFilenameWithoutExtension(req.file.originalname)}_${nanoid()}_${Date.now()}${path.extname(req.file.originalname)}`
    const filepath = path.join(env.CDN_TEMP_CARS, filename)

    await fs.writeFile(filepath, req.file.buffer)
    return res.json(filename)
  } catch (err) {
    logger.error(`[car.createImage] ${i18n.t('DB_ERROR')}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Update a Car image.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const updateImage = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    if (!req.file) {
      const msg = '[car.updateImage] req.file not found'
      logger.error(msg)
      return res.status(400).send(msg)
    }

    const { file } = req

    const car = await Car.findById(id)

    if (car) {
      if (car.image) {
        const image = path.join(env.CDN_CARS, car.image)
        if (await helper.exists(image)) {
          await fs.unlink(image)
        }
      }

      const filename = `${car._id}_${Date.now()}${path.extname(file.originalname)}`
      const filepath = path.join(env.CDN_CARS, filename)

      await fs.writeFile(filepath, file.buffer)
      car.image = filename
      await car.save()
      return res.json(filename)
    }

    logger.error('[car.updateImage] Car not found:', id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.updateImage] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete a Car image.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const deleteImage = async (req: Request, res: Response) => {
  const { id } = req.params

  try {
    const car = await Car.findById(id)

    if (car) {
      if (car.image) {
        const image = path.join(env.CDN_CARS, car.image)
        if (await helper.exists(image)) {
          await fs.unlink(image)
        }
      }
      car.image = null

      await car.save()
      return res.sendStatus(200)
    }
    logger.error('[car.deleteImage] Car not found:', id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.deleteImage] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Delete a temp Car image.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {*}
 */
export const deleteTempImage = async (req: Request, res: Response) => {
  const { image } = req.params

  try {
    const imageFile = path.join(env.CDN_TEMP_CARS, image)
    if (!await helper.exists(imageFile)) {
      throw new Error(`[car.deleteTempImage] temp image ${imageFile} not found`)
    }

    await fs.unlink(imageFile)

    res.sendStatus(200)
  } catch (err) {
    logger.error(`[car.deleteTempImage] ${i18n.t('DB_ERROR')} ${image}`, err)
    res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get a Car by ID.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCar = async (req: Request, res: Response) => {
  const { id, language } = req.params

  try {
    const car = await Car.findById(id)
      .populate<{ supplier: env.UserInfo }>('supplier')
      .populate<{ dateBasedPrices: env.DateBasedPrice[] }>('dateBasedPrices')
      .populate<{ locations: env.LocationInfo[] }>({
        path: 'locations',
        populate: {
          path: 'values',
          model: 'LocationValue',
        },
      })
      .lean()

    if (car) {
      const {
        _id,
        fullName,
        avatar,
        payLater,
        licenseRequired,
      } = car.supplier
      car.supplier = {
        _id,
        fullName,
        avatar,
        payLater,
        licenseRequired,
      }

      for (const location of car.locations) {
        location.name = location.values.filter((value) => value.language === language)[0].value
      }

      return res.json(car)
    }
    logger.error('[car.getCar] Car not found:', id)
    return res.sendStatus(204)
  } catch (err) {
    logger.error(`[car.getCar] ${i18n.t('DB_ERROR')} ${id}`, err)
    return res.status(400).send(i18n.t('ERROR') + err)
  }
}

/**
 * Get Cars.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getCars = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.GetCarsPayload } = req
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const suppliers = body.suppliers!.map((id) => new mongoose.Types.ObjectId(id))
    const {
      carType,
      gearbox,
      mileage,
      deposit,
      availability,
      fuelPolicy,
      carSpecs,
      ranges,
      multimedia,
      rating,
      seats,
    } = body
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'

    const $match: mongoose.FilterQuery<bookcarsTypes.Car> = {
      $and: [
        { name: { $regex: keyword, $options: options } },
        { supplier: { $in: suppliers } },
      ],
    }

    if (fuelPolicy) {
      $match.$and!.push({ fuelPolicy: { $in: fuelPolicy } })
    }

    if (carSpecs) {
      if (carSpecs.aircon) {
        $match.$and!.push({ aircon: true })
      }
      if (carSpecs.moreThanFourDoors) {
        $match.$and!.push({ doors: { $gt: 4 } })
      }
      if (carSpecs.moreThanFiveSeats) {
        $match.$and!.push({ seats: { $gt: 5 } })
      }
    }

    if (carType) {
      $match.$and!.push({ type: { $in: carType } })
    }

    if (gearbox) {
      $match.$and!.push({ gearbox: { $in: gearbox } })
    }

    if (mileage) {
      if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Limited) {
        $match.$and!.push({ mileage: { $gt: -1 } })
      } else if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Unlimited) {
        $match.$and!.push({ mileage: -1 })
      } else if (mileage.length === 0) {
        return res.json([{ resultData: [], pageInfo: [] }])
      }
    }

    if (deposit && deposit > -1) {
      $match.$and!.push({ deposit: { $lte: deposit } })
    }

    if (Array.isArray(availability)) {
      if (availability.length === 1 && availability[0] === bookcarsTypes.Availablity.Available) {
        $match.$and!.push({ available: true })
      } else if (availability.length === 1
        && availability[0] === bookcarsTypes.Availablity.Unavailable) {
        $match.$and!.push({ available: false })
      } else if (availability.length === 0) {
        return res.json([{ resultData: [], pageInfo: [] }])
      }
    }

    if (ranges) {
      $match.$and!.push({ range: { $in: ranges } })
    }

    if (multimedia && multimedia.length > 0) {
      for (const multimediaOption of multimedia) {
        $match.$and!.push({ multimedia: multimediaOption })
      }
    }

    if (rating && rating > -1) {
      $match.$and!.push({ rating: { $gte: rating } })
    }

    if (seats) {
      if (seats > -1) {
        if (seats === 6) {
          $match.$and!.push({ seats: { $gt: 5 } })
        } else {
          $match.$and!.push({ seats })
        }
      }
    }

    const data = await Car.aggregate(
      [
        { $match },
        {
          $lookup: {
            from: 'User',
            let: { userId: '$supplier' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$userId'] },
                },
              },
            ],
            as: 'supplier',
          },
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
        // {
        //   $lookup: {
        //     from: 'Location',
        //     let: { locations: '$locations' },
        //     pipeline: [
        //       {
        //         $match: {
        //           $expr: { $in: ['$_id', '$$locations'] },
        //         },
        //       },
        //     ],
        //     as: 'locations',
        //   },
        // },
        {
          $facet: {
            resultData: [{ $sort: { updatedAt: -1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
            // resultData: [{ $sort: { dailyPrice: 1, _id: 1 } }, { $skip: (page - 1) * size }, { $limit: size }],
            pageInfo: [
              {
                $count: 'totalRecords',
              },
            ],
          },
        },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    for (const car of data[0].resultData) {
      const { _id, fullName, avatar } = car.supplier
      car.supplier = { _id, fullName, avatar }
    }

    return res.json(data)
  } catch (err) {
    logger.error(`[car.getCars] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get Cars by Supplier and pick-up Location.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getBookingCars = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.GetBookingCarsPayload } = req
    const supplier = new mongoose.Types.ObjectId(body.supplier)
    const pickupLocation = new mongoose.Types.ObjectId(body.pickupLocation)
    const keyword = escapeStringRegexp(String(req.query.s || ''))
    const options = 'i'
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)

    const cars = await Car.aggregate(
      [
        {
          $match: {
            $and: [
              { supplier: { $eq: supplier } },
              { locations: pickupLocation },
              { available: true }, { name: { $regex: keyword, $options: options } },
            ],
          },
        },
        { $sort: { name: 1, _id: 1 } },
        { $skip: (page - 1) * size },
        { $limit: size },
      ],
      { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
    )

    return res.json(cars)
  } catch (err) {
    logger.error(`[car.getBookingCars] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}

/**
 * Get Cars available for rental.
 *
 * @export
 * @async
 * @param {Request} req
 * @param {Response} res
 * @returns {unknown}
 */
export const getFrontendCars = async (req: Request, res: Response) => {
  try {
    const { body }: { body: bookcarsTypes.GetCarsPayload } = req
    const page = Number.parseInt(req.params.page, 10)
    const size = Number.parseInt(req.params.size, 10)
    const suppliers = body.suppliers && body.suppliers.length > 0 
      ? body.suppliers.map((id) => new mongoose.Types.ObjectId(id))
      : []
    
    // Coordonnées de recherche - priorité aux coordonnées directes
    let searchCoordinates = null
    let pickupLocation = null

    // Si des coordonnées directes sont fournies, les utiliser
    if (body.pickupCoordinates && body.pickupCoordinates.latitude && body.pickupCoordinates.longitude) {
      searchCoordinates = {
        latitude: body.pickupCoordinates.latitude,
        longitude: body.pickupCoordinates.longitude
      }
      logger.info(`[car.getFrontendCars] Using provided coordinates: ${JSON.stringify(searchCoordinates)}`)
    } 
    // Sinon, essayer de récupérer l'emplacement par ID
    else if (body.pickupLocation) {
      try {
        pickupLocation = new mongoose.Types.ObjectId(body.pickupLocation)
        // Récupérer les coordonnées de l'emplacement
        const selectedLocation = await Location.findById(pickupLocation).lean()
        if (selectedLocation && selectedLocation.latitude && selectedLocation.longitude) {
          searchCoordinates = {
            latitude: selectedLocation.latitude,
            longitude: selectedLocation.longitude
          }
          logger.info(`[car.getFrontendCars] Using location coordinates: ${JSON.stringify(searchCoordinates)}`)
        } else {
          logger.info(`[car.getFrontendCars] Location found but no coordinates available: ${pickupLocation}`)
        }
      } catch (err) {
        logger.info(`[car.getFrontendCars] Invalid pickup location ID: ${body.pickupLocation}`)
      }
    }

    // Si aucune coordonnée n'est disponible, retourner un résultat vide
    if (!searchCoordinates && !pickupLocation) {
      logger.info(`[car.getFrontendCars] No valid coordinates or location provided`)
      return res.json([{ resultData: [], pageInfo: [{ totalRecords: 0 }] }])
    }
    
    const {
      carType,
      gearbox,
      mileage,
      fuelPolicy,
      deposit,
      carSpecs,
      ranges,
      multimedia,
      rating,
      seats,
      days,
      includeAlreadyBookedCars,
      includeComingSoonCars,
      searchRadius = 10, // Default search radius: 10km
      exactLocationOnly = false, // Default: include nearby locations
    } = body

    // Log search parameters
    logger.info(`[car.getFrontendCars] Search parameters: 
      suppliers: ${JSON.stringify(suppliers)}, 
      coordinates: ${JSON.stringify(searchCoordinates)},
      pickupLocation: ${pickupLocation}, 
      carType: ${JSON.stringify(carType)}, 
      gearbox: ${JSON.stringify(gearbox)},
      searchRadius: ${searchRadius},
      exactLocationOnly: ${exactLocationOnly}
    `)

    const $match: mongoose.FilterQuery<bookcarsTypes.Car> = {
      $and: [
        { type: { $in: carType } },
        { gearbox: { $in: gearbox } },
        { available: true },
      ],
    }

    // Ajouter le filtre de fournisseur seulement si des fournisseurs sont spécifiés
    if (suppliers.length > 0) {
      $match.$and!.push({ supplier: { $in: suppliers } })
    } else {
      logger.info(`[car.getFrontendCars] No suppliers specified, showing cars from all suppliers`)
    }

    // Si exactLocationOnly est true et que nous avons un ID d'emplacement, filtrer par cet emplacement
    if (exactLocationOnly && pickupLocation) {
      $match.$and!.push({ locations: pickupLocation })
    }

    // Log the match query
    logger.info(`[car.getFrontendCars] Match query: ${JSON.stringify($match)}`)

    if (!includeAlreadyBookedCars) {
      $match.$and!.push({ $or: [{ fullyBooked: false }, { fullyBooked: null }] })
    }

    if (!includeComingSoonCars) {
      $match.$and!.push({ $or: [{ comingSoon: false }, { comingSoon: null }] })
    }

    if (fuelPolicy) {
      $match.$and!.push({ fuelPolicy: { $in: fuelPolicy } })
    }

    if (carSpecs) {
      if (carSpecs.aircon) {
        $match.$and!.push({ aircon: true })
      }
      if (carSpecs.moreThanFourDoors) {
        $match.$and!.push({ doors: { $gt: 4 } })
      }
      if (carSpecs.moreThanFiveSeats) {
        $match.$and!.push({ seats: { $gt: 5 } })
      }
    }

    if (mileage) {
      if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Limited) {
        $match.$and!.push({ mileage: { $gt: -1 } })
      } else if (mileage.length === 1 && mileage[0] === bookcarsTypes.Mileage.Unlimited) {
        $match.$and!.push({ mileage: -1 })
      } else if (mileage.length === 0) {
        return res.json([{ resultData: [], pageInfo: [] }])
      }
    }

    if (deposit && deposit > -1) {
      $match.$and!.push({ deposit: { $lte: deposit } })
    }

    if (ranges) {
      $match.$and!.push({ range: { $in: ranges } })
    }

    if (multimedia && multimedia.length > 0) {
      for (const multimediaOption of multimedia) {
        $match.$and!.push({ multimedia: multimediaOption })
      }
    }

    if (rating && rating > -1) {
      $match.$and!.push({ rating: { $gte: rating } })
    }

    if (seats) {
      if (seats > -1) {
        if (seats === 6) {
          $match.$and!.push({ seats: { $gt: 5 } })
        } else {
          $match.$and!.push({ seats })
        }
      }
    }

    let $supplierMatch: mongoose.FilterQuery<any> = {}
    if (days) {
      $supplierMatch = { $or: [{ 'supplier.minimumRentalDays': { $lte: days } }, { 'supplier.minimumRentalDays': null }] }
    }

    // Si nous n'avons pas de coordonnées de recherche ou si exactLocationOnly est true et que nous avons un ID d'emplacement,
    // utiliser la requête originale
    if (!searchCoordinates || (exactLocationOnly && pickupLocation)) {
      // Original query for exact location search
      const data = await Car.aggregate(
        [
          { $match },
          {
            $lookup: {
              from: 'User',
              let: { userId: '$supplier' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', '$$userId'] },
                  },
                },
              ],
              as: 'supplier',
            },
          },
          { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
          {
            $match: $supplierMatch,
          },
          {
            $lookup: {
              from: 'DateBasedPrice',
              let: { dateBasedPrices: '$dateBasedPrices' },
              pipeline: [
                {
                  $match: {
                    $expr: { $in: ['$_id', '$$dateBasedPrices'] },
                  },
                },
              ],
              as: 'dateBasedPrices',
            },
          },
          {
            $facet: {
              resultData: [
                {
                  $sort: { dailyPrice: 1, _id: 1 },
                },
                { $skip: (page - 1) * size },
                { $limit: size },
              ],
              pageInfo: [
                {
                  $count: 'totalRecords',
                },
              ],
            },
          },
        ],
        { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } },
      )

      for (const car of data[0].resultData) {
        const { _id, fullName, avatar } = car.supplier
        car.supplier = { _id, fullName, avatar }
      }

      return res.json(data)
    } else {
      // Recherche basée sur les coordonnées GPS
      // We need to include the locations in the result to calculate distances
      const pipeline = [
        { $match },
        {
          $lookup: {
            from: 'User',
            let: { userId: '$supplier' },
            pipeline: [
              {
                $match: {
                  $expr: { $eq: ['$_id', '$$userId'] },
                },
              },
            ],
            as: 'supplier',
          },
        },
        { $unwind: { path: '$supplier', preserveNullAndEmptyArrays: false } },
        {
          $match: $supplierMatch,
        },
        {
          $lookup: {
            from: 'DateBasedPrice',
            let: { dateBasedPrices: '$dateBasedPrices' },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ['$_id', '$$dateBasedPrices'] },
                },
              },
            ],
            as: 'dateBasedPrices',
          },
        },
        {
          $lookup: {
            from: 'Location',
            let: { locations: '$locations' },
            pipeline: [
              {
                $match: {
                  $expr: { $in: ['$_id', '$$locations'] },
                },
              },
            ],
            as: 'locations',
          },
        },
      ]

      // Get all cars without pagination to filter by distance
      const allCars = await Car.aggregate(pipeline, { collation: { locale: env.DEFAULT_LANGUAGE, strength: 2 } })
      
      logger.info(`[car.getFrontendCars] Found ${allCars.length} cars before distance filtering`)
      
      if (allCars.length === 0) {
        logger.info(`[car.getFrontendCars] No cars found matching the basic criteria`)
        return res.json([{ resultData: [], pageInfo: [{ totalRecords: 0 }] }])
      }

      // Log the first car for debugging
      if (allCars.length > 0) {
        logger.info(`[car.getFrontendCars] First car: ${JSON.stringify({
          _id: allCars[0]._id,
          name: allCars[0].name,
          supplier: allCars[0].supplier._id,
          locations: allCars[0].locations.map((loc: bookcarsTypes.Location) => loc._id)
        })}`)
      }

      // Filter cars by distance and add distance information
      const carsWithDistance = []
      
      for (const car of allCars) {
        // Trouver l'emplacement le plus proche
        let minDistance = Number.MAX_VALUE
        let closestLocation = null

        if (car.locations && car.locations.length > 0) {
          for (const loc of car.locations) {
            if (loc.latitude && loc.longitude && searchCoordinates.latitude && searchCoordinates.longitude) {
              const distance = helper.calculateDistance(
                searchCoordinates.latitude,
                searchCoordinates.longitude,
                loc.latitude,
                loc.longitude
              )

              if (distance < minDistance) {
                minDistance = distance
                closestLocation = loc
              }
            } else {
              logger.info(`[car.getFrontendCars] Missing coordinates for location comparison: 
                car location: ${JSON.stringify(loc)}, 
                search coordinates: ${JSON.stringify(searchCoordinates)}`)
            }
          }
        } else {
          logger.info(`[car.getFrontendCars] Car has no locations: ${car._id}`)
        }

        // Toujours ajouter la voiture, quelle que soit la distance
        if (closestLocation) {
          // Add distance information to the car
          car.distance = minDistance
          car.closestLocation = closestLocation
          carsWithDistance.push(car)
          logger.info(`[car.getFrontendCars] Car ${car._id} (${car.name}) added with distance: ${minDistance.toFixed(2)}km`)
        } else {
          // Si nous n'avons pas pu calculer la distance, ajouter quand même la voiture avec une distance par défaut
          car.distance = 999 // Distance par défaut élevée
          car.closestLocation = car.locations && car.locations.length > 0 ? car.locations[0] : null
          carsWithDistance.push(car)
          logger.info(`[car.getFrontendCars] Added car ${car._id} (${car.name}) without distance calculation`)
        }
      }

      // Vérifier si nous avons des résultats après avoir étendu la recherche
      if (carsWithDistance.length === 0) {
        logger.info(`[car.getFrontendCars] No cars found even after extending search radius.`)
        return res.json([{ resultData: [], pageInfo: [{ totalRecords: 0 }] }])
      }

      // Log the number of cars found
      logger.info(`[car.getFrontendCars] Found ${carsWithDistance.length} cars after distance filtering.`)

      // Sort by distance
      carsWithDistance.sort((a, b) => a.distance - b.distance)

      // Apply pagination manually
      const startIndex = (page - 1) * size
      const endIndex = startIndex + size
      const paginatedCars = carsWithDistance.slice(startIndex, endIndex)

      // Format the response to match the expected structure
      const result = [{
        resultData: paginatedCars,
        pageInfo: [{ totalRecords: carsWithDistance.length }]
      }]

      // Clean up supplier data
      for (const car of result[0].resultData) {
        const { _id, fullName, avatar } = car.supplier
        car.supplier = { _id, fullName, avatar }
      }

      return res.json(result)
    }
  } catch (err) {
    logger.error(`[car.getFrontendCars] ${i18n.t('DB_ERROR')} ${req.query.s}`, err)
    return res.status(400).send(i18n.t('DB_ERROR') + err)
  }
}
