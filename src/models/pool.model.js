import mongoose from 'mongoose';
import { CROP_CATEGORIES } from '../config/cropCategories.js';
import { CATEGORY_RULES } from '../config/categoryRules.js';

const poolSchema = new mongoose.Schema({
  crop: String,
  village: String,
  total_quantity: { type: Number, default: 0 },
  threshold: Number,
  status: { type: String, default: 'OPEN' },
  createdAt: { type: Date, default: Date.now },
  expiresAt: Date
});

export const Pool = mongoose.model('Pool', poolSchema);

export async function getOrCreatePool(crop, village) {
  let pool = await Pool.findOne({ crop, village, status: 'OPEN' });

  if (!pool) {
    const category = CROP_CATEGORIES[crop] || 'VEGETABLE';
    const rule = CATEGORY_RULES[category];

    const expires = new Date(Date.now() + rule.maxWaitHours * 60 * 60 * 1000);

    pool = await Pool.create({
      crop,
      village,
      threshold: rule.threshold,
      expiresAt: expires
    });
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
