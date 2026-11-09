import { useCallback, useEffect, useRef, useState } from 'react';
import { lerpNumber } from '../math/vectors';
import {
  DEFAULT_PULLEY_PARAMETERS,
  PHYSICAL_CONSTANTS,
} from '../physics/constants';
import {
  computePhysicalTravelLimits,
  computePulleyDynamics,
  computeSystemEnergies,
  createInitialPhysicsState,
  stepPhysicsState,
  toTelemetryPoint,
  validateSimulationInputs,
} from '../physics/engine';
import {
  PulleyParameters,
  PulleyPhysicsState,
  SimulationStatus,
  TelemetryPoint,
} from '../types/simulation';

/**
 * Interpola linealmente entre dos estados físicos discretos consecutivos (prev y curr)
 * según la fracción residual del acumulador temporal alpha ∈ [0, 1).
 * Esto permite que el motor físico avance en pasos estrictamente fijos (120 Hz)
 * mientras la representación visual se interpola con total fluidez a cualquier tasa de FPS.
 */
function interpolateVisualState(
  prev: PulleyPhysicsState,
  curr: PulleyPhysicsState,
  alpha: number
): PulleyPhysicsState {
  if (alpha <= 0.001 || curr.atLimit) return curr;
  return {
    ...curr,
    time: lerpNumber(prev.time, curr.time, alpha),
    systemPosition: lerpNumber(prev.systemPosition, curr.systemPosition, alpha),
    systemVelocity: lerpNumber(prev.systemVelocity, curr.systemVelocity, alpha),
    displacement: lerpNumber(prev.displacement, curr.displacement, alpha),
    position1Y: lerpNumber(prev.position1Y, curr.position1Y, alpha),
    position2Y: lerpNumber(prev.position2Y, curr.position2Y, alpha),
    velocity1: lerpNumber(prev.velocity1, curr.velocity1, alpha),
    velocity2: lerpNumber(prev.velocity2, curr.velocity2, alpha),
    pulleyAngle: lerpNumber(prev.pulleyAngle, curr.pulleyAngle, alpha),
    angularVelocity: lerpNumber(prev.angularVelocity, curr.angularVelocity, alpha),
    kineticEnergy: lerpNumber(prev.kineticEnergy, curr.kineticEnergy, alpha),
    potentialEnergy: lerpNumber(prev.potentialEnergy, curr.potentialEnergy, alpha),
    totalEnergy: lerpNumber(prev.totalEnergy, curr.totalEnergy, alpha),
  };
}

/**
 * Controlador del bucle de simulación física y animación.
 * Garantiza que el tiempo físico avance mediante un acumulador de paso fijo (FIXED_TIME_STEP = 1/120 s),
 * independizando los cálculos matemáticos de la frecuencia de refresco de la pantalla.
 */
