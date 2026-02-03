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
  getDriverByPhone,
  Driver
} from '../models/driver.model.js';

import {
  markPoolAssigned,
  markPoolCompleted,
  getReadyPoolForVillage,
  Pool
} from '../models/pool.model.js';

import {
  getFarmerByPhone,
  createOrUpdateFarmer,
  Farmer
} from '../models/farmer.model.js';

import { notifyFarmers } from '../services/notification.service.js';

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
    // START COMMAND
    // ======================
    if (upperMsg === 'START') {
      const driver = await getDriverByPhone(phone);
      if (driver) {
        return sendReply(phone,
          '👨‍✈️ DRIVER MENU:\n' +
          'AVAILABLE - Mark availability\n' +
          'UNAVAILABLE - Mark unavailable\n' +
          'ROUTES - View routes\n' +
          'ROUTEDETAILS [ID] - View Details\n' +
          'YES [ID] - Accept Route\n' +
          'DONE - Finish Job',
          res
        );
      }
      const farmer = await getFarmerByPhone(phone);
      if (farmer) {
        return sendReply(phone,
          '👨‍🌾 FARMER MENU:\n' +
          'ADDRESS <Addr> - Set Address\n' +
          'LOG <Crop> <Qty> <Date> - Log Produce\n' +
          'HELP - Show this menu',
          res
        );
      }
      return sendReply(phone,
        'Welcome to Logi-Pool!\nAre you a Driver or Farmer?\n(Contact Admin to register)',
        res
      );
    }

    // ======================
    // DRIVER COMMANDS
    // ======================
    const driver = await getDriverByPhone(phone);
    if (driver) {
      if (upperMsg === 'AVAILABLE') {
        await markDriverAvailable(phone);
        return sendReply(phone, 'You are now marked AVAILABLE.', res);
      }
      if (upperMsg === 'UNAVAILABLE') {
        await markDriverUnavailable(phone);
        return sendReply(phone, 'You are now marked UNAVAILABLE.', res);
      }
      if (upperMsg === 'ROUTES') {
        const villageUpper = (driver.village || '').toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pools = await Pool.find({ village: new RegExp(`^${villageUpper}$`, 'i'), status: 'READY' });
        if (pools.length === 0) return sendReply(phone, 'No routes available in your area.', res);

        let response = '-------------------------------------------------\n';
        for (const pool of pools) {
          // Hardcoded ETA for now as requested
          const etaPickup = '10:00 AM';
          const etaWarehouse = '02:00 PM';

          // Fetch first and last address for display
          const produces = await Produce.find({ poolId: pool._id }).sort({ createdAt: 1 });
          if (produces.length === 0) continue;

          const pickup1 = produces[0].address;
          const lastPickup = produces[produces.length - 1].address;

          response += `RouteId : ${pool._id}\n`;
          response += `${pickup1} -> ... -> ${lastPickup} -> Warehouse\n`;
          response += `Date of pickups : ${new Date().toLocaleDateString()}\n`;
          response += `Expected time of arrival at pickup 1 : ${etaPickup}\n`;
          response += `Expected time of arrival at warehouse : ${etaWarehouse}\n`;
          response += `Payload : ${pool.total_quantity} Kg\n`;
          response += '-------------------------------------------------\n';
        }
        return sendReply(phone, response, res);
      }

      if (upperMsg.startsWith('ROUTEDETAILS')) {
        const parts = upperMsg.split(' ');
        const poolId = parts[1];

        if (!poolId) return sendReply(phone, 'Usage: ROUTEDETAILS <RouteId>', res);

        const pool = await Pool.findById(poolId);
        if (!pool) return sendReply(phone, 'Route not found.', res);

        const produces = await Produce.find({ poolId: pool._id });

        let details = `Route: ${pool._id}\nPayload: ${pool.total_quantity} Kg\nCustomers:\n`;
        for (const p of produces) {
          const f = await getFarmerByPhone(p.farmer_phone);
          details += `- ${f?.name || 'Farmer'} (${p.farmer_phone}): ${p.quantity} Kg ${p.crop}\n`;
        }
        return sendReply(phone, details, res);
      }

      if (upperMsg.startsWith('YES')) {
        const parts = upperMsg.split(' ');
        const poolId = parts[1];
        if (!poolId) return sendReply(phone, 'Usage: YES <RouteId>', res);

        if (!driver.available) return sendReply(phone, 'You are already assigned to a pickup', res);

        const pool = await Pool.findById(poolId);
        if (!pool) return sendReply(phone, 'Route not found', res);
        if (pool.status !== 'READY') return sendReply(phone, 'Route not available', res);

        // Generate Map Link
        const produces = await Produce.find({ poolId: pool._id }).sort({ createdAt: 1 });
        const stops = produces.map(p => p.address);
        const mapLink = generateGoogleMapsLink(stops);

        await createDispatch(
          pool.category,
          pool.village,
          pool.total_quantity,
          phone,
          pool.crops,
          pool._id
        );

        await markDriverUnavailable(phone);
        await markPoolAssigned(pool._id);

        // NOTIFY FARMERS
        const arrivalTime = '10:00 AM'; // Hardcoded as per request
        await notifyFarmers(pool._id,
          `DRIVER ACQUIRED : ${phone}\n` +
          `DATE : ${new Date().toLocaleDateString()}\n` +
          `EXPECTED TIME OF ARRIVAL : ${arrivalTime}`
        );

        return sendReply(phone,
          `Route Assigned!\n` +
          `Map: ${mapLink}`,
          res
        );
      }

      if (upperMsg === 'DONE') {
        const dispatch = await completeDispatchByDriver(phone);
        if (dispatch) {
          await markDriverAvailable(phone);
          await markPoolCompleted(dispatch.poolId);
          try { await createJourneyForCompletedDispatch(dispatch); } catch (e) { console.error('❌ Journey creation failed:', e.message); }
          return sendReply(phone, 'Transport job completed. You are now available.', res);
        }
        await handleDone(phone);
        return sendReply(phone, 'Service marked as completed', res);
      }
    }

    // ======================
    // FARMER COMMANDS
    // ======================
    if (upperMsg === 'HELP') {
      const farmer = await getFarmerByPhone(phone);
      if (farmer) {
        return sendReply(phone,
          '👨‍🌾 FARMER MENU:\n' +
          'ADDRESS <Addr> - Set Address\n' +
          'LOG <Crop> <Qty> <Date> - Log Produce\n' +
          'HELP - Show this menu',
          res
        );
      }
      return sendReply(phone, 'Send START to begin. Or ADDRESS <your address> to register.', res);
    }

    if (upperMsg.startsWith('ADDRESS')) {
      const address = message.substring(7).trim(); // Remove 'ADDRESS'
      if (!address) return sendReply(phone, 'Usage: ADDRESS <Your Address>', res);

      const village = await extractVillageFromAddress(address);
      await createOrUpdateFarmer(phone, address, village);
      return sendReply(phone, `Address updated: ${address}\nVillage detected: ${village}`, res);
    }

    if (upperMsg.startsWith('LOG')) {
      // Format: LOG <CROP> <QTY> <DATE>
      const parts = message.split(' ');
      if (parts.length < 4) return sendReply(phone, 'Usage: LOG <Item> <Weight> <Date>', res);

      const crop = parts[1];
      const weight = parseInt(parts[2]);
      const dateStr = parts.slice(3).join(' ');

      if (isNaN(weight)) return sendReply(phone, 'Invalid weight', res);

      // Farmer must have address
      const farmer = await getFarmerByPhone(phone);
      if (!farmer || !farmer.address) {
        return sendReply(phone, 'Please set address first using ADDRESS command', res);
      }

      const readyDate = new Date(dateStr);

      await saveProduce(phone, crop.toUpperCase(), weight, farmer.address, farmer.village, readyDate);

      // Trigger Pooling (returns poolId and isReady)
      const { poolId } = await processPooling(crop.toUpperCase(), farmer.village, weight);

      return sendReply(phone,
        `ADDED TO POOL : #${poolId}\n` +
        `Expected arrival date : ${readyDate.toLocaleDateString()}`,
        res
      );
    }

    return sendReply(phone, 'Invalid command or not registered.', res);

  } catch (err) {
    console.error(err);
    await sendSMS(phone, 'Server error');
    res.status(500).json({ error: 'Server error' });
  }
}
