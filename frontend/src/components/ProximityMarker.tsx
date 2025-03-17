import React from 'react'
import { Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import { strings } from '@/lang/map'
import * as helper from '@/common/helper'
import * as bookcarsHelper from ':bookcars-helper'
import { getIconByDistance, userLocationIcon } from '@/assets/img/markers/customMarkers'

interface ProximityMarkerProps {
  supplier: bookcarsTypes.SortedSupplier
  position: L.LatLng
  distanceFromUser?: number
  language: string
  isUserLocation?: boolean
  onSelect?: (locationId: string) => void
}

/**
 * ProximityMarker - Composant pour afficher un marqueur sur la carte avec une couleur basée sur la proximité
 * 
 * @param supplier - Fournisseur associé au marqueur
 * @param position - Position du marqueur
 * @param distanceFromUser - Distance du marqueur par rapport à l'utilisateur (en km)
 * @param language - Langue actuelle
 * @param isUserLocation - Indique si c'est la position de l'utilisateur
 * @param onSelect - Fonction appelée lors de la sélection du marqueur
 */
const ProximityMarker = ({
  supplier,
  position,
  distanceFromUser,
  language,
  isUserLocation = false,
  onSelect
}: ProximityMarkerProps) => {
  // Obtenir l'icône appropriée en fonction de la distance ou si c'est la position de l'utilisateur
  const markerIcon = isUserLocation ? userLocationIcon : getIconByDistance(distanceFromUser)

  // Formatage de la distance si elle existe
  const formattedDistance = distanceFromUser
    ? `${bookcarsHelper.formatNumber(distanceFromUser, language)} km`
    : undefined

  return (
    <Marker position={position} icon={markerIcon}>
      <Popup className={`marker ${isUserLocation ? 'user-location-marker' : 'supplier-marker'}`}>
        <div className="name">{supplier.fullName}</div>
        {formattedDistance && (
          <div className="distance">
            {`${strings.DISTANCE}: ${formattedDistance}`}
          </div>
        )}
        {!isUserLocation && onSelect && supplier.location && (
          <div className="action">
            <button
              type="button"
              className="action-btn"
              onClick={async () => {
                try {
                  if (onSelect) {
                    const locationId = supplier.location
                    if (locationId) {
                      onSelect(locationId)
                    }
                  }
                } catch (err) {
                  helper.error(err)
                }
              }}
            >
              {strings.SELECT_PICK_UP_LOCATION}
            </button>
          </div>
        )}
      </Popup>
    </Marker>
  )
}

export default ProximityMarker 