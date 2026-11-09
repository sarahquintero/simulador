import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, Text, Line } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import {
  ArrowDown,
  ArrowUp,
  Compass,
  Eye,
  LocateFixed,
  MousePointerClick,
  Move,
  RotateCcw,
  Ruler,
  ShieldAlert,
  TrendingUp,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import {
  computeAccelerationArrowLength,
  computeCircularArcPoints,
  computeForceArrowLength,
  computeWeightBlockSize,
} from '../../math/ropeGeometry';
import { PHYSICAL_CONSTANTS } from '../../physics/constants';
import { PulleyParameters, PulleyPhysicsState } from '../../types/simulation';

interface PulleyScene3DProps {
  physicsState: PulleyPhysicsState;
  parameters: PulleyParameters;
}

interface VerticalArrow3DProps {
  origin: [number, number, number];
  direction: 1 | -1; // +1 hacia arriba (+Y), -1 hacia abajo (-Y)
  length: number;
  color: string;
  label: string;
  labelSide?: 'left' | 'right';
}

/**
 * Flecha vectorial 3D cuya orientación (+Y o -Y) y longitud responden
 * directamente al signo y magnitud de la variable física.
 */
const VerticalArrow3D: React.FC<VerticalArrow3DProps> = React.memo(
  ({ origin, direction, length, color, label, labelSide = 'right' }) => {
    if (length <= 0.01) return null;

    const [ox, oy, oz] = origin;
    const headHeight = 0.13;
    const shaftLength = Math.max(0.08, length - headHeight * 0.6);
    const endY = oy + direction * shaftLength;
    const coneY = oy + direction * length;
    const labelOffsetX = labelSide === 'right' ? 0.14 : -0.14;

    return (
      <group>
        <Line
          points={[
            [ox, oy, oz],
            [ox, endY, oz],
          ]}
          color={color}
          lineWidth={3.2}
        />
        <mesh
          position={[ox, coneY, oz]}
          rotation={[direction === 1 ? 0 : Math.PI, 0, 0]}
        >
          <coneGeometry args={[0.058, headHeight, 14]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <Text
          position={[ox + labelOffsetX, oy + direction * (length * 0.55), oz]}
          fontSize={0.105}
          color={color}
          anchorX={labelSide === 'right' ? 'left' : 'right'}
          anchorY="middle"
        >
          {label}
        </Text>
      </group>
    );
  }
);

/**
 * Representación visual del campo gravitatorio g en la escena.
 */
const GravityFieldIndicator: React.FC<{ gravity: number }> = React.memo(
  ({ gravity }) => {
    const arrowLen = Math.min(0.95, Math.max(0.35, gravity * 0.05));
    return (
      <group position={[-2.55, 2.05, 0]}>
        <Text
          position={[0, 0.22, 0]}
          fontSize={0.11}
          color="#26364A"
          anchorX="center"
          anchorY="middle"
        >
          Gravedad
        </Text>
        <VerticalArrow3D
          origin={[0, 0.05, 0]}
          direction={-1}
          length={arrowLen}
          color="#4776A5"
          label={`g = ${gravity.toFixed(2)} m/s2`}
          labelSide="right"
        />
      </group>
    );
  }
);

interface MotionDirectionIndicatorProps {
  centerX: number;
  centerY: number;
  radius: number;
  acceleration1: number;
  velocity1: number;
  atLimit: boolean;
}

/**
 * Arco indicador del sentido del movimiento sobre la polea fija.
 */
const MotionDirectionIndicator: React.FC<MotionDirectionIndicatorProps> =
  React.memo(
    ({ centerX, centerY, radius, acceleration1, velocity1, atLimit }) => {
      const arcRadius = radius + 0.16;
      const arcPoints = useMemo(
        () =>
          computeCircularArcPoints(
            centerX,
            centerY,
            0.08,
            arcRadius,
            Math.PI * 0.22,
            Math.PI * 0.78,
            24
          ),
        [centerX, centerY, arcRadius]
      );

      if (atLimit) {
        return (
          <Text
            position={[centerX, centerY + arcRadius + 0.15, 0.08]}
            fontSize={0.102}
            color="#D58A53"
            anchorX="center"
            anchorY="middle"
          >
            Limite fisico alcanzado (Detenido)
          </Text>
        );
      }

      const motionSignal =
        Math.abs(velocity1) > 0.02 ? velocity1 : acceleration1;

      if (Math.abs(motionSignal) < 0.015) {
        return (
          <Text
            position={[centerX, centerY + arcRadius + 0.15, 0.08]}
            fontSize={0.102}
            color="#398C87"
            anchorX="center"
            anchorY="middle"
          >
            Equilibrio (Sin movimiento neto)
          </Text>
        );
      }

      const isClockwise = motionSignal > 0;
      const tipAngle = isClockwise ? Math.PI * 0.22 : Math.PI * 0.78;
      const tipX = centerX + arcRadius * Math.cos(tipAngle);
      const tipY = centerY + arcRadius * Math.sin(tipAngle);
      const tangentRotZ = isClockwise
        ? tipAngle - Math.PI / 2
        : tipAngle + Math.PI / 2;

      return (
        <group>
          <Line points={arcPoints} color="#17365D" lineWidth={2.4} />
          <mesh position={[tipX, tipY, 0.08]} rotation={[0, 0, tangentRotZ]}>
            <coneGeometry args={[0.05, 0.11, 12]} />
            <meshStandardMaterial color="#17365D" />
          </mesh>
          <Text
            position={[centerX, centerY + arcRadius + 0.15, 0.08]}
            fontSize={0.102}
            color="#17365D"
            anchorX="center"
            anchorY="middle"
          >
            {isClockwise
              ? 'Sentido: m1 sube | m2 baja'
              : 'Sentido: m1 baja | m2 sube'}
          </Text>
        </group>
      );
    }
  );

/**
 * Regla vertical graduada estática con caracteres ASCII limpios.
 */
const VerticalRuler: React.FC = React.memo(() => {
  const ticks = [-1.5, -1.0, -0.5, 0, 0.5, 1.0, 1.5, 2.0];
  const rulerX = -2.25;

  return (
    <group>
      <Line
        points={[
          [rulerX, -1.78, -0.15],
          [rulerX, 2.15, -0.15],
        ]}
        color="#64748B"
        lineWidth={1.6}
      />
      <Line
        points={[
          [-2.25, 0, -0.15],
          [2.1, 0, -0.15],
        ]}
        color="#DCE4ED"
        lineWidth={1.4}
        dashed
        dashSize={0.12}
        gapSize={0.08}
      />
      {ticks.map((yVal) => (
        <group key={yVal} position={[rulerX, yVal, -0.15]}>
          <Line
            points={[
              [-0.08, 0, 0],
              [0.08, 0, 0],
            ]}
            color="#64748B"
            lineWidth={1.6}
          />
          <Text
            position={[-0.14, 0, 0]}
            fontSize={0.095}
            color={yVal === 0 ? '#17365D' : '#64748B'}
            anchorX="right"
            anchorY="middle"
          >
            {`${yVal > 0 ? `+${yVal.toFixed(1)}` : yVal.toFixed(1)} m`}
          </Text>
        </group>
      ))}
    </group>
  );
});

/**
 * Plataforma física del suelo y topes amortiguadores.
 */
interface PhysicalBoundariesProps {
  mass1X: number;
  mass2X: number;
  atLimit: boolean;
  systemPosition: number;
}

const PhysicalBoundaries: React.FC<PhysicalBoundariesProps> = React.memo(
  ({ mass1X, mass2X, atLimit, systemPosition }) => {
    const floorY = PHYSICAL_CONSTANTS.FLOOR_SURFACE_Y; // -1.80 m
    const m1TouchingFloor = atLimit && systemPosition > 0;
    const m2TouchingFloor = atLimit && systemPosition < 0;

    return (
      <group>
        {/* Plataforma base de laboratorio en y = -1.80 m */}
        <mesh position={[0, floorY - 0.08, 0]} receiveShadow>
          <boxGeometry args={[4.6, 0.16, 1.2]} />
          <meshStandardMaterial color="#DCE8F5" roughness={0.6} metalness={0.1} />
        </mesh>

        {/* Tope amortiguador inferior bajo Masa 1 */}
        <mesh position={[mass1X, floorY + 0.015, 0]}>
          <cylinderGeometry args={[0.32, 0.36, 0.03, 24]} />
          <meshStandardMaterial
            color={m1TouchingFloor ? '#D58A53' : '#4776A5'}
          />
        </mesh>

        {/* Tope amortiguador inferior bajo Masa 2 */}
        <mesh position={[mass2X, floorY + 0.015, 0]}>
          <cylinderGeometry args={[0.32, 0.36, 0.03, 24]} />
          <meshStandardMaterial
            color={m2TouchingFloor ? '#D58A53' : '#4776A5'}
          />
        </mesh>

        <Text
          position={[0, floorY - 0.08, 0.62]}
          fontSize={0.095}
          color="#26364A"
          anchorX="center"
          anchorY="middle"
        >
          Base de Laboratorio (y = -1.80 m)
        </Text>
      </group>
    );
  }
);

/**
 * Marcadores de movimiento de la cuerda.
 * Cada esfera se posiciona exactamente sobre la trayectoria geométrica 3D (z = 0)
 * de los tramos verticales activos de la cuerda tanto en Atwood como en Polipasto Simple.
 */
interface RopeMotionMarkersProps {
  isMovable: boolean;
  mass1X: number;
  mass2X: number;
  innerRopeX: number;
  ceilingAnchorX: number;
  topPulleyY: number;
  beamBottomY: number;
  movablePulleyY: number;
  hook1TopY: number;
  hook2TopY: number;
  position1Y: number;
  position2Y: number;
}

const RopeMotionMarkers: React.FC<RopeMotionMarkersProps> = React.memo(
  ({
    isMovable,
    mass1X,
    mass2X,
    innerRopeX,
    ceilingAnchorX,
    topPulleyY,
    beamBottomY,
    movablePulleyY,
    hook1TopY,
    hook2TopY,
    position1Y,
    position2Y,
  }) => {
    const offsets = [-1.25, -0.85, -0.45, -0.05, 0.35, 0.75, 1.15, 1.55, 1.95, 2.35];

    return (
      <group>
        {offsets.map((offset, idx) => {
          // 1. Tramo vertical izquierdo (conectado a m1 en ambos escenarios): x = mass1X, z = 0
          const yLeft = position1Y + offset;
          const showLeft =
            yLeft >= hook1TopY + 0.08 && yLeft <= topPulleyY - 0.06;

          if (!isMovable) {
            // Máquina de Atwood: tramo vertical derecho en x = mass2X, z = 0
            const yRightAtwood = position2Y + offset;
            const showRightAtwood =
              yRightAtwood >= hook2TopY + 0.08 &&
              yRightAtwood <= topPulleyY - 0.06;

            return (
              <React.Fragment key={idx}>
                {showLeft && (
                  <mesh position={[mass1X, yLeft, 0]}>
                    <sphereGeometry args={[0.024, 12, 12]} />
                    <meshStandardMaterial color="#D58A53" />
                  </mesh>
                )}
                {showRightAtwood && (
                  <mesh position={[mass2X, yRightAtwood, 0]}>
                    <sphereGeometry args={[0.024, 12, 12]} />
                    <meshStandardMaterial color="#D58A53" />
                  </mesh>
                )}
              </React.Fragment>
            );
          }

          // Polipasto Simple:
          // - Tramo central (entre polea fija y polea móvil): x = innerRopeX, z = 0.
          //   Cuando m1 baja (position1Y disminuye), este tramo de cuerda sube (-position1Y aumenta).
          const yMiddle = -position1Y + offset;
          const showMiddle =
            yMiddle >= movablePulleyY + 0.08 && yMiddle <= topPulleyY - 0.06;

          // - Tramo derecho (entre polea móvil y anclaje fijo al techo): x = ceilingAnchorX, z = 0.
          const yAnchored = offset;
          const showAnchored =
            yAnchored >= movablePulleyY + 0.08 &&
            yAnchored <= beamBottomY - 0.06;

          return (
            <React.Fragment key={idx}>
              {showLeft && (
                <mesh position={[mass1X, yLeft, 0]}>
                  <sphereGeometry args={[0.024, 12, 12]} />
                  <meshStandardMaterial color="#D58A53" />
                </mesh>
              )}
              {showMiddle && (
                <mesh position={[innerRopeX, yMiddle, 0]}>
                  <sphereGeometry args={[0.024, 12, 12]} />
                  <meshStandardMaterial color="#D58A53" />
                </mesh>
              )}
              {showAnchored && (
                <mesh position={[ceilingAnchorX, yAnchored, 0]}>
                  <sphereGeometry args={[0.024, 12, 12]} />
                  <meshStandardMaterial color="#D58A53" />
                </mesh>
              )}
            </React.Fragment>
          );
        })}
      </group>
    );
  }
);

interface PulleyWheelProps {
  position: [number, number, number];
  radius: number;
  angle: number;
  color?: string;
  mountDirection?: 'up' | 'down';
}

const PulleyWheel: React.FC<PulleyWheelProps> = React.memo(
  ({ position, radius, angle, color = '#4776A5', mountDirection = 'up' }) => {
    const bracketOffsetY = mountDirection === 'up' ? 0.22 : -0.18;
    const bracketHeight =
      mountDirection === 'up' ? radius * 1.25 : radius * 0.95;

    return (
      <group position={position}>
        {/* Horquilla metálica orientada hacia el soporte superior ('up') o hacia el gancho de carga ('down') */}
        <mesh position={[0, bracketOffsetY, -0.11]}>
          <boxGeometry args={[0.14, bracketHeight, 0.06]} />
          <meshStandardMaterial
            color="#64748B"
            metalness={0.35}
            roughness={0.45}
          />
        </mesh>

        {/* Rueda acanalada que rota en sincronía exacta con la cuerda */}
        <group rotation={[0, 0, angle]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radius, radius, 0.14, 40]} />
            <meshStandardMaterial
              color={color}
              metalness={0.22}
              roughness={0.4}
            />
          </mesh>

          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[radius * 0.74, radius * 0.74, 0.15, 32]} />
            <meshStandardMaterial color="#F3F6FA" roughness={0.5} />
          </mesh>

          {/* Radios internos para observar claramente la rotación sin elementos flotantes */}
          {[0, Math.PI / 3, (2 * Math.PI) / 3].map((rot, idx) => (
            <mesh key={idx} rotation={[0, 0, rot]} position={[0, 0, 0.08]}>
              <boxGeometry args={[radius * 1.82, 0.042, 0.02]} />
              <meshStandardMaterial color="#17365D" />
            </mesh>
          ))}
        </group>

        {/* Eje central fijo */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.068, 0.068, 0.26, 20]} />
          <meshStandardMaterial color="#244A73" metalness={0.5} roughness={0.3} />
        </mesh>
      </group>
    );
  }
);

