// src/funkin/play/Judgment.js

class Judgment {
  // Constantes de Umbral (Milisegundos)
  static PBOT1_PERFECT_THRESHOLD = 5.0;
  static PBOT1_KILLER_THRESHOLD = 12.5;
  static PBOT1_SICK_THRESHOLD = 45.0;
  static PBOT1_GOOD_THRESHOLD = 90.0;
  static PBOT1_BAD_THRESHOLD = 135.0;
  static PBOT1_SHIT_THRESHOLD = 160.0;
  static PBOT1_MISS_THRESHOLD = 160.0;

  // Constantes de Puntuación
  static PBOT1_MAX_SCORE = 500.0;
  static PBOT1_MIN_SCORE = 9.0;
  static PBOT1_MISS_SCORE = -100;

  // Constantes Matemáticas (Curva Sigmoide)
  static PBOT1_SCORING_OFFSET = 54.99;
  static PBOT1_SCORING_SLOPE = 0.08;

  /**
   * Determina el rating (nombre del juicio) según la diferencia de tiempo.
   */
  static getRating(diff) {
    const absDiff = Math.abs(diff);

    if (absDiff < this.PBOT1_PERFECT_THRESHOLD) return "perfect";
    if (absDiff <= this.PBOT1_KILLER_THRESHOLD) return "killer";
    if (absDiff <= this.PBOT1_SICK_THRESHOLD) return "sick";
    if (absDiff <= this.PBOT1_GOOD_THRESHOLD) return "good";
    if (absDiff <= this.PBOT1_BAD_THRESHOLD) return "bad";
    if (absDiff <= this.PBOT1_SHIT_THRESHOLD) return "shit";

    return "miss";
  }

  /**
   * Calcula la puntuación variable usando la curva sigmoide.
   */
  static calculateScore(diff) {
    const absDiff = Math.abs(diff);

    if (absDiff > this.PBOT1_MISS_THRESHOLD) {
      return this.PBOT1_MISS_SCORE;
    }

    const exponent =
      this.PBOT1_SCORING_SLOPE * (absDiff - this.PBOT1_SCORING_OFFSET);
    const score =
      (this.PBOT1_MAX_SCORE - this.PBOT1_MIN_SCORE) / (1 + Math.exp(exponent)) +
      this.PBOT1_MIN_SCORE;

    return Math.floor(score);
  }
}

window.Judgment = Judgment;
