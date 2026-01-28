import { saveProduce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';

import { createDispatch } from '../models/dispatch.model.js';
import { markDriverUnavailable } from '../models/driver.model.js';
import { markPoolAssigned, getFirstReadyPool } from '../models/pool.model.js';

import {
  handleRegister,
  handleBooking,
  handleDone
} from '../services/equipment.service.js';

export async function handleSMS(req, res) {
  try {
    const message = req.body.Body?.trim().toUpperCase();
    const phone = req.body.From;

    if (!message || !phone) {
      return res.send('Invalid SMS');
    }

    /* ======================
       PHASE 2: EQUIPMENT
    ====================== */

    if (message.startsWith('REGISTER')) {
      const [, type, village] = message.split(' ');
      await handleRegister(type, phone, village);
      return res.send('Service registered successfully');
    }

    if (message.startsWith('BOOK')) {
      const [, type, village] = message.split(' ');
      const booked = await handleBooking(type, phone, village);
      return res.send(
        booked ? 'Service booked successfully' : 'No service available'
      );
    }

    if (message === 'DONE') {
      await handleDone(phone);
      return res.send('Service marked as completed');
    }

    /* ======================
       PHASE 1: DRIVER ACCEPT
    ====================== */

    if (message === 'YES') {
      // Find the first READY pool
      const readyPool = await getFirstReadyPool();

      if (!readyPool) {
        return res.send('No pickup available right now');
      }

      const { crop, village, total_quantity } = readyPool;

      await createDispatch(crop, village, total_quantity, phone);
      await markDriverUnavailable(phone);
      await markPoolAssigned(crop, village);

      console.log(`🚛 Driver ${phone} assigned to ${crop} in ${village}`);
      return res.send(`Pickup assigned: ${crop} (${total_quantity} qty) in ${village}`);
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
    console.error(err);
    res.send('Server error');
  }
}
