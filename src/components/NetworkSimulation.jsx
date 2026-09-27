import React from 'react';
import { 
  Laptop, 
  Server, 
  Clock, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  AlertCircle,
  XCircle,
  RotateCw,
  Layers
} from 'lucide-react';
import { PROTOCOL_STATES } from '../simulation/stopAndWaitEngine';

export function NetworkSimulation({
  simState,
  currentFrameIndex,
  totalFrames,
  senderSeq,
  senderStatus,
  receiverExpectedSeq,
  receiverStatus,
  receiverLastAction,
  activePacket,
  timerActive,
  timerRemaining,
  timerTotal,
  timerStatus,
}) {
  // Helpers for status badge styles
  const getSenderBadgeClass = () => {
    switch (senderStatus) {
      case 'Transmitting':
      case 'Sending DATA':
        return 'badge-primary';
      case 'Waiting for ACK':
        return 'badge-warning';
      case 'Timeout':
        return 'badge-danger';
      case 'Retransmitting':
        return 'badge-orange';
      case 'Completed':
        return 'badge-success';
      case 'Ready':
      default:
        return 'badge-neutral';
    }
  };

  const getReceiverBadgeClass = () => {
    switch (receiverStatus) {
      case 'Received':
        return 'badge-success';
      case 'Duplicate Detected':
        return 'badge-purple';
      case 'Sending ACK':
        return 'badge-teal';
      case 'Completed':
        return 'badge-success';
      case 'Waiting':
      default:
        return 'badge-neutral';
    }
  };

  const getTimerBadgeClass = () => {
    switch (timerStatus) {
      case 'Running':
        return 'timer-running';
      case 'Timeout':
        return 'timer-timeout';
      case 'Stopped':
      default:
        return 'timer-stopped';
    }
  };

  const timerPercent = timerTotal > 0 ? (timerRemaining / timerTotal) * 100 : 0;

  // Active packet details
  const isDataPacketActive = activePacket && activePacket.type === 'DATA';
  const isAckPacketActive = activePacket && activePacket.type === 'ACK';

  return (
    <div className="simulation-panel-grid">
      {/* ================= 1. SENDER CARD ================= */}
      <div className="node-card sender-card">
        <div className="node-card-header">
          <div className="node-title-group">
            <div className="node-icon-avatar sender-avatar">
              <Laptop size={20} />
            </div>
            <div>
              <h2 className="node-title">Sender</h2>
              <span className="node-subtitle">Host A</span>
            </div>
          </div>
          <span className={`status-badge ${getSenderBadgeClass()}`}>
            {senderStatus}
          </span>
        </div>

        <div className="node-card-body">
          <div className="node-metric-row">
            <span className="metric-label">Current Frame</span>
            <span className="metric-value font-mono">
              Frame {currentFrameIndex} / {totalFrames}
            </span>
          </div>

          <div className="node-metric-row">
            <span className="metric-label">Sequence Number</span>
            <div className="seq-pill-group">
              <span className={`seq-pill ${senderSeq === 0 ? 'seq-active' : ''}`}>0</span>
              <span className={`seq-pill ${senderSeq === 1 ? 'seq-active' : ''}`}>1</span>
            </div>
          </div>

          <div className="node-state-footer">
            <span className="footer-label">Transmission State</span>
            <span className="footer-state-desc">
              {simState === PROTOCOL_STATES.WAITING_FOR_ACK
                ? 'Awaiting ACK confirmation'
                : simState === PROTOCOL_STATES.RETRANSMISSION
                ? 'Retransmitting lost frame'
                : simState === PROTOCOL_STATES.COMPLETED
                ? 'All frames acknowledged'
                : simState === PROTOCOL_STATES.SENDING_DATA || simState === PROTOCOL_STATES.DATA_IN_TRANSIT
                ? `Transmitting Frame ${currentFrameIndex}`
                : 'Ready for transmission'}
            </span>
          </div>
        </div>
      </div>

      {/* ================= 2. COMMUNICATION AREA (CHANNELS & TIMER) ================= */}
      <div className="communication-card">
        {/* Forward Channel: Sender -> Receiver */}
        <div className="channel-section forward-channel">
          <div className="channel-header">
            <div className="channel-title-group">
              <ArrowRight size={15} className="channel-title-icon text-blue" />
              <span className="channel-title">Forward Channel</span>
            </div>
            <span className="channel-route-tag">Sender → Receiver</span>
          </div>

          <div className="channel-track-container">
            <div className="channel-dashed-line forward-line"></div>
            
            {/* Animated DATA Packet */}
            {isDataPacketActive ? (
              <div 
                className={`packet-capsule packet-data ${activePacket.isLost ? 'packet-lost' : ''}`}
                style={{
                  left: `${activePacket.progress}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {activePacket.isLost ? (
                  <>
                    <XCircle size={14} className="packet-icon icon-lost" />
                    <span className="packet-text font-mono">DATA {activePacket.seq} (LOST)</span>
                  </>
                ) : (
                  <>
                    <Layers size={13} className="packet-icon" />
                    <span className="packet-text font-mono">
                      {activePacket.isRetransmit ? `RETX DATA ${activePacket.seq}` : `DATA (SEQ: ${activePacket.seq})`}
                    </span>
                  </>
                )}
              </div>
            ) : (
              <div className="track-idle-indicator forward-idle">
                <span className="idle-label">Ready for DATA</span>
              </div>
            )}
          </div>
        </div>

        {/* Central Timer Display */}
        <div className="central-timer-section">
          <div className="timer-display-box">
            <div className="timer-info-row">
              <div className="timer-label-group">
                <Clock size={16} className={`timer-clock-icon ${timerActive ? 'spin-slow' : ''}`} />
                <span className="timer-main-label">Timer:</span>
                <span className={`timer-status-badge ${getTimerBadgeClass()}`}>
                  {timerStatus === 'Running' 
                    ? `Running (${timerRemaining.toFixed(1)}s / ${timerTotal.toFixed(1)}s)` 
                    : timerStatus === 'Timeout' 
                    ? 'Timeout!' 
                    : 'Stopped'}
                </span>
              </div>
              <span className="timer-countdown-readout font-mono">
                {timerActive ? `${timerRemaining.toFixed(2)}s` : `${timerTotal.toFixed(1)}s`}
              </span>
            </div>

            <div className="timer-track-bar">
              <div 
                className={`timer-fill-bar ${timerRemaining <= 0.8 && timerActive ? 'bar-critical' : ''}`}
                style={{ width: `${timerPercent}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Reverse Channel: Receiver -> Sender */}
        <div className="channel-section reverse-channel">
          <div className="channel-header">
            <div className="channel-title-group">
              <ArrowLeft size={15} className="channel-title-icon text-emerald" />
              <span className="channel-title">Receiver → Sender</span>
            </div>
            <span className="channel-route-tag">Reverse Channel</span>
          </div>

          <div className="channel-track-container">
            <div className="channel-dashed-line reverse-line"></div>

            {/* Animated ACK Packet (travels from Receiver to Sender: 100% -> 0%) */}
            {isAckPacketActive ? (
              <div 
                className={`packet-capsule packet-ack ${activePacket.isLost ? 'packet-lost' : ''}`}
                style={{
                  left: `${100 - activePacket.progress}%`,
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {activePacket.isLost ? (
                  <>
                    <XCircle size={14} className="packet-icon icon-lost" />
                    <span className="packet-text font-mono">ACK {activePacket.ackSeq} (LOST)</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={13} className="packet-icon" />
                    <span className="packet-text font-mono">ACK {activePacket.ackSeq}</span>
                  </>
                )}
              </div>
            ) : (
              <div className="track-idle-indicator reverse-idle">
                <span className="idle-label">Ready for ACK</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================= 3. RECEIVER CARD ================= */}
      <div className="node-card receiver-card">
        <div className="node-card-header">
          <div className="node-title-group">
            <div className="node-icon-avatar receiver-avatar">
              <Server size={20} />
            </div>
            <div>
              <h2 className="node-title">Receiver</h2>
              <span className="node-subtitle">Host B</span>
            </div>
          </div>
          <span className={`status-badge ${getReceiverBadgeClass()}`}>
            {receiverStatus}
          </span>
        </div>

        <div className="node-card-body">
          <div className="node-metric-row">
            <span className="metric-label">Expected Sequence</span>
            <div className="seq-pill-group">
              <span className={`seq-pill ${receiverExpectedSeq === 0 ? 'seq-active' : ''}`}>0</span>
              <span className={`seq-pill ${receiverExpectedSeq === 1 ? 'seq-active' : ''}`}>1</span>
            </div>
          </div>

          <div className="node-metric-row">
            <span className="metric-label">Last Action</span>
            <span className="metric-value font-mono receiver-action-text" title={receiverLastAction}>
              {receiverLastAction}
            </span>
          </div>

          <div className="node-state-footer">
            <span className="footer-label">Protocol Assessment</span>
            <span className="footer-state-desc">
              {simState === PROTOCOL_STATES.DUPLICATE_DETECTED
                ? 'Duplicate frame discarded, resending ACK'
                : simState === PROTOCOL_STATES.DATA_RECEIVED
                ? 'Valid frame accepted, generating ACK'
                : simState === PROTOCOL_STATES.SENDING_ACK
                ? `Dispatched ACK ${receiverExpectedSeq}`
                : simState === PROTOCOL_STATES.COMPLETED
                ? 'Transmission completed'
                : 'Listening for incoming data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
