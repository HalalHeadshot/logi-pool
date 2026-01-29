import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema({
  category: String,
  crops: [String],
  village: String,
  total_quantity: Number,
  driver_phone: String,
  status: { type: String, default: 'ASSIGNED' },
  createdAt: { type: Date, default: Date.now }
});

export const Dispatch = mongoose.model('Dispatch', dispatchSchema);

export async function createDispatch(category, village, total_quantity, driver_phone, crops) {
  return await Dispatch.create({
    category,
    crops,
    village,
    total_quantity,
    driver_phone
  });
}

export async function completeDispatchByDriver(phone) {
  return await Dispatch.findOneAndUpdate(
    { driver_phone: phone, status: 'ASSIGNED' },
    { status: 'COMPLETED' }
  );
}

