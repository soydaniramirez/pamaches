/** Moods (categorías de ideas de cita) — portado 1:1 del index.html. */
export const MOODS = [
  'acurrucados',
  'aventura',
  'romance',
  'low budget',
  'a estrenar',
  'en casa',
  'al aire libre',
] as const;

/** Base de ideas por mood (opción C: base + las que la pareja guarde). */
export const IDEAS_BASE: Record<string, string[]> = {
  acurrucados: [
    'maratón de una serie con cobijas y palomitas',
    'tarde de películas con el proyector y café',
    'leer juntos en la cama un domingo lento',
    'noche de mantita, vino y playlist suave',
    'desayuno en la cama sin prisa',
  ],
  aventura: [
    'ir a una zona nueva de la ciudad a explorar sin plan',
    'subir a un mirador a ver el atardecer',
    'rentar bicis y recorrer un parque grande',
    'road trip de un día a un pueblo cercano',
    'probar un deporte nuevo juntos',
  ],
  romance: [
    'cena con velas cocinando los dos',
    'picnic con vino y quesos al atardecer',
    'escribirse cartas y leerlas en voz alta',
    'cena en ese restaurante que querían probar',
    'baile lento en la sala con su canción',
  ],
  'low budget': [
    'picnic en el parque con lo que haya en casa',
    'caminar por una colonia bonita y ver aparadores',
    'tarde de juegos de mesa y botana',
    'cocinar algo nuevo con lo que tengan en la alacena',
    'ver el atardecer desde algún punto alto, gratis',
  ],
  'a estrenar': [
    'ir al cine a ver el estreno de la semana',
    'probar ese café o restaurante nuevo del barrio',
    'visitar una expo o museo que no conozcan',
    'descubrir un mercado o tianguis nuevo',
    'tomar una clase juntos por primera vez',
  ],
  'en casa': [
    'noche de cocina: cada quien hace un platillo',
    'spa casero con mascarillas y música',
    'torneo de videojuegos o juegos de mesa',
    'armar un rompecabezas grande juntos',
    'cata casera de vinos o quesos',
  ],
  'al aire libre': [
    'caminata matutina y desayuno afuera',
    'picnic en un parque nuevo',
    'andar en bici por la ciudad temprano',
    'ir a un jardín botánico o vivero',
    'ver las estrellas desde algún lugar oscuro',
  ],
};
