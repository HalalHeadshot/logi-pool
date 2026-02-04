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
export async function handleRegister(type, phone, village, ownerName = 'Owner', address = '', pricePerHour = 0) {
  await registerService(type, phone, village, ownerName, address, pricePerHour);
}

// Book a service (farmer flow) - Simple version for backward compatibility
export async function handleBooking(type, farmerPhone, village) {
  const service = await getAvailableService(type, village);
  if (!service) return false;

  await markServiceUnavailable(service._id);
  await createBooking(service._id, farmerPhone, village);
  return true;
}

// Mark service usage as DONE (owner flow)
export async function handleDone(ownerPhone) {
  await completeBookingByOwner(ownerPhone);
  await markServiceAvailableByOwner(ownerPhone);
}
