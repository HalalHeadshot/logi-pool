import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  Pool
} from '../models/pool.model.js';

import { assignProduceToPool } from '../models/produce.model.js';
import { notifyDrivers, notifyFarmers } from './notification.service.js';

/**
 * Process produce into pool. Returns { poolId, isReady }.
 * @returns {{ poolId: ObjectId, isReady: boolean }}
 */
export async function processPooling(crop, village, quantity) {
  const pool = await getOrCreatePool(crop, village);

  // Do not modify pools that are already ready/assigned
  if (pool.status !== 'OPEN') {
    return { poolId: pool._id, isReady: false };
  }

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
    await notifyFarmers(pool._id, 'POOL IS FULL, WAITING ON DRIVER..');

    console.log(
      `🚚 Dispatching ${updatedPool.category} pool with crops: ${updatedPool.crops.join(', ')}`
    );

    return { poolId: pool._id, isReady: true };
  }

  return { poolId: pool._id, isReady: false };
}
