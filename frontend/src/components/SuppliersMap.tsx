import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer } from 'react-leaflet'
import L, { LatLngExpression } from 'leaflet'
import * as bookcarsTypes from ':bookcars-types'
import * as UserService from '@/services/UserService'
import { strings } from '@/lang/map'
import ProximityMarker from './ProximityMarker'

import 'leaflet/dist/leaflet.css'
import '@/assets/css/map.css'

interface SuppliersMapProps {
  title?: string
  userLocation?: LatLngExpression
  initialZoom?: number
  suppliers?: bookcarsTypes.SortedSupplier[]
  className?: string
  onSelectSupplier?: (locationId: string) => void
}

/**
 * SuppliersMap - Carte pour afficher les fournisseurs triés par proximité
 * 
 * @param title - Titre de la carte
 * @param userLocation - Position de l'utilisateur
 * @param initialZoom - Zoom initial
 * @param suppliers - Liste des fournisseurs triés par proximité
 * @param className - Classe CSS supplémentaire
 * @param onSelectSupplier - Fonction appelée lors de la sélection d'un fournisseur
 */
const SuppliersMap = ({
  title,
  userLocation = new L.LatLng(13.7942, -88.8965), // Centre du Salvador par défaut
  initialZoom = 8,
  suppliers = [],
  className,
  onSelectSupplier,
}: SuppliersMapProps) => {
  const map = useRef<L.Map>(null)
  const [language, setLanguage] = useState(UserService.getLanguage())

  useEffect(() => {
    if (map.current) {
      map.current.attributionControl.setPrefix('')
      map.current.invalidateSize()
    }
  }, [map])

  // Tile server
  const tileURL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'

  // Créer une liste de points pour ajuster la vue de la carte
  useEffect(() => {
    if (map.current && suppliers && suppliers.length > 0) {
      try {
        // Ensure userLocation is valid before creating bounds
        const userLat = typeof userLocation === 'object' && 'lat' in userLocation ? 
          userLocation.lat : 
          (Array.isArray(userLocation) ? userLocation[0] : 13.7942);
        
        const userLng = typeof userLocation === 'object' && 'lng' in userLocation ? 
          userLocation.lng : 
          (Array.isArray(userLocation) ? userLocation[1] : -88.8965);
        
        // Create bounds with validated user location
        const bounds = new L.LatLngBounds([[userLat, userLng]]);
        
        // Ajouter les positions des fournisseurs aux limites
        suppliers.forEach(supplier => {
          if (supplier.coordinates && 
              supplier.coordinates.latitude && 
              supplier.coordinates.longitude && 
              !isNaN(supplier.coordinates.latitude) && 
              !isNaN(supplier.coordinates.longitude)) {
            bounds.extend([supplier.coordinates.latitude, supplier.coordinates.longitude]);
          }
        });

        // Ajuster la vue pour inclure tous les marqueurs
        if (bounds.isValid()) {
          map.current.fitBounds(bounds, { padding: [50, 50] });
        } else {
          // Si les limites ne sont pas valides, centrer sur l'emplacement de l'utilisateur
          map.current.setView([userLat, userLng], initialZoom);
        }
      } catch (error) {
        console.error('Error adjusting map view:', error);
        // En cas d'erreur, centrer sur l'emplacement par défaut
        map.current.setView([13.7942, -88.8965], initialZoom);
      }
    }
  }, [suppliers, userLocation, initialZoom]);

  return (
    <div className="suppliers-map-container">
      {title && <h2 className="map-title">{title}</h2>}
      <MapContainer
        center={userLocation}
        zoom={initialZoom}
        className={`${className ? `${className} ` : ''}map suppliers-map`}
        ref={map}
      >
        <TileLayer
          url={tileURL}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        
        {/* Marqueur pour la position de l'utilisateur */}
        <ProximityMarker
          supplier={{ fullName: strings.YOUR_LOCATION } as bookcarsTypes.SortedSupplier}
          position={userLocation as L.LatLng}
          language={language}
          isUserLocation
        />
        
        {/* Marqueurs pour les fournisseurs avec indicateurs de proximité */}
        {suppliers.map((supplier) => {
          if (supplier.coordinates && 
              supplier.coordinates.latitude && 
              supplier.coordinates.longitude && 
              !isNaN(supplier.coordinates.latitude) && 
              !isNaN(supplier.coordinates.longitude)) {
            try {
              const position = new L.LatLng(supplier.coordinates.latitude, supplier.coordinates.longitude);
              return (
                <ProximityMarker
                  key={supplier._id}
                  supplier={supplier}
                  position={position}
                  distanceFromUser={supplier.distance}
                  language={language}
                  onSelect={onSelectSupplier}
                />
              );
            } catch (error) {
              console.error(`Error creating marker for supplier ${supplier._id}:`, error);
              return null;
            }
          }
          return null;
        })}
      </MapContainer>
    </div>
  )
}

export default SuppliersMap 