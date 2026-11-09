import { rk4Step } from '../math/integrators';
import { computeWeightBlockSize } from '../math/ropeGeometry';
import { clamp } from '../math/vectors';
import {
  InputValidationResult,
  PulleyParameters,
  PulleyPhysicsState,
  SimulationInputValues,
  TelemetryPoint,
} from '../types/simulation';
import {
  DEFAULT_PULLEY_PARAMETERS,
  PARAMETER_BOUNDS,
  PHYSICAL_CONSTANTS,
} from './constants';

/**
 * ============================================================================
 * MOTOR DE CÁLCULO FÍSICO — MÁQUINA DE ATWOOD Y SISTEMAS DE POLEAS
 * ============================================================================
 * Este módulo es completamente independiente de la interfaz de usuario (React)
 * y del motor de renderizado 3D (Three.js).
 *
 * Todas las magnitudes operan estrictamente en el Sistema Internacional (SI):
 * - Masa (m₁, m₂): kilogramos [kg]
 * - Gravedad (g): metros por segundo al cuadrado [m/s²]
 * - Aceleración (a): metros por segundo al cuadrado [m/s²]
 * - Fuerza / Peso (P) y Tensión (T): Newtons [N = kg·m/s²]
 * - Posición (y): metros [m]
 * - Velocidad (v): metros por segundo [m/s]
 * - Tiempo (t): segundos [s]
 * - Energía (E): Julios [J = N·m]
 * ============================================================================
 */

/**
 * Valida un número individual garantizando que sea finito y se encuentre dentro
 * del intervalo [min, max]. Si no es válido, devuelve el valor por defecto `fallback`.
 */
function sanitizeNumber(
  value: unknown,
  min: number,
  max: number,
  fallback: number,
  label: string,
  warnings: string[]
): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) {
    warnings.push(`${label}: valor no numérico, se restableció a ${fallback}.`);
    return fallback;
  }
  if (num < min) {
    warnings.push(`${label}: valor inferior al mínimo permitido (${min}).`);
    return min;
  }
  if (num > max) {
    warnings.push(`${label}: valor superior al máximo permitido (${max}).`);
    return max;
  }
  return num;
}

/**
 * 1. VALIDACIÓN DE VALORES DE ENTRADA
 * Verifica todos los parámetros ingresados por el estudiante, evita masas nulas
 * o negativas (previniendo divisiones por cero en m₁ + m₂) y acota a rangos físicos seguros.
 */
