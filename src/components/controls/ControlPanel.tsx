import React from 'react';
import {
  FastForward,
  Globe,
  Maximize2,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Sliders,
  Sparkles,
  StepForward,
  Weight,
} from 'lucide-react';
import {
  PulleyParameters,
  PulleySystemType,
  SimulationStatus,
} from '../../types/simulation';
import {
  PARAMETER_BOUNDS,
  PHYSICAL_CONSTANTS,
} from '../../physics/constants';

interface ControlPanelProps {
  parameters: PulleyParameters;
  status: SimulationStatus;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onRestoreDefaults: () => void;
  onStep: () => void;
  onUpdateParameter: <K extends keyof PulleyParameters>(
    key: K,
    value: PulleyParameters[K]
  ) => void;
}

const STATUS_DESCRIPTIONS: Record<SimulationStatus, string> = {
  idle: 'Estado: Listo para iniciar',
  running: 'Estado: En ejecución',
  paused: 'Estado: En pausa',
  finished: 'Estado: Finalizado (límite alcanzado)',
};

export const ControlPanel: React.FC<ControlPanelProps> = React.memo(
  ({
    parameters,
    status,
    onStart,
    onPause,
    onResume,
    onReset,
    onRestoreDefaults,
    onStep,
    onUpdateParameter,
  }) => {
    const isRunning = status === 'running';
    const isPaused = status === 'paused';

    const handleNumberInput = (
      key: keyof PulleyParameters,
      rawValue: string
    ) => {
      const parsed = parseFloat(rawValue);
      if (!Number.isNaN(parsed)) {
        onUpdateParameter(key, parsed);
      }
    };

    const applyTestCase = (m1: number, m2: number) => {
      onUpdateParameter('systemType', 'atwood');
      onUpdateParameter('pulleyMass', 0.0);
      onUpdateParameter('frictionTorque', 0.0);
      onUpdateParameter('gravity', PHYSICAL_CONSTANTS.EARTH_GRAVITY);
      onUpdateParameter('initialDisplacement', 0.0);
      onUpdateParameter('initialVelocity', 0.0);
      onUpdateParameter('mass1', m1);
      onUpdateParameter('mass2', m2);
    };

    return (
      <aside
        className="panel control-panel"
        aria-label="Panel de controles interactivos"
      >
        {/* Cabecera fija del panel de controles */}
        <div className="control-panel-header">
          <div className="section-header">
            <h2 className="panel-title">
              <Sliders size={18} className="icon-primary" />
              <span>Controles Interactivos</span>
            </h2>
          </div>

          {/* Indicador claro de ejecución, pausa y finalización */}
          <div className={`control-status-indicator state-${status}`}>
            <span className="status-indicator-dot" />
            <span>{STATUS_DESCRIPTIONS[status]}</span>
          </div>
        </div>

        {/* Cuerpo con desplazamiento vertical independiente */}
        <div className="control-panel-scroll">
          {/* 1. Botones de Acción de la Simulación */}
          <div className="panel-section">
            <span className="section-subtitle">Ejecución de la Simulación</span>

            {/* Botones principales: INICIAR, PAUSAR, REANUDAR */}
            <div className="action-buttons-grid">
              <button
                type="button"
                className="btn btn-primary"
                onClick={onStart}
                disabled={isRunning}
                title="Iniciar la simulación desde t = 0 s"
              >
                <Play size={15} />
                <span>INICIAR</span>
              </button>

              <button
                type="button"
                className="btn btn-warning"
                onClick={onPause}
                disabled={!isRunning}
                title="Pausar temporalmente la simulación"
              >
                <Pause size={15} />
                <span>PAUSAR</span>
              </button>

              <button
                type="button"
                className="btn btn-emerald"
                onClick={onResume}
                disabled={!isPaused}
                title="Reanudar la simulación desde el instante actual"
              >
                <Play size={15} />
                <span>REANUDAR</span>
              </button>
            </div>

            {/* Botones secundarios: REINICIAR, PASO y RESTABLECER VALORES */}
            <div className="action-buttons-secondary">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onReset}
                title="Reiniciar el tiempo a t = 0 s manteniendo los parámetros actuales"
              >
                <RotateCcw size={15} />
                <span>REINICIAR</span>
              </button>

              <button
                type="button"
                className="btn btn-outline"
                onClick={onStep}
                disabled={isRunning}
                title="Avanzar un paso discreto de tiempo físico"
              >
                <StepForward size={15} />
                <span>PASO</span>
              </button>
            </div>

            <button
              type="button"
              className="btn btn-restore"
              onClick={onRestoreDefaults}
              title="Restablecer todos los parámetros a sus valores iniciales"
            >
              <RefreshCw size={15} />
              <span>RESTABLECER VALORES</span>
            </button>
          </div>

          {/* 2. Configuración del Sistema y Casos de Prueba */}
          <div className="panel-section">
            <span className="section-subtitle">Tipo de Sistema</span>
            <div className="system-selector-grid">
              {(
                [
                  {
                    id: 'atwood',
                    title: 'Máquina de Atwood Ideal',
                    badge: 'VM = 1',
                    desc: 'Dos masas conectadas sobre una polea fija',
                  },
                  {
                    id: 'movable_pulley',
                    title: 'Polipasto Simple',
                    badge: 'VM = 2',
                    desc: 'Polea fija y polea móvil (mitad de esfuerzo)',
                  },
                ] as const
              ).map((sys) => {
                const active = parameters.systemType === sys.id;
                return (
                  <button
                    key={sys.id}
                    type="button"
                    className={`system-card ${active ? 'active' : ''}`}
                    onClick={() =>
                      onUpdateParameter('systemType', sys.id as PulleySystemType)
                    }
                  >
                    <div className="system-card-top">
                      <strong>{sys.title}</strong>
                      <span className="vm-pill">{sys.badge}</span>
                    </div>
                    <p>{sys.desc}</p>
                  </button>
                );
              })}
            </div>

            <span className="section-subtitle">
              <Sparkles size={13} /> Casos de Prueba Rápidos
            </span>
            <div className="preset-chips">
              <button
                type="button"
                className={`chip ${
                  parameters.systemType === 'atwood' &&
                  parameters.mass1 === 5 &&
                  parameters.mass2 === 5
                    ? 'active'
                    : ''
                }`}
                onClick={() => applyTestCase(5.0, 5.0)}
              >
                Caso 1 (5 / 5 kg)
              </button>
              <button
                type="button"
                className={`chip ${
                  parameters.systemType === 'atwood' &&
                  parameters.mass1 === 8 &&
                  parameters.mass2 === 4
                    ? 'active'
                    : ''
                }`}
                onClick={() => applyTestCase(8.0, 4.0)}
              >
                Caso 2 (8 / 4 kg)
              </button>
              <button
                type="button"
                className={`chip ${
                  parameters.systemType === 'atwood' &&
                  parameters.mass1 === 4 &&
                  parameters.mass2 === 8
                    ? 'active'
                    : ''
                }`}
                onClick={() => applyTestCase(4.0, 8.0)}
              >
                Caso 3 (4 / 8 kg)
              </button>
            </div>
          </div>

          {/* 3. Controles de Masa 1 y Masa 2 */}
          <div className="panel-section sliders-group">
            <span className="section-subtitle">
              <Weight size={14} /> Masas del Sistema
            </span>

            {/* Masa 1 (kg) */}
            <div className="slider-item">
              <div className="slider-header">
                <label htmlFor="input-mass1">
                  <span className="mass-dot dot-blue" />
                  <span>
                    Masa 1 (m<sub>1</sub>)
                  </span>
                </label>
                <div className="number-input-group">
                  <input
                    id="input-mass1"
                    type="number"
                    className="num-input"
                    min={PARAMETER_BOUNDS.MIN_MASS}
                    max={PARAMETER_BOUNDS.MAX_MASS}
                    step={0.5}
                    value={parameters.mass1}
                    onChange={(e) => handleNumberInput('mass1', e.target.value)}
                  />
                  <span className="unit-tag">kg</span>
                </div>
              </div>
              <input
                type="range"
                min={PARAMETER_BOUNDS.MIN_MASS}
                max={25}
                step={0.5}
                value={parameters.mass1}
                onChange={(e) =>
                  onUpdateParameter('mass1', parseFloat(e.target.value))
                }
              />
            </div>

            {/* Masa 2 (kg) */}
            <div className="slider-item slider-orange">
              <div className="slider-header">
                <label htmlFor="input-mass2">
                  <span className="mass-dot dot-orange" />
                  <span>
                    Masa 2 (m<sub>2</sub>)
                  </span>
                </label>
                <div className="number-input-group">
                  <input
                    id="input-mass2"
                    type="number"
                    className="num-input"
                    min={PARAMETER_BOUNDS.MIN_MASS}
                    max={PARAMETER_BOUNDS.MAX_MASS}
                    step={0.5}
                    value={parameters.mass2}
                    onChange={(e) => handleNumberInput('mass2', e.target.value)}
                  />
                  <span className="unit-tag">kg</span>
                </div>
              </div>
              <input
                type="range"
                min={PARAMETER_BOUNDS.MIN_MASS}
                max={25}
                step={0.5}
                value={parameters.mass2}
                onChange={(e) =>
                  onUpdateParameter('mass2', parseFloat(e.target.value))
                }
              />
            </div>
          </div>

          {/* 4. Gravedad, Posición inicial y Velocidad inicial */}
          <div className="panel-section sliders-group">
            <span className="section-subtitle">
              <Globe size={14} /> Gravedad y Condiciones Iniciales
            </span>

            {/* Gravedad (m/s²) */}
            <div className="slider-item">
              <div className="slider-header">
                <label htmlFor="input-gravity">Gravedad (g)</label>
                <div className="number-input-group">
                  <input
                    id="input-gravity"
                    type="number"
                    className="num-input"
                    min={PARAMETER_BOUNDS.MIN_GRAVITY}
                    max={PARAMETER_BOUNDS.MAX_GRAVITY}
                    step={0.05}
                    value={parameters.gravity}
                    onChange={(e) =>
                      handleNumberInput('gravity', e.target.value)
                    }
                  />
                  <span className="unit-tag">
                    m/s<sup>2</sup>
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={1.0}
                max={25.0}
                step={0.05}
                value={parameters.gravity}
                onChange={(e) =>
                  onUpdateParameter('gravity', parseFloat(e.target.value))
                }
              />
              <div className="preset-chips">
                <button
                  type="button"
                  className={`chip ${
                    Math.abs(
                      parameters.gravity - PHYSICAL_CONSTANTS.MOON_GRAVITY
                    ) < 0.05
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    onUpdateParameter('gravity', PHYSICAL_CONSTANTS.MOON_GRAVITY)
                  }
                >
                  Luna (1.62)
                </button>
                <button
                  type="button"
                  className={`chip ${
                    Math.abs(
                      parameters.gravity - PHYSICAL_CONSTANTS.MARS_GRAVITY
                    ) < 0.05
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    onUpdateParameter('gravity', PHYSICAL_CONSTANTS.MARS_GRAVITY)
                  }
                >
                  Marte (3.72)
                </button>
                <button
                  type="button"
                  className={`chip ${
                    Math.abs(
                      parameters.gravity - PHYSICAL_CONSTANTS.EARTH_GRAVITY
                    ) < 0.05
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    onUpdateParameter(
                      'gravity',
                      PHYSICAL_CONSTANTS.EARTH_GRAVITY
                    )
                  }
                >
                  Tierra (9.81)
                </button>
                <button
                  type="button"
                  className={`chip ${
                    Math.abs(
                      parameters.gravity - PHYSICAL_CONSTANTS.JUPITER_GRAVITY
                    ) < 0.05
                      ? 'active'
                      : ''
                  }`}
                  onClick={() =>
                    onUpdateParameter(
                      'gravity',
                      PHYSICAL_CONSTANTS.JUPITER_GRAVITY
                    )
                  }
                >
                  Júpiter (24.8)
                </button>
              </div>
            </div>

            {/* Posición inicial (m) */}
            <div className="slider-item">
              <div className="slider-header">
                <label htmlFor="input-y0">
                  Posición inicial (y<sub>0</sub>)
                </label>
                <div className="number-input-group">
                  <input
                    id="input-y0"
                    type="number"
                    className="num-input"
                    min={PARAMETER_BOUNDS.MIN_POSITION}
                    max={PARAMETER_BOUNDS.MAX_POSITION}
                    step={0.1}
                    value={parameters.initialDisplacement}
                    onChange={(e) =>
                      handleNumberInput('initialDisplacement', e.target.value)
                    }
                  />
                  <span className="unit-tag">m</span>
                </div>
              </div>
              <input
                type="range"
                min={-1.2}
                max={1.2}
                step={0.05}
                value={parameters.initialDisplacement}
                onChange={(e) =>
                  onUpdateParameter(
                    'initialDisplacement',
                    parseFloat(e.target.value)
                  )
                }
              />
            </div>

            {/* Velocidad inicial (m/s) */}
            <div className="slider-item">
              <div className="slider-header">
                <label htmlFor="input-v0">
                  Velocidad inicial (v<sub>0</sub>)
                </label>
                <div className="number-input-group">
                  <input
                    id="input-v0"
                    type="number"
                    className="num-input"
                    min={PARAMETER_BOUNDS.MIN_VELOCITY}
                    max={PARAMETER_BOUNDS.MAX_VELOCITY}
                    step={0.1}
                    value={parameters.initialVelocity}
                    onChange={(e) =>
                      handleNumberInput('initialVelocity', e.target.value)
                    }
                  />
                  <span className="unit-tag">m/s</span>
                </div>
              </div>
              <input
                type="range"
                min={-3.0}
                max={3.0}
                step={0.1}
                value={parameters.initialVelocity}
                onChange={(e) =>
                  onUpdateParameter(
                    'initialVelocity',
                    parseFloat(e.target.value)
                  )
                }
              />
            </div>
          </div>

          {/* 5. Escala de visualización y Velocidad de animación */}
          <div className="panel-section sliders-group">
            <span className="section-subtitle">
              <Maximize2 size={14} /> Visualización y Animación
            </span>

            {/* Escala de visualización */}
            <div className="slider-item">
              <div className="slider-header">
                <label htmlFor="input-visual-scale">
                  Escala de visualización
                </label>
                <div className="number-input-group">
                  <input
                    id="input-visual-scale"
                    type="number"
                    className="num-input"
                    min={PARAMETER_BOUNDS.MIN_VISUAL_SCALE}
                    max={PARAMETER_BOUNDS.MAX_VISUAL_SCALE}
                    step={0.05}
                    value={parameters.visualScale}
                    onChange={(e) =>
                      handleNumberInput('visualScale', e.target.value)
                    }
                  />
                  <span className="unit-tag">x</span>
                </div>
              </div>
              <input
                type="range"
                min={PARAMETER_BOUNDS.MIN_VISUAL_SCALE}
                max={PARAMETER_BOUNDS.MAX_VISUAL_SCALE}
                step={0.05}
                value={parameters.visualScale}
                onChange={(e) =>
                  onUpdateParameter('visualScale', parseFloat(e.target.value))
                }
              />
            </div>

            {/* Velocidad de animación */}
            <div className="slider-item">
              <div className="slider-header">
                <label htmlFor="input-time-scale">
                  <FastForward size={13} /> Velocidad de animación
                </label>
                <div className="number-input-group">
                  <input
                    id="input-time-scale"
                    type="number"
                    className="num-input"
                    min={0.25}
                    max={2.0}
                    step={0.25}
                    value={parameters.timeScale}
                    onChange={(e) =>
                      handleNumberInput('timeScale', e.target.value)
                    }
                  />
                  <span className="unit-tag">x</span>
                </div>
              </div>
              <input
                type="range"
                min={0.25}
                max={2.0}
                step={0.25}
                value={parameters.timeScale}
                onChange={(e) =>
                  onUpdateParameter('timeScale', parseFloat(e.target.value))
                }
              />
            </div>
          </div>
        </div>
      </aside>
    );
  }
);
