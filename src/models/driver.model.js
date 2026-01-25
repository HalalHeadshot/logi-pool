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
  await Driver.updateOne(
    { phone },
    { available: false }
  );
}