export function validateSimulationInputs(
  raw: Partial<SimulationInputValues>
): InputValidationResult {
  const warnings: string[] = [];

  const mass1 = sanitizeNumber(
    raw.mass1,
    PARAMETER_BOUNDS.MIN_MASS,
    PARAMETER_BOUNDS.MAX_MASS,
    DEFAULT_PULLEY_PARAMETERS.mass1,
    'Masa m₁ (kg)',
    warnings
  );

  const mass2 = sanitizeNumber(
    raw.mass2,
    PARAMETER_BOUNDS.MIN_MASS,
    PARAMETER_BOUNDS.MAX_MASS,
    DEFAULT_PULLEY_PARAMETERS.mass2,
    'Masa m₂ (kg)',
    warnings
  );

  const gravity = sanitizeNumber(
    raw.gravity,
    PARAMETER_BOUNDS.MIN_GRAVITY,
    PARAMETER_BOUNDS.MAX_GRAVITY,
    DEFAULT_PULLEY_PARAMETERS.gravity,
    'Gravedad g (m/s²)',
    warnings
  );

  const initialDisplacement = sanitizeNumber(
    raw.initialDisplacement,
    PARAMETER_BOUNDS.MIN_POSITION,
    PARAMETER_BOUNDS.MAX_POSITION,
    DEFAULT_PULLEY_PARAMETERS.initialDisplacement,
    'Posición inicial y₀ (m)',
    warnings
  );

  const initialVelocity = sanitizeNumber(
    raw.initialVelocity,
    PARAMETER_BOUNDS.MIN_VELOCITY,
    PARAMETER_BOUNDS.MAX_VELOCITY,
    DEFAULT_PULLEY_PARAMETERS.initialVelocity,
    'Velocidad inicial v₀ (m/s)',
    warnings
  );

  const visualScale = sanitizeNumber(
    raw.visualScale,
    PARAMETER_BOUNDS.MIN_VISUAL_SCALE,
    PARAMETER_BOUNDS.MAX_VISUAL_SCALE,
    DEFAULT_PULLEY_PARAMETERS.visualScale,
    'Escala de visualización',
    warnings
  );

  const pulleyMass = sanitizeNumber(
    raw.pulleyMass,
    PARAMETER_BOUNDS.MIN_PULLEY_MASS,
    PARAMETER_BOUNDS.MAX_PULLEY_MASS,
    DEFAULT_PULLEY_PARAMETERS.pulleyMass,
    'Masa de polea mₚ (kg)',
    warnings
  );

  const pulleyRadius = sanitizeNumber(
    raw.pulleyRadius,
    PARAMETER_BOUNDS.MIN_PULLEY_RADIUS,
    PARAMETER_BOUNDS.MAX_PULLEY_RADIUS,
    DEFAULT_PULLEY_PARAMETERS.pulleyRadius,
    'Radio de polea R (m)',
    warnings
  );

  const frictionTorque = sanitizeNumber(
    raw.frictionTorque,
    PARAMETER_BOUNDS.MIN_FRICTION,
    PARAMETER_BOUNDS.MAX_FRICTION,
    DEFAULT_PULLEY_PARAMETERS.frictionTorque,
    'Rozamiento b (N·s/m)',
    warnings
  );

  const ropeLength = sanitizeNumber(
    raw.ropeLength,
    1.0,
    10.0,
    DEFAULT_PULLEY_PARAMETERS.ropeLength,
    'Longitud de cuerda L (m)',
    warnings
  );

  const timeScale = sanitizeNumber(
    raw.timeScale,
    0.1,
    3.0,
    DEFAULT_PULLEY_PARAMETERS.timeScale,
    'Escala de tiempo',
    warnings
  );

  const systemType =
    raw.systemType === 'movable_pulley' ? 'movable_pulley' : 'atwood';

  return {
    isValid: warnings.length === 0,
    warnings,
    sanitized: {
      systemType,
      mass1,
      mass2,
      gravity,
      initialDisplacement,
      initialVelocity,
      visualScale,
      pulleyMass,
      pulleyRadius,
      frictionTorque,
      ropeLength,
      timeScale,
    },
  };
}

/**
 * 2. FUERZA GRAVITACIONAL (PESO)
 * Ecuación fundamental:
 *   P = m * g
 * Donde:
 *   m = masa del cuerpo [kg]
 *   g = aceleración gravitacional [m/s²]
 *   P = peso resultante [N]
 */
export function calculateGravitationalForce(
  mass: number,
  gravity: number
): number {
  const safeMass = Math.max(0, Number.isFinite(mass) ? mass : 0);
  const safeGravity = Math.max(0, Number.isFinite(gravity) ? gravity : 0);
  return safeMass * safeGravity;
}

/**
 * 3. ACELERACIÓN DEL SISTEMA DE ATWOOD IDEAL
 * Aplicando la Segunda Ley de Newton a cada masa (tomando positivo el descenso de m₁):
 *   Para m₁: m₁ * g - T = m₁ * a
 *   Para m₂: T - m₂ * g = m₂ * a
 * Sumando ambas ecuaciones se elimina la tensión interna T y se obtiene:
 *   a = ((m1 - m2) * g) / (m1 + m2)
 *
 * Contempla explícitamente:
 * - Protección contra división por cero si (m1 + m2) <= 0.
 * - Caso de masas iguales (m1 == m2), donde la aceleración es exactamente 0 m/s².
 */
