import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import smsRoutes from './routes/sms.routes.js';
import journeyRoutes from './routes/journey.routes.js';
import { connectMongo } from './config/mongo.js';
import { checkExpiredPools } from './jobs/poolExpiry.job.js';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(express.text({ type: 'application/cloudevents+json' }));

// Parse string bodies as JSON (for CloudEvents format)
app.use('/sms', (req, res, next) => {
  if (typeof req.body === 'string') {
    try { req.body = JSON.parse(req.body); } catch (e) { /* ignore */ }
  }
  next();
});

app.use('/sms', smsRoutes);
app.use('/journey', journeyRoutes);

const startServer = async () => {
  try {
    await connectMongo();

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

    setInterval(checkExpiredPools, 10 * 60 * 1000);

  } catch (err) {
    console.error('❌ Server failed to start', err);
    process.exit(1);
  }
};

startServer();
