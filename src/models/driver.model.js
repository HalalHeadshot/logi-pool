import mongoose from 'mongoose';

const driverSchema = new mongoose.Schema({
  name: String,
  phone: String,
  village: String,
  address: String,
  aadhar: { type: String, unique: true, sparse: true },
  vehicleType: {
    type: String,
    enum: ['REGULAR', 'LARGE'],
    default: 'REGULAR'
  },
  available: {
    type: Boolean,
    default: true
  },
  truckId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    default: null  // Links to registered truck (Service with type=TRUCK)
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

// Create a new driver
export async function createDriver(phone, name, address, village, aadhar, vehicleType) {
  const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
  return await Driver.create({
    phone: normalizedPhone,
    name,
    address,
    village,
    aadhar,
    vehicleType,
    available: true
  });
}

// Create or update a driver (used when registering TRUCK)
export async function createOrUpdateDriver(phone, name, village, vehicleType = 'REGULAR') {
  const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');

  const driver = await Driver.findOneAndUpdate(
    { phone: normalizedPhone },
    {
      $set: {
        name: name,
        village: village.toUpperCase(),
        vehicleType: vehicleType
      },
      $setOnInsert: {
        phone: normalizedPhone,
        available: true
      }
    },
    { upsert: true, new: true }
  );

  console.log(`👨✈️ Driver ${normalizedPhone} created/updated: ${name} in ${village}`);
  return driver;
}
