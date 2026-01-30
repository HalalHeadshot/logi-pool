import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  Pool
} from '../models/pool.model.js';

import { assignProduceToPool } from '../models/produce.model.js';
import { notifyDrivers } from './notification.service.js';

export async function processPooling(crop, village, quantity) {
  const pool = await getOrCreatePool(crop, village);

  // Do not modify pools that are already ready/assigned
  if (pool.status !== 'OPEN') return false;

  // Add quantity to pool
  await updatePoolQuantity(pool._id, quantity);

  // Link produce entries to this pool
  await assignProduceToPool(pool._id, village, crop);

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
