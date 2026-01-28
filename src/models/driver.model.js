import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  village: String,
  available: {
    type: Boolean,
    default: true
  }
});

export const Driver = mongoose.model('Driver', driverSchema);

export async function getAvailableDrivers(village) {
  return await Driver.find({ village, available: true });
}

export async function markDriverUnavailable(phone) {
  // Normalize phone - remove spaces and ensure + prefix
  const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');

  const result = await Driver.updateOne(
    { phone: normalizedPhone },
    { available: false }
  );

  console.log(`📋 Driver ${normalizedPhone} marked unavailable:`, result.modifiedCount > 0 ? '✅' : '❌ not found');
  return result;
}