export function useSimulationController() {
  const [parameters, setParameters] = useState<PulleyParameters>(
    DEFAULT_PULLEY_PARAMETERS
  );
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [status, setStatus] = useState<SimulationStatus>('idle');
  const [physicsState, setPhysicsState] = useState<PulleyPhysicsState>(() =>
    createInitialPhysicsState(DEFAULT_PULLEY_PARAMETERS)
  );
  const [telemetry, setTelemetry] = useState<TelemetryPoint[]>(() => [
    toTelemetryPoint(createInitialPhysicsState(DEFAULT_PULLEY_PARAMETERS)),
  ]);

  const stateRef = useRef<PulleyPhysicsState>(physicsState);
  const prevStateRef = useRef<PulleyPhysicsState>(physicsState);
  const paramsRef = useRef<PulleyParameters>(parameters);
  const lastSampleTimeRef = useRef<number>(0);

  useEffect(() => {
    paramsRef.current = parameters;
  }, [parameters]);

  /**
   * REINICIAR: Vuelve el tiempo t a 0 s y coloca las masas en las condiciones iniciales
   * configuradas actualmente por el usuario, conservando sus parámetros.
   */
  const resetSimulation = useCallback((customParams?: PulleyParameters) => {
    const rawParams = customParams ?? paramsRef.current;
    const { sanitized, warnings } = validateSimulationInputs(rawParams);
    setValidationWarnings(warnings);
    const initial = createInitialPhysicsState(sanitized);
    stateRef.current = initial;
    prevStateRef.current = initial;
    lastSampleTimeRef.current = 0;
    setStatus('idle');
    setPhysicsState(initial);
    setTelemetry([toTelemetryPoint(initial)]);
  }, []);

  /**
   * RESTABLECER VALORES: Restaura todos los controles a los valores predeterminados
   * de fábrica (DEFAULT_PULLEY_PARAMETERS) y reinicia la simulación a t = 0 s.
   */
  const restoreDefaultValues = useCallback(() => {
    paramsRef.current = DEFAULT_PULLEY_PARAMETERS;
    setParameters(DEFAULT_PULLEY_PARAMETERS);
    setValidationWarnings([]);
    const initial = createInitialPhysicsState(DEFAULT_PULLEY_PARAMETERS);
    stateRef.current = initial;
    prevStateRef.current = initial;
    lastSampleTimeRef.current = 0;
    setStatus('idle');
    setPhysicsState(initial);
    setTelemetry([toTelemetryPoint(initial)]);
  }, []);

  /**
   * INICIAR: Arranca la simulación desde el inicio (t = 0 s).
   */
  const startSimulation = useCallback(() => {
    const initial = createInitialPhysicsState(paramsRef.current);
    stateRef.current = initial;
    prevStateRef.current = initial;
    lastSampleTimeRef.current = 0;
    setPhysicsState(initial);
    setTelemetry([toTelemetryPoint(initial)]);
    setStatus('running');
  }, []);

  /**
   * PAUSAR: Congela temporalmente el avance del tiempo físico en el instante actual.
   */
  const pauseSimulation = useCallback(() => {
    setStatus((prev) => (prev === 'running' ? 'paused' : prev));
  }, []);

  /**
   * REANUDAR: Continúa la simulación exactamente desde el estado en que se pausó.
   */
  const resumeSimulation = useCallback(() => {
    if (stateRef.current.atLimit) {
      startSimulation();
      return;
    }
    setStatus('running');
  }, [startSimulation]);

  /**
   * Actualiza cualquier parámetro de entrada y recalcula automáticamente
   * la aceleración, la tensión, los pesos y demás indicadores físicos.
   */
  const updateParameter = useCallback(
    <K extends keyof PulleyParameters>(key: K, value: PulleyParameters[K]) => {
      setParameters((prev) => {
        const candidate = { ...prev, [key]: value };
        const { sanitized: updated, warnings } =
          validateSimulationInputs(candidate);
        setValidationWarnings(warnings);
        paramsRef.current = updated;

        // Si solo cambia la escala de visualización o velocidad temporal, no altera el estado físico
        if (key === 'visualScale' || key === 'timeScale') {
          return updated;
        }

        if (
          status === 'idle' ||
          key === 'systemType' ||
          key === 'initialDisplacement' ||
          key === 'initialVelocity'
        ) {
          const initial = createInitialPhysicsState(updated);
          stateRef.current = initial;
          prevStateRef.current = initial;
          lastSampleTimeRef.current = 0;
          setStatus('idle');
          setPhysicsState(initial);
          setTelemetry([toTelemetryPoint(initial)]);
        } else {
          // Recálculo automático e instantáneo de aceleración, tensión y pesos
          const current = stateRef.current;
          const { minSystemY, maxSystemY } =
            computePhysicalTravelLimits(updated);
          const dynamics = computePulleyDynamics(current.velocity1, updated);
          const clampedSysY = Math.min(
            maxSystemY,
            Math.max(minSystemY, current.systemPosition)
          );
          const stillBlockedMax =
            clampedSysY >= maxSystemY - 1e-4 &&
            dynamics.systemAcceleration >= 0;
          const stillBlockedMin =
            clampedSysY <= minSystemY + 1e-4 &&
            dynamics.systemAcceleration <= 0;
          const stillAtLimit = stillBlockedMax || stillBlockedMin;

          const energies = computeSystemEnergies(
            current.position1Y,
            current.position2Y,
            current.velocity1,
            current.velocity2,
            updated
          );
          const recalculated: PulleyPhysicsState = {
            ...current,
            systemPosition: clampedSysY,
            systemAcceleration: stillAtLimit ? 0 : dynamics.systemAcceleration,
            ropeTension: dynamics.ropeTension,
            weight1: dynamics.weight1,
            weight2: dynamics.weight2,
            isEqualMasses: dynamics.isEqualMasses,
            acceleration1: stillAtLimit ? 0 : dynamics.acceleration1,
            acceleration2: stillAtLimit ? 0 : dynamics.acceleration2,
            tension1: dynamics.tension1,
            tension2: dynamics.tension2,
            netForce: dynamics.netForce,
            mechanicalAdvantage: dynamics.mechanicalAdvantage,
            ...energies,
            atLimit: stillAtLimit,
            limitReason: stillAtLimit ? current.limitReason : null,
          };
          stateRef.current = recalculated;
          prevStateRef.current = recalculated;
          setPhysicsState(recalculated);
          setTelemetry((prevTelemetry) => {
            if (prevTelemetry.length === 0) {
              return [toTelemetryPoint(recalculated)];
            }
            const copy = [...prevTelemetry];
            copy[copy.length - 1] = toTelemetryPoint(recalculated);
            return copy;
          });
        }
        return updated;
      });
    },
    [status]
  );

  const stepOnce = useCallback(() => {
    const dt = PHYSICAL_CONSTANTS.FIXED_TIME_STEP * 4;
    const next = stepPhysicsState(stateRef.current, paramsRef.current, dt);
    prevStateRef.current = stateRef.current;
    stateRef.current = next;
    setPhysicsState(next);
    setTelemetry((prev) =>
      [...prev, toTelemetryPoint(next)].slice(
        -PHYSICAL_CONSTANTS.MAX_TELEMETRY_POINTS
      )
    );
    setStatus((prevStatus) => {
      if (next.atLimit) return 'finished';
      if (prevStatus === 'idle') return 'paused';
      return prevStatus;
    });
  }, []);

  useEffect(() => {
    if (status !== 'running') return;

    let animationFrameId: number;
    let previousTimestamp = performance.now();
    let accumulator = 0;
    const fixedDt = PHYSICAL_CONSTANTS.FIXED_TIME_STEP;

    const animate = (timestamp: number) => {
      // Delta real entre frames acotado a MAX_FRAME_DELTA para evitar saltos bruscos
      const rawFrameDelta = (timestamp - previousTimestamp) / 1000;
      const frameDeltaSeconds = Math.min(
        Math.max(0, rawFrameDelta),
        PHYSICAL_CONSTANTS.MAX_FRAME_DELTA
      );
      previousTimestamp = timestamp;

      // Acumulador de tiempo físico desacoplado de la frecuencia de refresco del monitor
      accumulator += frameDeltaSeconds * paramsRef.current.timeScale;

      let current = stateRef.current;
      let previous = prevStateRef.current;

      while (accumulator >= fixedDt && !current.atLimit) {
        previous = current;
        current = stepPhysicsState(current, paramsRef.current, fixedDt);
        accumulator -= fixedDt;
      }

      prevStateRef.current = previous;
      stateRef.current = current;

      // Interpolación sub-paso para una animación continua y fluida a cualquier tasa de FPS
      const alpha = current.atLimit ? 1 : accumulator / fixedDt;
      const renderedState = interpolateVisualState(previous, current, alpha);
      setPhysicsState(renderedState);

      if (current.time - lastSampleTimeRef.current >= 0.04 || current.atLimit) {
        lastSampleTimeRef.current = current.time;
        const point = toTelemetryPoint(current);
        setTelemetry((prev) =>
          [...prev, point].slice(-PHYSICAL_CONSTANTS.MAX_TELEMETRY_POINTS)
        );
      }

      if (current.atLimit) {
        setStatus('finished');
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [status]);

  return {
    parameters,
    validationWarnings,
    status,
    physicsState,
    telemetry,
    start: startSimulation,
    pause: pauseSimulation,
    resume: resumeSimulation,
    reset: () => resetSimulation(),
    restoreDefaults: restoreDefaultValues,
    stepOnce,
    updateParameter,
  };
}
