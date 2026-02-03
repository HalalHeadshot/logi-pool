import { saveProduce, Produce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';
import { extractVillageFromAddress } from '../services/location.service.js';
import { generateGoogleMapsLink } from '../services/maps.service.js';
import { sendSMS } from '../services/sms.gateway.js';

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

// Helper to send SMS reply and return HTTP response
async function sendReply(phone, message, res) {
  await sendSMS(phone, message);
  return res.status(200).json({ status: 'sent', message });
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
      return sendReply(phone,
        'Welcome to Logi-Pool 🚜\n\n' +
        'LOG <CROP> <QTY> | <ADDRESS>\n' +
        'YES - Accept pickup\n' +
        'DONE - Complete job\n' +
        'REGISTER <SERVICE> <VILLAGE>\n' +
        'BOOK <SERVICE> <VILLAGE>',
        res
      );
    }

    // ======================
    // EQUIPMENT MODULE
    // ======================
    if (upperMsg.startsWith('REGISTER')) {
      const [, type, village] = upperMsg.split(' ');
      await handleRegister(type, phone, village);
      return sendReply(phone, 'Service registered successfully', res);
    }

    if (upperMsg.startsWith('BOOK')) {
      const [, type, village] = upperMsg.split(' ');
      const booked = await handleBooking(type, phone, village);
      return sendReply(phone, booked ? 'Service booked successfully' : 'No service available', res);
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

        return sendReply(phone, 'Transport job completed. You are now available.', res);
      }

      await handleDone(phone);
      return sendReply(phone, 'Service marked as completed', res);
    }

    // ======================
    // DRIVER ACCEPTS PICKUP
    // ======================
    if (upperMsg === 'YES') {
      const driver = await getDriverByPhone(phone);
      if (!driver) return sendReply(phone, 'Driver not registered', res);
      if (!driver.available) return sendReply(phone, 'You are already assigned to a pickup', res);

      const readyPool = await getReadyPoolForVillage(driver.village);
      if (!readyPool) return sendReply(phone, 'No pickup available in your area right now', res);

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

      return sendReply(phone,
        `Pickup in ${readyPool.village}\n` +
        `Finish within ${hoursLeft} hrs\n\n` +
        `Stops (priority order):\n${stops.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n` +
        `Navigate: ${mapLink}`,
        res
      );
    }

    // ======================
    // FARMER LOG WITH ADDRESS
    // ======================
    if (upperMsg.startsWith('LOG')) {
      const [left, address] = message.split('|');
      if (!address) return sendReply(phone, 'Format: LOG <CROP> <QTY> | <ADDRESS>', res);

      const parts = left.trim().split(' ');
      if (parts.length !== 3) return sendReply(phone, 'Format: LOG <CROP> <QTY> | <ADDRESS>', res);

      const [, crop, qty] = parts;
      const quantity = parseInt(qty);
      if (isNaN(quantity)) return sendReply(phone, 'Invalid quantity', res);

      const village = await extractVillageFromAddress(address.trim());

      await saveProduce(phone, crop.toUpperCase(), quantity, address.trim(), village);
      const ready = await processPooling(crop.toUpperCase(), village, quantity);

      return sendReply(phone,
        ready
          ? 'Pool ready. Drivers notified.'
          : `Produce logged for ${village}. Waiting for others.`,
        res
      );
    }

    return sendReply(phone, 'Invalid command', res);

  } catch (err) {
    console.error(err);
    await sendSMS(phone, 'Server error');
    res.status(500).json({ error: 'Server error' });
  }
}
