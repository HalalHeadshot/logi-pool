import { getJourneyByPoolId } from '../models/journey.model.js';
import { Pool } from '../models/pool.model.js';
import { Produce } from '../models/produce.model.js';
import { getJson } from '../services/r2.service.js';
import QRCode from 'qrcode';

const EXPLORER_URL = process.env.BLOCKCHAIN_EXPLORER_URL || 'https://amoy.polygonscan.com';

function wantsJson(req) {
  const accept = (req.headers.accept || '').toLowerCase();
  return accept.includes('application/json');
}

function renderJourneyPage(data) {
  const { payload, display, txUrl, completedAt } = data;
  const pool = payload?.pool || display ? { category: display.category, village: display.village, crops: display.crops, total_quantity: display.total_quantity } : {};
  const contributions = payload?.contributions || [];
  const cropList = (pool.crops || []).join(', ');
  const farmerCount = contributions.length || (display?.contribution_count ?? 0);
  const completedDate = completedAt
    ? new Date(completedAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
    : '—';

  const verifySection = txUrl
    ? `
    <section class="card verify">
      <h2>🔐 Verify authenticity</h2>
      <p>This journey was recorded on Polygon blockchain. You can verify it was not altered.</p>
      <a href="${txUrl}" target="_blank" rel="noopener noreferrer" class="btn">Verify on Polygon →</a>
    </section>`
    : `
    <section class="card verify">
      <p>Blockchain verification was not recorded for this journey.</p>
    </section>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Produce Journey</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; margin: 0; padding: 1rem; background: #f5f5f5; color: #1a1a1a; line-height: 1.5; }
    .container { max-width: 420px; margin: 0 auto; }
    h1 { font-size: 1.35rem; margin: 0 0 1rem; color: #1a1a1a; }
    .card { background: #fff; border-radius: 12px; padding: 1.25rem; margin-bottom: 1rem; box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .card h2 { font-size: 1rem; margin: 0 0 0.5rem; color: #444; font-weight: 600; }
    .card p { margin: 0; color: #333; }
    .row { display: flex; justify-content: space-between; margin-bottom: 0.5rem; }
    .row:last-child { margin-bottom: 0; }
    .label { color: #666; }
    .value { font-weight: 500; }
    .btn { display: inline-block; margin-top: 0.75rem; padding: 0.75rem 1.25rem; background: #7c3aed; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
    .btn:hover { background: #6d28d9; }
    .verify { border-left: 4px solid #7c3aed; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🌱 Produce Journey</h1>
    <section class="card">
      <h2>What’s in this batch</h2>
      <div class="row"><span class="label">Category</span><span class="value">${escapeHtml(pool.category || '—')}</span></div>
      <div class="row"><span class="label">Crops</span><span class="value">${escapeHtml(cropList || '—')}</span></div>
      <div class="row"><span class="label">Total quantity</span><span class="value">${escapeHtml(String(pool.total_quantity ?? '—'))}</span></div>
      <div class="row"><span class="label">Village</span><span class="value">${escapeHtml(pool.village || '—')}</span></div>
    </section>
    <section class="card">
      <h2>Delivery</h2>
      <div class="row"><span class="label">Contributing farmers</span><span class="value">${farmerCount}</span></div>
      <div class="row"><span class="label">Completed on</span><span class="value">${escapeHtml(completedDate)}</span></div>
    </section>
    ${verifySection}
  </div>
</body>
</html>`;
}

function escapeHtml(str) {
  if (str == null) return '—';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function getJourney(req, res) {
  try {
    const { id } = req.params;
    const journey = await getJourneyByPoolId(id);
    if (!journey) {
      if (wantsJson(req)) return res.status(404).json({ error: 'Journey not found' });
      return res.status(404).send('Journey not found');
    }

    let journeyJson = null;
    try {
      journeyJson = await getJson(journey.r2Key);
    } catch (err) {
      console.error('R2 getJson failed:', err);
    }

    const txUrl = journey.txHash
      ? `${EXPLORER_URL}/tx/${journey.txHash}`
      : null;

    const payload = journeyJson ? JSON.parse(journeyJson) : null;

    let display = journey.display;
    if (!payload && !display && journey.poolId) {
      const pool = await Pool.findById(journey.poolId).lean();
      if (pool) {
        const contributionCount = await Produce.countDocuments({ poolId: journey.poolId });
        display = { category: pool.category, village: pool.village, crops: pool.crops, total_quantity: pool.total_quantity, contribution_count: contributionCount };
      }
    }

    if (wantsJson(req)) {
      return res.json({
        journeyId: journey.journeyId,
        contentHash: journey.contentHash,
        txHash: journey.txHash,
        txUrl,
        completedAt: journey.completedAt,
        payload
      });
    }

    const html = renderJourneyPage({ payload, display: journey.display, txUrl, completedAt: journey.completedAt });
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error(err);
    if (wantsJson(req)) return res.status(500).json({ error: 'Server error' });
    res.status(500).send('Server error');
  }
}

export async function getJourneyQr(req, res) {
  try {
    const { id } = req.params;
    const journey = await getJourneyByPoolId(id);
    if (!journey) {
      return res.status(404).send('Journey not found');
    }

    const baseUrl = process.env.APP_BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const journeyUrl = `${baseUrl}/journey/${id}`;
    const qrBuffer = await QRCode.toBuffer(journeyUrl, { type: 'png', margin: 2 });

    res.set('Content-Type', 'image/png');
    res.send(qrBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
}
