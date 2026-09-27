/**
 * Stop-and-Wait Protocol Simulation Engine (Alternating-Bit ARQ)
 * Communication & Network Security (CNS)
 *
 * Implements reliable data transmission logic between a Sender and Receiver
 * with sequence numbers (0 and 1), timeout timers, retransmissions,
 * loss simulation, and duplicate frame detection.
 */

export const PROTOCOL_STATES = {
  IDLE: 'IDLE',
  SENDING_DATA: 'SENDING_DATA',
  DATA_IN_TRANSIT: 'DATA_IN_TRANSIT',
  DATA_LOST: 'DATA_LOST',
  DATA_RECEIVED: 'DATA_RECEIVED',
  WAITING_FOR_ACK: 'WAITING_FOR_ACK',
  SENDING_ACK: 'SENDING_ACK',
  ACK_IN_TRANSIT: 'ACK_IN_TRANSIT',
  ACK_LOST: 'ACK_LOST',
  ACK_RECEIVED: 'ACK_RECEIVED',
  TIMEOUT: 'TIMEOUT',
  RETRANSMISSION: 'RETRANSMISSION',
  DUPLICATE_DETECTED: 'DUPLICATE_DETECTED',
  COMPLETED: 'COMPLETED',
  PAUSED: 'PAUSED',
};

export const DEFAULT_CONFIG = {
  totalFrames: 10,
  ackLossRate: 0.20, // 20% default
  frameLossRate: 0.0, // 0% default
  timeoutDuration: 2.0, // 2.0 seconds default
  speed: 1.0, // 0.5x, 1x, 1.5x, 2x
};

export class StopAndWaitEngine {
  constructor(config = {}, onStateChange = () => {}, onLog = () => {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStateChange = onStateChange;
    this.onLog = onLog;

    this.runId = 0;
    this.activeTimeouts = new Set();
    this.timerTickerInterval = null;
    this.animationTimerId = null;

    this.reset();
  }

  getSpeedMultiplier() {
    return Math.max(0.2, this.config.speed || 1.0);
  }

  getEffectiveDuration(ms) {
    return ms / this.getSpeedMultiplier();
  }

  safeTimeout(callback, delayMs) {
    const currentRun = this.runId;
    const effectiveDelay = this.getEffectiveDuration(delayMs);

    const timerId = setTimeout(() => {
      this.activeTimeouts.delete(timerId);
      if (this.runId === currentRun && this.isRunning && !this.isPaused) {
        callback();
      }
    }, effectiveDelay);

    this.activeTimeouts.add(timerId);
    return timerId;
  }

  clearTimers() {
    for (const tid of this.activeTimeouts) {
      clearTimeout(tid);
    }
    this.activeTimeouts.clear();

    if (this.timerTickerInterval) {
      clearInterval(this.timerTickerInterval);
      this.timerTickerInterval = null;
    }

    if (this.animationTimerId) {
      clearTimeout(this.animationTimerId);
      this.animationTimerId = null;
    }
  }

  reset() {
    this.runId += 1;
    this.clearTimers();

    this.state = PROTOCOL_STATES.IDLE;
    this.isRunning = false;
    this.isPaused = false;
    this.isStepMode = false;
    this.isDemoMode = false;
    this.demoStepIndex = 0;

    // Sender state
    this.currentFrameIndex = 0;
    this.senderSeq = 0;
    this.senderStatus = 'Ready';

    // Receiver state
    this.receiverExpectedSeq = 0;
    this.receiverStatus = 'Waiting';
    this.receiverLastAction = 'Listening';

    // Timer state
    this.timerActive = false;
    this.timerRemaining = this.config.timeoutDuration;
    this.timerTotal = this.config.timeoutDuration;
    this.timerStatus = 'Stopped'; // 'Stopped', 'Running', 'Timeout'

    // Active Packet state
    this.activePacket = null; // { type: 'DATA'|'ACK', seq: 0|1, progress: 0..100, isLost: bool, label: string }

    // Next step planned action (for step mode)
    this.stepNextAction = 'SEND_DATA';

    // Statistics
    this.stats = {
      totalFramesSent: 0,
      successfulFrames: 0,
      retransmissions: 0,
      acksLost: 0,
      framesLost: 0,
      timeouts: 0,
      duplicatesDetected: 0,
      successRate: '100.0',
    };

    this.deliveredFrames = [];

    this.emitState();
  }

  updateConfig(newConfig) {
    const oldTotal = this.config.totalFrames;
    this.config = { ...this.config, ...newConfig };

    if (newConfig.totalFrames !== undefined && !this.isRunning) {
      this.currentFrameIndex = 0;
    }
    if (newConfig.timeoutDuration !== undefined && !this.timerActive) {
      this.timerTotal = this.config.timeoutDuration;
      this.timerRemaining = this.config.timeoutDuration;
    }

    this.emitState();
  }

  computeSuccessRate() {
    if (this.stats.totalFramesSent === 0) return '100.0';
    const rate = (this.stats.successfulFrames / this.stats.totalFramesSent) * 100;
    return Math.min(100, Math.max(0, rate)).toFixed(1);
  }

  log(type, detail, source = 'SYSTEM') {
    const now = new Date();
    const timestamp = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');

    const logEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp,
      type, // 'DATA', 'ACK', 'TIMEOUT', 'LOSS', 'RETX', 'DUPLICATE', 'SUCCESS', 'INFO'
      source,
      detail,
    };

    this.onLog(logEntry);
  }

