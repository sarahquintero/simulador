/**
 * Definiciones de tipos para el Simulador Interactivo de Pesas y Poleas.
 * Separa explícitamente los VALORES DE ENTRADA (parámetros configurados por el estudiante)
 * de los VALORES CALCULADOS por el motor físico en unidades del Sistema Internacional (SI).
 */

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export type SimulationStatus = 'idle' | 'running' | 'paused' | 'finished';

export type PulleySystemType = 'atwood' | 'movable_pulley';

/**
 * VALORES DE ENTRADA (Variables independientes en unidades del Sistema Internacional)
 */
export interface SimulationInputValues {
  systemType: PulleySystemType;
  mass1: number;               // m₁: Masa 1 en kilogramos (kg)
  mass2: number;               // m₂: Masa 2 en kilogramos (kg)
  gravity: number;             // g: Aceleración gravitacional en metros por segundo cuadrado (m/s²)
  initialDisplacement: number; // y₀: Posición inicial del sistema en metros (m)
  initialVelocity: number;     // v₀: Velocidad inicial del sistema en metros por segundo (m/s)
  visualScale: number;         // Escala de visualización gráfica (0.5x a 2.0x)
  pulleyMass: number;          // mₚ: Masa de la polea en kilogramos (kg) [0 en modelo ideal]
  pulleyRadius: number;        // R: Radio de la polea en metros (m)
  frictionTorque: number;      // b: Coeficiente de rozamiento en el eje (N·s/m) [0 en modelo ideal]
  ropeLength: number;          // L: Longitud operativa de la cuerda (m)
  timeScale: number;           // Factor de velocidad del tiempo físico (adimensional)
}

export type PulleyParameters = SimulationInputValues;

/**
 * Resultado de la validación de datos de entrada
 */
export interface InputValidationResult {
  isValid: boolean;
  warnings: string[];
  sanitized: SimulationInputValues;
}

/**
 * VALORES CALCULADOS (Variables dependientes obtenidas por el motor matemático en unidades SI)
 */
export interface CalculatedPhysicsOutputs {
  time: number;                // t: Tiempo físico transcurrido (s)
  systemAcceleration: number;  // a = ((m₁ - m₂) * g) / (m₁ + m₂) (m/s²)
  ropeTension: number;         // T = (2 * m₁ * m₂ * g) / (m₁ + m₂) (N)
  weight1: number;             // P₁ = m₁ * g (N)
  weight2: number;             // P₂ = m₂ * g (N)
  systemPosition: number;      // y(t) = y₀ + v₀*t + (1/2)*a*t² (m)
  systemVelocity: number;      // v(t) = v₀ + a*t (m/s)
  isEqualMasses: boolean;      // Indica el caso especial m₁ = m₂ (a = 0 m/s²)

  // Variables cinemáticas 3D individuales para cada cuerpo (con eje +Y apuntando hacia arriba)
  displacement: number;        // Desplazamiento coordenado s = y(t) (m)
  position1Y: number;          // Altura vertical de m₁ en escena: h₁ = -y(t) (m)
  position2Y: number;          // Altura vertical de m₂ en escena: h₂ = +y(t) (m)
  velocity1: number;           // Velocidad vertical de m₁ (+Y hacia arriba) (m/s)
  velocity2: number;           // Velocidad vertical de m₂ (+Y hacia arriba) (m/s)
  acceleration1: number;       // Aceleración vertical de m₁ (+Y hacia arriba) (m/s²)
  acceleration2: number;       // Aceleración vertical de m₂ (+Y hacia arriba) (m/s²)
  tension1: number;            // Tensión sobre m₁: T₁ (N)
  tension2: number;            // Tensión sobre m₂: T₂ (N)
  netForce: number;            // Fuerza neta motriz: F_neta = P₁ - P₂ = (m₁ - m₂)*g (N)
  pulleyAngle: number;         // Ángulo de giro de la polea θ (rad)
  angularVelocity: number;     // Velocidad angular de la polea ω (rad/s)
  mechanicalAdvantage: number; // Ventaja mecánica ideal (VM)
  kineticEnergy: number;       // Energía cinética total Eₖ (J)
  potentialEnergy: number;     // Energía potencial gravitacional Eₚ (J)
  totalEnergy: number;         // Energía mecánica total Eₘ = Eₖ + Eₚ (J)
  atLimit: boolean;            // Indica si se alcanzó el límite físico de la escena
  limitReason: string | null;  // Descripción del límite físico alcanzado (suelo o tope superior)
}

export type PulleyPhysicsState = CalculatedPhysicsOutputs;

export interface TelemetryPoint {
  time: number;
  systemPosition: number;
  systemVelocity: number;
  systemAcceleration: number;
  position1Y: number;
  position2Y: number;
  velocity1: number;
  velocity2: number;
  acceleration1: number;
  acceleration2: number;
  ropeTension: number;
  tension1: number;
  tension2: number;
  weight1: number;
  weight2: number;
  netForce: number;
  kineticEnergy: number;
  potentialEnergy: number;
  totalEnergy: number;
}

/**
 * Función derivada para EDO de primer orden: dy/dt = f(t, y)
 */
export type DerivativeFunction = (time: number, stateVector: number[]) => number[];
