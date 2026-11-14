// Guard rails for card matching. Below either threshold the answer is 'choose':
// the UI shows the cards instead of guessing.
export const matchConfig = {
  // Classifier confidence (probability of the top option) must reach this.
  minConfidence: 0.55,
  // Top probability minus the second must reach this.
  minMargin: 0.15,
  // Longer inputs are refused (a person describing a symptom, not a document).
  maxInputChars: 2000,
}
