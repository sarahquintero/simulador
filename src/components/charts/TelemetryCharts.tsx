import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Gauge,
  LayoutGrid,
  Move,
  MoveVertical,
  PauseCircle,
  RotateCcw,
  Scale,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { SimulationStatus, TelemetryPoint } from '../../types/simulation';

interface TelemetryChartsProps {
  data: TelemetryPoint[];
  status?: SimulationStatus;
}

type ChartViewMode =
  | 'all'
  | 'position'
  | 'velocity'
  | 'acceleration'
  | 'force';

const LIGHT_TOOLTIP_STYLE: React.CSSProperties = {
  backgroundColor: '#FFFFFF',
  borderColor: '#DCE4ED',
  borderRadius: '10px',
  boxShadow: '0 6px 18px -4px rgba(23, 54, 93, 0.1)',
  color: '#26364A',
  fontFamily: 'Calibri, "Segoe UI", Arial, sans-serif',
  fontSize: '0.82rem',
  padding: '8px 12px',
};

interface AxisBounds {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

interface SingleChartCardProps {
  title: string;
  subtitle: string;
  yAxisLabel: string;
  unit: string;
  data: TelemetryPoint[];
  height: number;
  defaultYRange: [number, number];
  resetTrigger: number;
  lines: Array<{
    dataKey: keyof TelemetryPoint;
    name: string;
    color: string;
    dashed?: boolean;
  }>;
}

/**
 * Calcula los límites automáticos iniciales [xMin, xMax, yMin, yMax] a partir
 * de los datos reales generados por el motor físico.
 */
function computeDataBounds(
  data: TelemetryPoint[],
  keys: Array<keyof TelemetryPoint>,
  defaultYRange: [number, number]
): AxisBounds {
  if (data.length === 0) {
    return {
      xMin: 0,
      xMax: 2,
      yMin: defaultYRange[0],
      yMax: defaultYRange[1],
    };
  }

  let minT = data[0].time;
  let maxT = data[data.length - 1].time;
  if (maxT - minT < 0.5) {
    maxT = minT + 1.0;
  }

  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const point of data) {
    for (const k of keys) {
      const val = Number(point[k]);
      if (Number.isFinite(val)) {
        if (val < minY) minY = val;
        if (val > maxY) maxY = val;
      }
    }
  }

  if (!Number.isFinite(minY) || !Number.isFinite(maxY)) {
    minY = defaultYRange[0];
    maxY = defaultYRange[1];
  } else {
    const span = Math.max(Math.abs(maxY - minY), 1.0);
    const pad = span * 0.18;
    minY = Math.min(minY - pad, defaultYRange[0] * 0.5);
    maxY = Math.max(maxY + pad, defaultYRange[1] * 0.5);
  }

  return {
    xMin: Number(minT.toFixed(2)),
    xMax: Number(maxT.toFixed(2)),
    yMin: Number(minY.toFixed(2)),
    yMax: Number(maxY.toFixed(2)),
  };
}

