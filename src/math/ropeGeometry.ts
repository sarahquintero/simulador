import { clamp } from './vectors';

/**
 * Cálculos geométricos y de escala vectorial puros para el sistema de poleas y cuerdas.
 * Mantiene las transformaciones matemáticas separadas de los componentes 3D.
 */

export type Point3Tuple = [number, number, number];

/**
 * Genera los puntos 3D de un arco circular en el plano XY (por ejemplo, la cuerda
 * que bordea la garganta superior de una polea o el arco indicador de giro).
 */
export function computeCircularArcPoints(
  centerX: number,
  centerY: number,
  centerZ: number,
  radius: number,
  startAngleRad: number,
  endAngleRad: number,
  segments = 28
): Point3Tuple[] {
  const points: Point3Tuple[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngleRad + t * (endAngleRad - startAngleRad);
    points.push([
      centerX + radius * Math.cos(angle),
      centerY + radius * Math.sin(angle),
      centerZ,
    ]);
  }
  return points;
}

/**
 * Calcula la dimensión cúbica visual de una pesa en función de su masa (kg)
 * manteniendo proporciones realistas de volumen (raíz cúbica de la masa).
 */
export function computeWeightBlockSize(massKg: number): number {
  return clamp(0.28 + Math.cbrt(Math.max(0.5, massKg)) * 0.12, 0.34, 0.66);
}

/**
 * Escala lineal compartida para vectores de fuerza (Peso P y Tensión T en Newtons).
 * Garantiza que si P₁ < T < P₂ en el modelo matemático, las longitudes de las flechas
 * cumplan estrictamente L(P₁) < L(T) < L(P₂) en la visualización.
 */
export function computeForceArrowLength(forceNewtons: number): number {
  const absForce = Math.abs(forceNewtons);
  if (absForce < 0.05) return 0;
  return clamp(0.18 + absForce * 0.0065, 0.22, 1.35);
}

/**
 * Escala lineal compartida para vectores de aceleración (a₁ y a₂ en m/s²).
 */
export function computeAccelerationArrowLength(
  accelerationMs2: number
): number {
  const absAcc = Math.abs(accelerationMs2);
  if (absAcc < 0.02) return 0;
  return clamp(0.22 + absAcc * 0.075, 0.24, 1.15);
}
