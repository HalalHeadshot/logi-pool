import { saveProduce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';

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
    console.log('📨 Incoming SMS webhook:', JSON.stringify(req.body, null, 2));

    // Support multiple SMS gateway formats:
    // TextBee: { sender: "+91...", message: "..." } or { data: { sender, message } }
    // httpSMS CloudEvents: { data: { content: "...", from: "..." } }
    // Twilio: { Body: "...", From: "..." }

    const data = req.body?.data || req.body;

    const rawMessage = data?.message || data?.content || data?.text || data?.body || data?.Body || req.body?.Body;
    const rawPhone = data?.sender || data?.from || data?.contact || data?.From || req.body?.From;

    console.log('📋 Extracted:', { message: rawMessage?.substring(0, 50), phone: rawPhone });

    const message = rawMessage?.trim().toUpperCase();
    const phone = normalizePhone(rawPhone);

    if (!message || !phone) {
      console.log('❌ Invalid SMS - missing message or phone');
      return res.status(200).json({ status: 'received', error: 'Invalid SMS' });
    }

    console.log(`✅ Processing SMS: "${message}" from ${phone}`);

    // Equipment registration
    if (message.startsWith('REGISTER')) {
      const [, type, village] = message.split(' ');
      await handleRegister(type, phone, village);
      return res.send('Service registered successfully');
    }

    // Equipment booking
    if (message.startsWith('BOOK')) {
      const [, type, village] = message.split(' ');
      const booked = await handleBooking(type, phone, village);
      return res.send(booked ? 'Service booked successfully' : 'No service available');
    }

    // DONE (transport or equipment)
    if (message === 'DONE') {
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

    // Driver accepts job
    if (message === 'YES') {
      const driver = await getDriverByPhone(phone);
      if (!driver) return res.send('Driver not registered');
      if (!driver.available) return res.send('You are already assigned to a pickup');

      const readyPool = await getReadyPoolForVillage(driver.village);
      if (!readyPool) return res.send('No pickup available in your area right now');

      const { category, crops, village, total_quantity, _id } = readyPool;

      await createDispatch(category, village, total_quantity, phone, crops, _id);
      await markDriverUnavailable(phone);
      await markPoolAssigned(_id);

      return res.send(`Pickup assigned: ${category} load (${total_quantity} qty) in ${village}`);
    }

    // Farmer logs produce
    const parts = message.split(' ');
    if (parts.length !== 4) return res.send('Format: LOG <CROP> <QTY> <VILLAGE>');

    const [command, crop, qty, village] = parts;
    const quantity = parseInt(qty);
    if (command !== 'LOG' || isNaN(quantity)) return res.send('Invalid command');

    await saveProduce(phone, crop, quantity, village);
    const ready = await processPooling(crop, village, quantity);

    return res.send(ready ? 'Pool ready. Drivers notified.' : 'Produce logged. Waiting for others.');

  } catch (err) {
    console.error(err);
    res.send('Server error');
  }
}
