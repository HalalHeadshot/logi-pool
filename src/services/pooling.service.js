import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  addCropToPool,
  Pool
} from '../models/pool.model.js';

import { assignProduceToPool, Produce, getDegradation } from '../models/produce.model.js';
import { notifyDrivers, notifyFarmers } from './notification.service.js';
import { TRUCK_CAPACITIES, TRUCK_TYPES, PRIORITY_THRESHOLDS } from '../config/truckConfig.js';

/**
<<<<<<< HEAD
 * Process produce into pool with priority-based truck assignment.
 * @returns {{ poolId: ObjectId, isReady: boolean, vehicleType: string }}
=======
 * Dynamic multi-pool allocation
>>>>>>> 86b94cf14a8d1d6b76867ab876d9387f9b3ed357
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

    // --- PRIORITY LOGIC START ---
    // Link produce first to calculate priority (Note: this currently links ALL unassigned produce)
    await assignProduceToPool(pool._id, village, crop);

    const produces = await Produce.find({ poolId: pool._id });
    const now = new Date();

    const degradations = produces.map(p => ({
      produce: p,
      degradation: getDegradation(p, now)
    }));

    const hasCritical = degradations.some(d => d.degradation >= PRIORITY_THRESHOLDS.CRITICAL);
    const avgDegradation = degradations.length > 0
      ? degradations.reduce((sum, d) => sum + d.degradation, 0) / degradations.length
      : 0;

    let targetVehicleType = TRUCK_TYPES.LARGE;
    let targetCapacity = TRUCK_CAPACITIES.LARGE;

    if (avgDegradation >= PRIORITY_THRESHOLDS.HIGH || hasCritical) {
      targetVehicleType = TRUCK_TYPES.REGULAR;
      targetCapacity = TRUCK_CAPACITIES.REGULAR;
    }
    // --- PRIORITY LOGIC END ---

    // Calculate space based on DYNAMIC capacity
    const spaceLeft = targetCapacity - pool.total_quantity;
    const qtyToAdd = Math.min(spaceLeft, remainingQty);

    if (qtyToAdd <= 0 && spaceLeft <= 0) {
      // Pool is full (due to capacity shrink). Mark ready and continue.
      // We need to ensure we don't infinite loop if new pool also full (unlikely if forceNew=true works)
    } else {
      // Step 3: Add quantity
      await updatePoolQuantity(pool._id, qtyToAdd);

      // Step 4: Track crop in pool
      await addCropToPool(pool._id, crop);

      remainingQty -= qtyToAdd;
    }

    const updatedPool = await Pool.findById(pool._id);
    lastPoolId = pool._id;

    // Log priority info
    if (hasCritical) console.log(`⚠️ Critical item detected (>= ${PRIORITY_THRESHOLDS.CRITICAL}% degradation)`);

    // Step 6: If pool filled or critical → mark READY
    const isThresholdMet = updatedPool.total_quantity >= targetCapacity;
    const isExpired = now >= updatedPool.expiresAt;

    if (isThresholdMet || isExpired || hasCritical) {
      await Pool.findByIdAndUpdate(pool._id, { targetVehicleType });
      await markPoolReady(pool._id);

      await notifyDrivers(
        updatedPool.category,
        village,
        updatedPool.total_quantity,
        targetVehicleType
      );

      await notifyFarmers(pool._id, 'POOL IS FULL, WAITING ON DRIVER..');

      console.log(
        `🚚 Pool ${pool._id} READY (${updatedPool.total_quantity}) Type: ${targetVehicleType} (Avg Deg: ${avgDegradation.toFixed(1)}%)`
      );

      anyPoolReady = true;
    }

    // Safety break if no progress to prevent infinite loop
    if (qtyToAdd <= 0 && !isThresholdMet && !hasCritical) {
      // Should not happen if getOrCreatePool works, but good safety
      break;
    }
  }

  return { poolId: lastPoolId, isReady: anyPoolReady, vehicleType: 'VARIES' };
}
