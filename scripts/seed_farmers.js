
import dotenv from 'dotenv';
import { connectMongo } from '../src/config/mongo.js';
import { Farmer } from '../src/models/farmer.model.js';
import mongoose from 'mongoose';

dotenv.config();

async function seed() {
    await connectMongo();

    const farmers = [
        { phone: '+913333333333', name: 'Alice', village: 'POWERSHELL_VILLAGE', address: 'Alice Farm' },
        { phone: '+914444444444', name: 'Bob', village: 'POWERSHELL_VILLAGE', address: 'Bob Farm' }
    ];

    for (const f of farmers) {
        await Farmer.findOneAndUpdate(
            { phone: f.phone },
            { ...f, aadhar: Math.floor(100000000000 + Math.random() * 900000000000).toString() },
            { upsert: true, new: true }
        );
        console.log(`✅ Seeded farmer: ${f.name} (${f.phone})`);
    }

    await mongoose.disconnect();
}

seed();
