import L from 'leaflet'
import iconShadow from 'leaflet/dist/images/marker-shadow.png'

// Fonction pour créer une icône de marqueur colorée en SVG
const createColoredMarkerIcon = (color: string) => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <g fill="${color}" stroke="#000" stroke-width="1">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 5.486 7.564 16.155 10.705 20.954 1.153 1.764 3.438 1.764 4.591 0C18.436 28.655 25 17.986 25 12.5 25 5.596 19.404 0 12.5 0zm0 17.924a5.425 5.425 0 01-5.424-5.424A5.425 5.425 0 0112.5 7.077a5.425 5.425 0 015.424 5.423 5.425 5.425 0 01-5.424 5.424z"/>
    </g>
  </svg>
  `

  // Convertir le SVG en URL Data pour l'utiliser comme icône
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svg)}`

  return L.icon({
    iconUrl: svgDataUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

// Créer une icône spéciale pour la position de l'utilisateur
const createUserLocationIcon = () => {
  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="25" height="41" viewBox="0 0 25 41">
    <g fill="#4CAF50" stroke="#000" stroke-width="1">
      <path d="M12.5 0C5.596 0 0 5.596 0 12.5c0 5.486 7.564 16.155 10.705 20.954 1.153 1.764 3.438 1.764 4.591 0C18.436 28.655 25 17.986 25 12.5 25 5.596 19.404 0 12.5 0zm0 17.924a5.425 5.425 0 01-5.424-5.424A5.425 5.425 0 0112.5 7.077a5.425 5.425 0 015.424 5.423 5.425 5.425 0 01-5.424 5.424z"/>
    </g>
    <circle cx="12.5" cy="12.5" r="6" fill="#fff" stroke="#000" stroke-width="1"/>
    <circle cx="12.5" cy="12.5" r="3" fill="#4CAF50" stroke="#000" stroke-width="0.5"/>
  </svg>
  `

  // Convertir le SVG en URL Data pour l'utiliser comme icône
  const svgDataUrl = `data:image/svg+xml;base64,${btoa(svg)}`

  return L.icon({
    iconUrl: svgDataUrl,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  })
}

// Créer des icônes pour différentes distances
export const userLocationIcon = createColoredMarkerIcon('#3388ff') // Bleu - Position de l'utilisateur
export const veryCloseIcon = createColoredMarkerIcon('#4CAF50') // Vert - Très proche (<5km)
export const closeIcon = createColoredMarkerIcon('#8BC34A') // Vert clair - Proche (<10km)
export const mediumIcon = createColoredMarkerIcon('#FFC107') // Jaune - Distance moyenne (<20km)
export const farIcon = createColoredMarkerIcon('#FF9800') // Orange - Assez loin (<50km)
export const veryFarIcon = createColoredMarkerIcon('#F44336') // Rouge - Loin (>50km)

// Icône spéciale pour la position de l'utilisateur
const _userLocationIcon = createUserLocationIcon()

// Fonction pour obtenir l'icône en fonction de la distance
export const getIconByDistance = (distance?: number) => {
  if (!distance) return userLocationIcon

  if (distance < 5) {
    return veryCloseIcon // Très proche
  } else if (distance < 10) {
    return closeIcon // Proche
  } else if (distance < 20) {
    return mediumIcon // Distance moyenne
  } else if (distance < 50) {
    return farIcon // Assez loin
  } else {
    return veryFarIcon // Loin
  }
}

// Fonction pour obtenir l'icône de la position de l'utilisateur
export const getUserLocationIcon = () => {
  return _userLocationIcon
} 