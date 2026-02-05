
import dotenv from 'dotenv';
import { connectMongo } from '../src/config/mongo.js';
import { Pool } from '../src/models/pool.model.js';
import { Produce } from '../src/models/produce.model.js';
import mongoose from 'mongoose';
import fs from 'fs';

dotenv.config();

async function check() {
    await connectMongo();
    const pools = await Pool.find({ village: 'POWERSHELL_VILLAGE' }).sort({ createdAt: 1 });

    let report = `🔎 Live Verification Results for village: POWERSHELL_VILLAGE\n`;
    report += `==========================================================\n`;

    for (const pool of pools) {
        report += `\n📦 Pool: ${pool._id}\n`;
        report += `   Category: ${pool.category}\n`;
        report += `   Status:   ${pool.status}\n`;
        report += `   Total Qty: ${pool.total_quantity} kg\n`;
        report += `   Crops:     ${pool.crops.join(', ')}\n`;
        report += `   Contributions:\n`;

        for (const c of pool.contributions) {
            const p = await Produce.findById(c.produceId);
            report += `     - Farmer: ${c.farmerPhone} | Qty: ${c.quantity} kg | Crop: ${p ? p.crop : 'Unknown'}\n`;
        }
    }

    fs.writeFileSync('verification_report.txt', report);
    console.log('✅ Report generated in verification_report.txt');
    await mongoose.disconnect();
}

check();
