import { saveProduce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';
import { createDispatch } from '../models/dispatch.model.js';
import { markDriverUnavailable } from '../models/driver.model.js';
import { getTotalQuantity } from '../models/produce.model.js';
import { markPoolAssigned } from '../models/pool.model.js';
import { handleRegister, handleBooking } from '../services/equipment.service.js';
import { handleDone } from '../services/equipment.service.js';


export async function handleSMS(req, res) {
  const message = req.body.Body.trim().toUpperCase();
  const phone = req.body.From;


  // PHASE 2: SERVICE COMPLETED
  if (message === 'DONE') {
    await handleDone(phone);
    return res.send('✅ Service marked as completed');
  }

  // PHASE 2: SERVICE REGISTRATION
  if (message.startsWith('REGISTER')) {
    const [, type, village] = message.split(' ');
    await handleRegister(type, phone, village);
    return res.send('✅ Service registered');
  }

  // PHASE 2: SERVICE BOOKING
  if (message.startsWith('BOOK')) {
    const [, type, village] = message.split(' ');
    const booked = await handleBooking(type, phone, village);

    if (booked) {
      return res.send('🚜 Service booked successfully');
    } else {
      return res.send('❌ No service available');
    }
  }


  // DRIVER ACCEPTS PICKUP
  if (message === 'YES') {
    // For MVP, assume last pool (simple)
    const crop = 'RICE';
    const village = 'KHEDA';
    const quantity = await getTotalQuantity(crop, village);

    await createDispatch(crop, village, quantity, phone);
    await markDriverUnavailable(phone);
    await markPoolAssigned(crop, village);


    return res.send('✅ Pickup assigned to you.');
  }

  // FARMER FLOW
  try {
    const parts = message.split(' ');

    if (parts.length !== 4) {
      return res.send('❌ Format: LOG <CROP> <QTY> <VILLAGE>');
    }

    const [command, crop, qty, village] = parts;
    const quantity = parseInt(qty);

    if (command !== 'LOG' || isNaN(quantity)) {
      return res.send('❌ Invalid command');
    }

    await saveProduce(phone, crop, quantity, village);
    const ready = await processPooling(crop, village, quantity);


    if (ready) {
      res.send('🚚 Pool ready. Drivers notified.');
    } else {
      res.send('✅ Produce logged.');
    }

  } catch (err) {
    console.error(err);
    res.send('❌ Server error');
  }
}