export function calculateAtwoodAcceleration(
  mass1: number,
  mass2: number,
  gravity: number
): number {
  const m1 = Math.max(0, Number.isFinite(mass1) ? mass1 : 0);
  const m2 = Math.max(0, Number.isFinite(mass2) ? mass2 : 0);
  const g = Math.max(0, Number.isFinite(gravity) ? gravity : 0);

  const totalMass = m1 + m2;

  // Protección estricta contra división por cero
  if (totalMass <= PHYSICAL_CONSTANTS.EPSILON_MASS) {
    return 0;
  }

  // Caso especial: masas iguales -> equilibrio traslacional (a = 0 m/s²)
  if (Math.abs(m1 - m2) <= PHYSICAL_CONSTANTS.EPSILON_MASS) {
    return 0;
  }

  return ((m1 - m2) * g) / totalMass;
}

/**
 * 4. TENSIÓN DE LA CUERDA EN EL SISTEMA DE ATWOOD IDEAL
 * Sustituyendo la aceleración a en T = m₂ * (g + a), se obtiene la relación simétrica:
 *   T = (2 * m1 * m2 * g) / (m1 + m2)
 *
 * En el caso de masas iguales (m1 = m2 = m), la ecuación se reduce a:
 *   T = (2 * m² * g) / (2 * m) = m * g = P
 */
export function calculateRopeTension(
  mass1: number,
  mass2: number,
  gravity: number
): number {
  const m1 = Math.max(0, Number.isFinite(mass1) ? mass1 : 0);
  const m2 = Math.max(0, Number.isFinite(mass2) ? mass2 : 0);
  const g = Math.max(0, Number.isFinite(gravity) ? gravity : 0);

  const totalMass = m1 + m2;

  // Protección estricta contra división por cero
  if (totalMass <= PHYSICAL_CONSTANTS.EPSILON_MASS) {
    return 0;
  }

  return (2 * m1 * m2 * g) / totalMass;
}

/**
 * 5. ECUACIÓN HORARIA DE LA POSICIÓN (MRUA / MRU)
 * Para aceleración constante a:
 *   y(t) = y0 + v0 * t + (1/2) * a * t²
 * Si las masas son iguales (a = 0):
 *   y(t) = y0 + v0 * t
 */
export function calculatePositionAtTime(
  y0: number,
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, Number.isFinite(time) ? time : 0);
  return y0 + v0 * t + 0.5 * acceleration * t * t;
}

/**
 * 6. ECUACIÓN HORARIA DE LA VELOCIDAD (MRUA / MRU)
 * Para aceleración constante a:
 *   v(t) = v0 + a * t
 * Si las masas son iguales (a = 0):
 *   v(t) = v0 (velocidad constante)
 */
export function calculateVelocityAtTime(
  v0: number,
  acceleration: number,
  time: number
): number {
  const t = Math.max(0, Number.isFinite(time) ? time : 0);
  return v0 + acceleration * t;
}

export interface InstantaneousDynamics {
  systemAcceleration: number; // a = ((m₁ - m₂)*g)/(m₁ + m₂)
  ropeTension: number;        // T = (2*m₁*m₂*g)/(m₁ + m₂)
  weight1: number;            // P₁ = m₁*g
  weight2: number;            // P₂ = m₂*g
  acceleration1: number;      // Aceleración vertical de m₁ en escena (+Y hacia arriba)
  acceleration2: number;      // Aceleración vertical de m₂ en escena (+Y hacia arriba)
  tension1: number;
  tension2: number;
  netForce: number;           // Fuerza neta F = P₁ - P₂
  mechanicalAdvantage: number;
  isEqualMasses: boolean;
}

/**
 * Calcula las variables dinámicas instantáneas combinando las ecuaciones exactas
 * de Atwood ideal con el soporte opcional para polea con inercia/rozamiento o polipasto.
 */
