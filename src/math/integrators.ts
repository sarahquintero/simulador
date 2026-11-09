import { DerivativeFunction } from '../types/simulation';

/**
 * Integradores numéricos puros para resolver sistemas de ecuaciones diferenciales ordinarias.
 * Completamente independientes del bucle de animación (requestAnimationFrame) y de la vista.
 */

/**
 * Método de Runge-Kutta de 4.º orden (RK4) para un vector de estado arbitrario.
 * Proporciona alta precisión y conservación de energía a corto/medio plazo.
 */
export function rk4Step(
  time: number,
  state: number[],
  dt: number,
  derivativeFn: DerivativeFunction
): number[] {
  const n = state.length;
  const k1 = derivativeFn(time, state);

  const stateK2 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    stateK2[i] = state[i] + 0.5 * dt * k1[i];
  }
  const k2 = derivativeFn(time + 0.5 * dt, stateK2);

  const stateK3 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    stateK3[i] = state[i] + 0.5 * dt * k2[i];
  }
  const k3 = derivativeFn(time + 0.5 * dt, stateK3);

  const stateK4 = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    stateK4[i] = state[i] + dt * k3[i];
  }
  const k4 = derivativeFn(time + dt, stateK4);

  const nextState = new Array<number>(n);
  for (let i = 0; i < n; i++) {
    nextState[i] =
      state[i] + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
  }

  return nextState;
}

/**
 * Integrador de Euler Semi-Implícito (Euler-Cromer) para sistemas de segundo orden [posición, velocidad].
 * Es simpléctico y conserva mejor la energía en sistemas oscilatorios simples que el Euler explícito.
 */
export function semiImplicitEulerStep1D(
  position: number,
  velocity: number,
  dt: number,
  computeAcceleration: (pos: number, vel: number) => number
): { position: number; velocity: number; acceleration: number } {
  const acceleration = computeAcceleration(position, velocity);
  const nextVelocity = velocity + acceleration * dt;
  const nextPosition = position + nextVelocity * dt;
  const nextAcceleration = computeAcceleration(nextPosition, nextVelocity);

  return {
    position: nextPosition,
    velocity: nextVelocity,
    acceleration: nextAcceleration,
  };
}
