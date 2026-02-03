import mongoose from 'mongoose';

const dispatchSchema = new mongoose.Schema({
  category: String,
  crops: [String],
  village: String,
  total_quantity: Number,
  driver_phone: String,
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool' }, // IMPORTANT
  status: { type: String, default: 'ASSIGNED' },
  createdAt: { type: Date, default: Date.now }
});

export const Dispatch = mongoose.model('Dispatch', dispatchSchema);

export async function createDispatch(category, village, total_quantity, driver_phone, crops, poolId) {
  return await Dispatch.create({
    category,
    crops,
    village,
    total_quantity,
    driver_phone,
    poolId, // MUST be saved
    status: 'ASSIGNED'
  });
}

export async function completeDispatchByDriver(phone) {
  console.log('🔍 completeDispatchByDriver called with phone:', phone);
  const query = { driver_phone: phone, status: 'ASSIGNED' };
  console.log('🔍 Query:', JSON.stringify(query));

  const result = await Dispatch.findOneAndUpdate(
    query,
    { status: 'COMPLETED' },
    { new: true }
  );

  console.log('🔍 Update result:', result ? `✅ Updated dispatch ${result._id}` : '❌ No dispatch found');
  return result;
}
