import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  addCropToPool,
  addContributionToPool,
  Pool
} from '../models/pool.model.js';

import { assignProduceToPool, Produce, getDegradation } from '../models/produce.model.js';
import { notifyDrivers, notifyFarmers } from './notification.service.js';
import { TRUCK_CAPACITIES, TRUCK_TYPES, PRIORITY_THRESHOLDS } from '../config/truckConfig.js';

/**
 * Process produce into pool with priority-based truck assignment.
 * Supports dynamic multi-pool allocation.
 * @returns {{ poolId: ObjectId, isReady: boolean, vehicleType: string }}
 */
export async function processPooling(crop, village, quantity, farmerPhone) {
  let remainingQty = quantity;
  let lastPoolId = null;
  let anyPoolReady = false;

  try {
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

        // Step 5: Track contribution
        // Find specific produce doc to link (this is a simplified logic, ideally we pass the exact produceId)
        // For now, we link the contribution. Ideally assignProduceToPool should return the IDs.
        // We'll rely on the fact that assignProduceToPool just ran.
        // But to be precise in 'contributions' array, we might want the exact produce ID.
        // For this task, user emphasized "who logged", so phone is critical.
        // We will try to find the produce for this farmer in this pool effectively.
        const recentProduce = await Produce.findOne({
          farmer_phone: farmerPhone,
          poolId: pool._id,
          crop: crop
        }).sort({ createdAt: -1 });

        await addContributionToPool(pool._id, farmerPhone, recentProduce?._id, qtyToAdd);

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
  } catch (error) {
    console.error(`❌ Pooling error: ${error.message}`);
    throw error;
  }
}
