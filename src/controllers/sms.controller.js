import { saveProduce, Produce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';
import { extractVillageFromAddress } from '../services/location.service.js';
import { generateGoogleMapsLink } from '../services/maps.service.js';

import {
  createDispatch,
  completeDispatchByDriver
} from '../models/dispatch.model.js';

import {
  markDriverUnavailable,
  markDriverAvailable,
  getDriverByPhone
} from '../models/driver.model.js';

import {
  markPoolAssigned,
  markPoolCompleted,
  getReadyPoolForVillage
} from '../models/pool.model.js';

import {
  handleRegister,
  handleBooking,
  handleDone
} from '../services/equipment.service.js';

import { createJourneyForCompletedDispatch } from '../services/journey.service.js';

function normalizePhone(phone) {
  if (!phone) return null;
  return '+' + phone.replace(/[\s+]/g, '');
}

export async function handleSMS(req, res) {
  try {
    const data = req.body?.data || req.body;
    const rawMessage =
      data?.message || data?.content || data?.text || data?.body || data?.Body || req.body?.Body;
    const rawPhone =
      data?.sender || data?.from || data?.contact || data?.From || req.body?.From;

    const message = rawMessage?.trim();
    const phone = normalizePhone(rawPhone);

    if (!message || !phone) {
      return res.status(200).json({ status: 'received', error: 'Invalid SMS' });
    }

    const upperMsg = message.toUpperCase();
    console.log(`📩 SMS from ${phone}: ${upperMsg}`);

    // ======================
    // HELP MENU
    // ======================
    if (upperMsg === 'HELP' || upperMsg === 'MENU') {
      return res.send(
        'Welcome to Logi-Pool 🚜\n\n' +
        'LOG <CROP> <QTY> | <ADDRESS>\n' +
        'YES - Accept pickup\n' +
        'DONE - Complete job\n' +
        'REGISTER <SERVICE> <VILLAGE>\n' +
        'BOOK <SERVICE> <VILLAGE>'
      );
    }

    // ======================
    // EQUIPMENT MODULE
    // ======================
    if (upperMsg.startsWith('REGISTER')) {
      const [, type, village] = upperMsg.split(' ');
      await handleRegister(type, phone, village);
      return res.send('Service registered successfully');
    }

    if (upperMsg.startsWith('BOOK')) {
      const [, type, village] = upperMsg.split(' ');
      const booked = await handleBooking(type, phone, village);
      return res.send(booked ? 'Service booked successfully' : 'No service available');
    }

    // ======================
    // DRIVER COMPLETION
    // ======================
    if (upperMsg === 'DONE') {
      const dispatch = await completeDispatchByDriver(phone);

      if (dispatch) {
        await markDriverAvailable(phone);
        await markPoolCompleted(dispatch.poolId);

        try {
          await createJourneyForCompletedDispatch(dispatch);
        } catch (err) {
          console.error('Journey record failed:', err);
        }

        return res.send('Transport job completed. You are now available.');
      }

      await handleDone(phone);
      return res.send('Service marked as completed');
    }

    // ======================
    // DRIVER ACCEPTS PICKUP
    // ======================
    if (upperMsg === 'YES') {
      const driver = await getDriverByPhone(phone);
      if (!driver) return res.send('Driver not registered');
      if (!driver.available) return res.send('You are already assigned to a pickup');

      const readyPool = await getReadyPoolForVillage(driver.village);
      if (!readyPool) return res.send('No pickup available in your area right now');

      // Fetch produce stops and sort by oldest produce first (priority)
      const produces = await Produce.find({ poolId: readyPool._id }).sort({ createdAt: 1 });
      const stops = produces.map(p => p.address);

      const hoursLeft = Math.max(
        0,
        Math.round((new Date(readyPool.expiresAt) - new Date()) / (1000 * 60 * 60))
      );

      const mapLink = generateGoogleMapsLink(stops);

      await createDispatch(
        readyPool.category,
        readyPool.village,
        readyPool.total_quantity,
        phone,
        readyPool.crops,
        readyPool._id
      );

      await markDriverUnavailable(phone);
      await markPoolAssigned(readyPool._id);

      return res.send(
        `Pickup in ${readyPool.village}\n` +
        `Finish within ${hoursLeft} hrs\n\n` +
        `Stops (priority order):\n${stops.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
        `Navigate: ${mapLink}`
      );
    }

    // ======================
    // FARMER LOG WITH ADDRESS
    // ======================
    if (upperMsg.startsWith('LOG')) {
      const [left, address] = message.split('|');
      if (!address) return res.send('Format: LOG <CROP> <QTY> | <ADDRESS>');

      const parts = left.trim().split(' ');
      if (parts.length !== 3) return res.send('Format: LOG <CROP> <QTY> | <ADDRESS>');

      const [, crop, qty] = parts;
      const quantity = parseInt(qty);
      if (isNaN(quantity)) return res.send('Invalid quantity');

      const village = await extractVillageFromAddress(address.trim());

      await saveProduce(phone, crop.toUpperCase(), quantity, address.trim(), village);
      const ready = await processPooling(crop.toUpperCase(), village, quantity);

      return res.send(
        ready
          ? 'Pool ready. Drivers notified.'
          : `Produce logged for ${village}. Waiting for others.`
      );
    }

    return res.send('Invalid command');

  } catch (err) {
    console.error(err);
    res.send('Server error');
  }
}
