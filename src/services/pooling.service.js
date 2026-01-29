import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  Pool
} from '../models/pool.model.js';

import { notifyDrivers } from './notification.service.js';

export async function processPooling(crop, village, quantity) {
  const pool = await getOrCreatePool(crop, village);

  if (pool.status !== 'OPEN') return false;

  await updatePoolQuantity(pool._id, quantity);

  const updatedPool = await Pool.findById(pool._id);
  const now = new Date();

  const isThresholdMet = updatedPool.total_quantity >= updatedPool.threshold;
  const isExpired = now >= updatedPool.expiresAt;

  if (isThresholdMet || isExpired) {
    await markPoolReady(pool._id);
    await notifyDrivers(updatedPool.category, village, updatedPool.total_quantity);

    console.log(
      `🚚 Dispatching ${updatedPool.category} pool with crops: ${updatedPool.crops.join(', ')}`
    );

    return true;
  }

  return false;
}