  emitState() {
    this.stats.successRate = this.computeSuccessRate();

    this.onStateChange({
      state: this.state,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isStepMode: this.isStepMode,
      isDemoMode: this.isDemoMode,
      currentFrameIndex: this.currentFrameIndex,
      totalFrames: this.config.totalFrames,
      senderSeq: this.senderSeq,
      senderStatus: this.senderStatus,
      receiverExpectedSeq: this.receiverExpectedSeq,
      receiverStatus: this.receiverStatus,
      receiverLastAction: this.receiverLastAction,
      activePacket: this.activePacket ? { ...this.activePacket } : null,
      timerActive: this.timerActive,
      timerRemaining: Number(Math.max(0, this.timerRemaining).toFixed(2)),
      timerTotal: this.timerTotal,
      timerStatus: this.timerStatus,
      stats: { ...this.stats },
      deliveredFrames: [...this.deliveredFrames],
      stepNextAction: this.stepNextAction,
    });
  }

  start() {
    if (this.isRunning && !this.isPaused) return;

    if (this.state === PROTOCOL_STATES.COMPLETED) {
      this.reset();
    }

    this.isRunning = true;
    this.isPaused = false;
    this.isStepMode = false;
    this.isDemoMode = false;

    this.log('INFO', `Starting Stop-and-Wait transmission (${this.config.totalFrames} frames, timeout: ${this.config.timeoutDuration.toFixed(1)}s, ACK loss: ${(this.config.ackLossRate * 100).toFixed(0)}%, Frame loss: ${(this.config.frameLossRate * 100).toFixed(0)}%)`, 'SENDER');

    this.sendCurrentFrame(false);
  }

  startDemoMode() {
    this.reset();
    this.isRunning = true;
    this.isPaused = false;
    this.isStepMode = false;
    this.isDemoMode = true;
    this.demoStepIndex = 0;

    // Fixed 4 frames for demo to demonstrate:
    // Frame 0: Clean transmission & ACK
    // Frame 1: ACK lost in reverse channel -> Timeout -> Retransmission -> Duplicate detected -> ACK resent
    // Frame 2: DATA lost in forward channel -> Timeout -> Retransmission -> Delivered
    // Frame 3: Clean final transmission
    this.config.totalFrames = 4;

    this.log('INFO', 'Demo Mode initiated: Demonstrating normal transfer, ACK loss & duplicate detection, and Frame loss recovery.', 'DEMO');

    this.sendCurrentFrame(false);
  }

  pause() {
    if (!this.isRunning || this.isPaused) return;
    this.isPaused = true;
    this.state = PROTOCOL_STATES.PAUSED;
    this.clearTimers();
    this.log('INFO', 'Simulation paused by user.', 'CONTROL');
    this.emitState();
  }

  resume() {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.log('INFO', 'Simulation resumed.', 'CONTROL');

    if (this.timerActive) {
      this.startCountdownTimer();
    }

    if (this.activePacket) {
      // Resume packet in flight
      if (this.activePacket.type === 'DATA') {
        this.advanceDataInTransit(this.activePacket.isRetransmit, this.activePacket.willLose);
      } else {
        this.advanceAckInTransit(this.activePacket.ackSeq, this.activePacket.willLose);
      }
    } else if (this.state === PROTOCOL_STATES.WAITING_FOR_ACK) {
      // Timer is already ticking
      this.emitState();
    } else {
      this.sendCurrentFrame(false);
    }
  }

