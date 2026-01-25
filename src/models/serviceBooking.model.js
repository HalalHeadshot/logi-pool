import mongoose from 'mongoose';

const serviceBookingSchema = new mongoose.Schema({
  service_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service'
  },
  farmer_phone: String,
  village: String,
  status: {
    type: String,
    default: 'ACTIVE'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export const ServiceBooking =
  mongoose.model('ServiceBooking', serviceBookingSchema);

export async function createBooking(serviceId, farmerPhone, village) {
  await ServiceBooking.create({
    service_id: serviceId,
    farmer_phone: farmerPhone,
    village
  });
}

export async function completeBookingByOwner(ownerPhone) {
  const services = await mongoose.model('Service')
    .find({ owner_phone: ownerPhone });

  const serviceIds = services.map(s => s._id);

  await ServiceBooking.updateMany(
    {
      service_id: { $in: serviceIds },
      status: 'ACTIVE'
    },
    { status: 'DONE' }
  );
}
