import { getAvailableDrivers } from '../models/driver.model.js';
import { sendSMS } from './sms.gateway.js';

export async function notifyDrivers(crop, village, quantity, vehicleType = null) {
  const drivers = await getAvailableDrivers(village, vehicleType);

  if (drivers.length === 0) {
    console.log(`❌ No ${vehicleType || 'any'} drivers available`);
    return;
  }
  console.log(`🚛 ${vehicleType || 'All'} Drivers found:`, drivers.length);

  const message = `🚚 Pickup Ready!\nCrop: ${crop}\nQty: ${quantity}\nVillage: ${village}\nTruck: ${vehicleType || 'ANY'}\nReply YES to accept`;

  // Send SMS to all drivers
  const smsPromises = drivers.map(async (driver) => {
    console.log(`📩 Sending SMS to ${driver.phone}...`);
    const result = await sendSMS(driver.phone, message);

    if (!result.success) {
      // Fallback: log if SMS fails
      console.log(`⚠️ SMS failed, message would be:`);
      console.log(message);
    }

    return result;
  });

  const results = await Promise.all(smsPromises);
  const sent = results.filter(r => r.success).length;
  console.log(`📊 Notifications: ${sent}/${drivers.length} SMS sent successfully`);
}

import { Produce } from '../models/produce.model.js';

export async function notifyFarmers(poolId, message) {
  // Find all produce in this pool to get farmer phones
  const produces = await Produce.find({ poolId });
  const uniquePhones = [...new Set(produces.map(p => p.farmer_phone))];

  if (uniquePhones.length === 0) return;

  console.log(`📢 Notifying ${uniquePhones.length} farmers about pool update...`);

  const smsPromises = uniquePhones.map(async (phone) => {
    return await sendSMS(phone, message);
  });

  await Promise.all(smsPromises);
}