  step() {
    if (this.state === PROTOCOL_STATES.COMPLETED) {
      this.reset();
    }

    this.isStepMode = true;
    this.isRunning = true;
    this.isPaused = true; // In step mode, execution pauses after each action

    switch (this.stepNextAction) {
      case 'SEND_DATA':
        this.stepSendData();
        break;
      case 'DATA_ARRIVE':
        this.stepDataArrive();
        break;
      case 'TIMEOUT_DATA_LOST':
        this.stepHandleTimeout();
        break;
      case 'SEND_ACK':
        this.stepSendAck();
        break;
      case 'ACK_ARRIVE':
        this.stepAckArrive();
        break;
      case 'TIMEOUT_ACK_LOST':
        this.stepHandleTimeout();
        break;
      case 'NEXT_FRAME':
        this.stepNextFrame();
        break;
      default:
        this.stepSendData();
        break;
    }
  }

  // --- Step-by-Step granular operations ---

  stepSendData() {
    const isRetransmit = this.state === PROTOCOL_STATES.TIMEOUT || this.state === PROTOCOL_STATES.RETRANSMISSION;
    const seq = this.senderSeq;
    const frameNum = this.currentFrameIndex;

    this.stats.totalFramesSent += 1;
    if (isRetransmit) {
      this.stats.retransmissions += 1;
      this.state = PROTOCOL_STATES.RETRANSMISSION;
      this.senderStatus = 'Retransmitting';
      this.log('RETX', `Retransmitting Frame ${frameNum} (SEQ: ${seq})`, 'SENDER');
    } else {
      this.state = PROTOCOL_STATES.SENDING_DATA;
      this.senderStatus = 'Transmitting';
      this.log('DATA', `Sending Frame ${frameNum} (SEQ: ${seq})`, 'SENDER');
    }

    // Determine loss
    const willLose = this.shouldLoseFrame(isRetransmit);

    this.activePacket = {
      type: 'DATA',
      seq,
      frameNum,
      isRetransmit,
      progress: 0,
      isLost: false,
      willLose,
      label: `DATA ${seq}`,
    };

    this.startCountdownTimer();

    if (willLose) {
      this.activePacket.progress = 50;
      this.activePacket.isLost = true;
      this.stats.framesLost += 1;
      this.log('LOSS', `DATA frame (SEQ: ${seq}) lost in forward channel!`, 'CHANNEL');
      this.stepNextAction = 'TIMEOUT_DATA_LOST';
    } else {
      this.activePacket.progress = 50;
      this.stepNextAction = 'DATA_ARRIVE';
    }

    this.emitState();
  }

  stepDataArrive() {
    if (!this.activePacket) return;

    this.activePacket.progress = 100;
    const { seq, frameNum } = this.activePacket;

    if (seq === this.receiverExpectedSeq) {
      // Expected frame received
      this.state = PROTOCOL_STATES.DATA_RECEIVED;
      this.receiverStatus = 'Received';
      this.receiverLastAction = `Accepted Frame ${frameNum}`;
      this.log('DATA', `Receiver received expected Frame ${frameNum} (SEQ: ${seq})`, 'RECEIVER');
      this.stepNextAction = 'SEND_ACK';
    } else {
      // Duplicate frame detected!
      this.stats.duplicatesDetected += 1;
      this.state = PROTOCOL_STATES.DUPLICATE_DETECTED;
      this.receiverStatus = 'Duplicate Detected';
      this.receiverLastAction = `Discarded Duplicate Frame ${frameNum} (SEQ: ${seq})`;
      this.log('DUPLICATE', `Receiver detected duplicate Frame (SEQ: ${seq}) - Discarding and resending ACK`, 'RECEIVER');
      this.stepNextAction = 'SEND_ACK';
    }

    this.emitState();
  }