export function computePulleyDynamics(
  velocity1Vertical: number,
  rawParams: PulleyParameters
): InstantaneousDynamics {
  const { sanitized: params } = validateSimulationInputs(rawParams);
  const m1 = params.mass1;
  const m2 = params.mass2;
  const mp = params.pulleyMass;
  const g = params.gravity;
  const b = params.frictionTorque;

  // Pesos gravitacionales individuales: P = m * g
  const weight1 = calculateGravitationalForce(m1, g);
  const weight2 = calculateGravitationalForce(m2, g);

  if (params.systemType === 'movable_pulley') {
    const mechanicalAdvantage = 2;
    const effectiveLoadMass = m2 + mp;
    const isEqualMasses =
      Math.abs(m1 - 0.5 * effectiveLoadMass) <= PHYSICAL_CONSTANTS.EPSILON_MASS;

    const drivingForce = (m1 - 0.5 * effectiveLoadMass) * g;
    // velocity1Vertical es en eje +Y (hacia arriba); la velocidad de descenso s' = -velocity1Vertical
    const systemVel = -velocity1Vertical;
    const dampingForce = -b * systemVel;
    const equivalentMass = m1 + 0.25 * effectiveLoadMass + (5 / 8) * mp;

    const systemAcceleration =
      equivalentMass > PHYSICAL_CONSTANTS.EPSILON_MASS
        ? (drivingForce + dampingForce) / equivalentMass
        : 0;

    // En coordenadas verticales 3D (+Y hacia arriba): a₁ = -a, a₂ = +0.5 * a
    const acceleration1 = -systemAcceleration;
    const acceleration2 = 0.5 * systemAcceleration;

    const tension1 = Math.max(0, m1 * (g + acceleration1));
    const tension2 = Math.max(0, effectiveLoadMass * (g + acceleration2));

    return {
      systemAcceleration,
      ropeTension: tension1,
      weight1,
      weight2,
      acceleration1,
      acceleration2,
      tension1,
      tension2,
      netForce: drivingForce,
      mechanicalAdvantage,
      isEqualMasses,
    };
  }

  // ==========================================================================
  // CASO PRINCIPAL: MÁQUINA DE ATWOOD (systemType === 'atwood')
  // ==========================================================================
  const mechanicalAdvantage = 1;
  const isEqualMasses = Math.abs(m1 - m2) <= PHYSICAL_CONSTANTS.EPSILON_MASS;
  const isIdealAtwood =
    mp <= PHYSICAL_CONSTANTS.EPSILON_MASS &&
    b <= PHYSICAL_CONSTANTS.EPSILON_MASS;

  if (isIdealAtwood) {
    // Fórmulas analíticas exactas de la Máquina de Atwood ideal:
    //   a = ((m1 - m2) * g) / (m1 + m2)
    //   T = (2 * m1 * m2 * g) / (m1 + m2)
    const systemAcceleration = calculateAtwoodAcceleration(m1, m2, g);
    const ropeTension = calculateRopeTension(m1, m2, g);
    const netForce = weight1 - weight2;

    // En la escena 3D (+Y apunta hacia ARRIBA):
    // Si a > 0 (m₁ > m₂), m₁ desciende (acceleration1 < 0) y m₂ asciende (acceleration2 > 0).
    const acceleration1 = -systemAcceleration;
    const acceleration2 = systemAcceleration;

    return {
      systemAcceleration,
      ropeTension,
      weight1,
      weight2,
      acceleration1,
      acceleration2,
      tension1: ropeTension,
      tension2: ropeTension,
      netForce,
      mechanicalAdvantage,
      isEqualMasses,
    };
  }

  // Extensión con masa de polea mₚ > 0 o fricción viscosa b > 0:
  const systemVel = -velocity1Vertical;
  const drivingForce = isEqualMasses ? 0 : (m1 - m2) * g;
  const dampingForce = -b * systemVel;
  const totalEffectiveMass = m1 + m2 + 0.5 * mp;

  const systemAcceleration =
    totalEffectiveMass > PHYSICAL_CONSTANTS.EPSILON_MASS
      ? (drivingForce + dampingForce) / totalEffectiveMass
      : 0;

  const acceleration1 = -systemAcceleration;
  const acceleration2 = systemAcceleration;
  const tension1 = Math.max(0, m1 * (g + acceleration1));
  const tension2 = Math.max(0, m2 * (g + acceleration2));

  return {
    systemAcceleration,
    ropeTension: 0.5 * (tension1 + tension2),
    weight1,
    weight2,
    acceleration1,
    acceleration2,
    tension1,
    tension2,
    netForce: drivingForce,
    mechanicalAdvantage,
    isEqualMasses,
  };
}

