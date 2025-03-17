import LocalizedStrings from 'localized-strings'
import * as langHelper from '../common/langHelper'

const strings = new LocalizedStrings({
  en: {
    REVIEWS: 'Reviews',
    REVIEW_EXPERIENCE: 'Review Your Experience',
    YOUR_RATING: 'Your Rating',
    YOUR_REVIEW: 'Your Review (optional)',
    SUBMIT_REVIEW: 'Submit Review',
    LOAD_MORE: 'Load More',
    NO_REVIEWS: 'No reviews yet',
    SUPPLIER_REPLY: 'Supplier Reply',
    WRITE_REVIEW: 'Write a Review',
    REVIEW_SUCCESS: 'Your review has been submitted successfully!',
    REVIEW_ERROR: 'An error occurred while submitting your review.',
    ALREADY_REVIEWED: 'You have already reviewed this booking.',
  },
  fr: {
    REVIEWS: 'Avis',
    REVIEW_EXPERIENCE: 'Évaluez Votre Expérience',
    YOUR_RATING: 'Votre Note',
    YOUR_REVIEW: 'Votre Avis (facultatif)',
    SUBMIT_REVIEW: 'Soumettre l\'Avis',
    LOAD_MORE: 'Voir Plus',
    NO_REVIEWS: 'Pas encore d\'avis',
    SUPPLIER_REPLY: 'Réponse du Fournisseur',
    WRITE_REVIEW: 'Écrire un Avis',
    REVIEW_SUCCESS: 'Votre avis a été soumis avec succès!',
    REVIEW_ERROR: 'Une erreur s\'est produite lors de la soumission de votre avis.',
    ALREADY_REVIEWED: 'Vous avez déjà évalué cette réservation.',
  },
  es: {
    REVIEWS: 'Reseñas',
    REVIEW_EXPERIENCE: 'Evalúe Su Experiencia',
    YOUR_RATING: 'Su Puntuación',
    YOUR_REVIEW: 'Su Reseña (opcional)',
    SUBMIT_REVIEW: 'Enviar Reseña',
    LOAD_MORE: 'Cargar Más',
    NO_REVIEWS: 'Aún no hay reseñas',
    SUPPLIER_REPLY: 'Respuesta del Proveedor',
    WRITE_REVIEW: 'Escribir una Reseña',
    REVIEW_SUCCESS: '¡Su reseña ha sido enviada con éxito!',
    REVIEW_ERROR: 'Se produjo un error al enviar su reseña.',
    ALREADY_REVIEWED: 'Ya ha evaluado esta reserva.',
  },
})

langHelper.setLanguage(strings)

export { strings } 