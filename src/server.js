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

app.use('/sms', smsRoutes);
app.use('/journey', journeyRoutes);

const startServer = async () => {
  try {
    await connectMongo();

    app.listen(3000, () => {
      console.log('🚀 Server running on port 3000');
    });

    setInterval(checkExpiredPools, 10 * 60 * 1000);

  } catch (err) {
    console.error('❌ Server failed to start', err);
    process.exit(1);
  }
};

startServer();
