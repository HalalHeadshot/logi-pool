import mongoose from 'mongoose';
import { CROP_CATEGORIES } from '../config/cropCategories.js';
import { CATEGORY_RULES } from '../config/categoryRules.js';

const poolSchema = new mongoose.Schema({
  category: String,
  village: String,
  crops: [String],
  total_quantity: { type: Number, default: 0 },
  threshold: Number,
  status: { type: String, default: 'OPEN' }, // OPEN → READY → ASSIGNED → COMPLETED
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

export const Pool = mongoose.model('Pool', poolSchema);

export async function getOrCreatePool(crop, village) {
  const category = CROP_CATEGORIES[crop] || 'VEGETABLE';
  const rule = CATEGORY_RULES[category];

  let pool = await Pool.findOne({ category, village, status: 'OPEN' });

  if (!pool) {
    const expires = new Date(Date.now() + rule.maxWaitHours * 60 * 60 * 1000);

    pool = await Pool.create({
      category,
      village,
      crops: [crop],
      threshold: rule.threshold,
      expiresAt: expires
    });
  } else {
    if (!pool.crops.includes(crop)) {
      pool.crops.push(crop);
      await pool.save();
    }
  }

  return pool;
}

export async function updatePoolQuantity(poolId, quantity) {
  await Pool.findByIdAndUpdate(poolId, { $inc: { total_quantity: quantity } });
}

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

export async function getReadyPoolForVillage(village) {
  return await Pool.findOne({ village, status: 'READY' }).sort({ expiresAt: 1 });
}
