import { DEFAULT_PULLEY_PARAMETERS, PHYSICAL_CONSTANTS } from './constants';
import {
  calculateAtwoodAcceleration,
  calculateGravitationalForce,
  calculatePositionAtTime,
  calculateRopeTension,
  calculateVelocityAtTime,
  createInitialPhysicsState,
  stepPhysicsState,
  toTelemetryPoint,
  validateSimulationInputs,
} from './engine';

export interface TestCaseVerificationReport {
  id: string;
  description: string;
  passed: boolean;
  expected: string;
  actual: string;
}

function approxEqual(a: number, b: number, tolerance = 1e-4): boolean {
  return Math.abs(a - b) <= tolerance;
}

/**
 * Ejecuta la batería completa de pruebas de validación física y matemática (Fase 9).
 */
export function runPhysicsValidationSuite(): {
  allPassed: boolean;
  results: TestCaseVerificationReport[];
} {
  const results: TestCaseVerificationReport[] = [];
  const g = PHYSICAL_CONSTANTS.EARTH_GRAVITY; // 9.81 m/s²

  // ==========================================================================
  // CASO 1 OBLIGATORIO: m1 = 5 kg, m2 = 5 kg -> a = 0 m/s²
  // ==========================================================================
  const aCase1 = calculateAtwoodAcceleration(5, 5, g);
  const tCase1 = calculateRopeTension(5, 5, g);
  const stateCase1 = createInitialPhysicsState({
    ...DEFAULT_PULLEY_PARAMETERS,
    mass1: 5,
    mass2: 5,
    gravity: g,
  });
  const steppedCase1 = stepPhysicsState(stateCase1, {
    ...DEFAULT_PULLEY_PARAMETERS,
    mass1: 5,
    mass2: 5,
    gravity: g,
  }, 0.5);

  results.push({
    id: 'CASO 1',
    description: 'm1 = 5 kg, m2 = 5 kg (Masas iguales en equilibrio)',
    passed:
      aCase1 === 0 &&
      approxEqual(tCase1, 49.05) &&
      steppedCase1.position1Y === 0 &&
      steppedCase1.velocity1 === 0 &&
      stateCase1.isEqualMasses === true,
    expected: 'a = 0.000 m/s², T = 49.05 N, v(t) = 0 m/s',
    actual: `a = ${aCase1.toFixed(3)} m/s², T = ${tCase1.toFixed(2)} N, v(0.5s) = ${steppedCase1.velocity1.toFixed(3)} m/s`,
  });

  // ==========================================================================
  // CASO 2 OBLIGATORIO: m1 = 8 kg, m2 = 4 kg, g = 9.81 m/s² -> a = +3.27 m/s²
  // ==========================================================================
  const aCase2 = calculateAtwoodAcceleration(8, 4, g);
  const tCase2 = calculateRopeTension(8, 4, g);
  const p1Case2 = calculateGravitationalForce(8, g);
  const p2Case2 = calculateGravitationalForce(4, g);
  const paramsCase2 = {
    ...DEFAULT_PULLEY_PARAMETERS,
    mass1: 8,
    mass2: 4,
    gravity: g,
  };
  const initCase2 = createInitialPhysicsState(paramsCase2);
  const stepCase2 = stepPhysicsState(initCase2, paramsCase2, 0.5);

  // Verificación de 2.ª Ley de Newton en cada masa: T - P₁ = m₁*a₁ y T - P₂ = m₂*a₂
  const newtonM1Case2 = approxEqual(
    tCase2 - p1Case2,
    8 * initCase2.acceleration1
  );
  const newtonM2Case2 = approxEqual(
    tCase2 - p2Case2,
    4 * initCase2.acceleration2
  );

  results.push({
    id: 'CASO 2',
    description: 'm1 = 8 kg, m2 = 4 kg, g = 9.81 m/s² (m1 desciende, m2 asciende)',
    passed:
      approxEqual(aCase2, 3.27) &&
      approxEqual(tCase2, 52.32) &&
      stepCase2.position1Y < 0 &&
      stepCase2.position2Y > 0 &&
      newtonM1Case2 &&
      newtonM2Case2,
    expected: 'a = +3.270 m/s², T = 52.32 N, m1 baja (y1 < 0) y m2 sube (y2 > 0)',
    actual: `a = +${aCase2.toFixed(3)} m/s², T = ${tCase2.toFixed(2)} N, y1(0.5s) = ${stepCase2.position1Y.toFixed(4)} m, y2(0.5s) = +${stepCase2.position2Y.toFixed(4)} m`,
  });

  // ==========================================================================
  // CASO 3 OBLIGATORIO: m1 = 4 kg, m2 = 8 kg, g = 9.81 m/s² -> a = -3.27 m/s²
  // ==========================================================================
  const aCase3 = calculateAtwoodAcceleration(4, 8, g);
  const tCase3 = calculateRopeTension(4, 8, g);
  const paramsCase3 = {
    ...DEFAULT_PULLEY_PARAMETERS,
    mass1: 4,
    mass2: 8,
    gravity: g,
  };
  const initCase3 = createInitialPhysicsState(paramsCase3);
  const stepCase3 = stepPhysicsState(initCase3, paramsCase3, 0.5);

  results.push({
    id: 'CASO 3',
    description: 'm1 = 4 kg, m2 = 8 kg, g = 9.81 m/s² (m1 asciende, m2 desciende)',
    passed:
      approxEqual(aCase3, -3.27) &&
      approxEqual(tCase3, 52.32) &&
      stepCase3.position1Y > 0 &&
      stepCase3.position2Y < 0,
    expected: 'a = -3.270 m/s², T = 52.32 N, m1 sube (y1 > 0) y m2 baja (y2 < 0)',
    actual: `a = ${aCase3.toFixed(3)} m/s², T = ${tCase3.toFixed(2)} N, y1(0.5s) = +${stepCase3.position1Y.toFixed(4)} m, y2(0.5s) = ${stepCase3.position2Y.toFixed(4)} m`,
  });

  // ==========================================================================
  // VERIFICACIÓN 4: Conservación de la longitud de la cuerda inextensible
  // ==========================================================================
  const pulleyY = PHYSICAL_CONSTANTS.PULLEY_CENTER_Y;
  const radius = paramsCase2.pulleyRadius;
  const initialRopeLength =
    pulleyY -
    initCase2.position1Y +
    (pulleyY - initCase2.position2Y) +
    Math.PI * radius;

  let current = initCase2;
  let maxDeviation = 0;
  for (let i = 0; i < 60; i++) {
    current = stepPhysicsState(
      current,
      paramsCase2,
      PHYSICAL_CONSTANTS.FIXED_TIME_STEP
    );
    const instantRopeLen =
      pulleyY -
      current.position1Y +
      (pulleyY - current.position2Y) +
      Math.PI * radius;
    maxDeviation = Math.max(
      maxDeviation,
      Math.abs(instantRopeLen - initialRopeLength)
    );
  }

  results.push({
    id: 'CUERDA INEXTENSIBLE',
    description: 'Conservación exacta de la longitud total de la cuerda L1 + L2 + pi*R',
    passed: maxDeviation < 1e-12,
    expected: 'Desviación máxima = 0.000000 m',
    actual: `Desviación máxima = ${maxDeviation.toExponential(2)} m (L = ${initialRopeLength.toFixed(4)} m)`,
  });

  // ==========================================================================
  // VERIFICACIÓN 5: Coherencia cinemática analítica y límites físicos de suelo
  // ==========================================================================
  const tAnalytical = 0.5;
  const expectedYAt05 = calculatePositionAtTime(0, 0, aCase2, tAnalytical);
  const expectedVAt05 = calculateVelocityAtTime(0, aCase2, tAnalytical);

  // Avanzar hasta alcanzar el límite físico del suelo
  let limitState = initCase2;
  for (let i = 0; i < 300 && !limitState.atLimit; i++) {
    limitState = stepPhysicsState(limitState, paramsCase2, 0.02);
  }
  const telemetrySample = toTelemetryPoint(stepCase2);

  results.push({
    id: 'CINEMÁTICA Y LÍMITES',
    description: 'Ecuaciones horarias y(t), v(t), telemetría y detención en límite físico',
    passed:
      approxEqual(stepCase2.systemPosition, expectedYAt05) &&
      approxEqual(stepCase2.systemVelocity, expectedVAt05) &&
      approxEqual(telemetrySample.position1Y, stepCase2.position1Y, 1e-3) &&
      limitState.atLimit === true &&
      limitState.systemVelocity === 0,
    expected: `y(0.5s) = ${expectedYAt05.toFixed(4)} m, v(0.5s) = ${expectedVAt05.toFixed(4)} m/s, atLimit = true`,
    actual: `y(0.5s) = ${stepCase2.systemPosition.toFixed(4)} m, v(0.5s) = ${stepCase2.systemVelocity.toFixed(4)} m/s, atLimit = ${limitState.atLimit}`,
  });

  // ==========================================================================
  // VERIFICACIÓN 6: Protección contra división por cero y validación de entradas
  // ==========================================================================
  const zeroMassAcc = calculateAtwoodAcceleration(0, 0, g);
  const zeroMassTen = calculateRopeTension(0, 0, g);
  const invalidValidation = validateSimulationInputs({
    mass1: -10,
    mass2: Number.NaN,
    gravity: -5,
  });

  results.push({
    id: 'VALIDACIÓN Y SEGURIDAD',
    description: 'Protección contra división por cero y entradas fuera de rango',
    passed:
      zeroMassAcc === 0 &&
      zeroMassTen === 0 &&
      invalidValidation.sanitized.mass1 > 0 &&
      invalidValidation.sanitized.mass2 > 0 &&
      invalidValidation.sanitized.gravity > 0,
    expected: 'Sin NaN ni Infinity ante entradas nulas o negativas',
    actual: `a(0,0) = ${zeroMassAcc}, T(0,0) = ${zeroMassTen}, m1_sanitizado = ${invalidValidation.sanitized.mass1} kg`,
  });

  return {
    allPassed: results.every((r) => r.passed),
    results,
  };
}
