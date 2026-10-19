/* Temporary example crops from the user-supplied reference, not Sensum client work.
 * Replace src with a case image and crop with [0, 0, 1, 1] for production.
 * Crop coordinates are normalized [left, top, width, height]. */
window.sensumPortfolioPreviews = [
  { src: 'assets/portfolio/reference-examples.png', crop: [.082, .096, .176, .228], label: 'Reference — accounts' },
  { src: 'assets/portfolio/reference-examples.png', crop: [.353, .035, .209, .264], label: 'Reference — wallet' },
  { src: 'assets/portfolio/reference-examples.png', crop: [.628, .058, .200, .247], label: 'Reference — card' },
  { src: 'assets/portfolio/reference-examples.png', crop: [.768, .346, .209, .259], label: 'Reference — payouts' },
  { src: 'assets/portfolio/reference-examples.png', crop: [.047, .681, .187, .229], label: 'Reference — spending' },
];
