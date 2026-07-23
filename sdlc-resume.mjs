#!/usr/bin/env node
// Non-interactive helper: resumes an execution and polls until next interrupt or completion.
// Usage:
//   node sdlc-resume.mjs <execution_id>          -- resume and poll
//   node sdlc-resume.mjs <execution_id> --status -- just show current status/output
import { getCodemieClient } from '/opt/homebrew/lib/node_modules/@codemieai/code/dist/utils/sdk-client.js';

const WORKFLOW_ID = 'f1dd6ec7-e708-461d-b763-2f3ffa4d3e22';
const POLL_MS = 5000;
const execId = process.argv[2];
const statusOnly = process.argv.includes('--status');

if (!execId) { console.error('Usage: node sdlc-resume.mjs <execution_id> [--status]'); process.exit(1); }

function log(msg) { console.log(`\n[${new Date().toLocaleTimeString()}] ${msg}`); }
function sep() { console.log('─'.repeat(60)); }

async function showStateOutput(execSvc, exec) {
  try {
    const states = await execSvc.states(execId).list();
    if (states?.length) {
      console.log('\nState results:');
      for (const s of states) {
        const sid = s.state_id ?? s.id ?? '?';
        const ss  = s.status ?? s.overall_status ?? '?';
        console.log(`\n  [${sid}]  status=${ss}`);
        const out = s.output ?? s.result ?? s.message;
        if (out) {
          const preview = typeof out === 'string' ? out : JSON.stringify(out, null, 2);
          console.log('  ' + preview.slice(0, 800).replace(/\n/g, '\n  '));
        }
      }
    } else {
      const hist = exec?.history ?? [];
      for (const h of hist.slice(-3)) {
        if (h.message) console.log(`\n  [${h.role}]: ${String(h.message).slice(0, 600)}`);
      }
    }
  } catch (e) {
    console.log('  (could not fetch state details:', e.message, ')');
  }
}

async function main() {
  log('Connecting to CodeMie...');
  const client = await getCodemieClient();
  const execSvc = client.workflows.executions(WORKFLOW_ID);

  if (statusOnly) {
    const exec = await execSvc.get(execId);
    log(`Status: ${exec?.overall_status}`);
    await showStateOutput(execSvc, exec);
    return;
  }

  // Resume the interrupted execution
  log(`Resuming execution: ${execId}`);
  await execSvc.resume(execId);
  log('Resumed — polling for next state...');
  sep();

  let lastStatus = null;
  let dots = 0;

  while (true) {
    await new Promise(r => setTimeout(r, POLL_MS));

    let exec;
    try {
      exec = await execSvc.get(execId);
    } catch (e) {
      process.stdout.write('.');
      dots++;
      if (dots % 12 === 0) console.log(` [${new Date().toLocaleTimeString()}]`);
      continue;
    }

    const status = exec?.overall_status ?? 'unknown';

    if (status !== lastStatus) {
      if (dots > 0) { console.log(''); dots = 0; }
      log(`Status → ${status}`);
      lastStatus = status;
    }

    if (status === 'Interrupted') {
      sep();
      log('HUMAN-IN-THE-LOOP — Workflow paused. Showing output:');
      await showStateOutput(execSvc, exec);
      sep();
      log('Tell Claude "y" to approve and continue, or "abort" to stop.');
      break;
    }

    if (status === 'Succeeded') {
      sep();
      log('Workflow completed successfully!');
      await showStateOutput(execSvc, exec);
      break;
    }

    if (status === 'Failed' || status === 'Aborted') {
      sep();
      log(`Workflow ended with status: ${status}`);
      const hist = exec?.history ?? [];
      for (const h of hist.slice(-3)) {
        if (h.message) console.log(`  [${h.role}]: ${String(h.message).slice(0, 400)}`);
      }
      break;
    }

    process.stdout.write('.');
    dots++;
    if (dots % 12 === 0) console.log(` [${new Date().toLocaleTimeString()}]`);
  }
}

main().catch(e => { console.error('\nFatal:', e.message ?? e); process.exit(1); });
