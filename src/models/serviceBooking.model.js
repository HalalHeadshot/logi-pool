import mongoose from 'mongoose';

const serviceBookingSchema = new mongoose.Schema({
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  farmer_phone: String,
  farmer_address: String,   // Full address entered by farmer
  farmer_village: String,   // Extracted village name
  village: String,          // Keep for backward compatibility
  start_time: Date,
  end_time: Date,
  booking_created_at: {
    type: Date,
    default: Date.now
  },
  original_price: {
    type: Number,
    default: 0
  },
  discount_percentage: {
    type: Number,
    default: 0
  },
  discount_amount: {
    type: Number,
    default: 0
  },
  final_price: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'RESERVED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'DONE'],
    default: 'CONFIRMED'
  }
}, { timestamps: true });

export const ServiceBooking = mongoose.model('ServiceBooking', serviceBookingSchema);

// Create a new booking with time-based pricing
export async function createBooking(serviceId, farmerPhone, village, farmerAddress = '', startTime = null, endTime = null, originalPrice = 0, finalPrice = 0) {
  const booking = await ServiceBooking.create({
    service_id: serviceId,
    farmer_phone: farmerPhone,
    farmer_address: farmerAddress || village,
    farmer_village: village,
    village: village,
    start_time: startTime || new Date(),
    end_time: endTime,
    original_price: originalPrice,
    final_price: finalPrice,
    status: 'CONFIRMED'
  });
  return booking;
}

// Get bookings by farmer phone
export async function getBookingsByFarmerPhone(phone, limit = 5) {
  return await ServiceBooking.find({ farmer_phone: phone })
    .populate('service_id')
    .sort({ createdAt: -1 })
    .limit(limit);
}

// Get busy service IDs (services with active bookings that overlap with given time)
export async function getBusyServiceIds(startTime) {
  return await ServiceBooking.distinct('service_id', {
    status: 'CONFIRMED',
    end_time: { $gt: startTime }
  });
}

// Complete booking by owner phone
export async function completeBookingByOwner(ownerPhone) {
  const Service = mongoose.model('Service');
  const services = await Service.find({
    $or: [{ owner_phone: ownerPhone }, { phone: ownerPhone }]
  });

  const serviceIds = services.map(s => s._id);

  await ServiceBooking.updateMany(
    {
      service_id: { $in: serviceIds },
      status: { $in: ['ACTIVE', 'CONFIRMED'] }
    },
    { status: 'COMPLETED' }
  );
}

// Find and complete expired bookings
export async function findAndCompleteExpiredBookings() {
  const now = new Date();

  const expiredBookings = await ServiceBooking.find({
    end_time: { $lte: now },
    status: 'CONFIRMED'
  });

  return expiredBookings;
}
