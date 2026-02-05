import mongoose from 'mongoose';
import { CROP_CATEGORIES } from '../config/cropCategories.js';
import { CATEGORY_RULES } from '../config/categoryRules.js';

const poolSchema = new mongoose.Schema({
  category: String,
  village: String,
  crops: { type: [String], default: [] },
  total_quantity: { type: Number, default: 0 },
  threshold: Number,
  targetVehicleType: { type: String, enum: ['REGULAR', 'LARGE'], default: 'REGULAR' },
  status: { type: String, default: 'OPEN' }, // OPEN → READY → ASSIGNED → COMPLETED
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

export const Pool = mongoose.model('Pool', poolSchema);


// Get or create an OPEN pool
export async function getOrCreatePool(crop, village, forceNew = false) {
  const category = CROP_CATEGORIES[crop.toUpperCase()];
  const threshold = CATEGORY_RULES[category].threshold;
  const maxWaitHours = CATEGORY_RULES[category].maxWaitHours;

  if (!forceNew) {
    const existing = await Pool.findOne({ category, village, status: 'OPEN' });
    if (existing) return existing;
  }

  return await Pool.create({
    category,
    village,
    crops: [], // ⭐ ensure array exists
    threshold,
    total_quantity: 0,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + maxWaitHours * 60 * 60 * 1000)
  });
}


// Increase pool quantity
export async function updatePoolQuantity(poolId, quantity) {
  await Pool.findByIdAndUpdate(poolId, { $inc: { total_quantity: quantity } });
}


// Add crop type to pool (no duplicates)
export async function addCropToPool(poolId, crop) {
  await Pool.updateOne(
    { _id: poolId },
    { $addToSet: { crops: crop.toUpperCase() } }
  );
}


// Mark pool states
export async function markPoolReady(poolId) {
  await Pool.findByIdAndUpdate(poolId, { status: 'READY' });
}

export async function markPoolAssigned(poolId) {
  await Pool.findByIdAndUpdate(poolId, { status: 'ASSIGNED' });
}

export async function markPoolCompleted(poolId) {
  if (!poolId) return;
  await Pool.findByIdAndUpdate(poolId, { status: 'COMPLETED' });
}


// Fetch READY pool for driver
export async function getReadyPoolForVillage(village) {
  return await Pool.findOne({ village, status: 'READY' }).sort({ expiresAt: 1 });
}
