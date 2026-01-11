import { saveProduce } from '../models/produce.model.js';
import { processPooling } from '../services/pooling.service.js';
import { createDispatch } from '../models/dispatch.model.js';
import { markDriverUnavailable } from '../models/driver.model.js';
import { getTotalQuantity } from '../models/produce.model.js';
import { markPoolAssigned } from '../models/pool.model.js';à


export async function handleSMS(req, res) {
  const message = req.body.Body.trim().toUpperCase();
  const phone = req.body.From;

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
