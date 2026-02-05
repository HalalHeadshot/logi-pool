import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pool } from '../src/models/pool.model.js';
import { getMarketPrice } from '../src/utils/marketPricing.js';
import { CommodityPrice } from '../src/models/commodityPrice.model.js';

dotenv.config();

async function testPuneScenario() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // 1. Check/Create Pune Pool
        const cropName = 'BAJRA';
        const villageName = 'Pune'; // Or specific village in Pune district

        // Create a temporary test pool
        const testPool = await Pool.create({
            category: 'GRAIN',
            village: villageName,
            crops: [cropName],
            total_quantity: 50,
            status: 'READY'
        });

        console.log(`Created test pool: ID=${testPool._id}, Village=${villageName}, Crop=${cropName}`);

        // 2. Get Price
        console.log('\n--- Fetching Market Price ---');
        const priceData = await getMarketPrice(cropName);
        console.log(`Calculated Market Price: ₹${priceData.price}/quintal`);
        console.log(`Source: ${priceData.source}`);

        // 3. Compare with actual Pune CSV data
        console.log('\n--- Determining Expected Values ---');

        // Get actual Pune price from DB
        const puneRecord = await CommodityPrice.findOne({
            district: 'Pune',
            commodity: { $regex: new RegExp(cropName, 'i') }
        });

        if (puneRecord) {
            console.log(`Actual Price in Pune CSV: ₹${puneRecord.priceLatest}/quintal`);
        } else {
            console.log('No direct Pune record found for comparison.');
        }

        // Get stats for average calculation
        const allRecords = await CommodityPrice.find({
            commodity: { $regex: new RegExp(cropName, 'i') }
        });

        const validPrices = allRecords.filter(r => r.priceLatest > 0);
        const sum = validPrices.reduce((acc, r) => acc + r.priceLatest, 0);
        const avg = Math.round(sum / validPrices.length);

        console.log(`\nGlobal Average (Current Logic): ₹${avg}/quintal`);
        console.log(`(Based on ${validPrices.length} records from: ${validPrices.map(r => r.district).join(', ')})`);

        // Cleanup
        await Pool.findByIdAndDelete(testPool._id);
        console.log('\nTest pool cleaned up.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

testPuneScenario();