interface WeightBlockProps {
  position: [number, number, number];
  mass: number;
  label: string;
  indexNumber: string;
  color: string;
  tension: number;
  weight: number;
  acceleration: number;
  velocity: number;
  side: 'left' | 'right';
  showForces: boolean;
  showAcceleration: boolean;
}

const WeightBlock: React.FC<WeightBlockProps> = React.memo(
  ({
    position,
    mass,
    label,
    indexNumber,
    color,
    tension,
    weight,
    acceleration,
    velocity,
    side,
    showForces,
    showAcceleration,
  }) => {
    const size = computeWeightBlockSize(mass);
    const halfSize = size / 2;
    const hookRadius = 0.055;
    const hookCenterY = halfSize + hookRadius;

    const tensionArrowLen = computeForceArrowLength(tension);
    const weightArrowLen = computeForceArrowLength(weight);
    const accArrowLen = computeAccelerationArrowLength(acceleration);

    const forceSide: 'left' | 'right' = side === 'left' ? 'left' : 'right';
    const accOffsetX = side === 'left' ? -(halfSize + 0.22) : halfSize + 0.22;
    const forceOffsetX =
      side === 'left' ? halfSize + 0.14 : -(halfSize + 0.14);

    const motionSignal =
      Math.abs(velocity) > 0.02 ? velocity : acceleration;
    const motionTag =
      Math.abs(motionSignal) < 0.02
        ? 'En reposo'
        : motionSignal > 0
        ? 'Sube'
        : 'Baja';

    return (
      <group position={position}>
        {/* Argolla superior donde se ata la cuerda inextensible */}
        <mesh position={[0, hookCenterY, 0]}>
          <torusGeometry args={[hookRadius, 0.016, 12, 24]} />
          <meshStandardMaterial
            color="#244A73"
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>

        {/* Bloque de la pesa */}
        <mesh castShadow receiveShadow>
          <boxGeometry args={[size, size, size]} />
          <meshStandardMaterial
            color={color}
            metalness={0.14}
            roughness={0.45}
          />
        </mesh>

        {/* Etiqueta en el bloque */}
        <Text
          position={[0, 0.04, halfSize + 0.02]}
          fontSize={0.12}
          color="#FFFFFF"
          anchorX="center"
          anchorY="middle"
        >
          {`${label} (${mass.toFixed(1)} kg)`}
        </Text>
        <Text
          position={[0, -0.11, halfSize + 0.02]}
          fontSize={0.09}
          color="#DCE8F5"
          anchorX="center"
          anchorY="middle"
        >
          {motionTag}
        </Text>

        {/* Vectores de Fuerza: Tensión T (hacia arriba) y Peso P = m·g (hacia abajo) */}
        {showForces && (
          <group>
            <VerticalArrow3D
              origin={[forceOffsetX, halfSize * 0.4, 0]}
              direction={1}
              length={tensionArrowLen}
              color="#398C87"
              label={`T${indexNumber} = ${tension.toFixed(1)} N`}
              labelSide={side === 'left' ? 'right' : 'left'}
            />

            <VerticalArrow3D
              origin={[forceOffsetX, -halfSize * 0.4, 0]}
              direction={-1}
              length={weightArrowLen}
              color="#D58A53"
              label={`P${indexNumber} = ${weight.toFixed(1)} N`}
              labelSide={side === 'left' ? 'right' : 'left'}
            />
          </group>
        )}

        {/* Vector de Aceleración: cambia de orientación según el signo de a */}
        {showAcceleration && (
          <group>
            {Math.abs(acceleration) >= 0.02 ? (
              <VerticalArrow3D
                origin={[accOffsetX, 0, 0]}
                direction={acceleration > 0 ? 1 : -1}
                length={accArrowLen}
                color="#244A73"
                label={`a${indexNumber} = ${acceleration.toFixed(2)} m/s2`}
                labelSide={forceSide}
              />
            ) : (
              <Text
                position={[
                  accOffsetX + (side === 'left' ? -0.08 : 0.08),
                  0,
                  0,
                ]}
                fontSize={0.095}
                color="#244A73"
                anchorX={side === 'left' ? 'right' : 'left'}
                anchorY="middle"
              >
                {`a${indexNumber} = 0.00 m/s2`}
              </Text>
            )}
          </group>
        )}
      </group>
    );
  }
);

