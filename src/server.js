import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import smsRoutes from './routes/sms.routes.js';
import journeyRoutes from './routes/journey.routes.js';
import { connectMongo } from './config/mongo.js';
import { checkExpiredPools } from './jobs/poolExpiry.job.js';
import { checkExpiredBookings } from './jobs/equipmentExpiry.job.js';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.text({ type: 'application/cloudevents+json' }));

// DEBUG LOGGING
app.use((req, res, next) => {
  console.log(`🔌 INCOMING: ${req.method} ${req.url}`);
  console.log('Body:', JSON.stringify(req.body).substring(0, 200));
  next();
});

// Parse string bodies as JSON (for CloudEvents format)
// Updated to listen on /sms/webhook as requested
app.use('/sms/webhook', (req, res, next) => {
  if (typeof req.body === 'string') {
    try { req.body = JSON.parse(req.body); } catch (e) { /* ignore */ }
  }
  next();
});

app.use('/sms/webhook', smsRoutes);
app.use('/journey', journeyRoutes);

const startServer = async () => {
  try {
    await connectMongo();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    // Pool expiry scheduler (every 10 minutes)
    setInterval(checkExpiredPools, 10 * 60 * 1000);

    // Equipment booking expiry scheduler (every 5 minutes)
    console.log('⏰ Equipment scheduler started: checking for expired bookings every 5 minutes...');
    checkExpiredBookings(); // Run on startup
    setInterval(checkExpiredBookings, 5 * 60 * 1000);

  } catch (err) {
    console.error('❌ Server failed to start', err);
    process.exit(1);
  }
};

startServer();
