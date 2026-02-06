import { saveProduce, Produce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';
import { extractVillageFromAddress } from '../services/location.service.js';
import { generateGoogleMapsLink } from '../services/maps.service.js';
import { sendSMS } from '../services/sms.gateway.js';
import { translateToEnglish, translateToUserLang, getLanguageName } from '../services/translation.service.js';

import {
  createDispatch,
  completeDispatchByDriver
} from '../models/dispatch.model.js';

import {
  markDriverUnavailable,
  markDriverAvailable,
  getDriverByPhone,
  createDriver,
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

import {
  getSession,
  updateSession,
  deleteSession,
  RegistrationSession
} from '../models/registration.model.js';

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
// Now supports translation to user's preferred language
async function sendReply(phone, message, res, userLanguage = 'en') {
  // Translate message to user's language if not English
  const translatedMessage = await translateToUserLang(message, userLanguage);
  await sendSMS(phone, translatedMessage);
  return res.status(200).json({ status: 'sent', message: translatedMessage });
}

export async function handleSMS(req, res, userLanguage) {
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

    // Get user's language preference
    let userLanguage = 'en';
    const userDriver = await getDriverByPhone(phone);
    const userFarmer = await getFarmerByPhone(phone);

    if (userDriver) {
      userLanguage = userDriver.language || 'en';
    } else if (userFarmer) {
      userLanguage = userFarmer.language || 'en';
    }

    // Translate incoming message to English for processing
    const translatedMessage = await translateToEnglish(message, userLanguage);
    const upperMsg = translatedMessage.toUpperCase();
    console.log(`📩 SMS from ${phone} [${userLanguage}]: ${message} -> ${upperMsg}`);

    // ======================
    // LANG COMMAND - Check BEFORE translation to avoid interference
    // ======================
    const rawUpperMsg = message.toUpperCase().trim();
    if (rawUpperMsg.startsWith('LANG')) {
      const parts = rawUpperMsg.split(' ');
      const langCode = parts[1]?.toLowerCase();

      if (!langCode || !['en', 'hi', 'mr'].includes(langCode)) {
        return sendReply(phone,
          'Usage: LANG <CODE>\nAvailable: EN (English), HI (Hindi), MR (Marathi)\nExample: LANG HI', res, userLanguage);
      }

      // Pre-translated confirmation messages
      const confirmationMessages = {
        'en': 'Language updated to English',
        'hi': 'भाषा को हिंदी में अपडेट किया गया',
        'mr': 'भाषा मराठीत अपडेट केली'
      };

      // Update language for driver or farmer
      if (userDriver) {
        await Driver.updateOne({ phone }, { language: langCode });
        await sendSMS(phone, confirmationMessages[langCode]);
        return res.status(200).json({ status: 'sent', message: confirmationMessages[langCode] });
      } else if (userFarmer) {
        await Farmer.updateOne({ phone }, { language: langCode });
        await sendSMS(phone, confirmationMessages[langCode]);
        return res.status(200).json({ status: 'sent', message: confirmationMessages[langCode] });
      } else {
        return sendReply(phone,
          'Please register first using START or ADDRESS command', res, userLanguage);
      }
    }

    // ======================
    // CHECK REGISTRATION SESSION
    // ======================
    const session = await getSession(phone);
    if (session) {
      return handleRegistrationStep(session, translatedMessage, phone, res, userLanguage);
    }

    // ======================
    // START COMMAND
    // ======================
    if (upperMsg === 'START') {
      const driver = await getDriverByPhone(phone);
      if (driver) {
        return sendReply(phone,
          'DRIVER MENU:\n' +
          'AVAILABLE - Mark availability\n' +
          'UNAVAILABLE - Mark unavailable\n' +
          'ROUTES - View routes\n' +
          'ROUTEDETAILS [ID] - View Details\n' +
          'YES [ID] - Accept Route\n' +
          'DONE - Finish Job', res, userLanguage);
      }
      const farmer = await getFarmerByPhone(phone);
      if (farmer) {
        return sendReply(phone,
          'FARMER MENU:\n' +
          'ADDRESS <Addr> - Set Address\n' +
          'LOG <Crop> <Qty> <Date> - Log Produce\n' +
          'AVAILABLE <Village> - Check Equipment\n' +
          'RENT <Type> <Hrs> <Phone> <Addr> [Date]\n' +
          'MYBOOKINGS <Phone> - View Bookings\n' +
          'REWARDS - Check rewards status\n' +
          'HELP - For more commands', res, userLanguage);
      }
      // User is not registered, start registration flow
      await RegistrationSession.create({ phone, step: 'ASK_ROLE', data: {} });
      return sendReply(phone,
        'Welcome to Logi-Pool! 🌾\n' +
        'It seems you are new here.\n\n' +
        'Are you a FARMER or DRIVER?\n' +
        'Reply with FARMER or DRIVER.',
        res,
        userLanguage
      );
    }

    // ======================
    // STATS COMMAND (Universal)
    // ======================
    if (upperMsg === 'STATS') {
      const stats = await getSystemStats();
      if (!stats.success) {
        return sendReply(phone, stats.message, res, userLanguage);
      }
      return sendReply(phone,
        `SYSTEM STATS:\n` +
        `Total Services: ${stats.totalServices}\n` +
        `Available: ${stats.availableServices}\n` +
        `Total Bookings: ${stats.totalBookings}\n` +
        `Active: ${stats.activeBookings}`, res, userLanguage);
    }

    // ======================
    // DRIVER COMMANDS
    // ======================
    const driver = await getDriverByPhone(phone);
    if (driver) {
      if (upperMsg === 'AVAILABLE') {
        await markDriverAvailable(phone);
        return sendReply(phone, 'You are now marked AVAILABLE.', res, userLanguage);
      }
      if (upperMsg === 'UNAVAILABLE') {
        await markDriverUnavailable(phone);
        return sendReply(phone, 'You are now marked UNAVAILABLE.', res, userLanguage);
      }
      if (upperMsg === 'ROUTES') {
        const villageUpper = (driver.village || '').toUpperCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pools = await Pool.find({
          village: new RegExp(`^${villageUpper}$`, 'i'),
          status: 'READY',
          targetVehicleType: driver.vehicleType || 'REGULAR'
        });
        if (pools.length === 0) return sendReply(phone, 'No routes available in your area.', res, userLanguage);

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
        return sendReply(phone, response, res, userLanguage);
      }

      if (upperMsg.startsWith('ROUTEDETAILS')) {
        const parts = upperMsg.split(' ');
        const poolId = parts[1];

        if (!poolId) return sendReply(phone, 'Usage: ROUTEDETAILS <RouteId>', res, userLanguage);

        const pool = await Pool.findById(poolId);
        if (!pool) return sendReply(phone, 'Route not found.', res, userLanguage);

        const produces = await Produce.find({ poolId: pool._id });

        let details = `Route: ${pool._id}\nPayload: ${pool.total_quantity} Kg\nCustomers:\n`;
        for (const p of produces) {
          const f = await getFarmerByPhone(p.farmer_phone);
          details += `- ${f?.name || 'Farmer'} (${p.farmer_phone}): ${p.quantity} Kg ${p.crop}\n`;
        }
        return sendReply(phone, details, res, userLanguage);
      }

      if (upperMsg.startsWith('YES')) {
        const parts = upperMsg.split(' ');
        const poolId = parts[1];
        if (!poolId) return sendReply(phone, 'Usage: YES <RouteId>', res, userLanguage);

        if (!driver.available) return sendReply(phone, 'You are already assigned to a pickup', res, userLanguage);

        const pool = await Pool.findById(poolId);
        if (!pool) return sendReply(phone, 'Route not found', res, userLanguage);
        if (pool.status !== 'READY') return sendReply(phone, 'Route not available', res, userLanguage);

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
          `Map: ${mapLink}`, res, userLanguage);
      }

      if (upperMsg === 'DONE') {
        const dispatch = await completeDispatchByDriver(phone);
        if (dispatch) {
          await markDriverAvailable(phone);
          await markPoolCompleted(dispatch.poolId);
          try { await createJourneyForCompletedDispatch(dispatch); } catch (e) { console.error('❌ Journey creation failed:', e.message); }
          // Process Farmer Rewards
          try { await processFarmerRewardsForCompletedDispatch(dispatch.poolId); } catch (e) { console.error('❌ Reward processing failed:', e.message); }
          return sendReply(phone, 'Transport job completed. You are now available.', res, userLanguage);
        }
        await handleEquipmentDone(phone);
        return sendReply(phone, 'Service marked as completed', res, userLanguage);
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
          'Example: REGISTER TRACTOR 14th Street Bangalore 600 9876543210 RAMESH', res, userLanguage);
      }

      const type = parts[1];

      // Extract price & phone from fixed positions (last 3 elements before name)
      const price = parseFloat(parts[parts.length - 3]);
      const ownerPhone = parts[parts.length - 2];
      const ownerName = parts[parts.length - 1];

      if (isNaN(price) || price <= 0) {
        return sendReply(phone, '❌ Invalid price. Example: REGISTER TRACTOR MUMBAI 600 9876543210 RAMESH', res, userLanguage);
      }

      if (!ownerPhone || ownerPhone.length < 10) {
        return sendReply(phone, '❌ Invalid phone number. Must be at least 10 digits.', res, userLanguage);
      }

      // Everything between TYPE and PRICE is treated as address
      const addressParts = parts.slice(2, -3);
      const address = addressParts.join(' ');

      if (!address) {
        return sendReply(phone, '❌ Address is required.', res, userLanguage);
      }

      const result = await registerEquipment(type, address, price, ownerPhone, ownerName);

      if (!result.success) {
        return sendReply(phone, result.message, res, userLanguage);
      }

      const s = result.service;

      // Different response for TRUCK vs other equipment
      if (s.type === 'TRUCK') {
        return sendReply(phone,
          `${result.message}\n` +
          `🚛 Type: ${s.type} (${s.vehicle_type})\n` +
          `👤 Driver: ${s.owner_name}\n` +
          `📍 Village: ${s.village}\n` +
          `📌 Address: ${s.address}\n` +
          `🆔 ID: ${s._id}\n` +
          `✅ Ready for Logi-Pool routes!`,
          res
        );
      }

      return sendReply(phone,
        `${result.message}\n` +
        `🚜 Type: ${s.type}\n` +
        `👤 Owner: ${s.owner_name}\n` +
        `📍 Village: ${s.village}\n` +
        `📌 Address: ${s.address}\n` +
        `💰 Price: ₹${s.price_per_hour}/hr\n` +
        `🆔 ID: ${s._id}\n` +
        `Status: Available for rent`, res, userLanguage);
    }

    // RENT command - Book equipment
    if (upperMsg.startsWith('RENT')) {
      // Format: RENT <type> <hours> <phone> <address> [date]
      const parts = message.split(/\s+/);

      if (parts.length < 5) {
        return sendReply(phone,
          '❌ Format: RENT <type> <hours> <phone> <address> [date]\n' +
          'Example: RENT TRACTOR 5 9123456789 Near Market Panvel 2026-02-10', res, userLanguage);
      }

      const type = parts[1];
      let hours = parts[2].replace(/HRS?/i, '');
      const farmerPhone = parts[3];

      hours = parseInt(hours);
      if (isNaN(hours) || hours <= 0) {
        return sendReply(phone, '❌ Invalid hours.', res, userLanguage);
      }

      if (!farmerPhone || farmerPhone.length < 10) {
        return sendReply(phone, '❌ Invalid phone number.', res, userLanguage);
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
        return sendReply(phone, '❌ Address is required.', res, userLanguage);
      }

      const result = await bookEquipment(type, hours, farmerPhone, farmerAddress, startTime);

      if (!result.success) {
        let msg = result.message;
        if (result.earliest_available_at) {
          const availableAt = new Date(result.earliest_available_at);
          msg += `\n\nâ° Earliest Available: ${availableAt.toLocaleString('en-IN', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}`;
          msg += `\nðŸ’¡ Try booking after this time!`;
        }
        return sendReply(phone, msg, res, userLanguage);
      }

      // Build success response
      const s = result.service;
      const b = result.booking;

      let msg = `${result.message}\n`;
      msg += `ðŸ‘¤ Owner: ${s.owner_name}\n`;
      msg += `ðŸ“ Village: ${s.village}\n`;
      msg += `ðŸ“ž Phone: ${s.phone}\n`;
      msg += `ðŸ’° Original: â‚¹${b.original_price}\n`;
      if (b.discount_percentage > 0) {
        msg += `ðŸŽ‰ Discount: ${b.discount_percentage}% (â‚¹${b.discount_amount} off)\n`;
      }
      msg += `ðŸ’µ Total Pay: â‚¹${b.final_price}\n`;
      msg += `ðŸ†” Booking ID: ${b._id}\n`;

      const start = new Date(b.start_time);
      const end = new Date(b.end_time);
      msg += `â° Start: ${start.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}\n`;
      msg += `â±ï¸ End: ${end.toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}\n`;

      if (result.maps_link) {
        msg += `\nðŸ—ºï¸ GOOGLE MAPS LINK FOR OWNER:\n${result.maps_link}`;
      }

      return sendReply(phone, msg, res, userLanguage);
    }

    // AVAILABLE <village> - Check equipment in village
    if (upperMsg.startsWith('AVAILABLE ') && upperMsg.split(' ').length >= 2) {
      const parts = upperMsg.split(' ');
      const village = parts[1];

      if (!village) {
        return sendReply(phone, '❌ Format: AVAILABLE <village>\nExample: AVAILABLE BANGALORE', res, userLanguage);
      }

      const result = await getAvailableEquipment(village);

      if (!result.success) {
        return sendReply(phone, result.message, res, userLanguage);
      }

      let msg = `ðŸ” Available in ${result.village} (${result.count}):\n`;
      result.services.forEach((s, i) => {
        msg += `\n${i + 1}. ${s.type}`;
        msg += `\n   Owner: ${s.owner_name}`;
        msg += `\n   â‚¹${s.price_per_hour}/hr`;
        msg += `\n   Ph: ${s.phone}`;
      });

      return sendReply(phone, msg, res, userLanguage);
    }

    // MYSERVICES <phone> - View owner's services
    if (upperMsg.startsWith('MYSERVICES') || upperMsg.startsWith('MS ')) {
      const parts = upperMsg.split(' ');
      const queryPhone = parts[1] ? normalizePhone(parts[1]) : phone;

      if (!queryPhone || queryPhone.length < 10) {
        return sendReply(phone, '❌ Format: MYSERVICES <phone>\nExample: MYSERVICES 9876543210', res, userLanguage);
      }

      const result = await getMyServices(queryPhone);

      if (!result.success) {
        return sendReply(phone, result.message, res, userLanguage);
      }

      let msg = `ðŸ“‹ Your Services (${result.count}):\n`;
      result.services.forEach((s, i) => {
        msg += `\n${i + 1}. ${s.type} - ${s.village}`;
        msg += `\n   â‚¹${s.price_per_hour}/hr`;
        msg += `\n   ${s.available ? 'âœ… Available' : 'ðŸ”´ Booked'}`;
      });

      return sendReply(phone, msg, res, userLanguage);
    }

    // MYBOOKINGS <phone> - View farmer's bookings
    if (upperMsg.startsWith('MYBOOKINGS') || upperMsg.startsWith('MB ')) {
      const parts = upperMsg.split(' ');
      const queryPhone = parts[1] || phone.replace(/^\+/, '');

      if (!queryPhone || queryPhone.length < 10) {
        return sendReply(phone, '❌ Format: MYBOOKINGS <phone>\nExample: MYBOOKINGS 9123456789', res, userLanguage);
      }

      const result = await getMyBookings(queryPhone);

      if (!result.success) {
        return sendReply(phone, result.message, res, userLanguage);
      }

      let msg = `ðŸ“š Your Bookings (Last ${result.count}):\n`;
      result.bookings.forEach((b, i) => {
        msg += `\n${i + 1}. ${b.type} - ${b.status}`;
        msg += `\n   â‚¹${b.final_price}`;
        msg += `\n   ${new Date(b.date).toLocaleDateString()}`;
      });

      return sendReply(phone, msg, res, userLanguage);
    }

    // ======================
    // FARMER COMMANDS
    // ======================
    if (upperMsg === 'HELP') {
      const farmer = await getFarmerByPhone(phone);
      if (farmer) {
        return sendReply(phone,
          'ðŸ‘¨â€ðŸŒ¾ FARMER MENU:\n' +
          'ADDRESS <Addr> - Set Address\n' +
          'LOG <Crop> <Qty> <Date> - Log Produce\n' +
          'AVAILABLE <Village> - Check Equipment\n' +
          'RENT <Type> <Hrs> <Phone> <Addr> [Date]\n' +
          'MYBOOKINGS <Phone> - View Bookings\n' +
          'REWARDS - Check rewards status\n' +
          'HELP - Show this menu\n\n' +
          'ðŸšœ EQUIPMENT OWNER:\n' +
          'REGISTER <Type> <Addr> <Price> <Phone> <Name>\n' +
          'MYSERVICES <Phone> - View Services\n' +
          'STATS - System Statistics', res, userLanguage);
      }
      return sendReply(phone,
        'Send START to begin.\n' +
        'Or ADDRESS <your address> to register.\n\n' +
        '🚜 Equipment Owner?\n' +
        'REGISTER <Type> <Addr> <Price> <Phone> <Name>', res, userLanguage);
    }

    if (upperMsg === 'REWARDS') {
      const farmer = await getFarmerByPhone(phone);
      if (!farmer) return sendReply(phone, 'Farmer not found.', res, userLanguage);

      const status = await getFarmerRewardStatus(phone);
      return sendReply(phone,
        `ðŸŽ REWARDS STATUS:\n` +
        `Total Dispatched: ${status.totalDispatched} kg\n` +
        `Reward Balance: ${status.rewardBalance} kg\n` +
        `Progress to next: ${status.progressToNext}/${status.nextThreshold} kg`, res, userLanguage);
    }

    if (upperMsg.startsWith('ADDRESS')) {
      const address = message.substring(7).trim(); // Remove 'ADDRESS'
      if (!address) return sendReply(phone, 'Usage: ADDRESS <Your Address>', res, userLanguage);

      const village = await extractVillageFromAddress(address);
      await createOrUpdateFarmer(phone, address, village);
      return sendReply(phone, `Address updated: ${address}\nVillage detected: ${village}`, res, userLanguage);
    }

    if (upperMsg.startsWith('LOG')) {
      // Format: LOG <CROP> <QTY> <DATE>
      const parts = message.split(' ');
      if (parts.length < 4) return sendReply(phone, 'Usage: LOG <Item> <Weight> <Date>', res, userLanguage);

      const crop = parts[1];
      const weight = parseInt(parts[2]);
      const dateStr = parts.slice(3).join(' ');

      if (isNaN(weight)) return sendReply(phone, 'Invalid weight', res, userLanguage);

      // Farmer must have address
      const farmer = await getFarmerByPhone(phone);
      if (!farmer || !farmer.address) {
        return sendReply(phone, 'Please set address first using ADDRESS command', res, userLanguage);
      }

      const readyDate = new Date(dateStr);

      await saveProduce(phone, crop.toUpperCase(), weight, farmer.address, farmer.village, readyDate);

      // Check for rewards utilization
      let rewardUsage = { applied: false };
      try {
        rewardUsage = await processRewardUtilization(phone, weight);
      } catch (e) {
        console.error('âŒ Reward utilization failed:', e.message);
      }

      // Trigger Pooling (returns poolId and isReady)
      const { poolId } = await processPooling(crop.toUpperCase(), farmer.village, weight, phone);

      let response = `ADDED TO POOL : #${poolId}\n` +
        `Expected arrival date : ${readyDate.toLocaleDateString()}`;

      if (rewardUsage.applied) {
        response += `\nðŸŽ Discount applied: ${rewardUsage.used} kg\nRemaining balance: ${rewardUsage.remaining} kg`;
      }

      return sendReply(phone, response, res, userLanguage);
    }

    return sendReply(phone, 'Invalid command or not registered.', res, userLanguage);

  } catch (err) {
    console.error(err);
    if (phone) await sendSMS(phone, 'Server error');
    res.status(500).json({ error: 'Server error' });
  }
}

