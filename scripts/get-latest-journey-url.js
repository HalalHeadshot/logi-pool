import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Journey } from '../src/models/journey.model.js';

async function run() {
    try {
        await connectMongo();
        const journey = await Journey.findOne().sort({ _id: -1 }).lean();
        if (journey) {
            const journeyId = journey.journeyId?.toString?.() || journey.journeyId;
            console.log(`LATEST_JOURNEY_URL=http://localhost:3000/journey/${journeyId}`);
        } else {
            console.log('NO_JOURNEY_FOUND');
        }
    } catch (err) {
        console.error(err);
    } finally {
        await mongoose.disconnect();
    }
}
run();
