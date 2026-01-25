import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema({
  crop: String,
  village: String,
  total_quantity: Number,
  driver_phone: String,
  status: {
    type: String,
    default: 'ASSIGNED'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const Dispatch = mongoose.model('Dispatch', dispatchSchema);

export async function createDispatch(crop, village, quantity, driverPhone) {
  await Dispatch.create({
    crop,
    village,
    total_quantity: quantity,
    driver_phone: driverPhone
  });
}
