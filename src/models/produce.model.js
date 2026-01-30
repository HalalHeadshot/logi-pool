import mongoose from 'mongoose';

const produceSchema = new mongoose.Schema({
  farmer_phone: String,
  crop: String,
  quantity: Number,
  village: String,
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', default: null },
  createdAt: { type: Date, default: Date.now }
});

export const Produce = mongoose.model('Produce', produceSchema);

export async function saveProduce(phone, crop, quantity, village) {
  return await Produce.create({
    farmer_phone: phone,
    crop,
    quantity,
    village
  });
}

export async function assignProduceToPool(poolId, village, crop) {
  await Produce.updateMany(
    { village, crop, poolId: null },
    { poolId }
  );
}
