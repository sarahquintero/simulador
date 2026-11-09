import React from 'react';
import { PulleyScene3D } from './components/canvas/PulleyScene3D';
import { TelemetryCharts } from './components/charts/TelemetryCharts';
import { ControlPanel } from './components/controls/ControlPanel';
import { Header } from './components/ui/Header';
import { PhysicsInfoPanel } from './components/ui/PhysicsInfoPanel';
import { TelemetryCards } from './components/ui/TelemetryCards';
import { useSimulationController } from './simulation/useSimulationController';

export const App: React.FC = () => {
  const {
    parameters,
    status,
    physicsState,
    telemetry,
    start,
    pause,
    resume,
    reset,
    restoreDefaults,
    stepOnce,
    updateParameter,
  } = useSimulationController();

  return (
    <div className="app-layout">
      {/* 1. Encabezado con el nombre del simulador */}
      <Header
        status={status}
        time={physicsState.time}
        systemType={parameters.systemType}
      />

      <main className="workspace-grid">
        {/* 2. Panel de controles interactivos (Valores de Entrada) */}
        <ControlPanel
          parameters={parameters}
          status={status}
          onStart={start}
          onPause={pause}
          onResume={resume}
          onReset={reset}
          onRestoreDefaults={restoreDefaults}
          onStep={stepOnce}
          onUpdateParameter={updateParameter}
        />

        <div className="simulation-main">
          {/* 3. Área principal de visualización del sistema de poleas */}
          <section
            className="canvas-panel"
            aria-label="Área principal de visualización del sistema de poleas"
          >
            <PulleyScene3D
              physicsState={physicsState}
              parameters={parameters}
            />
          </section>

          {/* 4. Panel de indicadores físicos en tiempo real */}
          <TelemetryCards
            parameters={parameters}
            state={physicsState}
            status={status}
          />

          {/* 5. Área de gráficas cartesianas */}
          <TelemetryCharts data={telemetry} status={status} />

          {/* 6. Panel de información y explicación física */}
          <PhysicsInfoPanel parameters={parameters} state={physicsState} />
        </div>
      </main>
    </div>
  );
};

export default App;