  stepSendAck() {
    const isDuplicate = this.state === PROTOCOL_STATES.DUPLICATE_DETECTED;
    let ackSeq;

    if (isDuplicate) {
      // Resend ACK for already expected sequence
      ackSeq = this.receiverExpectedSeq;
    } else {
      // Accept data, toggle expected sequence, send ACK with next expected seq
      this.receiverExpectedSeq = 1 - this.receiverExpectedSeq;
      ackSeq = this.receiverExpectedSeq;
    }

    const willLose = this.shouldLoseAck(isDuplicate);

    this.state = PROTOCOL_STATES.SENDING_ACK;
    this.receiverStatus = 'Sending ACK';
    this.receiverLastAction = `Sent ACK ${ackSeq}`;
    this.senderStatus = 'Waiting for ACK';

    this.activePacket = {
      type: 'ACK',
      seq: ackSeq,
      ackSeq,
      progress: 0,
      isLost: false,
      willLose,
      label: `ACK ${ackSeq}`,
    };

    this.log('ACK', `Receiver sending ACK ${ackSeq} to Sender`, 'RECEIVER');

    if (willLose) {
      this.activePacket.progress = 50;
      this.activePacket.isLost = true;
      this.stats.acksLost += 1;
      this.log('LOSS', `ACK ${ackSeq} lost in reverse channel!`, 'CHANNEL');
      this.stepNextAction = 'TIMEOUT_ACK_LOST';
    } else {
      this.activePacket.progress = 50;
      this.stepNextAction = 'ACK_ARRIVE';
    }

    this.emitState();
  }

  stepAckArrive() {
    if (!this.activePacket) return;

    this.activePacket.progress = 100;
    const { ackSeq } = this.activePacket;

    // Check if ACK matches the next expected sequence
    const expectedAck = 1 - this.senderSeq;
    if (ackSeq === expectedAck) {
      // Valid ACK received!
      this.stopTimer();
      this.state = PROTOCOL_STATES.ACK_RECEIVED;
      this.senderStatus = 'Ready';
      this.stats.successfulFrames += 1;

      this.deliveredFrames.push({
        frameIndex: this.currentFrameIndex,
        seq: this.senderSeq,
        ackSeq,
      });

      this.log('ACK', `Sender received valid ACK ${ackSeq}. Frame ${this.currentFrameIndex} confirmed.`, 'SENDER');

      this.activePacket = null;
      this.stepNextAction = 'NEXT_FRAME';
    } else {
      this.log('INFO', `Sender received unexpected ACK ${ackSeq}, ignoring.`, 'SENDER');
    }

    this.emitState();
  }

  stepNextFrame() {
    this.currentFrameIndex += 1;
    this.senderSeq = 1 - this.senderSeq;

    if (this.currentFrameIndex >= this.config.totalFrames) {
      this.completeSimulation();
      return;
    }

    this.senderStatus = 'Ready';
    this.stepNextAction = 'SEND_DATA';
    this.emitState();
  }

  stepHandleTimeout() {
    this.stopTimer();
    this.stats.timeouts += 1;
    this.state = PROTOCOL_STATES.TIMEOUT;
    this.senderStatus = 'Timeout';
    this.timerStatus = 'Timeout';
    this.activePacket = null;

    this.log('TIMEOUT', `Timer expired (${this.config.timeoutDuration.toFixed(1)}s) without receiving ACK! Triggering retransmission.`, 'SENDER');

    this.stepNextAction = 'SEND_DATA';
    this.emitState();
  }

  // --- Automated Execution Pipeline ---

  shouldLoseFrame(isRetransmit) {
    if (this.isDemoMode) {
      // In demo mode:
      // Frame 0: normal
      // Frame 1: ACK lost (frame delivered)
      // Frame 2: DATA frame lost on initial transmission, delivered on retransmit
      // Frame 3: normal
      if (this.currentFrameIndex === 2 && !isRetransmit) {
        return true;
      }
      return false;
    }
    return Math.random() < this.config.frameLossRate;
  }

  shouldLoseAck(isDuplicate) {
    if (this.isDemoMode) {
      // Frame 1: ACK lost on first transmission, delivered on duplicate resend
      if (this.currentFrameIndex === 1 && !isDuplicate) {
        return true;
      }
      return false;
    }
    return Math.random() < this.config.ackLossRate;
  }

  sendCurrentFrame(isRetransmit = false) {
    if (!this.isRunning || this.isPaused) return;

    if (this.currentFrameIndex >= this.config.totalFrames) {
      this.completeSimulation();
      return;
    }

    const seq = this.senderSeq;
    const frameNum = this.currentFrameIndex;

    this.stats.totalFramesSent += 1;
    if (isRetransmit) {
      this.stats.retransmissions += 1;
      this.state = PROTOCOL_STATES.RETRANSMISSION;
      this.senderStatus = 'Retransmitting';
      this.log('RETX', `Retransmitting Frame ${frameNum} (SEQ: ${seq})`, 'SENDER');
    } else {
      this.state = PROTOCOL_STATES.SENDING_DATA;
      this.senderStatus = 'Transmitting';
      this.log('DATA', `Sending Frame ${frameNum} (SEQ: ${seq})`, 'SENDER');
    }

    // Start timer upon transmission
    this.startCountdownTimer();

    const willLose = this.shouldLoseFrame(isRetransmit);

    // Animate DATA packet across forward channel
    this.activePacket = {
      type: 'DATA',
      seq,
      frameNum,
      isRetransmit,
      progress: 0,
      isLost: false,
      willLose,
      label: `DATA ${seq}`,
    };

    this.state = PROTOCOL_STATES.DATA_IN_TRANSIT;
    this.emitState();

    this.advanceDataInTransit(isRetransmit, willLose);
  }