// ======================
// REGISTRATION FLOW HANDLER
// ======================
async function handleRegistrationStep(session, message, phone, res, userLanguage = 'en') {
  const upperMsg = message.toUpperCase().trim();
  const step = session.step;
  const data = session.data || {};

  try {
    // Step 1: ASK_ROLE
    if (step === 'ASK_ROLE') {
      if (upperMsg === 'FARMER') {
        await updateSession(phone, { step: 'ASK_NAME', 'data.role': 'FARMER' });
        return sendReply(phone, 'Great! You are registering as a FARMER.\n\nPlease enter your full Name:', res, userLanguage);
      }
      if (upperMsg === 'DRIVER') {
        await updateSession(phone, { step: 'ASK_NAME', 'data.role': 'DRIVER' });
        return sendReply(phone, 'Great! You are registering as a DRIVER.\n\nPlease enter your full Name:', res, userLanguage);
      }
      return sendReply(phone, '❌ Invalid choice.\nPlease reply with FARMER or DRIVER.', res, userLanguage);
    }

    // Step 2: ASK_NAME
    if (step === 'ASK_NAME') {
      const name = message.trim();
      if (!name || name.length < 2) {
        return sendReply(phone, '❌ Name is too short.\nPlease enter your full Name:', res, userLanguage);
      }
      await updateSession(phone, { step: 'ASK_ADDRESS', 'data.name': name });
      return sendReply(phone, `Thanks, ${name}!\n\nPlease enter your full Address:`, res, userLanguage);
    }

    // Step 3: ASK_ADDRESS
    if (step === 'ASK_ADDRESS') {
      const address = message.trim();
      if (!address || address.length < 5) {
        return sendReply(phone, '❌ Address is too short.\nPlease enter your full Address:', res, userLanguage);
      }
      await updateSession(phone, { step: 'ASK_AADHAR', 'data.address': address });
      return sendReply(phone, 'Got it!\n\nPlease enter your 12-digit Aadhar Number:', res, userLanguage);
    }

    // Step 4: ASK_AADHAR
    if (step === 'ASK_AADHAR') {
      const aadhar = message.replace(/\s/g, ''); // Remove spaces
      const aadharRegex = /^\d{12}$/;
      if (!aadharRegex.test(aadhar)) {
        return sendReply(phone, '❌ Invalid Aadhar format.\nPlease enter a valid 12-digit Aadhar Number:', res, userLanguage);
      }

      // Fetch updated session data
      const updatedSession = await getSession(phone);
      const role = updatedSession.data.role;

      if (role === 'FARMER') {
        // Create Farmer and finish
        const village = await extractVillageFromAddress(updatedSession.data.address);
        await Farmer.create({
          phone,
          name: updatedSession.data.name,
          address: updatedSession.data.address,
          village,
          aadhar,
          language: userLanguage
        });
        await deleteSession(phone);
        return sendReply(phone,
          '✅ Registration Complete!\n\n' +
          `Name: ${updatedSession.data.name}\n` +
          `Role: FARMER\n` +
          `Village: ${village}\n\n` +
          'Send START to view your menu.',
          res, userLanguage
        );
      }

      // Driver - ask for payload
      await updateSession(phone, { step: 'ASK_PAYLOAD', 'data.aadhar': aadhar });
      return sendReply(phone, 'Almost done!\n\nPlease enter your vehicle payload capacity (in kg):', res, userLanguage);
    }

    // Step 5: ASK_PAYLOAD (Driver only)
    if (step === 'ASK_PAYLOAD') {
      const payload = parseInt(message.replace(/[^\d]/g, ''));
      if (isNaN(payload) || payload <= 0) {
        return sendReply(phone, '❌ Invalid payload.\nPlease enter a number (in kg):', res, userLanguage);
      }

      const vehicleType = payload <= 500 ? 'REGULAR' : 'LARGE';

      // Fetch updated session data
      const updatedSession = await getSession(phone);
      const village = await extractVillageFromAddress(updatedSession.data.address);

      await createDriver(
        phone,
        updatedSession.data.name,
        updatedSession.data.address,
        village,
        updatedSession.data.aadhar,
        vehicleType
      );
      // Update Driver language preference
      await Driver.updateOne({ phone }, { language: userLanguage });

      await deleteSession(phone);

      return sendReply(phone,
        '✅ Registration Complete!\n\n' +
        `Name: ${updatedSession.data.name}\n` +
        `Role: DRIVER\n` +
        `Vehicle Type: ${vehicleType}\n` +
        `Village: ${village}\n\n` +
        'Send START to view your menu.',
        res, userLanguage
      );
    }

    // Fallback - delete stale session
    await deleteSession(phone);
    return sendReply(phone, 'Session expired. Send START to begin again.', res, userLanguage);

  } catch (err) {
    console.error('❌ Registration error:', err);
    if (err.code === 11000) {
      // Duplicate key error (likely Aadhar)
      return sendReply(phone, '❌ Registration Failed: This Aadhar number is already registered with another account.', res, userLanguage);
    }
    await deleteSession(phone);
    return sendReply(phone, 'An error occurred. Send START to try again.', res, userLanguage);
  }
}
