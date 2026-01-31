import crypto from 'crypto';
import { Pool } from '../models/pool.model.js';
import { Produce } from '../models/produce.model.js';
import { uploadJson, getJson } from './r2.service.js';
import { createJourneyRecord } from '../models/journey.model.js';

const CHAIN_RPC_URL = process.env.CHAIN_RPC_URL;
const WALLET_PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY;
const JOURNEY_WALLET_ADDRESS = process.env.JOURNEY_WALLET_ADDRESS;

function buildCanonicalPayload(pool, dispatch, produceList) {
  const contributions = produceList.map((p) => ({
    farmer_phone: p.farmer_phone,
    crop: p.crop,
    quantity: p.quantity,
    village: p.village,
    createdAt: p.createdAt
  }));

  return {
    journeyId: pool._id.toString(),
    pool: {
      category: pool.category,
      village: pool.village,
      crops: pool.crops,
      total_quantity: pool.total_quantity,
      threshold: pool.threshold,
      status: pool.status,
      createdAt: pool.createdAt,
      expiresAt: pool.expiresAt
    },
    dispatch: {
      driver_phone: dispatch.driver_phone,
      category: dispatch.category,
      village: dispatch.village,
      total_quantity: dispatch.total_quantity,
      crops: dispatch.crops,
      status: dispatch.status,
      createdAt: dispatch.createdAt
    },
    contributions,
    completedAt: new Date().toISOString()
  };
}

function stableStringify(obj) {
  if (obj === null) return 'null';
  if (typeof obj !== 'object') return JSON.stringify(obj);
  if (obj instanceof Date) return JSON.stringify(obj.toISOString());
  if (Array.isArray(obj)) {
    const parts = obj.map((item) => stableStringify(item));
    return '[' + parts.join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const pairs = keys.map((k) => `"${k}":${stableStringify(obj[k])}`);
  return `{${pairs.join(',')}}`;
}

function hashPayload(jsonString) {
  return crypto.createHash('sha256').update(jsonString, 'utf8').digest('hex');
}

async function recordHashOnChain(hashHex) {
  if (!CHAIN_RPC_URL || !WALLET_PRIVATE_KEY || !JOURNEY_WALLET_ADDRESS) {
    console.warn('⚠️ Blockchain env missing – hash will not be recorded on chain');
    return null;
  }
  if (WALLET_PRIVATE_KEY === 'your_polygon_amoy_wallet_private_key_here') {
    console.warn('⚠️ WALLET_PRIVATE_KEY not set – hash will not be recorded on chain');
    return null;
  }

  const { createWalletClient, http, parseEther } = await import('viem');
  const { privateKeyToAccount } = await import('viem/accounts');
  const { polygonAmoy } = await import('viem/chains');

  const account = privateKeyToAccount(
    (WALLET_PRIVATE_KEY.startsWith('0x') ? WALLET_PRIVATE_KEY : '0x' + WALLET_PRIVATE_KEY)
  );
  const client = createWalletClient({
    account,
    chain: polygonAmoy,
    transport: http(CHAIN_RPC_URL)
  });

  const hashBytes = hashHex.startsWith('0x') ? hashHex : '0x' + hashHex;
  const txHash = await client.sendTransaction({
    to: JOURNEY_WALLET_ADDRESS,
    value: parseEther('0'),
    data: hashBytes
  });
  return txHash;
}

export async function createJourneyForCompletedDispatch(dispatch) {
  const poolId = dispatch.poolId;
  if (!poolId) return null;

  const pool = await Pool.findById(poolId).lean();
  if (!pool) return null;

  const produceList = await Produce.find({ poolId }).lean();
  const payloadObj = buildCanonicalPayload(pool, dispatch, produceList);
  const jsonString = stableStringify(payloadObj);

  const contentHash = hashPayload(jsonString);
  const r2Key = `journeys/${poolId}.json`;

  try {
    await uploadJson(r2Key, jsonString);
  } catch (err) {
    console.error('R2 upload failed:', err);
    throw err;
  }

  let txHash = null;
  try {
    txHash = await recordHashOnChain(contentHash);
  } catch (err) {
    console.error('Blockchain record failed:', err);
  }

  await createJourneyRecord({
    journeyId: poolId,
    r2Key,
    contentHash,
    txHash,
    poolId,
    completedAt: new Date(),
    display: {
      category: pool.category,
      village: pool.village,
      crops: pool.crops,
      total_quantity: pool.total_quantity,
      contribution_count: produceList.length
    }
  });

  return { journeyId: poolId, contentHash, txHash, r2Key };
}

export async function getJourneyJson(r2Key) {
  return await getJson(r2Key);
}
