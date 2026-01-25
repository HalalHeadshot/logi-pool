import mongoose from 'mongoose';

const poolSchema = new mongoose.Schema({
  crop: String,
  village: String,
  total_quantity: {
    type: Number,
    default: 0
  },
  threshold: Number,
  status: {
    type: String,
    default: 'OPEN'
  }
});

export const Pool = mongoose.model('Pool', poolSchema);

export async function getOrCreatePool(crop, village, threshold) {
  let pool = await Pool.findOne({ crop, village, status: 'OPEN' });
  if (!pool) {
    pool = await Pool.create({ crop, village, threshold });
  }
  return pool;
}

export async function updatePoolQuantity(poolId, quantity) {
  await Pool.findByIdAndUpdate(poolId, {
    $inc: { total_quantity: quantity }
  });
}

export async function markPoolReady(poolId) {
  await Pool.findByIdAndUpdate(poolId, { status: 'READY' });
}

export async function markPoolAssigned(crop, village) {
  await Pool.updateOne(
    { crop, village, status: 'READY' },
    { status: 'ASSIGNED' }
  );
}
