import { StopAndWaitEngine, PROTOCOL_STATES, DEFAULT_CONFIG } from './src/simulation/stopAndWaitEngine.js';

console.log('=== RUNNING STOP-AND-WAIT PROTOCOL TEST SUITE ===\n');

// 1. Configuration & Default Values Check
console.log('Test 1: Default configuration verification...');
{
  if (
    DEFAULT_CONFIG.totalFrames !== 10 ||
    DEFAULT_CONFIG.ackLossRate !== 0.20 ||
    DEFAULT_CONFIG.frameLossRate !== 0.0 ||
    DEFAULT_CONFIG.timeoutDuration !== 2.0
  ) {
    throw new Error('Test 1 Failed: Unexpected DEFAULT_CONFIG values');
  }
  console.log('✓ Test 1 Passed: Defaults (10 frames, 20% ACK loss, 0% frame loss, 2.0s timeout) verified.');
}

// 2. Normal Mode: 3 frames, 0% loss
console.log('\nTest 2: Normal transmission (3 frames, 0% loss)...');
{
  let completed = false;
  let logs = [];
  const engine = new StopAndWaitEngine({
    totalFrames: 3,
    ackLossRate: 0,
    frameLossRate: 0,
    timeoutDuration: 2.0,
    speed: 4.0, // High speed for fast unit test
  }, (st) => {
    if (st.state === PROTOCOL_STATES.COMPLETED) completed = true;
  }, (l) => {
    logs.push(l);
  });

  engine.start();

  await new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (completed) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > 6000) {
        clearInterval(interval);
        reject(new Error('Test 2 Timed out waiting for completion'));
      }
    }, 50);
  });

  if (engine.stats.successfulFrames !== 3 || engine.stats.totalFramesSent !== 3) {
    throw new Error(`Test 2 Failed: Expected 3 frames sent and ACKed, got ${JSON.stringify(engine.stats)}`);
  }
  console.log('✓ Test 2 Passed: 3 frames sent and ACKed cleanly.');
}

// 3. Demo Mode: Deterministic ACK loss, timeout, duplicate detection, and Frame loss
console.log('\nTest 3: Demo Mode (Deterministic ACK loss, duplicate detection, frame loss)...');
{
  let completed = false;
  let logs = [];
  const engine = new StopAndWaitEngine({
    timeoutDuration: 1.8,
    speed: 4.0,
  }, (st) => {
    if (st.state === PROTOCOL_STATES.COMPLETED) completed = true;
  }, (l) => {
    logs.push(l);
  });

  engine.startDemoMode();

  await new Promise((resolve, reject) => {
    const start = Date.now();
    const interval = setInterval(() => {
      if (completed) {
        clearInterval(interval);
        resolve();
      } else if (Date.now() - start > 10000) {
        clearInterval(interval);
        reject(new Error('Test 3 Timed out in demo mode'));
      }
    }, 50);
  });

  const hasAckLoss = logs.some((l) => l.type === 'LOSS' && l.detail.includes('ACK'));
  const hasTimeout = logs.some((l) => l.type === 'TIMEOUT');
  const hasDuplicate = logs.some((l) => l.type === 'DUPLICATE');
  const hasFrameLoss = logs.some((l) => l.type === 'LOSS' && l.detail.includes('DATA'));

  console.log(`Demo Mode checks: ACK Lost=${hasAckLoss}, Timeout=${hasTimeout}, Duplicate=${hasDuplicate}, DATA Lost=${hasFrameLoss}`);

  if (!hasAckLoss || !hasTimeout || !hasDuplicate || !hasFrameLoss) {
    throw new Error('Test 3 Failed: Demo mode did not exhibit expected protocol error recovery events');
  }
  console.log('✓ Test 3 Passed: Demo Mode verified complete error recovery cycle.');
}

// 4. Step-by-Step Mode Execution
console.log('\nTest 4: Step-by-step mode progression...');
{
  let currentState = null;
  const engine = new StopAndWaitEngine({
    totalFrames: 2,
    ackLossRate: 0,
    frameLossRate: 0,
    timeoutDuration: 2.0,
    speed: 1.0,
  }, (st) => {
    currentState = st;
  });

  // Step 1: Send DATA
  engine.step();
  if (currentState.stepNextAction !== 'DATA_ARRIVE' || currentState.activePacket?.type !== 'DATA') {
    throw new Error(`Test 4 Step 1 failed: Expected DATA_ARRIVE, got ${currentState.stepNextAction}`);
  }

  // Step 2: DATA arrives
  engine.step();
  if (currentState.stepNextAction !== 'SEND_ACK' || currentState.receiverStatus !== 'Received') {
    throw new Error(`Test 4 Step 2 failed: Expected SEND_ACK, got ${currentState.stepNextAction}`);
  }

  // Step 3: Send ACK
  engine.step();
  if (currentState.stepNextAction !== 'ACK_ARRIVE' || currentState.activePacket?.type !== 'ACK') {
    throw new Error(`Test 4 Step 3 failed: Expected ACK_ARRIVE, got ${currentState.stepNextAction}`);
  }

  // Step 4: ACK arrives
  engine.step();
  if (currentState.stepNextAction !== 'NEXT_FRAME' || currentState.stats.successfulFrames !== 1) {
    throw new Error(`Test 4 Step 4 failed: Expected NEXT_FRAME, got ${currentState.stepNextAction}`);
  }

  // Step 5: Advance to next frame
  engine.step();
  if (currentState.currentFrameIndex !== 1 || currentState.senderSeq !== 1) {
    throw new Error(`Test 4 Step 5 failed: Expected frame 1, seq 1, got frame ${currentState.currentFrameIndex}, seq ${currentState.senderSeq}`);
  }

  console.log('✓ Test 4 Passed: Step mode cleanly progresses through discrete protocol stages.');
}

// 5. Reset Behavior
console.log('\nTest 5: Reset clearing timers & state...');
{
  const engine = new StopAndWaitEngine();
  engine.start();
  engine.reset();

  if (engine.isRunning || engine.state !== PROTOCOL_STATES.IDLE || engine.stats.totalFramesSent !== 0) {
    throw new Error('Test 5 Failed: Reset did not cleanly restore initial state');
  }
  console.log('✓ Test 5 Passed: Reset cleanly restores all state and clears timers.');
}

console.log('\n======================================================');
console.log('ALL STOP-AND-WAIT PROTOCOL TESTS PASSED CLEANLY (5/5)!');
console.log('======================================================');
