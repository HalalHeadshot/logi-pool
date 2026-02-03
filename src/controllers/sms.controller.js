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
        return res.send(
          '👨‍✈️ DRIVER MENU:\n' +
          'AVAILABLE - Mark availability\n' +
          'UNAVAILABLE - Mark unavailable\n' +
          'ROUTES - View routes\n' +
          'ROUTEDETAILS [ID] - View Details\n' +
          'YES [ID] - Accept Route\n' +
          'DONE - Finish Job'
        );
      }
      const farmer = await getFarmerByPhone(phone);
      if (farmer) {
        return res.send(
          '👨‍🌾 FARMER MENU:\n' +
          'ADDRESS <Addr> - Set Address\n' +
          'LOG <Crop> <Qty> <Date> - Log Produce\n' +
          'HELP - Show this menu'
        );
      }
      return res.send(
        'Welcome to Logi-Pool!\nAre you a Driver or Farmer?\n(Contact Admin to register)'
      );
    }

    // ======================
    // DRIVER COMMANDS
    // ======================
    const driver = await getDriverByPhone(phone);
    if (driver) {
      if (upperMsg === 'AVAILABLE') {
        await markDriverAvailable(phone);
        return res.send('You are now marked AVAILABLE.');
      }
      if (upperMsg === 'UNAVAILABLE') {
        await markDriverUnavailable(phone);
        return res.send('You are now marked UNAVAILABLE.');
      }
      if (upperMsg === 'ROUTES') {
        const villageUpper = (driver.village || '').toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pools = await Pool.find({ village: new RegExp(`^${villageUpper}$`, 'i'), status: 'READY' });
        if (pools.length === 0) return res.send('No routes available in your area.');

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
        return res.send(response);
      }

      if (upperMsg.startsWith('ROUTEDETAILS')) {
        const parts = upperMsg.split(' ');
        const poolId = parts[1];

        if (!poolId) return res.send('Usage: ROUTEDETAILS <RouteId>');

        const pool = await Pool.findById(poolId);
        if (!pool) return res.send('Route not found.');

        const produces = await Produce.find({ poolId: pool._id });

        let details = `Route: ${pool._id}\nPayload: ${pool.total_quantity} Kg\nCustomers:\n`;
        for (const p of produces) {
          const f = await getFarmerByPhone(p.farmer_phone);
          details += `- ${f?.name || 'Farmer'} (${p.farmer_phone}): ${p.quantity} Kg ${p.crop}\n`;
        }
        return res.send(details);
      }

      if (upperMsg.startsWith('YES')) {
        const parts = upperMsg.split(' ');
        const poolId = parts[1];
        if (!poolId) return res.send('Usage: YES <RouteId>');

        if (!driver.available) return res.send('You are already assigned to a pickup');

        const pool = await Pool.findById(poolId);
        if (!pool) return res.send('Route not found');
        if (pool.status !== 'READY') return res.send('Route not available');

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

        return res.send(
          `Route Assigned!\n` +
          `Map: ${mapLink}`
        );
      }

      if (upperMsg === 'DONE') {
        const dispatch = await completeDispatchByDriver(phone);
        if (dispatch) {
          await markDriverAvailable(phone);
          await markPoolCompleted(dispatch.poolId);
          try { await createJourneyForCompletedDispatch(dispatch); } catch (e) { }
          return res.send('Transport job completed. You are now available.');
        }
        await handleDone(phone);
        return res.send('Service marked as completed');
      }
    }

    // ======================
    // FARMER COMMANDS
    // ======================
    if (upperMsg === 'HELP') {
      const farmer = await getFarmerByPhone(phone);
      if (farmer) {
        return res.send(
          '👨‍🌾 FARMER MENU:\n' +
          'ADDRESS <Addr> - Set Address\n' +
          'LOG <Crop> <Qty> <Date> - Log Produce\n' +
          'HELP - Show this menu'
        );
      }
      return res.send('Send START to begin. Or ADDRESS <your address> to register.');
    }

    if (upperMsg.startsWith('ADDRESS')) {
      const address = message.substring(7).trim(); // Remove 'ADDRESS'
      if (!address) return res.send('Usage: ADDRESS <Your Address>');

      const village = await extractVillageFromAddress(address);
      await createOrUpdateFarmer(phone, address, village);
      return res.send(`Address updated: ${address}\nVillage detected: ${village}`);
    }

    if (upperMsg.startsWith('LOG')) {
      // Format: LOG <CROP> <QTY> <DATE>
      const parts = message.split(' ');
      if (parts.length < 4) return res.send('Usage: LOG <Item> <Weight> <Date>');

      const crop = parts[1];
      const weight = parseInt(parts[2]);
      const dateStr = parts.slice(3).join(' ');

      if (isNaN(weight)) return res.send('Invalid weight');

      // Farmer must have address
      const farmer = await getFarmerByPhone(phone);
      if (!farmer || !farmer.address) {
        return res.send('Please set address first using ADDRESS command');
      }

      const readyDate = new Date(dateStr);

      await saveProduce(phone, crop.toUpperCase(), weight, farmer.address, farmer.village, readyDate);

      // Trigger Pooling (returns poolId and isReady)
      const { poolId } = await processPooling(crop.toUpperCase(), farmer.village, weight);

      return res.send(
        `ADDED TO POOL : #${poolId}\n` +
        `Expected arrival date : ${readyDate.toLocaleDateString()}`
      );
    }

    return res.send('Invalid command or not registered.');

  } catch (err) {
    console.error(err);
    res.send('Server error');
  }
}
