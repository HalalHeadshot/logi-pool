/**
 * Full simulation: seed driver → LOG produce → YES (driver accept) → DONE (driver complete)
 * → verify Journey record, GET /journey/:id, GET /journey/:id/qr
 * Run: node scripts/simulate-journey-flow.js
 * Server will be started and stopped by this script.
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

import { spawn } from 'child_process';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Driver } from '../src/models/driver.model.js';
import { Journey } from '../src/models/journey.model.js';

const BASE = 'http://localhost:3000';
const DRIVER_PHONE = '+1555SIMDRIVER';
const FARMER_PHONE = '+1555SIMFARMER';
// SMS controller uppercases Body, so pool/driver village must match uppercase
// Use unique village per run so we get a fresh pool + journey
// Use unique village per run so we get a fresh pool + journey
const VILLAGE = 'SIMVILLAGE_' + Date.now();
const ADDRESS = '123 Farm Lane, ' + VILLAGE;

function log(msg, ok = null) {
  const icon = ok === true ? '✅' : ok === false ? '❌' : '  ';
  console.log(`${icon} ${msg}`);
}

async function waitForServer(maxWaitMs = 15000) {
  const step = 500;
  for (let elapsed = 0; elapsed < maxWaitMs; elapsed += step) {
    try {
      const r = await fetch(`${BASE}/journey/000000000000000000000000`, { method: 'GET' });
      if (r.status === 404 || r.status === 200) {
        log('Server is up', true);
        return true;
      }
    } catch (_) { }
    await new Promise((r) => setTimeout(r, step));
  }
  log('Server did not become ready', false);
  return false;
}

async function postSms(from, body) {
  const res = await fetch(`${BASE}/sms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ From: from, Body: body })
  });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

async function run() {
  let serverProcess = null;

  try {
    log('Connecting to MongoDB...');
    await connectMongo();
    log('MongoDB connected', true);

    log('Seeding driver (if not exists)...');
    await Driver.findOneAndUpdate(
      { phone: DRIVER_PHONE },
      { $set: { name: 'SimDriver', phone: DRIVER_PHONE, village: VILLAGE, available: true } },
      { upsert: true, new: true }
    );
    log('Driver ready', true);

    log('Starting server...');
    serverProcess = spawn('node', ['src/server.js'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    serverProcess.stdout.on('data', (d) => process.stdout.write(d));
    serverProcess.stderr.on('data', (d) => process.stderr.write(d));

    const serverUp = await waitForServer();
    if (!serverUp) {
      process.exit(1);
    }

    log(`1. Farmer logs produce (LOG TOMATO 10 | ${ADDRESS})...`);
    const logRes = await postSms(FARMER_PHONE, `LOG TOMATO 10 | ${ADDRESS}`);
    log(logRes.ok ? `Response: ${logRes.text}` : `Failed: ${logRes.status} ${logRes.text}`, logRes.ok);
    if (!logRes.ok) throw new Error('LOG failed');

    log('2. Driver accepts (YES)...');
    const yesRes = await postSms(DRIVER_PHONE, 'YES');
    log(yesRes.ok ? `Response: ${yesRes.text}` : `Failed: ${yesRes.status} ${yesRes.text}`, yesRes.ok);
    if (!yesRes.ok) throw new Error('YES failed');

    log('3. Driver completes delivery (DONE)...');
    const doneRes = await postSms(DRIVER_PHONE, 'DONE');
    log(doneRes.ok ? `Response: ${doneRes.text}` : `Failed: ${doneRes.status} ${doneRes.text}`, doneRes.ok);
    if (!doneRes.ok) throw new Error('DONE failed');

    await new Promise((r) => setTimeout(r, 2000));

    log('4. Checking Journey record in DB...');
    const journey = await Journey.findOne().sort({ _id: -1 }).lean();
    if (!journey) {
      log('No Journey found after DONE', false);
      throw new Error('Journey not created');
    }
    log(`Journey found: journeyId=${journey.journeyId}, hash=${journey.contentHash?.slice(0, 16)}..., txHash=${journey.txHash || 'none'}`, true);

    const journeyId = journey.journeyId?.toString?.() || journey.journeyId;

    log('5. GET /journey/:id (JSON)...');
    const getRes = await fetch(`${BASE}/journey/${journeyId}`, {
      headers: { Accept: 'application/json' }
    });
    const getData = await getRes.json();
    if (!getRes.ok) {
      log(`GET journey failed: ${getRes.status}`, false);
      throw new Error('GET /journey failed');
    }
    log(`Payload present: ${!!getData.payload}, contentHash: ${getData.contentHash?.slice(0, 16)}..., txUrl: ${getData.txUrl || 'n/a'}`, true);
    if (getData.payload) {
      log(`  - Pool: ${getData.payload.pool?.category}, village: ${getData.payload.pool?.village}, total_quantity: ${getData.payload.pool?.total_quantity}`);
      log(`  - Pool: ${getData.payload.pool?.category}, village: ${getData.payload.pool?.village}, total_quantity: ${getData.payload.pool?.total_quantity}`);
      const contribs = getData.payload.contributions || [];
      log(`  - Contributions: ${contribs.length} farmer(s)`);
      if (contribs.length > 0 && contribs[0].address === ADDRESS) {
        log('  - Address verification: MATCH ✅', true);
      } else {
        log(`  - Address verification: FAILED (Expected ${ADDRESS}, got ${contribs[0]?.address})`, false);
      }
    }

    log('6. GET /journey/:id/qr (PNG)...');
    const qrRes = await fetch(`${BASE}/journey/${journeyId}/qr`);
    const qrOk = qrRes.ok && qrRes.headers.get('content-type')?.includes('image/png');
    const qrSize = qrOk ? (await qrRes.arrayBuffer()).byteLength : 0;
    log(qrOk ? `QR OK, size: ${qrSize} bytes` : `QR failed: ${qrRes.status}`, qrOk);

    log('Simulation complete.', true);
  } catch (err) {
    log(`Error: ${err.message}`, false);
    console.error(err);
    process.exit(1);
  } finally {
    if (serverProcess) {
      serverProcess.kill('SIGTERM');
      log('Server stopped.');
    }
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
