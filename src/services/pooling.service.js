import { getOrCreatePool, updatePoolQuantity, markPoolReady }
  from '../models/pool.model.js';
import { notifyDrivers } from './notification.service.js';
import { CROP_THRESHOLDS } from '../config/thresholds.js';

export async function processPooling(crop, village, quantity) {
  const threshold = CROP_THRESHOLDS[crop] || 10;

  const pool = await getOrCreatePool(crop, village, threshold);

  if (pool.status !== 'OPEN') return false;

  await updatePoolQuantity(pool.id, quantity);

  const newTotal = pool.total_quantity + quantity;

  if (newTotal >= threshold) {
    await markPoolReady(pool.id);
    await notifyDrivers(crop, village, newTotal);
    return true;
  }

  return false;
}
