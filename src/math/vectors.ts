import { Vector3D } from '../types/simulation';

/**
 * Operaciones matemáticas puras sobre vectores 3D.
 * Sin dependencias de motores gráficos ni de animaciones.
 */

export function createVec3(x = 0, y = 0, z = 0): Vector3D {
  return { x, y, z };
}

export function addVec3(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x + b.x,
    y: a.y + b.y,
    z: a.z + b.z,
  };
}

export function subVec3(a: Vector3D, b: Vector3D): Vector3D {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  };
}

export function scaleVec3(v: Vector3D, scalar: number): Vector3D {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  };
}

export function dotVec3(a: Vector3D, b: Vector3D): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

export function magnitudeSquaredVec3(v: Vector3D): number {
  return dotVec3(v, v);
}

export function magnitudeVec3(v: Vector3D): number {
  return Math.sqrt(magnitudeSquaredVec3(v));
}

export function normalizeVec3(v: Vector3D): Vector3D {
  const mag = magnitudeVec3(v);
  if (mag === 0) return createVec3(0, 0, 0);
  return scaleVec3(v, 1 / mag);
}

export function lerpNumber(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpVec3(a: Vector3D, b: Vector3D, t: number): Vector3D {
  return {
    x: lerpNumber(a.x, b.x, t),
    y: lerpNumber(a.y, b.y, t),
    z: lerpNumber(a.z, b.z, t),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
