
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Pool } from '../src/models/pool.model.js';
import { processPooling } from '../src/services/pooling.service.js';

dotenv.config();

async function cleanTestPools(village) {
    await Pool.deleteMany({ village: village });
    console.log(`🧹 Cleaned up pools for village: ${village}`);
}

async function verifyScenario() {
    const testVillage = 'SCENARIO_VILLAGE_' + Date.now();

    console.log('🚀 Starting Specific Scenario Verification...');

    try {
        await connectMongo();
        await cleanTestPools(testVillage);

        const inputs = [
            { crop: 'WHEAT', qty: 2000 },
            { crop: 'SPINACH', qty: 500 },
            { crop: 'WHEAT', qty: 500 },
            { crop: 'SPINACH', qty: 2000 },
            { crop: 'APPLE', qty: 1000 },
            { crop: 'ONION', qty: 700 }
        ];

        console.log('\n📥 Processing Inputs:');
        for (const input of inputs) {
            console.log(`- Adding ${input.qty} ${input.crop}...`);
            await processPooling(input.crop, testVillage, input.qty);
        }

        console.log('\n📊 Checking Pools...');
        const pools = await Pool.find({ village: testVillage }).sort({ category: 1 });

        pools.forEach(pool => {
            console.log(`   > Pool ID: ${pool._id}`);
            console.log(`     Category: ${pool.category}`);
            console.log(`     Crops: ${pool.crops.join(', ')}`);
            console.log(`     Total Quantity: ${pool.total_quantity}`);
            console.log('     -------------------');
        });

        // Assertions
        const grainPool = pools.find(p => p.category === 'GRAIN');
        const leafyPool = pools.find(p => p.category === 'LEAFY');
        const fruitPool = pools.find(p => p.category === 'FRUIT');
        const vegPool = pools.find(p => p.category === 'VEGETABLE');

        console.log('\n✅ Verification Results:');

        // Check GRAIN Pool (Wheat)
        if (grainPool && grainPool.total_quantity === 2500 && grainPool.crops.includes('WHEAT')) {
            console.log('   [PASS] GRAIN Pool: 2500 (Wheat correctly aggregated)');
        } else {
            console.error(`   [FAIL] GRAIN Pool: Expected 2500, got ${grainPool ? grainPool.total_quantity : 'NONE'}`);
        }

        // Check LEAFY Pool (Spinach)
        if (leafyPool && leafyPool.total_quantity === 2500 && leafyPool.crops.includes('SPINACH')) {
            console.log('   [PASS] LEAFY Pool: 2500 (Spinach correctly aggregated)');
        } else {
            console.error(`   [FAIL] LEAFY Pool: Expected 2500, got ${leafyPool ? leafyPool.total_quantity : 'NONE'}`);
        }

        // Check FRUIT Pool (Apple)
        if (fruitPool && fruitPool.total_quantity === 1000 && fruitPool.crops.includes('APPLE')) {
            console.log('   [PASS] FRUIT Pool: 1000 (Apple correctly created)');
        } else {
            console.error(`   [FAIL] FRUIT Pool: Expected 1000, got ${fruitPool ? fruitPool.total_quantity : 'NONE'}`);
        }

        // Check VEGETABLE Pool (Onion)
        if (vegPool && vegPool.total_quantity === 700 && vegPool.crops.includes('ONION')) {
            console.log('   [PASS] VEGETABLE Pool: 700 (Onion correctly created)');
        } else {
            console.error(`   [FAIL] VEGETABLE Pool: Expected 700, got ${vegPool ? vegPool.total_quantity : 'NONE'}`);
        }

    } catch (err) {
        console.error('\n❌ FAILURE:', err);
    } finally {
        await cleanTestPools(testVillage);
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

verifyScenario();