/**
 * Calcula las energías cinética, potencial gravitatoria y mecánica total del sistema.
 */
export function computeSystemEnergies(
  position1Y: number,
  position2Y: number,
  velocity1: number,
  velocity2: number,
  params: PulleyParameters
): { kineticEnergy: number; potentialEnergy: number; totalEnergy: number } {
  const m1 = params.mass1;
  const m2 = params.mass2;
  const mp = params.pulleyMass;
  const g = params.gravity;

  const ke1 = 0.5 * m1 * velocity1 * velocity1;
  const ke2 = 0.5 * m2 * velocity2 * velocity2;
  const kePulley =
    params.systemType === 'movable_pulley'
      ? 0.5 * mp * velocity2 * velocity2 + 0.25 * mp * velocity1 * velocity1
      : 0.25 * mp * velocity1 * velocity1;

  const kineticEnergy = ke1 + ke2 + kePulley;

  const referenceHeight = PHYSICAL_CONSTANTS.MAX_TRAVEL_LIMIT;
  const pe1 = m1 * g * (position1Y + referenceHeight);
  const pe2 =
    (params.systemType === 'movable_pulley' ? m2 + mp : m2) *
    g *
    (position2Y + referenceHeight);

  const potentialEnergy = pe1 + pe2;

  return {
    kineticEnergy,
    potentialEnergy,
    totalEnergy: kineticEnergy + potentialEnergy,
  };
}

/**
 * Calcula los límites físicos exactos de desplazamiento del sistema [minSystemY, maxSystemY]
 * teniendo en cuenta las dimensiones geométricas de cada pesa, la cota del suelo (FLOOR_SURFACE_Y)
 * y el tope superior bajo la polea, garantizando que ninguna masa atraviese el suelo ni salga de la escena.
 */
export function computePhysicalTravelLimits(params: PulleyParameters): {
  minSystemY: number;
  maxSystemY: number;
} {
  const halfSize1 = computeWeightBlockSize(params.mass1) / 2;
  const halfSize2 = computeWeightBlockSize(params.mass2) / 2;
  const floorY = PHYSICAL_CONSTANTS.FLOOR_SURFACE_Y; // -1.80 m

  // Cuando y_sistema > 0, m₁ baja (h₁ = -y_sistema) y m₂ sube (h₂ = ratio * y_sistema).
  // Condición de suelo para m₁: h₁ - halfSize1 >= floorY  =>  y_sistema <= |floorY| - halfSize1
  const maxByFloorM1 = Math.abs(floorY) - halfSize1;
  const maxSystemY = Math.min(PHYSICAL_CONSTANTS.MAX_TRAVEL_LIMIT, maxByFloorM1);

  // Cuando y_sistema < 0, m₂ baja y m₁ sube.
  // Condición de suelo para m₂: h₂ - halfSize2 >= floorY
  const maxDownM2 = Math.abs(floorY) - halfSize2;
  const minSystemY =
    params.systemType === 'movable_pulley'
      ? -Math.min(PHYSICAL_CONSTANTS.MAX_TRAVEL_LIMIT, maxDownM2 * 2)
      : -Math.min(PHYSICAL_CONSTANTS.MAX_TRAVEL_LIMIT, maxDownM2);

  return { minSystemY, maxSystemY };
}

/**
 * Construye el estado físico inicial en t = 0 s a partir de los parámetros validados.
 */
