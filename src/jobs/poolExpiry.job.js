import { Pool, markPoolReady } from '../models/pool.model.js';
import { notifyDrivers } from '../services/notification.service.js';

export async function checkExpiredPools() {
  try {
    const now = new Date();

    const expiredPools = await Pool.find({
      status: 'OPEN',
      expiresAt: { $lte: now }
    });

    for (const pool of expiredPools) {
      console.log(`⏰ Expired pool found: ${pool.category} in ${pool.village}`);

      await markPoolReady(pool._id);
      await notifyDrivers(pool.category, pool.village, pool.total_quantity);

      console.log(`🚚 Auto-dispatched expired pool ${pool._id}`);
    }

  } catch (err) {
    console.error('Pool expiry job error:', err);
  }
}
