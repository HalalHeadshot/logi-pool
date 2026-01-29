import { saveProduce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';

import { createDispatch } from '../models/dispatch.model.js';
import { markDriverUnavailable, getDriverByPhone } from '../models/driver.model.js';
import { markPoolAssigned, getReadyPoolForVillage } from '../models/pool.model.js';

import { completeDispatchByDriver } from '../models/dispatch.model.js';
import { markDriverAvailable } from '../models/driver.model.js';


import {
  handleRegister,
  handleBooking,
  handleDone
} from '../services/equipment.service.js';

// Normalize phone format
function normalizePhone(phone) {
  if (!phone) return null;
  return '+' + phone.replace(/[\s+]/g, '');
}

export async function handleSMS(req, res) {
  try {
    const message = req.body.Body?.trim().toUpperCase();
    const phone = normalizePhone(req.body.From);

    if (!message || !phone) {
      return res.send('Invalid SMS');
    }

    /* ======================
       PHASE 2: EQUIPMENT
    ====================== */

    if (message.startsWith('REGISTER')) {
      const [, type, village] = message.split(' ');
      if (!type || !village) return res.send('Format: REGISTER <TYPE> <VILLAGE>');

      await handleRegister(type, phone, village);
      return res.send('Service registered successfully');
    }

    if (message.startsWith('BOOK')) {
      const [, type, village] = message.split(' ');
      if (!type || !village) return res.send('Format: BOOK <TYPE> <VILLAGE>');

      const booked = await handleBooking(type, phone, village);
      return res.send(
        booked ? 'Service booked successfully' : 'No service available'
      );
    }

    if (message === 'DONE') {
      // First check if driver has active transport job
      const dispatchCompleted = await completeDispatchByDriver(phone);

      if (dispatchCompleted) {
        await markDriverAvailable(phone);
        return res.send('Transport job completed. You are now available.');
      }

      // Otherwise treat as equipment completion
      await handleDone(phone);
      return res.send('Service marked as completed');
      }


    /* ======================
       PHASE 1: DRIVER ACCEPT
    ====================== */

    if (message === 'YES') {
      const driver = await getDriverByPhone(phone);

      if (!driver) {
        return res.send('Driver not registered');
      }

      if (!driver.available) {
        return res.send('You are already assigned to a pickup');
      }

      const readyPool = await getReadyPoolForVillage(driver.village);

      if (!readyPool) {
        return res.send('No pickup available in your area right now');
      }

      const { category, crops, village, total_quantity, _id } = readyPool;


      await createDispatch(category, village, total_quantity, phone, crops);
      await markPoolAssigned(_id);
      await markDriverUnavailable(phone);
      

      console.log(`🚛 Driver ${phone} assigned to ${crop} in ${village}`);
      return res.send(`Pickup assigned: ${category} load (${total_quantity} qty) in ${village}`);

    }

    /* ======================
       PHASE 1: FARMER LOG
    ====================== */

    const parts = message.split(' ');
    if (parts.length !== 4) {
      return res.send('Format: LOG <CROP> <QTY> <VILLAGE>');
    }

    const [command, crop, qty, village] = parts;
    const quantity = parseInt(qty);

    if (command !== 'LOG' || isNaN(quantity)) {
      return res.send('Invalid command');
    }

    await saveProduce(phone, crop, quantity, village);
    const ready = await processPooling(crop, village, quantity);

    return res.send(
      ready
        ? 'Pool ready. Drivers notified.'
        : 'Produce logged. Waiting for others.'
    );

  } catch (err) {
    console.error('SMS Controller Error:', err);
    res.send('Server error');
  }
}
