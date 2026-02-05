
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { getOrCreatePool, Pool } from '../src/models/pool.model.js';
import { CROP_CATEGORIES } from '../src/config/cropCategories.js';

dotenv.config();

async function cleanTestPools(village) {
    await Pool.deleteMany({ village: village });
    console.log(`🧹 Cleaned up pools for village: ${village}`);
}

async function verifyPooling() {
    const testVillage = 'TEST_VILLAGE_' + Date.now();

    console.log('🚀 Starting Crop Type Pooling Verification...');

    try {
        await connectMongo();

        // Setup: Clean slate
        await cleanTestPools(testVillage);

        // Test 1: Add WHEAT (GRAIN)
        console.log('\n--- Test 1: Add WHEAT (GRAIN) ---');
        const pool1 = await getOrCreatePool('WHEAT', testVillage);
        console.log(`✅ Pool 1 Created: ID=${pool1._id}, Category=${pool1.category}`);
        if (pool1.category !== 'GRAIN') throw new Error('Pool 1 category mismatch');

        // Test 2: Add RICE (GRAIN) -> Should match Pool 1
        console.log('\n--- Test 2: Add RICE (GRAIN) ---');
        const pool2 = await getOrCreatePool('RICE', testVillage);
        console.log(`✅ Pool 2 Fetched: ID=${pool2._id}, Category=${pool2.category}`);

        if (pool1._id.toString() !== pool2._id.toString()) {
            throw new Error(`❌ Failed: RICE should have joined WHEAT pool! Got ${pool2._id} instead of ${pool1._id}`);
        } else {
            console.log('✅ Success: RICE joined existing GRAIN pool');
        }

        // Test 3: Add TOMATO (VEGETABLE) -> Should create NEW pool
        console.log('\n--- Test 3: Add TOMATO (VEGETABLE) ---');
        const pool3 = await getOrCreatePool('TOMATO', testVillage);
        console.log(`✅ Pool 3 Created: ID=${pool3._id}, Category=${pool3.category}`);

        if (pool3._id.toString() === pool1._id.toString()) {
            throw new Error('❌ Failed: TOMATO joined GRAIN pool! Should be separate.');
        }
        if (pool3.category !== 'VEGETABLE') throw new Error('Pool 3 category mismatch');
        console.log('✅ Success: TOMATO created a separate VEGETABLE pool');

        // Test 4: Invalid Crop -> Should Throw Error
        console.log('\n--- Test 4: Invalid Crop Handling ---');
        try {
            await getOrCreatePool('UNKNOWN_CROP', testVillage);
            throw new Error('❌ Failed: Should have thrown error for UNKNOWN_CROP');
        } catch (err) {
            if (err.message.includes('Unknown crop type')) {
                console.log(`✅ Success: Correctly rejected invalid crop with error: "${err.message}"`);
            } else {
                throw new Error(`❌ Failed: Threw unexpected error: ${err.message}`);
            }
        }

        console.log('\n🎉 ALL TESTS PASSED!');

    } catch (err) {
        console.error('\n❌ VERIFICATION FAILED:', err);
        process.exit(1);
    } finally {
        await cleanTestPools(testVillage);
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

verifyPooling();