const SingleChartCard: React.FC<SingleChartCardProps> = ({
  title,
  subtitle,
  yAxisLabel,
  unit,
  data,
  height,
  defaultYRange,
  resetTrigger,
  lines,
}) => {
  const lineKeys = useMemo(() => lines.map((l) => l.dataKey), [lines]);
  const autoBounds = useMemo(
    () => computeDataBounds(data, lineKeys, defaultYRange),
    [data, lineKeys, defaultYRange]
  );

  const [customBounds, setCustomBounds] = useState<AxisBounds | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    bounds: AxisBounds;
  } | null>(null);

  // Restablecer cuando se pulsa el botón global de restablecer o se reinicia a 1 punto
  useEffect(() => {
    setCustomBounds(null);
  }, [resetTrigger]);

  useEffect(() => {
    if (data.length <= 1) {
      setCustomBounds(null);
    }
  }, [data.length]);

  const activeBounds = customBounds ?? autoBounds;

  /**
   * Zoom de acercamiento (factor < 1) o alejamiento (factor > 1) en ambos ejes.
   */
  const handleZoom = useCallback(
    (factor: number) => {
      const current = customBounds ?? autoBounds;
      const xCenter = 0.5 * (current.xMin + current.xMax);
      const yCenter = 0.5 * (current.yMin + current.yMax);
      const halfX = Math.max(0.1, 0.5 * (current.xMax - current.xMin) * factor);
      const halfY = Math.max(0.1, 0.5 * (current.yMax - current.yMin) * factor);

      setCustomBounds({
        xMin: Number((xCenter - halfX).toFixed(2)),
        xMax: Number((xCenter + halfX).toFixed(2)),
        yMin: Number((yCenter - halfY).toFixed(2)),
        yMax: Number((yCenter + halfY).toFixed(2)),
      });
    },
    [customBounds, autoBounds]
  );

  /**
   * Desplazamiento horizontal (dxFactor) y vertical (dyFactor) de los ejes.
   */
  const handlePanStep = useCallback(
    (dxFraction: number, dyFraction: number) => {
      const current = customBounds ?? autoBounds;
      const xSpan = Math.max(0.2, current.xMax - current.xMin);
      const ySpan = Math.max(0.2, current.yMax - current.yMin);
      const dx = xSpan * dxFraction;
      const dy = ySpan * dyFraction;

      setCustomBounds({
        xMin: Number((current.xMin + dx).toFixed(2)),
        xMax: Number((current.xMax + dx).toFixed(2)),
        yMin: Number((current.yMin + dy).toFixed(2)),
        yMax: Number((current.yMax + dy).toFixed(2)),
      });
    },
    [customBounds, autoBounds]
  );

  const handleResetView = useCallback(() => {
    setCustomBounds(null);
  }, []);

  /**
   * Inicio de arrastre con el cursor para desplazar libremente los ejes X e Y.
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      bounds: customBounds ?? autoBounds,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !dragStartRef.current || !containerRef.current) return;
    e.stopPropagation();

    const rect = containerRef.current.getBoundingClientRect();
    const widthPx = Math.max(120, rect.width - 60);
    const heightPx = Math.max(100, rect.height - 50);

    const deltaPxX = e.clientX - dragStartRef.current.clientX;
    const deltaPxY = e.clientY - dragStartRef.current.clientY;

    const startBounds = dragStartRef.current.bounds;
    const xSpan = startBounds.xMax - startBounds.xMin;
    const ySpan = startBounds.yMax - startBounds.yMin;

    const dxData = -(deltaPxX / widthPx) * xSpan;
    const dyData = (deltaPxY / heightPx) * ySpan;

    setCustomBounds({
      xMin: Number((startBounds.xMin + dxData).toFixed(2)),
      xMax: Number((startBounds.xMax + dxData).toFixed(2)),
      yMin: Number((startBounds.yMin + dyData).toFixed(2)),
      yMax: Number((startBounds.yMax + dyData).toFixed(2)),
    });
  };

  const handleMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false);
      dragStartRef.current = null;
    }
  };

  const handleBoundInputChange = (key: keyof AxisBounds, rawVal: string) => {
    const parsed = parseFloat(rawVal);
    if (Number.isNaN(parsed)) return;
    const current = customBounds ?? autoBounds;
    const updated = { ...current, [key]: parsed };
    if (updated.xMax <= updated.xMin) updated.xMax = updated.xMin + 0.2;
    if (updated.yMax <= updated.yMin) updated.yMax = updated.yMin + 0.2;
    setCustomBounds(updated);
  };

  return (
    <article className="cartesian-chart-card">
      <div className="cartesian-card-header">
        <div>
          <h3 className="cartesian-card-title">{title}</h3>
          <span className="cartesian-card-sub">{subtitle}</span>
        </div>

        {/* Barra de controles de zoom, desplazamiento en 2 ejes y restablecimiento */}
        <div className="chart-nav-controls">
          <button
            type="button"
            className="chart-icon-btn"
            onClick={() => handleZoom(0.75)}
            title="Acercar vista (Zoom +)"
          >
            <ZoomIn size={14} />
          </button>
          <button
            type="button"
            className="chart-icon-btn"
            onClick={() => handleZoom(1.33)}
            title="Alejar vista (Zoom -)"
          >
            <ZoomOut size={14} />
          </button>
          <button
            type="button"
            className="chart-icon-btn"
            onClick={() => handlePanStep(-0.2, 0)}
            title="Desplazar eje X a la izquierda"
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            className="chart-icon-btn"
            onClick={() => handlePanStep(0.2, 0)}
            title="Desplazar eje X a la derecha"
          >
            <ArrowRight size={14} />
          </button>
          <button
            type="button"
            className="chart-icon-btn"
            onClick={() => handlePanStep(0, 0.2)}
            title="Desplazar eje Y hacia arriba"
          >
            <ArrowUp size={14} />
          </button>
          <button
            type="button"
            className="chart-icon-btn"
            onClick={() => handlePanStep(0, -0.2)}
            title="Desplazar eje Y hacia abajo"
          >
            <ArrowDown size={14} />
          </button>
          <button
            type="button"
            className="chart-reset-btn"
            onClick={handleResetView}
            title="Restablecer vista original de los ejes"
          >
            <RotateCcw size={13} />
            <span>Restablecer</span>
          </button>
        </div>
      </div>

      {/* Controles de ajuste directo de rango visible para Eje X y Eje Y */}
      <div className="axis-range-bar">
        <div className="axis-range-group">
          <span className="axis-range-label">Rango X (s):</span>
          <input
            type="number"
            step={0.5}
            className="axis-num-input"
            value={activeBounds.xMin}
            onChange={(e) => handleBoundInputChange('xMin', e.target.value)}
            aria-label="Mínimo eje X"
          />
          <span>a</span>
          <input
            type="number"
            step={0.5}
            className="axis-num-input"
            value={activeBounds.xMax}
            onChange={(e) => handleBoundInputChange('xMax', e.target.value)}
            aria-label="Máximo eje X"
          />
        </div>

        <div className="axis-range-group">
          <span className="axis-range-label">Rango Y ({unit}):</span>
          <input
            type="number"
            step={1}
            className="axis-num-input"
            value={activeBounds.yMin}
            onChange={(e) => handleBoundInputChange('yMin', e.target.value)}
            aria-label="Mínimo eje Y"
          />
          <span>a</span>
          <input
            type="number"
            step={1}
            className="axis-num-input"
            value={activeBounds.yMax}
            onChange={(e) => handleBoundInputChange('yMax', e.target.value)}
            aria-label="Máximo eje Y"
          />
        </div>

        <span className="drag-pan-hint">
          <Move size={12} /> Arrastra la gráfica para desplazar X e Y
        </span>
      </div>

      {/* Contenedor interactivo con soporte de arrastre 2D */}
      <div
        ref={containerRef}
        className={`cartesian-canvas-box ${isDragging ? 'dragging' : ''}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave}
      >
        <ResponsiveContainer width="100%" height={height}>
          <LineChart
            data={data}
            margin={{ top: 10, right: 20, left: 14, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#DCE4ED" />
            <ReferenceLine y={0} stroke="#64748B" strokeDasharray="4 4" />
            <XAxis
              type="number"
              dataKey="time"
              domain={[activeBounds.xMin, activeBounds.xMax]}
              allowDataOverflow={true}
              stroke="#64748B"
              fontSize={12}
              tickFormatter={(v) => `${Number(v).toFixed(1)}s`}
              label={{
                value: 'Tiempo (s)',
                position: 'insideBottom',
                offset: -6,
                fill: '#26364A',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <YAxis
              type="number"
              domain={[activeBounds.yMin, activeBounds.yMax]}
              allowDataOverflow={true}
              stroke="#64748B"
              fontSize={12}
              tickFormatter={(v) => `${Number(v).toFixed(1)}`}
              label={{
                value: yAxisLabel,
                angle: -90,
                position: 'insideLeft',
                offset: 2,
                fill: '#26364A',
                fontSize: 12,
                fontWeight: 600,
              }}
            />
            <Tooltip
              contentStyle={LIGHT_TOOLTIP_STYLE}
              labelFormatter={(label) =>
                `Tiempo: ${Number(label).toFixed(2)} s`
              }
              formatter={(value: number, name: string) => [
                `${Number(value).toFixed(3)} ${unit}`,
                name,
              ]}
            />
            <Legend
              verticalAlign="top"
              height={28}
              wrapperStyle={{ fontSize: '0.82rem', fontWeight: 600 }}
            />
            {lines.map((line) => (
              <Line
                key={String(line.dataKey)}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={line.color}
                strokeWidth={2.5}
                strokeDasharray={line.dashed ? '5 4' : undefined}
                dot={data.length <= 2 ? { r: 3.5 } : false}
                activeDot={{ r: 5, strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </article>
  );
};

export const TelemetryCharts: React.FC<TelemetryChartsProps> = React.memo(
  ({ data, status }) => {
    const [viewMode, setViewMode] = useState<ChartViewMode>('all');
    const [resetCounter, setResetCounter] = useState<number>(0);
    const chartHeight = viewMode === 'all' ? 250 : 340;

    return (
      <section
        className="panel charts-panel"
        aria-label="Área de gráficas cartesianas dinámicas"
      >
        <div className="charts-header">
          <div>
            <h2 className="panel-title">Gráficas Cartesianas Dinámicas</h2>
            <p className="panel-caption">
              Arrastra con el cursor sobre cualquier gráfica para desplazar los ejes X e Y, usa el zoom o ajusta el rango visible
            </p>
          </div>

          <div className="charts-header-actions">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => setResetCounter((c) => c + 1)}
              title="Restablecer el zoom y posición de todas las gráficas"
            >
              <RotateCcw size={14} />
              <span>Restablecer vistas</span>
            </button>

            <div className="chart-tabs" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'all'}
                className={`tab-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                <LayoutGrid size={14} />
                <span>Las 4 Gráficas</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'position'}
                className={`tab-btn ${viewMode === 'position' ? 'active' : ''}`}
                onClick={() => setViewMode('position')}
              >
                <MoveVertical size={14} />
                <span>Posición</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'velocity'}
                className={`tab-btn ${viewMode === 'velocity' ? 'active' : ''}`}
                onClick={() => setViewMode('velocity')}
              >
                <Activity size={14} />
                <span>Velocidad</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'acceleration'}
                className={`tab-btn ${
                  viewMode === 'acceleration' ? 'active' : ''
                }`}
                onClick={() => setViewMode('acceleration')}
              >
                <Gauge size={14} />
                <span>Aceleración</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={viewMode === 'force'}
                className={`tab-btn ${viewMode === 'force' ? 'active' : ''}`}
                onClick={() => setViewMode('force')}
              >
                <Scale size={14} />
                <span>Fuerza</span>
              </button>
            </div>
          </div>
        </div>

        {status === 'paused' && (
          <div className="chart-paused-banner">
            <PauseCircle size={15} />
            <span>
              <strong>Simulación en pausa:</strong> Puedes arrastrar las gráficas
              en cualquier dirección o hacer zoom para inspeccionar los puntos.
            </span>
          </div>
        )}

        <div
          className={
            viewMode === 'all' ? 'charts-quad-grid' : 'charts-single-view'
          }
        >
          {/* 1. GRÁFICA: POSICIÓN VS. TIEMPO */}
          {(viewMode === 'all' || viewMode === 'position') && (
            <SingleChartCard
              title="1. Posición vs. Tiempo"
              subtitle="Posición vertical de cada masa (m)"
              yAxisLabel="Posición (m)"
              unit="m"
              data={data}
              height={chartHeight}
              defaultYRange={[-1.6, 1.6]}
              resetTrigger={resetCounter}
              lines={[
                {
                  dataKey: 'position1Y',
                  name: 'Posición Masa 1 (y1)',
                  color: '#17365D',
                },
                {
                  dataKey: 'position2Y',
                  name: 'Posición Masa 2 (y2)',
                  color: '#D58A53',
                },
              ]}
            />
          )}

          {/* 2. GRÁFICA: VELOCIDAD VS. TIEMPO */}
          {(viewMode === 'all' || viewMode === 'velocity') && (
            <SingleChartCard
              title="2. Velocidad vs. Tiempo"
              subtitle="Cambio de velocidad respecto al tiempo (m/s)"
              yAxisLabel="Velocidad (m/s)"
              unit="m/s"
              data={data}
              height={chartHeight}
              defaultYRange={[-4, 4]}
              resetTrigger={resetCounter}
              lines={[
                {
                  dataKey: 'velocity1',
                  name: 'Velocidad Masa 1 (v1)',
                  color: '#17365D',
                },
                {
                  dataKey: 'velocity2',
                  name: 'Velocidad Masa 2 (v2)',
                  color: '#D58A53',
                },
              ]}
            />
          )}

          {/* 3. GRÁFICA: ACELERACIÓN VS. TIEMPO */}
          {(viewMode === 'all' || viewMode === 'acceleration') && (
            <SingleChartCard
              title="3. Aceleración vs. Tiempo"
              subtitle="Aceleración de cada masa y del sistema (m/s²)"
              yAxisLabel="Aceleración (m/s²)"
              unit="m/s²"
              data={data}
              height={chartHeight}
              defaultYRange={[-6, 6]}
              resetTrigger={resetCounter}
              lines={[
                {
                  dataKey: 'acceleration1',
                  name: 'Aceleración Masa 1 (a1)',
                  color: '#17365D',
                },
                {
                  dataKey: 'acceleration2',
                  name: 'Aceleración Masa 2 (a2)',
                  color: '#D58A53',
                },
                {
                  dataKey: 'systemAcceleration',
                  name: 'Aceleración Sistema (a)',
                  color: '#398C87',
                  dashed: true,
                },
              ]}
            />
          )}

          {/* 4. GRÁFICA: FUERZA VS. TIEMPO */}
          {(viewMode === 'all' || viewMode === 'force') && (
            <SingleChartCard
              title="4. Fuerza vs. Tiempo"
              subtitle="Pesos gravitacionales (P1, P2), Tensión (T) y Fuerza Neta (N)"
              yAxisLabel="Fuerza (N)"
              unit="N"
              data={data}
              height={chartHeight}
              defaultYRange={[-30, 100]}
              resetTrigger={resetCounter}
              lines={[
                {
                  dataKey: 'weight1',
                  name: 'Peso Masa 1 (P1)',
                  color: '#17365D',
                },
                {
                  dataKey: 'weight2',
                  name: 'Peso Masa 2 (P2)',
                  color: '#D58A53',
                },
                {
                  dataKey: 'ropeTension',
                  name: 'Tensión Cuerda (T)',
                  color: '#398C87',
                },
                {
                  dataKey: 'netForce',
                  name: 'Fuerza Neta (P1 - P2)',
                  color: '#4776A5',
                  dashed: true,
                },
              ]}
            />
          )}
        </div>
      </section>
    );
  }
);
