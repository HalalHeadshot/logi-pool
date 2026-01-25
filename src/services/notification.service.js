import { getAvailableDrivers } from '../models/driver.model.js';

export async function notifyDrivers(crop, village, quantity) {
  const drivers = await getAvailableDrivers(village);

  if (drivers.length === 0) {
    console.log('❌ No drivers available');
    return;
  }
  console.log('Drivers found:', drivers);


  drivers.forEach(driver => {
    const message =
      `🚚 Pickup Ready!\nCrop: ${crop}\nQty: ${quantity}\nVillage: ${village}\nReply YES to accept`;

    // Simulated SMS
    console.log(`📩 SMS to ${driver.phone}:`);
    console.log(message);
  });
}
