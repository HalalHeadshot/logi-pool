import {
  getOrCreatePool,
  updatePoolQuantity,
  markPoolReady,
  Pool
} from '../models/pool.model.js';

import { assignProduceToPool, Produce, getDegradation } from '../models/produce.model.js';
import { notifyDrivers, notifyFarmers } from './notification.service.js';
import { TRUCK_CAPACITIES, TRUCK_TYPES, PRIORITY_THRESHOLDS } from '../config/truckConfig.js';

/**
 * Process produce into pool with priority-based truck assignment.
 * @returns {{ poolId: ObjectId, isReady: boolean, vehicleType: string }}
 */
export async function processPooling(crop, village, quantity) {
  const pool = await getOrCreatePool(crop, village);

  // Do not modify pools that are already ready/assigned
  if (pool.status !== 'OPEN') {
    return { poolId: pool._id, isReady: false, vehicleType: pool.targetVehicleType };
  }

  // Add quantity to pool
  await updatePoolQuantity(pool._id, quantity);

  // Link produce entries to this pool
  await assignProduceToPool(pool._id, village, crop);

  // Get all produce in this pool to calculate priority
  const produces = await Produce.find({ poolId: pool._id });
  const updatedPool = await Pool.findById(pool._id);
  const now = new Date();

  // Calculate degradation for each produce item
  const degradations = produces.map(p => ({
    produce: p,
    degradation: getDegradation(p, now)
  }));

  // Check for critical items (>= 90% degradation)
  const hasCritical = degradations.some(d => d.degradation >= PRIORITY_THRESHOLDS.CRITICAL);

  // Calculate average degradation to determine truck type
  const avgDegradation = degradations.length > 0
    ? degradations.reduce((sum, d) => sum + d.degradation, 0) / degradations.length
    : 0;

  // Determine target vehicle type based on priority
  let targetVehicleType = TRUCK_TYPES.LARGE; // Default for bulk/low priority
  let targetCapacity = TRUCK_CAPACITIES.LARGE;

  if (avgDegradation >= PRIORITY_THRESHOLDS.HIGH || hasCritical) {
    targetVehicleType = TRUCK_TYPES.REGULAR;
    targetCapacity = TRUCK_CAPACITIES.REGULAR;
  }

  const isThresholdMet = updatedPool.total_quantity >= targetCapacity;
  const isExpired = now >= updatedPool.expiresAt;

  // Force dispatch for critical items
  if (hasCritical) {
    console.log(`⚠️ FORCE DISPATCH: Critical item detected (>= ${PRIORITY_THRESHOLDS.CRITICAL}% degradation)`);
  }

  if (isThresholdMet || isExpired || hasCritical) {
    // Update pool with target vehicle type
    await Pool.findByIdAndUpdate(pool._id, { targetVehicleType });
    await markPoolReady(pool._id);

    await notifyDrivers(updatedPool.category, village, updatedPool.total_quantity, targetVehicleType);
    await notifyFarmers(pool._id, 'POOL IS FULL, WAITING ON DRIVER..');

    console.log(
      `🚚 Dispatching ${targetVehicleType} pool with crops: ${updatedPool.crops.join(', ')} (Avg Degradation: ${avgDegradation.toFixed(1)}%)`
    );

    return { poolId: pool._id, isReady: true, vehicleType: targetVehicleType };
  }

  return { poolId: pool._id, isReady: false, vehicleType: targetVehicleType };
}