  advanceDataInTransit(isRetransmit, willLose) {
    const transitDuration = 400 / this.getSpeedMultiplier();
    const startTime = Date.now();

    const checkProgress = () => {
      if (!this.isRunning || this.isPaused) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / transitDuration) * 100);

      if (willLose && progress >= 50) {
        // Frame is lost midway
        if (this.activePacket) {
          this.activePacket.progress = 50;
          this.activePacket.isLost = true;
        }
        this.stats.framesLost += 1;
        this.state = PROTOCOL_STATES.DATA_LOST;
        this.log('LOSS', `DATA frame (SEQ: ${this.senderSeq}) lost in forward channel!`, 'CHANNEL');
        this.emitState();

        // Sender waits for timeout
        this.safeTimeout(() => {
          this.activePacket = null;
          this.senderStatus = 'Waiting for ACK';
          this.emitState();
        }, 150);

        return;
      }

      if (this.activePacket) {
        this.activePacket.progress = progress;
      }
      this.emitState();

      if (progress < 100) {
        this.animationTimerId = setTimeout(checkProgress, 30);
      } else {
        // Arrived at receiver
        this.handleDataArrival();
      }
    };

    this.animationTimerId = setTimeout(checkProgress, 30);
  }

  handleDataArrival() {
    if (!this.isRunning || this.isPaused || !this.activePacket) return;

    const { seq, frameNum } = this.activePacket;
    this.activePacket = null;

    if (seq === this.receiverExpectedSeq) {
      // Expected frame!
      this.state = PROTOCOL_STATES.DATA_RECEIVED;
      this.receiverStatus = 'Received';
      this.receiverLastAction = `Accepted Frame ${frameNum}`;
      this.log('DATA', `Receiver received expected Frame ${frameNum} (SEQ: ${seq})`, 'RECEIVER');

      this.safeTimeout(() => {
        this.sendAck(false);
      }, 100);
    } else {
      // Duplicate frame!
      this.stats.duplicatesDetected += 1;
      this.state = PROTOCOL_STATES.DUPLICATE_DETECTED;
      this.receiverStatus = 'Duplicate Detected';
      this.receiverLastAction = `Discarded Duplicate Frame ${frameNum} (SEQ: ${seq})`;
      this.log('DUPLICATE', `Receiver detected duplicate Frame ${frameNum} (SEQ: ${seq}) - Discarding and resending ACK`, 'RECEIVER');

      this.safeTimeout(() => {
        this.sendAck(true);
      }, 100);
    }

    this.emitState();
  }

  sendAck(isDuplicate = false) {
    if (!this.isRunning || this.isPaused) return;

    let ackSeq;
    if (isDuplicate) {
      ackSeq = this.receiverExpectedSeq;
    } else {
      this.receiverExpectedSeq = 1 - this.receiverExpectedSeq;
      ackSeq = this.receiverExpectedSeq;
    }

    const willLose = this.shouldLoseAck(isDuplicate);

    this.state = PROTOCOL_STATES.SENDING_ACK;
    this.receiverStatus = 'Sending ACK';
    this.receiverLastAction = `Sent ACK ${ackSeq}`;
    this.senderStatus = 'Waiting for ACK';

    this.activePacket = {
      type: 'ACK',
      seq: ackSeq,
      ackSeq,
      progress: 0,
      isLost: false,
      willLose,
      label: `ACK ${ackSeq}`,
    };

    this.log('ACK', `Receiver sending ACK ${ackSeq} to Sender`, 'RECEIVER');
    this.emitState();

    this.advanceAckInTransit(ackSeq, willLose);
  }

  advanceAckInTransit(ackSeq, willLose) {
    const transitDuration = 400 / this.getSpeedMultiplier();
    const startTime = Date.now();

    const checkProgress = () => {
      if (!this.isRunning || this.isPaused) return;

      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / transitDuration) * 100);

      if (willLose && progress >= 50) {
        // ACK is lost midway
        if (this.activePacket) {
          this.activePacket.progress = 50;
          this.activePacket.isLost = true;
        }
        this.stats.acksLost += 1;
        this.state = PROTOCOL_STATES.ACK_LOST;
        this.log('LOSS', `ACK ${ackSeq} lost in reverse channel!`, 'CHANNEL');
        this.emitState();

        // Sender waits for timeout
        this.safeTimeout(() => {
          this.activePacket = null;
          this.emitState();
        }, 150);

        return;
      }

      if (this.activePacket) {
        this.activePacket.progress = progress;
      }
      this.emitState();

      if (progress < 100) {
        this.animationTimerId = setTimeout(checkProgress, 30);
      } else {
        // Arrived at sender
        this.handleAckArrival(ackSeq);
      }
    };

    this.animationTimerId = setTimeout(checkProgress, 30);
  }

  handleAckArrival(ackSeq) {
    if (!this.isRunning || this.isPaused) return;

    this.activePacket = null;
    const expectedAck = 1 - this.senderSeq;

    if (ackSeq === expectedAck) {
      // Valid ACK received!
      this.stopTimer();
      this.state = PROTOCOL_STATES.ACK_RECEIVED;
      this.senderStatus = 'Ready';
      this.stats.successfulFrames += 1;

      this.deliveredFrames.push({
        frameIndex: this.currentFrameIndex,
        seq: this.senderSeq,
        ackSeq,
      });

      this.log('SUCCESS', `Sender received valid ACK ${ackSeq}. Frame ${this.currentFrameIndex} confirmed!`, 'SENDER');
      this.emitState();

      // Proceed to next frame
      this.safeTimeout(() => {
        this.currentFrameIndex += 1;
        this.senderSeq = 1 - this.senderSeq;

        if (this.currentFrameIndex >= this.config.totalFrames) {
          this.completeSimulation();
        } else {
          this.sendCurrentFrame(false);
        }
      }, 150);
    } else {
      this.log('INFO', `Sender received unexpected ACK ${ackSeq}, ignoring.`, 'SENDER');
      this.emitState();
    }
  }

  // --- Timer Management ---

  startCountdownTimer() {
    this.stopTimer();

    this.timerActive = true;
    this.timerTotal = this.config.timeoutDuration;
    this.timerRemaining = this.config.timeoutDuration;
    this.timerStatus = 'Running';

    const tickIntervalMs = 50;
    const decrementPerTick = (tickIntervalMs / 1000) * this.getSpeedMultiplier();

    this.timerTickerInterval = setInterval(() => {
      if (!this.isRunning || this.isPaused) return;

      this.timerRemaining = Math.max(0, this.timerRemaining - decrementPerTick);

      if (this.timerRemaining <= 0) {
        this.stopTimer();
        this.handleTimeout();
      } else {
        this.emitState();
      }
    }, tickIntervalMs);

    this.emitState();
  }

  stopTimer() {
    if (this.timerTickerInterval) {
      clearInterval(this.timerTickerInterval);
      this.timerTickerInterval = null;
    }
    this.timerActive = false;
    this.timerStatus = 'Stopped';
  }

  handleTimeout() {
    this.stats.timeouts += 1;
    this.state = PROTOCOL_STATES.TIMEOUT;
    this.senderStatus = 'Timeout';
    this.timerStatus = 'Timeout';
    this.activePacket = null;

    this.log('TIMEOUT', `Timeout! No ACK received within ${this.config.timeoutDuration.toFixed(1)}s. Retransmitting Frame ${this.currentFrameIndex} (SEQ: ${this.senderSeq})...`, 'SENDER');
    this.emitState();

    if (this.isStepMode) {
      this.stepNextAction = 'SEND_DATA';
      return;
    }

    this.safeTimeout(() => {
      this.sendCurrentFrame(true);
    }, 600);
  }

  completeSimulation() {
    this.clearTimers();
    this.state = PROTOCOL_STATES.COMPLETED;
    this.isRunning = false;
    this.isPaused = false;
    this.senderStatus = 'Completed';
    this.receiverStatus = 'Completed';
    this.receiverLastAction = 'All Frames Received';
    this.activePacket = null;
    this.timerStatus = 'Stopped';

    this.log('SUCCESS', `🎉 Simulation Completed! Successfully delivered and acknowledged all ${this.config.totalFrames} frames with a ${this.computeSuccessRate()}% success rate.`, 'SYSTEM');
    this.emitState();
  }
}
