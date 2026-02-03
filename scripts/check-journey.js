import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Journey } from '../src/models/journey.model.js';

await mongoose.connect(process.env.MONGO_URI);

const journeys = await Journey.find().sort({ createdAt: -1 }).limit(1);
console.log('Latest Journey:', JSON.stringify(journeys, null, 2));

process.exit(0);
