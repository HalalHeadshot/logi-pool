import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  village: String,
  vehicleType: {
    type: String,
    enum: ['REGULAR', 'LARGE'],
    default: 'REGULAR'
  },
  available: {
    type: Boolean,
    default: true
  }
});

export const Driver = mongoose.model('Driver', driverSchema);

// Get driver by phone
export async function getDriverByPhone(phone) {
  const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
  return await Driver.findOne({ phone: normalizedPhone });
}

// Get all available drivers in a village, optionally filtered by vehicle type
export async function getAvailableDrivers(village, vehicleType = null) {
  const query = { village, available: true };
  if (vehicleType) {
    query.vehicleType = vehicleType;
  }
  return await Driver.find(query);
}

export async function markDriverAvailable(phone) {
  const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
  await Driver.updateOne({ phone: normalizedPhone }, { available: true });
}


// Mark driver unavailable after assignment
export async function markDriverUnavailable(phone) {
  const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');

  const result = await Driver.updateOne(
    { phone: normalizedPhone },
    { available: false }
  );

  console.log(
    `📋 Driver ${normalizedPhone} marked unavailable:`,
    result.modifiedCount > 0 ? '✅' : '❌ not found'
  );

  return result;
}
