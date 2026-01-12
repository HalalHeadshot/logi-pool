import {
  registerService,
  getAvailableService,
  markServiceUnavailable,
  markServiceAvailableByOwner
} from '../models/service.model.js';

import {
  createBooking,
  completeBookingByOwner
} from '../models/serviceBooking.model.js';

// Register a service (owner flow)
export async function handleRegister(type, phone, village) {
  await registerService(type, phone, village);
}

// Book a service (farmer flow)
export async function handleBooking(type, farmerPhone, village) {
  const service = await getAvailableService(type, village);
  if (!service) return false;

  await markServiceUnavailable(service.id);
  await createBooking(service.id, farmerPhone, village);
  return true;
}

// Mark service usage as DONE (owner flow)
export async function handleDone(ownerPhone) {
  await completeBookingByOwner(ownerPhone);
  await markServiceAvailableByOwner(ownerPhone);
}
