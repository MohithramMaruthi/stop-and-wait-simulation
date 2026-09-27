import React from 'react';
import { 
  Play, 
  Pause, 
  StepForward, 
  RotateCcw, 
  Sparkles,
  Sliders
} from 'lucide-react';
import { PROTOCOL_STATES } from '../simulation/stopAndWaitEngine';

export function Controls({
  config,
  onConfigChange,
  simState,
  isRunning,
  isPaused,
  isDemoMode,
  isStepMode,
  onStart,
  onPause,
  onResume,
  onStep,
  onReset,
  onStartDemo
}) {
  const isCompleted = simState === PROTOCOL_STATES.COMPLETED;

  const handleTotalFramesChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val) && val >= 1 && val <= 20) {
      onConfigChange({ totalFrames: val });
    }
  };

  const handleAckLossChange = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0 && val <= 1) {
      onConfigChange({ ackLossRate: val });
    }
  };

  const handleFrameLossChange = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 0 && val <= 1) {
      onConfigChange({ frameLossRate: val });
    }
  };

  const handleTimeoutChange = (e) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && val >= 1.0 && val <= 5.0) {
      onConfigChange({ timeoutDuration: val });
    }
  };

  const handleSpeedChange = (s) => {
    onConfigChange({ speed: s });
  };

  return (
    <div className="controls-dashboard-card">
      {/* Top Button Group & Speed Selector */}
      <div className="controls-actions-row">
        <div className="primary-btn-group">
          {/* Blue Start / Pause / Resume Button */}
          {!isRunning || isCompleted ? (
            <button
              className="btn-control btn-start"
              onClick={onStart}
              title="Start simulation"
            >
              <Play size={16} className="btn-icon-play" fill="currentColor" />
              <span>{isCompleted ? 'Restart' : 'Start'}</span>
            </button>
          ) : isPaused ? (
            <button
              className="btn-control btn-start"
              onClick={onResume}
              title="Resume simulation"
            >
              <Play size={16} className="btn-icon-play" fill="currentColor" />
              <span>Resume</span>
            </button>
          ) : (
            <button
              className="btn-control btn-pause"
              onClick={onPause}
              title="Pause simulation"
            >
              <Pause size={16} />
              <span>Pause</span>
            </button>
          )}

          {/* Step Button */}
          <button
            className={`btn-control btn-secondary ${isStepMode ? 'btn-active-ring' : ''}`}
            onClick={onStep}
            title="Step through protocol events"
          >
            <StepForward size={16} />
            <span>Step</span>
          </button>

          {/* Reset Button */}
          <button
            className="btn-control btn-secondary"
            onClick={onReset}
            title="Reset simulation state"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>

          {/* Demo Mode Button */}
          <button
            className={`btn-control btn-demo ${isDemoMode ? 'demo-active-glow' : ''}`}
            onClick={onStartDemo}
            title="Run guided demo of normal transfer, ACK loss, and duplicate detection"
          >
            <Sparkles size={16} />
            <span>Demo Mode</span>
          </button>
        </div>

        {/* Speed Controls: 0.5x, 1x, 1.5x, 2x */}
        <div className="speed-controller-cluster">
          <span className="speed-cluster-label">Speed:</span>
          <div className="speed-button-group">
            {[0.5, 1.0, 1.5, 2.0].map((s) => (
              <button
                key={s}
                className={`btn-speed ${config.speed === s ? 'speed-active' : ''}`}
                onClick={() => handleSpeedChange(s)}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sliders Configuration Row */}
      <div className="controls-sliders-grid">
        {/* Frames Slider */}
        <div className="slider-control-box">
          <div className="slider-info-line">
            <span className="slider-label">Frames</span>
            <span className="slider-value-display font-mono">{config.totalFrames}</span>
          </div>
          <input
            type="range"
            min="1"
            max="20"
            step="1"
            value={config.totalFrames}
            onChange={handleTotalFramesChange}
            disabled={isRunning && !isPaused}
            className="modern-range-slider"
          />
        </div>

        {/* ACK Loss Slider (default 20%) */}
        <div className="slider-control-box">
          <div className="slider-info-line">
            <span className="slider-label">ACK Loss</span>
            <span className="slider-value-display font-mono text-loss">
              {(config.ackLossRate * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.ackLossRate}
            onChange={handleAckLossChange}
            disabled={(isRunning && !isPaused) || isDemoMode}
            className="modern-range-slider slider-ack-loss"
          />
        </div>

        {/* Frame Loss Slider (default 0%) */}
        <div className="slider-control-box">
          <div className="slider-info-line">
            <span className="slider-label">Frame Loss</span>
            <span className="slider-value-display font-mono text-loss">
              {(config.frameLossRate * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.frameLossRate}
            onChange={handleFrameLossChange}
            disabled={(isRunning && !isPaused) || isDemoMode}
            className="modern-range-slider slider-frame-loss"
          />
        </div>

        {/* Timeout Slider (default 2.0s) */}
        <div className="slider-control-box">
          <div className="slider-info-line">
            <span className="slider-label">Timeout</span>
            <span className="slider-value-display font-mono">
              {config.timeoutDuration.toFixed(1)}s
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="5.0"
            step="0.1"
            value={config.timeoutDuration}
            onChange={handleTimeoutChange}
            disabled={isRunning && !isPaused}
            className="modern-range-slider"
          />
        </div>
      </div>
    </div>
  );
}
