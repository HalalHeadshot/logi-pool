import { Pool } from '../models/pool.model.js';
import { notifyDrivers } from '../services/notification.service.js';

export async function checkExpiredPools() {
  const now = new Date();

  const expiredPools = await Pool.find({
    status: 'OPEN',
    expiresAt: { $lte: now }
  });

  for (const pool of expiredPools) {
    await Pool.findByIdAndUpdate(pool._id, { status: 'READY' });
    await notifyDrivers(pool.crop, pool.village, pool.total_quantity);

    console.log(`⏰ Auto-dispatching expired pool: ${pool.crop} from ${pool.village}`);
  }
}
