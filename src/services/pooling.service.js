import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  addCropToPool,
  Pool
} from '../models/pool.model.js';

import { assignProduceToPool } from '../models/produce.model.js';
import { notifyDrivers, notifyFarmers } from './notification.service.js';

/**
 * Dynamic multi-pool allocation
 */
export async function processPooling(crop, village, quantity) {
  let remainingQty = quantity;
  let lastPoolId = null;
  let anyPoolReady = false;

  while (remainingQty > 0) {
    // Step 1: Get or create an OPEN pool
    let pool = await getOrCreatePool(crop, village);

    // Step 2: If pool is not OPEN, force create new one
    if (pool.status !== 'OPEN') {
      pool = await getOrCreatePool(crop, village, true);
    }

    const spaceLeft = pool.threshold - pool.total_quantity;
    const qtyToAdd = Math.min(spaceLeft, remainingQty);

    // Step 3: Add quantity
    await updatePoolQuantity(pool._id, qtyToAdd);

    // Step 4: Track crop in pool
    await addCropToPool(pool._id, crop);

    // Step 5: Assign produce records
    await assignProduceToPool(pool._id, village, crop);

    const updatedPool = await Pool.findById(pool._id);
    lastPoolId = pool._id;

    // Step 6: If pool filled → mark READY
    if (updatedPool.total_quantity >= updatedPool.threshold) {
      await markPoolReady(pool._id);

      await notifyDrivers(
        updatedPool.category,
        village,
        updatedPool.total_quantity
      );

      await notifyFarmers(pool._id, 'POOL IS FULL, WAITING ON DRIVER..');

      console.log(
        `🚚 Pool ${pool._id} READY (${updatedPool.total_quantity}) crops: ${updatedPool.crops.join(', ')}`
      );

      anyPoolReady = true;
    }

    remainingQty -= qtyToAdd;
  }

  return { poolId: lastPoolId, isReady: anyPoolReady };
}