/**
 * Controlador interno de cámara 3D que sincroniza el desplazamiento vertical
 * (cameraTargetY) y la distancia de zoom (cameraDistance) sin bloquear el scroll de página.
 */
interface SceneCameraControllerProps {
  cameraTargetY: number;
  cameraDistance: number;
  resetCounter: number;
  enableWheelZoom: boolean;
}

const SceneCameraController: React.FC<SceneCameraControllerProps> = ({
  cameraTargetY,
  cameraDistance,
  resetCounter,
  enableWheelZoom,
}) => {
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const { camera } = useThree();
  const prevTargetYRef = useRef<number>(cameraTargetY);
  const prevDistanceRef = useRef<number>(cameraDistance);

  // Actualizar desplazamiento vertical manteniendo el ángulo orbital actual
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    const deltaY = cameraTargetY - prevTargetYRef.current;
    if (Math.abs(deltaY) > 1e-4) {
      controls.target.y = cameraTargetY;
      camera.position.y += deltaY;
      controls.update();
      prevTargetYRef.current = cameraTargetY;
    }
  }, [cameraTargetY, camera]);

  // Actualizar zoom mediante los botones + / -
  useEffect(() => {
    const controls = controlsRef.current;
    if (!controls) return;
    if (Math.abs(cameraDistance - prevDistanceRef.current) > 1e-4) {
      const dir = camera.position
        .clone()
        .sub(controls.target)
        .normalize();
      camera.position.copy(
        controls.target.clone().addScaledVector(dir, cameraDistance)
      );
      controls.update();
      prevDistanceRef.current = cameraDistance;
    }
  }, [cameraDistance, camera]);

  // Restablecer vista completa original
  useEffect(() => {
    if (resetCounter === 0) return;
    const controls = controlsRef.current;
    if (!controls) return;
    controls.reset();
    controls.target.set(0, 0.32, 0);
    camera.position.set(0, 0.32, 7.6);
    controls.update();
    prevTargetYRef.current = 0.32;
    prevDistanceRef.current = 7.6;
  }, [resetCounter, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableRotate
      enableZoom={enableWheelZoom}
      screenSpacePanning
      target={[0, 0.32, 0]}
      minDistance={3.2}
      maxDistance={12.0}
    />
  );
};

