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

import { createJourneyForCompletedDispatch } from '../services/journey.service.js';
import {
  processFarmerRewardsForCompletedDispatch,
  getFarmerRewardStatus,
  processRewardUtilization
} from '../models/reward.js';

// Import new equipment controller functions
import {
  bookEquipment,
  registerEquipment,
  getAvailableEquipment,
  getMyServices,
  getMyBookings,
  getSystemStats,
  handleEquipmentDone
} from './equipment.controller.js';

function normalizePhone(phone) {
  if (!phone) return null;
  // Remove all spaces and + signs
  let cleaned = phone.replace(/[\s+]/g, '');
  // Add + prefix if not present
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }
  return cleaned;
}

// Helper to send SMS reply and return HTTP response
async function sendReply(phone, message, res) {
  await sendSMS(phone, message);
  return res.status(200).json({ status: 'sent', message });
}

export async function handleSMS(req, res) {
  let phone = null;
  try {
    const data = req.body?.data || req.body;
    const rawMessage =
      data?.message || data?.content || data?.text || data?.body || data?.Body || req.body?.Body;
    const rawPhone =
      data?.sender || data?.from || data?.contact || data?.From || req.body?.From;

    const message = rawMessage?.trim();
    phone = normalizePhone(rawPhone);

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
          'AVAILABLE <Village> - Check Equipment\n' +
          'RENT <Type> <Hrs> <Phone> <Addr> [Date]\n' +
          'MYBOOKINGS <Phone> - View Bookings\n' +
          'REWARDS - Check rewards status\n' +
          'HELP - Show this menu',
          res
        );
      }
      return sendReply(phone,
        'Welcome to Logi-Pool!\nAre you a Driver or Farmer?\n(Contact Admin to register)\n\n🚜 Equipment Owner?\nREGISTER <Type> <Addr> <Price> <Phone> <Name>',
        res
      );
    }

    // ======================
    // STATS COMMAND (Universal)
    // ======================
    if (upperMsg === 'STATS') {
      const stats = await getSystemStats();
      if (!stats.success) {
        return sendReply(phone, stats.message, res);
      }
      return sendReply(phone,
        `📊 SYSTEM STATS:\n` +
        `Total Services: ${stats.totalServices}\n` +
        `Available: ${stats.availableServices}\n` +
        `Total Bookings: ${stats.totalBookings}\n` +
        `Active: ${stats.activeBookings}`,
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
        const pools = await Pool.find({
          village: new RegExp(`^${villageUpper}$`, 'i'),
          status: 'READY',
          targetVehicleType: driver.vehicleType || 'REGULAR'
        });
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
          // Process Farmer Rewards
          try { await processFarmerRewardsForCompletedDispatch(dispatch.poolId); } catch (e) { console.error('❌ Reward processing failed:', e.message); }
          return sendReply(phone, 'Transport job completed. You are now available.', res);
        }
        await handleEquipmentDone(phone);
        return sendReply(phone, 'Service marked as completed', res);
      }
    }

    // ======================
    // EQUIPMENT COMMANDS (Available to all)
    // ======================

    // REGISTER command - Equipment owner registration
    if (upperMsg.startsWith('REGISTER') || upperMsg.startsWith('REG ')) {
      // Format: REGISTER <type> <address> <price> <phone> <name>
      const parts = message.split(/\s+/);

      if (parts.length < 6) {
        return sendReply(phone,
          '❌ Format: REGISTER <type> <address> <price> <phone> <name>\n' +
          'Example: REGISTER TRACTOR 14th Street Bangalore 600 9876543210 RAMESH',
          res
        );
      }

      const type = parts[1];

      // Extract price & phone from fixed positions (last 3 elements before name)
      const price = parseFloat(parts[parts.length - 3]);
      const ownerPhone = parts[parts.length - 2];
      const ownerName = parts[parts.length - 1];

      if (isNaN(price) || price <= 0) {
        return sendReply(phone, '❌ Invalid price. Example: REGISTER TRACTOR MUMBAI 600 9876543210 RAMESH', res);
      }

      if (!ownerPhone || ownerPhone.length < 10) {
        return sendReply(phone, '❌ Invalid phone number. Must be at least 10 digits.', res);
      }

      // Everything between TYPE and PRICE is treated as address
      const addressParts = parts.slice(2, -3);
      const address = addressParts.join(' ');

      if (!address) {
        return sendReply(phone, '❌ Address is required.', res);
      }

      const result = await registerEquipment(type, address, price, ownerPhone, ownerName);

      if (!result.success) {
        return sendReply(phone, result.message, res);
      }

      const s = result.service;
      return sendReply(phone,
        `${result.message}\n` +
        `🚜 Type: ${s.type}\n` +
        `👤 Owner: ${s.owner_name}\n` +
        `📍 Village: ${s.village}\n` +
        `📌 Address: ${s.address}\n` +
        `💰 Price: ₹${s.price_per_hour}/hr\n` +
        `🆔 ID: ${s._id}\n` +
        `Status: Available for rent`,
        res
      );
    }

    // RENT command - Book equipment
    if (upperMsg.startsWith('RENT')) {
      // Format: RENT <type> <hours> <phone> <address> [date]
      const parts = message.split(/\s+/);

      if (parts.length < 5) {
        return sendReply(phone,
          '❌ Format: RENT <type> <hours> <phone> <address> [date]\n' +
          'Example: RENT TRACTOR 5 9123456789 Near Market Panvel 2026-02-10',
          res
        );
      }

      const type = parts[1];
      let hours = parts[2].replace(/HRS?/i, '');
      const farmerPhone = parts[3];

      hours = parseInt(hours);
      if (isNaN(hours) || hours <= 0) {
        return sendReply(phone, '❌ Invalid hours.', res);
      }

      if (!farmerPhone || farmerPhone.length < 10) {
        return sendReply(phone, '❌ Invalid phone number.', res);
      }

      // Parse Address & Optional Date
      let addressParts = parts.slice(4);

      // Check if last part is a date (YYYY-MM-DD)
      const lastPart = addressParts[addressParts.length - 1];
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

      let startTime = new Date();
      if (dateRegex.test(lastPart)) {
        const parsedDate = new Date(lastPart);
        if (!isNaN(parsedDate.getTime())) {
          startTime = parsedDate;
          addressParts.pop(); // Remove date from address
        }
      }

      const farmerAddress = addressParts.join(' ');

      if (!farmerAddress) {
        return sendReply(phone, '❌ Address is required.', res);
      }

      const result = await bookEquipment(type, hours, farmerPhone, farmerAddress, startTime);

      if (!result.success) {
        let msg = result.message;
        if (result.earliest_available_at) {
          const availableAt = new Date(result.earliest_available_at);
          msg += `\n\n⏰ Earliest Available: ${availableAt.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}`;
          msg += `\n💡 Try booking after this time!`;
        }
        return sendReply(phone, msg, res);
      }

      // Build success response
      const s = result.service;
      const b = result.booking;

      let msg = `${result.message}\n`;
      msg += `👤 Owner: ${s.owner_name}\n`;
      msg += `📍 Village: ${s.village}\n`;
      msg += `📞 Phone: ${s.phone}\n`;
      msg += `💰 Original: ₹${b.original_price}\n`;
      if (b.discount_percentage > 0) {
        msg += `🎉 Discount: ${b.discount_percentage}% (₹${b.discount_amount} off)\n`;
      }
      msg += `💵 Total Pay: ₹${b.final_price}\n`;
      msg += `🆔 Booking ID: ${b._id}\n`;

      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      msg += `⏰ Start: ${start.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}\n`;
      msg += `⏱️ End: ${end.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}\n`;

      if (result.maps_link) {
        msg += `\n🗺️ GOOGLE MAPS LINK FOR OWNER:\n${result.maps_link}`;
      }

      return sendReply(phone, msg, res);
    }

    // AVAILABLE <village> - Check equipment in village
    if (upperMsg.startsWith('AVAILABLE ') && upperMsg.split(' ').length >= 2) {
      const parts = upperMsg.split(' ');
      const village = parts[1];

      if (!village) {
        return sendReply(phone, '❌ Format: AVAILABLE <village>\nExample: AVAILABLE BANGALORE', res);
      }

      const result = await getAvailableEquipment(village);

      if (!result.success) {
        return sendReply(phone, result.message, res);
      }

      let msg = `🔍 Available in ${result.village} (${result.count}):\n`;
      result.services.forEach((s, i) => {
        msg += `\n${i + 1}. ${s.type}`;
        msg += `\n   Owner: ${s.owner_name}`;
        msg += `\n   ₹${s.price_per_hour}/hr`;
        msg += `\n   Ph: ${s.phone}`;
      });

      return sendReply(phone, msg, res);
    }

    // MYSERVICES <phone> - View owner's services
    if (upperMsg.startsWith('MYSERVICES') || upperMsg.startsWith('MS ')) {
      const parts = upperMsg.split(' ');
      const queryPhone = parts[1] ? normalizePhone(parts[1]) : phone;

      if (!queryPhone || queryPhone.length < 10) {
        return sendReply(phone, '❌ Format: MYSERVICES <phone>\nExample: MYSERVICES 9876543210', res);
      }

      const result = await getMyServices(queryPhone);

      if (!result.success) {
        return sendReply(phone, result.message, res);
      }

      let msg = `📋 Your Services (${result.count}):\n`;
      result.services.forEach((s, i) => {
        msg += `\n${i + 1}. ${s.type} - ${s.village}`;
        msg += `\n   ₹${s.price_per_hour}/hr`;
        msg += `\n   ${s.available ? '✅ Available' : '🔴 Booked'}`;
      });

      return sendReply(phone, msg, res);
    }

    // MYBOOKINGS <phone> - View farmer's bookings
    if (upperMsg.startsWith('MYBOOKINGS') || upperMsg.startsWith('MB ')) {
      const parts = upperMsg.split(' ');
      const queryPhone = parts[1] || phone.replace(/^\+/, '');

      if (!queryPhone || queryPhone.length < 10) {
        return sendReply(phone, '❌ Format: MYBOOKINGS <phone>\nExample: MYBOOKINGS 9123456789', res);
      }

      const result = await getMyBookings(queryPhone);

      if (!result.success) {
        return sendReply(phone, result.message, res);
      }

      let msg = `📚 Your Bookings (Last ${result.count}):\n`;
      result.bookings.forEach((b, i) => {
        msg += `\n${i + 1}. ${b.type} - ${b.status}`;
        msg += `\n   ₹${b.final_price}`;
        msg += `\n   ${new Date(b.date).toLocaleDateString()}`;
      });

      return sendReply(phone, msg, res);
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
          'AVAILABLE <Village> - Check Equipment\n' +
          'RENT <Type> <Hrs> <Phone> <Addr> [Date]\n' +
          'MYBOOKINGS <Phone> - View Bookings\n' +
          'REWARDS - Check rewards status\n' +
          'HELP - Show this menu\n\n' +
          '🚜 EQUIPMENT OWNER:\n' +
          'REGISTER <Type> <Addr> <Price> <Phone> <Name>\n' +
          'MYSERVICES <Phone> - View Services\n' +
          'STATS - System Statistics',
          res
        );
      }
      return sendReply(phone,
        'Send START to begin.\n' +
        'Or ADDRESS <your address> to register.\n\n' +
        '🚜 Equipment Owner?\n' +
        'REGISTER <Type> <Addr> <Price> <Phone> <Name>',
        res
      );
    }

    if (upperMsg === 'REWARDS') {
      const farmer = await getFarmerByPhone(phone);
      if (!farmer) return sendReply(phone, 'Farmer not found.', res);

      const status = await getFarmerRewardStatus(phone);
      return sendReply(phone,
        `🎁 REWARDS STATUS:\n` +
        `Total Dispatched: ${status.totalDispatched} kg\n` +
        `Reward Balance: ${status.rewardBalance} kg\n` +
        `Progress to next: ${status.progressToNext}/${status.nextThreshold} kg`,
        res
      );
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

      // Check for rewards utilization
      let rewardUsage = { applied: false };
      try {
        rewardUsage = await processRewardUtilization(phone, weight);
      } catch (e) {
        console.error('❌ Reward utilization failed:', e.message);
      }

      // Trigger Pooling (returns poolId and isReady)
      const { poolId } = await processPooling(crop.toUpperCase(), farmer.village, weight);

      let response = `ADDED TO POOL : #${poolId}\n` +
        `Expected arrival date : ${readyDate.toLocaleDateString()}`;

      if (rewardUsage.applied) {
        response += `\n🎁 Discount applied: ${rewardUsage.used} kg\nRemaining balance: ${rewardUsage.remaining} kg`;
      }

      return sendReply(phone, response, res);
    }

    return sendReply(phone, 'Invalid command or not registered.', res);

  } catch (err) {
    console.error(err);
    if (phone) await sendSMS(phone, 'Server error');
    res.status(500).json({ error: 'Server error' });
  }
}
