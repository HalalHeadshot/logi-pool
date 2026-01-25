import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import smsRoutes from './routes/sms.routes.js';
import { connectMongo } from './config/mongo.js';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use('/sms', smsRoutes);

const startServer = async () => {
  try {
    await connectMongo();

    app.listen(3000, () => {
      console.log('🚀 Server running on port 3000');
    });
  } catch (err) {
    console.error('❌ Server failed to start', err);
    process.exit(1);
  }
};

startServer();
