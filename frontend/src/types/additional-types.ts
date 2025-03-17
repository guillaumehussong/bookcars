import * as bookcarsTypes from ':bookcars-types'

declare module ':bookcars-types' {
  // Etendre les types existants avec les nouveaux champs
  
  // Étendre l'interface Location pour inclure googleMapsId
  export interface Location {
    googleMapsId?: string
  }
  
  // Emplacement avec coordonnées GPS
  export interface LocationWithCoordinates {
    _id: string
    name?: string
    latitude: number
    longitude: number
    googleMapsId?: string
  }
  
  // Coordonnées GPS
  export interface Coordinates {
    latitude: number
    longitude: number
  }
  
  // Fournisseur trié par distance
  export interface SortedSupplier extends bookcarsTypes.User {
    distance: number
    coordinates?: Coordinates
  }
  
  // Étendre CarFilter pour inclure les coordonnées
  export interface CarFilter {
    pickupLocation: bookcarsTypes.Location
    dropOffLocation: bookcarsTypes.Location
    from: Date
    to: Date
    keyword?: string
    pickupLocationCoords?: Coordinates
    dropOffLocationCoords?: Coordinates
  }
  
  // Point d'intérêt sur la carte
  export interface POI {
    id: string
    name: string
    position: [number, number]
    type: 'user' | 'supplier' | 'pickup' | 'dropoff'
    icon?: string
    distance?: number
  }
} 