import mongoose from 'mongoose';

const produceSchema = new mongoose.Schema({
  phone: String,
  crop: String,
  quantity: Number,
  village: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Produce = mongoose.model('Produce', produceSchema);

export async function saveProduce(phone, crop, quantity, village) {
  await Produce.create({ phone, crop, quantity, village });
}