export function createInitialPhysicsState(
  rawParams: PulleyParameters
): PulleyPhysicsState {
  const { sanitized: params } = validateSimulationInputs(rawParams);
  const { minSystemY, maxSystemY } = computePhysicalTravelLimits(params);

  // y₀ es la coordenada inicial del sistema y(0) = y₀ acotada a los límites físicos
  const y0 = clamp(params.initialDisplacement, minSystemY, maxSystemY);
  const v0 = params.initialVelocity;

  const ratio = params.systemType === 'movable_pulley' ? 0.5 : 1;
  const position1Y = -y0;
  const position2Y = ratio * y0;
  const velocity1 = -v0;
  const velocity2 = ratio * v0;

  const dynamics = computePulleyDynamics(velocity1, params);
  const energies = computeSystemEnergies(
    position1Y,
    position2Y,
    velocity1,
    velocity2,
    params
  );
  const radius = Math.max(
    params.pulleyRadius,
    PARAMETER_BOUNDS.MIN_PULLEY_RADIUS
  );

  const atMax = y0 >= maxSystemY - 1e-4 && dynamics.systemAcceleration >= 0 && v0 >= 0;
  const atMin = y0 <= minSystemY + 1e-4 && dynamics.systemAcceleration <= 0 && v0 <= 0;
  const atLimit = atMax || atMin;
  const limitReason = atMax
    ? 'La masa m1 alcanzó la plataforma del suelo (límite físico inferior).'
    : atMin
    ? 'La masa m2 alcanzó la plataforma del suelo / tope superior.'
    : null;

  return {
    time: 0,
    systemAcceleration: dynamics.systemAcceleration,
    ropeTension: dynamics.ropeTension,
    weight1: dynamics.weight1,
    weight2: dynamics.weight2,
    systemPosition: y0,
    systemVelocity: v0,
    isEqualMasses: dynamics.isEqualMasses,
    displacement: y0,
    position1Y,
    position2Y,
    velocity1,
    velocity2,
    acceleration1: dynamics.acceleration1,
    acceleration2: dynamics.acceleration2,
    tension1: dynamics.tension1,
    tension2: dynamics.tension2,
    netForce: dynamics.netForce,
    pulleyAngle: y0 / radius,
    angularVelocity: v0 / radius,
    mechanicalAdvantage: dynamics.mechanicalAdvantage,
    ...energies,
    atLimit,
    limitReason,
  };
}

/**
 * Avanza el estado físico un paso temporal `dt`.
 * - En el caso de Atwood ideal sin rozamiento (b = 0), emplea directamente las ecuaciones
 *   cinemáticas analíticas exactas:
 *     y(t) = y0 + v0 * t + (1/2) * a * t²
 *     v(t) = v0 + a * t
 *   garantizando precisión matemática exacta sin deriva numérica.
 * - Cuando existe rozamiento viscoso dependiente de la velocidad (b > 0), emplea RK4.
 */
