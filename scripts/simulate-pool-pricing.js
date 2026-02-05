import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pool } from '../src/models/pool.model.js';
import { getMarketPrice } from '../src/utils/marketPricing.js';

dotenv.config();

async function simulatePoolPricing() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // 1. Fetch all pools
        const pools = await Pool.find({});
        console.log(`Found ${pools.length} pools in the database.\n`);

        if (pools.length === 0) {
            console.log('No pools found. Creating dummy pools for simulation...');
            // Create some dummy pools with various crops for testing
            const testCrops = ['Wheat', 'Bajra', 'Tomato', 'UnknownCrop'];

            for (const crop of testCrops) {
                await Pool.create({
                    category: 'GRAIN', // Just a placeholder, simpler to create
                    village: 'TestVillage',
                    crops: [crop],
                    total_quantity: 100,
                    status: 'READY'
                });
            }
            console.log('Created dummy pools for: ' + testCrops.join(', ') + '\n');

            // Re-fetch
            const newPools = await Pool.find({});
            await processPools(newPools);
        } else {
            await processPools(pools);
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

async function processPools(pools) {
    console.log('=== Simulating Pricing for Pools ===');
    console.log('Pool ID | Village | Crop | Category | Price (₹/q) | Source');
    console.log('-'.repeat(80));

    for (const pool of pools) {
        if (!pool.crops || pool.crops.length === 0) {
            console.log(`${pool._id} | ${pool.village} | NO_CROPS | - | - | -`);
            continue;
        }

        for (const crop of pool.crops) {
            // simulate fetching price for this crop
            const priceData = await getMarketPrice(crop);

            console.log(
                `${pool._id.toString().substring(0, 8)}... | ` +
                `${pool.village.padEnd(12)} | ` +
                `${crop.padEnd(12)} | ` +
                `${priceData.category.padEnd(10)} | ` +
                `₹${priceData.price.toString().padEnd(6)} | ` +
                `${priceData.source}`
            );
        }
    }
}

simulatePoolPricing();
