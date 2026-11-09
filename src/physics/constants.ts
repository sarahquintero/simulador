import { PulleyParameters } from '../types/simulation';

/**
 * Constantes físicas universales y límites de validación en el
 * Sistema Internacional de Unidades (SI).
 */

export const PHYSICAL_CONSTANTS = {
  EARTH_GRAVITY: 9.81,      // m/s²
  MOON_GRAVITY: 1.62,       // m/s²
  MARS_GRAVITY: 3.72,       // m/s²
  JUPITER_GRAVITY: 24.79,   // m/s²
  FIXED_TIME_STEP: 1 / 120, // s (paso fijo de tiempo físico a 120 Hz, independiente de los FPS)
  MAX_FRAME_DELTA: 0.05,    // s (límite superior de delta por frame para evitar saltos por pestaña inactiva)
  MAX_TELEMETRY_POINTS: 240,
  MAX_TRAVEL_LIMIT: 1.5,    // m (recorrido vertical máximo nominal)
  FLOOR_SURFACE_Y: -1.8,    // m (cota vertical de la superficie del suelo en la escena 3D)
  PULLEY_CENTER_Y: 2.25,    // m (cota vertical del eje de la polea fija en la escena 3D)
  EPSILON_MASS: 1e-6,       // kg (umbral para evitar división por cero y comparar masas iguales)
} as const;

/**
 * Rangos físicos permitidos para validar todos los valores de entrada (SI).
 */
export const PARAMETER_BOUNDS = {
  MIN_MASS: 0.1,            // kg (evita masa nula o negativa y división por cero)
  MAX_MASS: 50.0,           // kg
  MIN_GRAVITY: 0.1,         // m/s²
  MAX_GRAVITY: 50.0,        // m/s²
  MIN_POSITION: -1.4,       // m
  MAX_POSITION: 1.4,        // m
  MIN_VELOCITY: -5.0,       // m/s
  MAX_VELOCITY: 5.0,        // m/s
  MIN_VISUAL_SCALE: 0.5,    // factor de escala visual mínimo (0.5x)
  MAX_VISUAL_SCALE: 1.75,   // factor de escala visual máximo (1.75x)
  MIN_PULLEY_MASS: 0.0,     // kg
  MAX_PULLEY_MASS: 10.0,    // kg
  MIN_PULLEY_RADIUS: 0.2,   // m
  MAX_PULLEY_RADIUS: 0.6,   // m
  MIN_FRICTION: 0.0,        // N·s/m
  MAX_FRICTION: 5.0,        // N·s/m
} as const;

/**
 * Condiciones iniciales por defecto:
 * Máquina de Atwood ideal en el Sistema Internacional (kg, m, s, N).
 */
export const DEFAULT_PULLEY_PARAMETERS: PulleyParameters = {
  systemType: 'atwood',
  mass1: 6.0,               // m₁ = 6.0 kg
  mass2: 4.0,               // m₂ = 4.0 kg
  gravity: PHYSICAL_CONSTANTS.EARTH_GRAVITY, // g = 9.81 m/s²
  initialDisplacement: 0.0, // y₀ = 0.0 m
  initialVelocity: 0.0,     // v₀ = 0.0 m/s
  visualScale: 1.0,         // Escala de visualización = 1.0x
  pulleyMass: 0.0,          // mₚ = 0.0 kg (polea ideal sin masa)
  pulleyRadius: 0.4,        // R = 0.4 m
  frictionTorque: 0.0,      // b = 0.0 N·s/m (cuerda y eje sin fricción)
  ropeLength: 4.8,          // L = 4.8 m
  timeScale: 1.0,
};
