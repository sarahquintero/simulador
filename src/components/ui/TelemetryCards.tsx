import React from 'react';
import {
  Activity,
  ArrowDown,
  ArrowUp,
  Calculator,
  CheckCircle2,
  Clock,
  Gauge,
  Minus,
  MoveVertical,
  Scale,
  ShieldAlert,
  Sliders,
  Weight,
} from 'lucide-react';
import {
  PulleyParameters,
  PulleyPhysicsState,
  SimulationStatus,
} from '../../types/simulation';

interface TelemetryCardsProps {
  parameters: PulleyParameters;
  state: PulleyPhysicsState;
  status: SimulationStatus;
}

const MotionBadge: React.FC<{ value: number; unit: string }> = ({
  value,
  unit,
}) => {
  if (Math.abs(value) < 0.01) {
    return (
      <span className="motion-chip motion-neutral">
        <Minus size={11} /> Reposo (0 {unit})
      </span>
    );
  }
  if (value > 0) {
    return (
      <span className="motion-chip motion-up">
        <ArrowUp size={11} /> Ascendente (+Y)
      </span>
    );
  }
  return (
    <span className="motion-chip motion-down">
      <ArrowDown size={11} /> Descendente (-Y)
    </span>
  );
};

export const TelemetryCards: React.FC<TelemetryCardsProps> = ({
  parameters,
  state,
  status,
}) => {
  const isRunning = status === 'running';
  const ratio = parameters.systemType === 'movable_pulley' ? 0.5 : 1;
  const initialPos1 = -parameters.initialDisplacement;
  const initialPos2 = ratio * parameters.initialDisplacement;

  return (
    <section
      className="panel telemetry-section"
      aria-label="Visualización numérica en tiempo real"
    >
      {/* Cabecera de la sección con leyenda de las 3 categorías */}
      <div className="telemetry-top-header">
        <div>
          <h2 className="panel-title">
            Visualización Numérica en Tiempo Real (Sistema Internacional)
          </h2>
          <p className="panel-caption">
            Valores sincronizados cuadro a cuadro con el movimiento gráfico 3D
          </p>
        </div>

        <div className="category-legend">
          <span className="cat-pill cat-initial">
            <Sliders size={12} /> 1. Parámetros Iniciales
          </span>
          <span className="cat-pill cat-instant">
            <Activity size={12} /> 2. Valores Instantáneos
          </span>
          <span className="cat-pill cat-calculated">
            <Calculator size={12} /> 3. Resultados Calculados
          </span>
        </div>
      </div>

      {/* ====================================================================
          BLOQUE 1: PARÁMETROS INICIALES (Condiciones de partida en t = 0 s)
          ==================================================================== */}
      <div className="telemetry-category-block block-initial">
        <div className="category-block-header">
          <span className="cat-badge badge-cat-initial">
            <Sliders size={13} /> PARÁMETROS INICIALES (t = 0 s)
          </span>
          <span className="category-desc">
            Condiciones de entrada definidas antes del movimiento
          </span>
        </div>

        <div className="initial-params-strip">
          <div className="init-param-item">
            <span className="init-param-label">
              Masa 1 (m<sub>1</sub>)
            </span>
            <strong className="init-param-val">
              {parameters.mass1.toFixed(2)} <small>kg</small>
            </strong>
          </div>
          <div className="init-param-item">
            <span className="init-param-label">
              Masa 2 (m<sub>2</sub>)
            </span>
            <strong className="init-param-val">
              {parameters.mass2.toFixed(2)} <small>kg</small>
            </strong>
          </div>
          <div className="init-param-item">
            <span className="init-param-label">Gravedad (g)</span>
            <strong className="init-param-val">
              {parameters.gravity.toFixed(2)}{' '}
              <small>
                m/s<sup>2</sup>
              </small>
            </strong>
          </div>
          <div className="init-param-item">
            <span className="init-param-label">
              Posición inicial m<sub>1</sub> / m<sub>2</sub>
            </span>
            <strong className="init-param-val">
              {initialPos1.toFixed(2)} / {initialPos2.toFixed(2)}{' '}
              <small>m</small>
            </strong>
          </div>
          <div className="init-param-item">
            <span className="init-param-label">
              Velocidad inicial (v<sub>0</sub>)
            </span>
            <strong className="init-param-val">
              {parameters.initialVelocity.toFixed(2)} <small>m/s</small>
            </strong>
          </div>
        </div>
      </div>

      {/* ====================================================================
          BLOQUE 2: VALORES INSTANTÁNENEOS (Cambian continuamente con el tiempo t)
          ==================================================================== */}
      <div className="telemetry-category-block block-instant">
        <div className="category-block-header">
          <span className="cat-badge badge-cat-instant">
            <Activity size={13} /> VALORES INSTANTÁNEOS
            {isRunning && <span className="live-pulse-dot" />}
          </span>
          <span className="category-desc">
            Magnitudes cinemáticas que evolucionan en cada instante del movimiento
          </span>
        </div>

        <div className="instant-cards-grid">
          {/* 1. Tiempo (s) */}
          <article className="metric-card card-instant">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Clock size={14} className="icon-emerald" /> Tiempo
              </span>
              <span className="si-unit-pill">s</span>
            </div>
            <div className="metric-value">
              {state.time.toFixed(2)} <small>s</small>
            </div>
            <div className="metric-footer">
              <span>Variable independiente t</span>
            </div>
          </article>

          {/* 2. Posición de masa 1 (m) */}
          <article className="metric-card card-instant">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <MoveVertical size={14} className="icon-primary" /> Posición de masa 1
              </span>
              <span className="si-unit-pill">m</span>
            </div>
            <div className="metric-value">
              {state.position1Y.toFixed(3)} <small>m</small>
            </div>
            <div className="metric-footer">
              <MotionBadge value={state.velocity1} unit="m" />
            </div>
          </article>

          {/* 3. Posición de masa 2 (m) */}
          <article className="metric-card card-instant">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <MoveVertical size={14} className="icon-orange" /> Posición de masa 2
              </span>
              <span className="si-unit-pill">m</span>
            </div>
            <div className="metric-value">
              {state.position2Y.toFixed(3)} <small>m</small>
            </div>
            <div className="metric-footer">
              <MotionBadge value={state.velocity2} unit="m" />
            </div>
          </article>

          {/* 4. Velocidad de masa 1 (m/s) */}
          <article className="metric-card card-instant">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Activity size={14} className="icon-primary" /> Velocidad de masa 1
              </span>
              <span className="si-unit-pill">m/s</span>
            </div>
            <div className="metric-value">
              {state.velocity1.toFixed(3)} <small>m/s</small>
            </div>
            <div className="metric-footer">
              <MotionBadge value={state.velocity1} unit="m/s" />
            </div>
          </article>

          {/* 5. Velocidad de masa 2 (m/s) */}
          <article className="metric-card card-instant">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Activity size={14} className="icon-orange" /> Velocidad de masa 2
              </span>
              <span className="si-unit-pill">m/s</span>
            </div>
            <div className="metric-value">
              {state.velocity2.toFixed(3)} <small>m/s</small>
            </div>
            <div className="metric-footer">
              <MotionBadge value={state.velocity2} unit="m/s" />
            </div>
          </article>
        </div>
      </div>

      {/* ====================================================================
          BLOQUE 3: RESULTADOS CALCULADOS (Aceleración, Tensión y Pesos)
          ==================================================================== */}
      <div className="telemetry-category-block block-calculated">
        <div className="category-block-header">
          <span className="cat-badge badge-cat-calculated">
            <Calculator size={13} /> RESULTADOS CALCULADOS
          </span>
          <span className="category-desc">
            Magnitudes dinámicas obtenidas a partir de las ecuaciones físicas del sistema
          </span>
        </div>

        <div className="calculated-cards-grid">
          {/* 6. Aceleración (m/s²) */}
          <article className="metric-card card-calculated">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Gauge size={14} className="icon-orange" /> Aceleración
              </span>
              <span className="si-unit-pill">
                m/s<sup>2</sup>
              </span>
            </div>
            <div className="metric-value">
              {state.systemAcceleration.toFixed(3)}{' '}
              <small>
                m/s<sup>2</sup>
              </small>
            </div>
            <div className="metric-footer">
              <span>
                a<sub>1</sub> = {state.acceleration1.toFixed(2)} · a<sub>2</sub> ={' '}
                {state.acceleration2.toFixed(2)} m/s<sup>2</sup>
              </span>
              {state.isEqualMasses && (
                <span className="equilibrium-pill">
                  <CheckCircle2 size={11} /> a = 0
                </span>
              )}
            </div>
          </article>

          {/* 7. Tensión (N) */}
          <article className="metric-card card-calculated">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Scale size={14} className="icon-emerald" /> Tensión
              </span>
              <span className="si-unit-pill">N</span>
            </div>
            <div className="metric-value">
              {state.ropeTension.toFixed(2)} <small>N</small>
            </div>
            <div className="metric-footer">
              <span>
                T = (2 · m<sub>1</sub> · m<sub>2</sub> · g) / (m<sub>1</sub> + m
                <sub>2</sub>)
              </span>
            </div>
          </article>

          {/* 8. Peso de masa 1 (N) */}
          <article className="metric-card card-calculated">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Weight size={14} className="icon-primary" /> Peso de masa 1
              </span>
              <span className="si-unit-pill">N</span>
            </div>
            <div className="metric-value">
              {state.weight1.toFixed(2)} <small>N</small>
            </div>
            <div className="metric-footer">
              <span>
                P<sub>1</sub> = m<sub>1</sub> · g = {parameters.mass1.toFixed(1)} ×{' '}
                {parameters.gravity.toFixed(2)}
              </span>
            </div>
          </article>

          {/* 9. Peso de masa 2 (N) */}
          <article className="metric-card card-calculated">
            <div className="metric-top-row">
              <span className="metric-var-name">
                <Weight size={14} className="icon-orange" /> Peso de masa 2
              </span>
              <span className="si-unit-pill">N</span>
            </div>
            <div className="metric-value">
              {state.weight2.toFixed(2)} <small>N</small>
            </div>
            <div className="metric-footer">
              <span>
                P<sub>2</sub> = m<sub>2</sub> · g = {parameters.mass2.toFixed(1)} ×{' '}
                {parameters.gravity.toFixed(2)}
              </span>
            </div>
          </article>
        </div>
      </div>

      {state.atLimit && (
        <div className="limit-banner" role="alert">
          <ShieldAlert size={18} />
          <span>
            {state.limitReason ??
              'Una de las pesas alcanzó el límite físico del recorrido.'}{' '}
            Pulsa <strong>REINICIAR</strong> o ajusta los parámetros para
            continuar experimentando.
          </span>
        </div>
      )}
    </section>
  );
};
