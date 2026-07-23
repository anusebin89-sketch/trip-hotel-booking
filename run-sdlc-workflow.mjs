#!/usr/bin/env node
import { createInterface } from 'readline';
import { readFileSync } from 'fs';
import { getCodemieClient } from '/opt/homebrew/lib/node_modules/@codemieai/code/dist/utils/sdk-client.js';

const WORKFLOW_ID = 'f1dd6ec7-e708-461d-b763-2f3ffa4d3e22';
const CSV_PATH = './userstories/sprint_backlog.csv';
const CSV_FILE_NAME = 'sprint_backlog.csv';
const POLL_MS = 5000;

// Parse --resume <execution_id> from CLI args
const resumeIdx = process.argv.indexOf('--resume');
const RESUME_ID = resumeIdx !== -1 ? process.argv[resumeIdx + 1] : null;

const rl = createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise(res => rl.question(q, res));

function log(msg) { console.log(`\n[${new Date().toLocaleTimeString()}] ${msg}`); }
function sep() { console.log('─'.repeat(60)); }

async function main() {
  log('Connecting to CodeMie...');
  const client = await getCodemieClient();
  const execSvc = client.workflows.executions(WORKFLOW_ID);

  let execId, rowId;

  if (RESUME_ID) {
    log(`Resuming execution: ${RESUME_ID}`);
    sep();
    execId = RESUME_ID;
  } else {
    log('Starting SDLC Workflow...');
    sep();

    // Upload CSV to CodeMie so csv_extractor can access it on the platform
    log(`Uploading ${CSV_FILE_NAME} to CodeMie...`);
    const csvContent = readFileSync(CSV_PATH);
    const uploaded = await client._files.upload({
      content: csvContent,
      name: CSV_FILE_NAME,
      mimeType: 'text/csv',
    });
    log(`File uploaded → file_url: ${uploaded.file_url}`);

    // Pass file_url as csv_file and as the fileName attachment parameter
    const userInput = JSON.stringify({ csv_file: uploaded.file_url });
    const raw = await execSvc.create(userInput, uploaded.file_url);
    execId = raw.execution_id;
    rowId  = raw.id;

    if (!execId) {
      console.error('No execution_id in create response:', JSON.stringify(raw, null, 2));
      process.exit(1);
    }

    log(`Execution started`);
    console.log(`  execution_id : ${execId}`);
    console.log(`  row id       : ${rowId}`);
    console.log(`  status       : ${raw.overall_status}`);
    sep();
  }

  let lastStatus = null;
  let dots = 0;
  let skipDelay = !!RESUME_ID; // skip first poll wait when resuming

  while (true) {
    if (skipDelay) { skipDelay = false; } else { await new Promise(r => setTimeout(r, POLL_MS)); }

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
      log('HUMAN-IN-THE-LOOP — Workflow paused for your review.');

      // Show state outputs
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
              console.log('  ' + preview.slice(0, 600).replace(/\n/g, '\n  '));
            }
          }
        } else {
          // fallback: show exec history
          const hist = exec?.history ?? [];
          for (const h of hist.slice(-2)) {
            if (h.message) console.log(`\n  [${h.role}]: ${String(h.message).slice(0, 600)}`);
          }
        }
      } catch (e) {
        console.log('  (could not fetch state details:', e.message, ')');
      }

      sep();
      const answer = await ask('\nApprove and continue? [y / n / abort]: ');
      const choice = answer.trim().toLowerCase();

      if (choice === 'abort') {
        await execSvc.abort(execId).catch(() => {});
        log('Execution aborted.');
        break;
      } else if (choice === 'y') {
        await execSvc.resume(execId);
        log('Resumed — waiting for next state...');
        lastStatus = null;
      } else {
        log('Not resumed. Type "y" to continue or "abort" to cancel.');
      }
      continue;
    }

    if (status === 'Succeeded') {
      sep();
      log('Workflow completed successfully!');
      try {
        const states = await execSvc.states(execId).list();
        if (states?.length) {
          console.log('\nFinal outputs:');
          for (const s of states) {
            console.log(`  [${s.state_id ?? s.id}] ${s.status ?? ''}`);
          }
        }
      } catch {}
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

    // still running — show a dot every poll
    process.stdout.write('.');
    dots++;
    if (dots % 12 === 0) console.log(` [${new Date().toLocaleTimeString()}]`);
  }

  rl.close();
}

main().catch(e => {
  console.error('\nFatal:', e.message ?? e);
  process.exit(1);
});
