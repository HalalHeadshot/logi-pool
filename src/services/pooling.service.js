import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady
} from '../models/pool.model.js';

import { notifyDrivers } from './notification.service.js';
import { CROP_THRESHOLDS } from '../config/thresholds.js';

export async function processPooling(crop, village, quantity) {
  const threshold = CROP_THRESHOLDS[crop] || 10;

  const pool = await getOrCreatePool(crop, village, threshold);

  if (pool.status !== 'OPEN') return false;

  await updatePoolQuantity(pool._id, quantity);

  const updatedTotal = pool.total_quantity + quantity;

  if (updatedTotal >= threshold) {
    await markPoolReady(pool._id);
    await notifyDrivers(crop, village, updatedTotal);
    return true;
  }

  return false;
}
