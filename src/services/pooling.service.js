import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady
} from '../models/pool.model.js';

import { notifyDrivers } from './notification.service.js';

export async function processPooling(crop, village, quantity) {
  const pool = await getOrCreatePool(crop, village);

  if (pool.status !== 'OPEN') return false;

  await updatePoolQuantity(pool._id, quantity);

  const updatedPool = await (await import('../models/pool.model.js'))
    .Pool.findById(pool._id);

  const now = new Date();

  const isThresholdMet = updatedPool.total_quantity >= updatedPool.threshold;
  const isExpired = now >= updatedPool.expiresAt;

  if (isThresholdMet || isExpired) {
    await markPoolReady(pool._id);
    await notifyDrivers(crop, village, updatedPool.total_quantity);

    console.log(
      isThresholdMet
        ? `🚚 Threshold met for ${crop} in ${village}`
        : `⏰ Pool expired for ${crop} in ${village}, dispatching partial load`
    );

    return true;
  }

  return false;
}
