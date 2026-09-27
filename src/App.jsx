import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  StopAndWaitEngine, 
  PROTOCOL_STATES, 
  DEFAULT_CONFIG 
} from './simulation/stopAndWaitEngine';
import { Header } from './components/Header';
import { NetworkSimulation } from './components/NetworkSimulation';
import { Controls } from './components/Controls';
import { Statistics } from './components/Statistics';
import { EventLog } from './components/EventLog';
import './App.css';

export default function App() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('cns_sim_theme') || 'light'; // Default to clean light mode
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('cns_sim_theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [logs, setLogs] = useState([]);
  const [engineState, setEngineState] = useState({
    state: PROTOCOL_STATES.IDLE,
    isRunning: false,
    isPaused: false,
    isStepMode: false,
    isDemoMode: false,
    currentFrameIndex: 0,
    totalFrames: DEFAULT_CONFIG.totalFrames,
    senderSeq: 0,
    senderStatus: 'Ready',
    receiverExpectedSeq: 0,
    receiverStatus: 'Waiting',
    receiverLastAction: 'Listening',
    activePacket: null,
    timerActive: false,
    timerRemaining: DEFAULT_CONFIG.timeoutDuration,
    timerTotal: DEFAULT_CONFIG.timeoutDuration,
    timerStatus: 'Stopped',
    stats: {
      totalFramesSent: 0,
      successfulFrames: 0,
      retransmissions: 0,
      acksLost: 0,
      framesLost: 0,
      timeouts: 0,
      duplicatesDetected: 0,
      successRate: '100.0',
    },
    deliveredFrames: [],
    stepNextAction: 'SEND_DATA',
  });

  const engineRef = useRef(null);

  useEffect(() => {
    const handleStateChange = (updatedState) => {
      setEngineState({ ...updatedState });
    };

    const handleLog = (logItem) => {
      setLogs((prev) => [...prev.slice(-200), logItem]);
    };

    const engine = new StopAndWaitEngine(config, handleStateChange, handleLog);
    engineRef.current = engine;

    return () => {
      engine.clearTimers();
    };
  }, []);

  const handleConfigChange = (newConfigPartial) => {
    const updated = { ...config, ...newConfigPartial };
    setConfig(updated);
    if (engineRef.current) {
      engineRef.current.updateConfig(updated);
    }
  };

  const handleStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.start();
    }
  }, []);

  const handlePause = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.pause();
    }
  }, []);

  const handleResume = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.resume();
    }
  }, []);

  const handleStep = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.step();
    }
  }, []);

  const handleReset = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reset();
      setLogs([]);
    }
  }, []);

  const handleStartDemo = useCallback(() => {
    if (engineRef.current) {
      setLogs([]);
      engineRef.current.startDemoMode();
    }
  }, []);

  const handleClearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  return (
    <div className="simulator-app-root">
      <div className="simulator-container">
        {/* 1. Header */}
        <Header 
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        {/* 2. Main Simulation Panel (Sender | Channels & Timer | Receiver) */}
        <main className="simulation-main-area">
          <NetworkSimulation 
            simState={engineState.state}
            currentFrameIndex={engineState.currentFrameIndex}
            totalFrames={engineState.totalFrames}
            senderSeq={engineState.senderSeq}
            senderStatus={engineState.senderStatus}
            receiverExpectedSeq={engineState.receiverExpectedSeq}
            receiverStatus={engineState.receiverStatus}
            receiverLastAction={engineState.receiverLastAction}
            activePacket={engineState.activePacket}
            timerActive={engineState.timerActive}
            timerRemaining={engineState.timerRemaining}
            timerTotal={engineState.timerTotal}
            timerStatus={engineState.timerStatus}
          />
        </main>

        {/* 3. Controls & Parameter Sliders */}
        <Controls 
          config={config}
          onConfigChange={handleConfigChange}
          simState={engineState.state}
          isRunning={engineState.isRunning}
          isPaused={engineState.isPaused}
          isDemoMode={engineState.isDemoMode}
          isStepMode={engineState.isStepMode}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onStep={handleStep}
          onReset={handleReset}
          onStartDemo={handleStartDemo}
        />

        {/* 4. Live Statistics Section */}
        <Statistics 
          stats={engineState.stats}
          totalFrames={engineState.totalFrames}
        />

        {/* 5. Protocol Event Log */}
        <EventLog 
          logs={logs}
          onClearLogs={handleClearLogs}
        />
      </div>
    </div>
  );
}
