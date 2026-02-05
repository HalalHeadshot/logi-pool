import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Driver } from '../src/models/driver.model.js';
import { Farmer } from '../src/models/farmer.model.js';
import { Pool } from '../src/models/pool.model.js';
import { Produce } from '../src/models/produce.model.js';

async function seed() {
    await connectMongo();

    console.log('🧹 Cleaning DB...');
    await Driver.deleteMany({});
    await Farmer.deleteMany({});
    await Pool.deleteMany({});
    await Produce.deleteMany({});

    console.log('🌱 Seeding Drivers...');
    await Driver.create({
        name: 'Ramesh Driver (Regular)',
        phone: '+918888888888',
        village: 'RAMPUR',
        vehicleType: 'REGULAR',
        available: true
    });
    await Driver.create({
        name: 'Suresh Driver (Large)',
        phone: '+917777777777',
        village: 'RAMPUR',
        vehicleType: 'LARGE',
        available: true
    });

    // Note: We don't seed Farmer, we let the test register one via SMS.

    console.log('✅ Seed Complete');
    process.exit(0);
}

seed();
