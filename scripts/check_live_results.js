
import dotenv from 'dotenv';
import { connectMongo } from '../src/config/mongo.js';
import { Pool } from '../src/models/pool.model.js';
import { Produce } from '../src/models/produce.model.js';
import mongoose from 'mongoose';

dotenv.config();

async function check() {
    await connectMongo();
    const pools = await Pool.find({ village: 'POWERSHELL_VILLAGE' }).sort({ createdAt: 1 });

    console.log(`\n🔎 Live Verification Results for village: POWERSHELL_VILLAGE`);
    console.log(`==========================================================`);

    for (const pool of pools) {
        console.log(`\n📦 Pool: ${pool._id}`);
        console.log(`   Category: ${pool.category}`);
        console.log(`   Status:   ${pool.status}`);
        console.log(`   Total Qty: ${pool.total_quantity} kg`);
        console.log(`   Crops:     ${pool.crops.join(', ')}`);
        console.log(`   Contributions:`);

        for (const c of pool.contributions) {
            const p = await Produce.findById(c.produceId);
            console.log(`     - Farmer: ${c.farmerPhone} | Qty: ${c.quantity} kg | Crop: ${p ? p.crop : 'Unknown'}`);
        }
    }

    await mongoose.disconnect();
}

check();
