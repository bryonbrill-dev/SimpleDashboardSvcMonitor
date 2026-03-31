import { env } from "../config/env";
import { pollAllActiveMachines } from "../services/pollingService";

let running = false;

async function executeCycle() {
  if (running) return;
  running = true;
  try {
    await pollAllActiveMachines();
  } finally {
    running = false;
  }
}

export function startPollWorker() {
  setInterval(executeCycle, env.pollIntervalSeconds * 1000);
  void executeCycle();
}