export function stepPhysicsState(
  currentState: PulleyPhysicsState,
  rawParams: PulleyParameters,
  dt: number
): PulleyPhysicsState {
  if (currentState.atLimit) {
    return currentState;
  }

  const { sanitized: params } = validateSimulationInputs(rawParams);
  const { minSystemY, maxSystemY } = computePhysicalTravelLimits(params);
  const nextTime = currentState.time + dt;

  const isConstantAcceleration =
    params.frictionTorque <= PHYSICAL_CONSTANTS.EPSILON_MASS;

  let nextSystemY: number;
  let nextSystemV: number;

  const dynamicsAtCurrent = computePulleyDynamics(
    currentState.velocity1,
    params
  );

  if (isConstantAcceleration) {
    // Solución analítica exacta sobre el paso físico dt:
    //   y(t + dt) = y(t) + v(t) * dt + (1/2) * a * dt²
    //   v(t + dt) = v(t) + a * dt
    // Esto es algebraicamente idéntico a y(t) = y₀ + v₀*t + ½*a*t² desde t = 0
    // y permite además modificar masas o gravedad en caliente sin discontinuidades.
    const a = dynamicsAtCurrent.systemAcceleration;
    nextSystemY = calculatePositionAtTime(
      currentState.systemPosition,
      currentState.systemVelocity,
      a,
      dt
    );
    nextSystemV = calculateVelocityAtTime(currentState.systemVelocity, a, dt);
  } else {
    // Integración numérica RK4 cuando hay fuerza amortiguadora dependiente de v
    const stateVector = [
      currentState.systemPosition,
      currentState.systemVelocity,
    ];
    const [rkY, rkV] = rk4Step(
      currentState.time,
      stateVector,
      dt,
      (_t, [_y, sysV]) => {
        const dyn = computePulleyDynamics(-sysV, params);
        return [sysV, dyn.systemAcceleration];
      }
    );
    nextSystemY = rkY;
    nextSystemV = rkV;
  }

  let atLimit = false;
  let limitReason: string | null = null;

  if (nextSystemY >= maxSystemY) {
    nextSystemY = maxSystemY;
    nextSystemV = 0;
    atLimit = true;
    limitReason =
      'Límite físico alcanzado: La masa m1 tocó la plataforma del suelo y la masa m2 llegó al tope superior.';
  } else if (nextSystemY <= minSystemY) {
    nextSystemY = minSystemY;
    nextSystemV = 0;
    atLimit = true;
    limitReason =
      'Límite físico alcanzado: La masa m2 tocó la plataforma del suelo y la masa m1 llegó al tope superior.';
  }

  const ratio = params.systemType === 'movable_pulley' ? 0.5 : 1;
  const nextPosition1Y = -nextSystemY;
  const nextPosition2Y = ratio * nextSystemY;
  const nextVelocity1 = -nextSystemV;
  const nextVelocity2 = ratio * nextSystemV;

  const dynamics = computePulleyDynamics(nextVelocity1, params);
  const energies = computeSystemEnergies(
    nextPosition1Y,
    nextPosition2Y,
    nextVelocity1,
    nextVelocity2,
    params
  );
  const radius = Math.max(params.pulleyRadius, PARAMETER_BOUNDS.MIN_PULLEY_RADIUS);

  return {
    time: nextTime,
    systemAcceleration: atLimit ? 0 : dynamics.systemAcceleration,
    ropeTension: dynamics.ropeTension,
    weight1: dynamics.weight1,
    weight2: dynamics.weight2,
    systemPosition: nextSystemY,
    systemVelocity: nextSystemV,
    isEqualMasses: dynamics.isEqualMasses,
    displacement: nextSystemY,
    position1Y: nextPosition1Y,
    position2Y: nextPosition2Y,
    velocity1: nextVelocity1,
    velocity2: nextVelocity2,
    acceleration1: atLimit ? 0 : dynamics.acceleration1,
    acceleration2: atLimit ? 0 : dynamics.acceleration2,
    tension1: dynamics.tension1,
    tension2: dynamics.tension2,
    netForce: dynamics.netForce,
    pulleyAngle: nextSystemY / radius,
    angularVelocity: nextSystemV / radius,
    mechanicalAdvantage: dynamics.mechanicalAdvantage,
    ...energies,
    atLimit,
    limitReason,
  };
}

export function toTelemetryPoint(state: PulleyPhysicsState): TelemetryPoint {
  return {
    time: Number(state.time.toFixed(2)),
    systemPosition: Number(state.systemPosition.toFixed(3)),
    systemVelocity: Number(state.systemVelocity.toFixed(3)),
    systemAcceleration: Number(state.systemAcceleration.toFixed(3)),
    position1Y: Number(state.position1Y.toFixed(3)),
    position2Y: Number(state.position2Y.toFixed(3)),
    velocity1: Number(state.velocity1.toFixed(3)),
    velocity2: Number(state.velocity2.toFixed(3)),
    acceleration1: Number(state.acceleration1.toFixed(3)),
    acceleration2: Number(state.acceleration2.toFixed(3)),
    ropeTension: Number(state.ropeTension.toFixed(2)),
    tension1: Number(state.tension1.toFixed(2)),
    tension2: Number(state.tension2.toFixed(2)),
    weight1: Number(state.weight1.toFixed(2)),
    weight2: Number(state.weight2.toFixed(2)),
    netForce: Number(state.netForce.toFixed(2)),
    kineticEnergy: Number(state.kineticEnergy.toFixed(2)),
    potentialEnergy: Number(state.potentialEnergy.toFixed(2)),
    totalEnergy: Number(state.totalEnergy.toFixed(2)),
  };
}
