import mongoose from 'mongoose';

const produceSchema = new mongoose.Schema({
  farmer_phone: String,
  crop: String,
  quantity: Number,
  address: String,   // Full farm address
  village: String,   // AI extracted village
  ready_date: Date,  // Legacy alias
  readyBy: Date,     // Date when produce is ready for pickup
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', default: null },
  createdAt: { type: Date, default: Date.now }
});

export const Produce = mongoose.model('Produce', produceSchema);

export async function saveProduce(phone, crop, quantity, address, village, readyBy) {
  const doc = await Produce.create({
    farmer_phone: phone,
    crop,
    quantity,
    address,
    village,
    ready_date: readyBy,
    readyBy
  });
  return doc;
}


export async function assignProduceToPool(poolId, village, crop) {
  await Produce.updateMany(
    { village, crop, poolId: null },
    { poolId }
  );
}

/**
 * Calculate degradation percentage for a produce item.
 * 0% = freshly created, 100% = at or past readyBy date.
 * @param {Object} produce - Produce document with createdAt and readyBy.
 * @param {Date} now - Current time.
 * @returns {number} Degradation percentage (0-100).
 */
export function getDegradation(produce, now = new Date()) {
  const createdAt = new Date(produce.createdAt);
  const readyBy = new Date(produce.readyBy || produce.ready_date);

  // If no valid dates, return 0
  if (isNaN(createdAt.getTime()) || isNaN(readyBy.getTime())) {
    return 0;
  }

  const totalWindow = readyBy.getTime() - createdAt.getTime();
  if (totalWindow <= 0) {
    return 100; // Already expired or same day
  }

  const elapsed = now.getTime() - createdAt.getTime();
  const percentage = (elapsed / totalWindow) * 100;

  return Math.min(100, Math.max(0, percentage));
}
