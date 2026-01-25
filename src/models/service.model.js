import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema({
  type: String,          // PLOUGH, TRACTOR
  owner_phone: String,
  village: String,
  available: {
    type: Boolean,
    default: true
  }
});

export const Service = mongoose.model('Service', serviceSchema);

export async function registerService(type, phone, village) {
  await Service.create({
    type,
    owner_phone: phone,
    village
  });
}

export async function getAvailableService(type, village) {
  return await Service.findOne({
    type,
    village,
    available: true
  });
}

export async function markServiceUnavailable(serviceId) {
  await Service.findByIdAndUpdate(
    serviceId,
    { available: false }
  );
}

export async function markServiceAvailableByOwner(ownerPhone) {
  await Service.updateMany(
    { owner_phone: ownerPhone },
    { available: true }
  );
}
