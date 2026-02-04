import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['TRACTOR', 'PLOUGH', 'LABOUR', 'WAREHOUSE'],
    required: true
  },
  owner_name: String,
  owner_phone: String,  // Keep for backward compatibility
  phone: String,        // New field from Shared Plough
  location: {
    address: String,    // Full address entered by owner
    village: String     // Extracted village name (uppercase)
  },
  village: String,      // Keep for backward compatibility
  price_per_hour: {
    type: Number,
    default: 0
  },
  available: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

export const Service = mongoose.model('Service', serviceSchema);

// Register a new service (equipment)
export async function registerService(type, phone, village, ownerName = 'Owner', address = '', pricePerHour = 0) {
  const service = await Service.create({
    type: type.toUpperCase(),
    owner_name: ownerName,
    owner_phone: phone,
    phone: phone,
    location: {
      address: address || village,
      village: village.toUpperCase()
    },
    village: village.toUpperCase(),
    price_per_hour: pricePerHour
  });
  return service;
}

// Get available service by type and village
export async function getAvailableService(type, village) {
  const villageUpper = village.toUpperCase();
  return await Service.findOne({
    type: type.toUpperCase(),
    $or: [
      { village: new RegExp(`^${villageUpper}$`, 'i') },
      { 'location.village': new RegExp(`^${villageUpper}$`, 'i') }
    ],
    available: true
  });
}

// Get all available services in a village
export async function getAvailableServicesInVillage(village) {
  const villageUpper = village.toUpperCase();
  return await Service.find({
    $or: [
      { village: new RegExp(`^${villageUpper}$`, 'i') },
      { 'location.village': new RegExp(`^${villageUpper}$`, 'i') }
    ],
    available: true
  });
}

// Get services by owner phone
export async function getServicesByPhone(phone) {
  return await Service.find({
    $or: [
      { phone: phone },
      { owner_phone: phone }
    ]
  });
}

// Mark service as unavailable
export async function markServiceUnavailable(serviceId) {
  await Service.findByIdAndUpdate(serviceId, { available: false });
}

// Mark service as available
export async function markServiceAvailable(serviceId) {
  await Service.findByIdAndUpdate(serviceId, { available: true });
}

// Mark all services by owner as available
export async function markServiceAvailableByOwner(ownerPhone) {
  await Service.updateMany(
    { $or: [{ owner_phone: ownerPhone }, { phone: ownerPhone }] },
    { available: true }
  );
}