export const PulleyScene3D: React.FC<PulleyScene3DProps> = ({
  physicsState,
  parameters,
}) => {
  const [showForces, setShowForces] = useState<boolean>(true);
  const [showAcceleration, setShowAcceleration] = useState<boolean>(true);
  const [showRuler, setShowRuler] = useState<boolean>(true);

  // Estado de exploración vertical y zoom de cámara 3D
  const [cameraTargetY, setCameraTargetY] = useState<number>(0.32);
  const [cameraDistance, setCameraDistance] = useState<number>(7.6);
  const [resetCounter, setResetCounter] = useState<number>(0);

  // Control inteligente de la rueda del ratón:
  // Permite desplazar verticalmente la página sin quedar bloqueado en el lienzo 3D,
  // activando el zoom con rueda al hacer clic dentro del visor 3D o mediante el botón de bloqueo.
  const [canvasInteracting, setCanvasInteracting] = useState<boolean>(false);
  const [lockWheelZoom, setLockWheelZoom] = useState<boolean>(false);
  const enableWheelZoom = canvasInteracting || lockWheelZoom;

  const handlePanUp = () =>
    setCameraTargetY((y) => Math.min(1.65, Number((y + 0.35).toFixed(2))));
  const handlePanDown = () =>
    setCameraTargetY((y) => Math.max(-1.45, Number((y - 0.35).toFixed(2))));
  const handleCenterVertical = () => setCameraTargetY(0.32);
  const handleZoomIn = () =>
    setCameraDistance((d) => Math.max(3.6, Number((d - 0.8).toFixed(2))));
  const handleZoomOut = () =>
    setCameraDistance((d) => Math.min(11.2, Number((d + 0.8).toFixed(2))));
  const handleResetCamera = () => {
    setCameraTargetY(0.32);
    setCameraDistance(7.6);
    setResetCounter((c) => c + 1);
  };

  // Geometría exacta y coherente para Máquina de Atwood y Polipasto Simple
  const topPulleyY = PHYSICAL_CONSTANTS.PULLEY_CENTER_Y; // 2.25 m
  const beamCenterY = topPulleyY + 0.52; // 2.77 m
  const beamBottomY = beamCenterY - 0.09; // 2.68 m

  const radius = Math.min(0.6, Math.max(0.32, parameters.pulleyRadius));
  const isMovable = parameters.systemType === 'movable_pulley';
  const movableRadius = radius * 0.82;

  // En el Polipasto Simple:
  // - La cuerda sale de la tangente derecha de la polea fija (innerRopeX = fixedPulleyX + radius)
  //   y baja verticalmente hasta la tangente izquierda de la polea móvil (movablePulleyX - movableRadius).
  // - Por tanto, movablePulleyX = innerRopeX + movableRadius garantiza alineación vertical exacta.
  const fixedPulleyX = isMovable ? -0.58 : 0;
  const mass1X = fixedPulleyX - radius;
  const innerRopeX = fixedPulleyX + radius;
  const movablePulleyX = isMovable ? innerRopeX + movableRadius : innerRopeX;
  const ceilingAnchorX = isMovable
    ? movablePulleyX + movableRadius
    : innerRopeX;
  const mass2X = isMovable ? movablePulleyX : innerRopeX;

  const mass1Y = physicsState.position1Y;
  const mass2Y = physicsState.position2Y;

  const size1 = computeWeightBlockSize(parameters.mass1);
  const size2 = computeWeightBlockSize(parameters.mass2);

  // Coordenada superior exacta del anillo de sujeción de cada masa
  const hook1TopY = mass1Y + size1 / 2 + 0.11;
  const hook2TopY = mass2Y + size2 / 2 + 0.11;

  // Centro de la polea móvil situado encima del gancho de m2 con separación constante
  const movablePulleyY = isMovable ? hook2TopY + movableRadius + 0.16 : 0;

  const fixedPulleyRopeArc = useMemo(
    () =>
      computeCircularArcPoints(
        fixedPulleyX,
        topPulleyY,
        0,
        radius,
        Math.PI,
        0,
        32
      ),
    [fixedPulleyX, topPulleyY, radius]
  );

  const movablePulleyRopeArc = useMemo(
    () =>
      computeCircularArcPoints(
        movablePulleyX,
        movablePulleyY,
        0,
        movableRadius,
        Math.PI,
        2 * Math.PI,
        28
      ),
    [movablePulleyX, movablePulleyY, movableRadius]
  );

  const weight1 = physicsState.weight1;
  const weight2 = physicsState.weight2;

  return (
    <div
      className="canvas-wrapper"
      onPointerDown={() => setCanvasInteracting(true)}
      onPointerLeave={() => setCanvasInteracting(false)}
    >
      {/* Barra superior superpuesta */}
      <div className="canvas-toolbar">
        <div className="canvas-legend">
          <span className="legend-item">
            <span className="legend-dot dot-blue" /> m<sub>1</sub> (
            {parameters.mass1.toFixed(1)} kg)
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-orange" /> m<sub>2</sub> (
            {parameters.mass2.toFixed(1)} kg)
          </span>
          {showForces && (
            <>
              <span className="legend-item">
                <span className="legend-dot dot-emerald" /> Tensión (T){' '}
                <ArrowUp size={12} />
              </span>
              <span className="legend-item">
                <span className="legend-dot dot-orange" /> Peso (P = m · g){' '}
                <ArrowDown size={12} />
              </span>
            </>
          )}
          {showAcceleration && (
            <span className="legend-item">
              <span className="legend-dot dot-blue" /> Aceleración (a)
            </span>
          )}
        </div>

        <div className="canvas-toggles">
          <button
            type="button"
            className={`canvas-chip ${showForces ? 'active' : ''}`}
            onClick={() => setShowForces((v) => !v)}
          >
            <Eye size={14} />
            <span>Fuerzas (P, T)</span>
          </button>
          <button
            type="button"
            className={`canvas-chip ${showAcceleration ? 'active' : ''}`}
            onClick={() => setShowAcceleration((v) => !v)}
          >
            <TrendingUp size={14} />
            <span>Aceleración (a)</span>
          </button>
          <button
            type="button"
            className={`canvas-chip ${showRuler ? 'active' : ''}`}
            onClick={() => setShowRuler((v) => !v)}
          >
            <Ruler size={14} />
            <span>Escala (m)</span>
          </button>
          <button
            type="button"
            className={`canvas-chip ${enableWheelZoom ? 'active' : ''}`}
            onClick={() => setLockWheelZoom((v) => !v)}
            title="Activar o desactivar el zoom con la rueda del ratón para no bloquear el desplazamiento vertical de la página"
          >
            <MousePointerClick size={14} />
            <span>
              {enableWheelZoom ? 'Rueda: Zoom 3D' : 'Rueda: Scroll Página'}
            </span>
          </button>
        </div>
      </div>

      {/* Barra lateral derecha de desplazamiento vertical y zoom de la escena 3D */}
      <div
        className="canvas-vertical-nav"
        aria-label="Controles de exploración vertical y cámara 3D"
      >
        <span className="canvas-nav-title">Vista 3D</span>
        <button
          type="button"
          className="canvas-nav-btn"
          onClick={handlePanUp}
          title="Desplazar vista hacia arriba (parte superior / poleas)"
        >
          <ArrowUp size={15} />
        </button>

        <input
          type="range"
          className="canvas-vertical-slider"
          aria-label="Desplazamiento vertical de la escena 3D"
          min={-1.45}
          max={1.65}
          step={0.05}
          value={cameraTargetY}
          onChange={(e) => setCameraTargetY(parseFloat(e.target.value))}
          title="Deslizar verticalmente la vista de la escena 3D"
        />

        <button
          type="button"
          className="canvas-nav-btn"
          onClick={handlePanDown}
          title="Desplazar vista hacia abajo (masas y base del suelo)"
        >
          <ArrowDown size={15} />
        </button>

        <div className="canvas-nav-divider" />

        <button
          type="button"
          className="canvas-nav-btn"
          onClick={handleCenterVertical}
          title="Centrar verticalmente el sistema de poleas"
        >
          <LocateFixed size={14} />
        </button>
        <button
          type="button"
          className="canvas-nav-btn"
          onClick={handleZoomIn}
          title="Acercar vista 3D (Zoom +)"
        >
          <ZoomIn size={14} />
        </button>
        <button
          type="button"
          className="canvas-nav-btn"
          onClick={handleZoomOut}
          title="Alejar vista 3D (Zoom -)"
        >
          <ZoomOut size={14} />
        </button>
        <button
          type="button"
          className="canvas-nav-btn"
          onClick={handleResetCamera}
          title="Restablecer cámara 3D completa"
        >
          <RotateCcw size={14} />
        </button>
      </div>

      {/* Aviso superpuesto en el lienzo cuando se alcanza el límite físico */}
      {physicsState.atLimit && physicsState.limitReason && (
        <div className="canvas-limit-pill" role="status">
          <ShieldAlert size={14} />
          <span>{physicsState.limitReason}</span>
        </div>
      )}

      <Canvas shadows camera={{ position: [0, 0.32, 7.6], fov: 44 }}>
        <color attach="background" args={['#F3F6FA']} />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 6]} intensity={0.95} castShadow />
        <directionalLight
          position={[-4, 4, 4]}
          intensity={0.4}
          color="#DCE8F5"
        />

        {/* Grupo escalable mediante el control de Escala de Visualización */}
        <group scale={parameters.visualScale}>
          {/* Indicador vectorial del campo gravitatorio g */}
          <GravityFieldIndicator gravity={parameters.gravity} />

          {/* Viga superior de soporte fija en Azul Oscuro Principal */}
          <mesh position={[0, beamCenterY, 0]}>
            <boxGeometry args={[4.4, 0.18, 0.5]} />
            <meshStandardMaterial
              color="#17365D"
              metalness={0.25}
              roughness={0.5}
            />
          </mesh>

          {/* Plataforma física del suelo y topes amortiguadores */}
          <PhysicalBoundaries
            mass1X={mass1X}
            mass2X={mass2X}
            atLimit={physicsState.atLimit}
            systemPosition={physicsState.systemPosition}
          />

          {/* Indicador curvo del sentido de movimiento sobre la polea fija */}
          <MotionDirectionIndicator
            centerX={fixedPulleyX}
            centerY={topPulleyY}
            radius={radius}
            acceleration1={physicsState.acceleration1}
            velocity1={physicsState.velocity1}
            atLimit={physicsState.atLimit}
          />

          {/* Polea fija principal */}
          <PulleyWheel
            position={[fixedPulleyX, topPulleyY, 0]}
            radius={radius}
            angle={physicsState.pulleyAngle}
            color="#4776A5"
            mountDirection="up"
          />

          {/* Regla vertical graduada y nivel y = 0 m */}
          {showRuler && <VerticalRuler />}

          {/* Tramo 1: Cuerda vertical izquierda desde el gancho de m1 hasta la polea fija */}
          <Line
            points={[
              [mass1X, hook1TopY, 0],
              [mass1X, topPulleyY, 0],
            ]}
            color="#26364A"
            lineWidth={2.8}
          />

          {/* Arco superior de cuerda sobre la polea fija */}
          <Line points={fixedPulleyRopeArc} color="#26364A" lineWidth={2.8} />

          {/* Marcadores de movimiento perfectamente alineados sobre la cuerda */}
          <RopeMotionMarkers
            isMovable={isMovable}
            mass1X={mass1X}
            mass2X={mass2X}
            innerRopeX={innerRopeX}
            ceilingAnchorX={ceilingAnchorX}
            topPulleyY={topPulleyY}
            beamBottomY={beamBottomY}
            movablePulleyY={movablePulleyY}
            hook1TopY={hook1TopY}
            hook2TopY={hook2TopY}
            position1Y={mass1Y}
            position2Y={mass2Y}
          />

          {!isMovable ? (
            /* Máquina de Atwood: Tramo vertical derecho desde la polea fija hasta el gancho de m2 */
            <Line
              points={[
                [mass2X, topPulleyY, 0],
                [mass2X, hook2TopY, 0],
              ]}
              color="#26364A"
              lineWidth={2.8}
            />
          ) : (
            /* Polipasto Simple: Polea móvil y recorrido continuo de 3 tramos verticales + arco inferior */
            <>
              <PulleyWheel
                position={[movablePulleyX, movablePulleyY, 0]}
                radius={movableRadius}
                angle={-physicsState.pulleyAngle * 0.5}
                color="#398C87"
                mountDirection="down"
              />

              {/* Anclaje fijo de la cuerda en la cara inferior de la viga superior */}
              <mesh position={[ceilingAnchorX, beamBottomY - 0.02, 0]}>
                <cylinderGeometry args={[0.055, 0.055, 0.06, 16]} />
                <meshStandardMaterial
                  color="#244A73"
                  metalness={0.4}
                  roughness={0.35}
                />
              </mesh>

              {/* Tramo vertical central: desde la tangente derecha de la polea fija hasta la tangente izquierda de la polea móvil */}
              <Line
                points={[
                  [innerRopeX, topPulleyY, 0],
                  [innerRopeX, movablePulleyY, 0],
                ]}
                color="#26364A"
                lineWidth={2.8}
              />

              {/* Arco inferior de cuerda bordeando la garganta inferior de la polea móvil */}
              <Line
                points={movablePulleyRopeArc}
                color="#26364A"
                lineWidth={2.8}
              />

              {/* Tramo vertical derecho: desde la tangente derecha de la polea móvil hasta el anclaje en la viga superior */}
              <Line
                points={[
                  [ceilingAnchorX, movablePulleyY, 0],
                  [ceilingAnchorX, beamBottomY, 0],
                ]}
                color="#26364A"
                lineWidth={2.8}
              />

              {/* Eslabón rígido de suspensión entre la horquilla inferior de la polea móvil y el gancho de m2 */}
              <Line
                points={[
                  [movablePulleyX, movablePulleyY - 0.14, 0],
                  [mass2X, hook2TopY, 0],
                ]}
                color="#244A73"
                lineWidth={3.4}
              />
            </>
          )}

          {/* Masa 1 suspendida a la izquierda (Azul oscuro principal #17365D) */}
          <WeightBlock
            position={[mass1X, mass1Y, 0]}
            mass={parameters.mass1}
            label="m1"
            indexNumber="1"
            color="#17365D"
            tension={physicsState.tension1}
            weight={weight1}
            acceleration={physicsState.acceleration1}
            velocity={physicsState.velocity1}
            side="left"
            showForces={showForces}
            showAcceleration={showAcceleration}
          />

          {/* Masa 2 suspendida a la derecha (Naranja suave diferenciado #D58A53) */}
          <WeightBlock
            position={[mass2X, mass2Y, 0]}
            mass={parameters.mass2}
            label="m2"
            indexNumber="2"
            color="#D58A53"
            tension={physicsState.tension2}
            weight={weight2}
            acceleration={physicsState.acceleration2}
            velocity={physicsState.velocity2}
            side="right"
            showForces={showForces}
            showAcceleration={showAcceleration}
          />

          {/* Cuadrícula de referencia en el plano del suelo */}
          <Grid
            position={[0, PHYSICAL_CONSTANTS.FLOOR_SURFACE_Y - 0.17, 0]}
            args={[12, 12]}
            cellSize={0.5}
            cellThickness={0.6}
            cellColor="#DCE4ED"
            sectionSize={2}
            sectionThickness={1.1}
            sectionColor="#64748B"
            fadeDistance={16}
          />
        </group>

        <SceneCameraController
          cameraTargetY={cameraTargetY}
          cameraDistance={cameraDistance}
          resetCounter={resetCounter}
          enableWheelZoom={enableWheelZoom}
        />
      </Canvas>

      <div className="canvas-footer-hint">
        <Compass size={13} />
        <span>
          {isMovable ? (
            <>
              Polipasto Simple (VM = 2): Δy<sub>1</sub> = -2 · Δy<sub>2</sub>, a
              <sub>1</sub> = -2 · a<sub>2</sub>
            </>
          ) : (
            <>
              Máquina de Atwood (VM = 1): Δy<sub>1</sub> = -Δy<sub>2</sub>, a
              <sub>1</sub> = -a<sub>2</sub>
            </>
          )}
        </span>
        <Move size={13} />
        <span>
          Arrastra para rotar 3D · Usa la barra derecha para desplazarte
          verticalmente o hacer zoom
        </span>
      </div>
    </div>
  );
};
