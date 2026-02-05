
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Pool } from '../src/models/pool.model.js';
import { Farmer } from '../src/models/farmer.model.js';
import { processPooling } from '../src/services/pooling.service.js';
import { saveProduce, Produce } from '../src/models/produce.model.js';

dotenv.config();

async function cleanTestPools(village) {
    await Pool.deleteMany({ village: village });
    console.log(`🧹 Cleaned up pools for village: ${village}`);
}

async function createTestFarmer(phone, name, village) {
    await Farmer.deleteMany({ phone });
    await Farmer.create({
        phone,
        name,
        address: `123 Test St, ${village}`,
        village,
        aadhar: Math.floor(100000000000 + Math.random() * 900000000000).toString()
    });
    console.log(`👨‍🌾 Created Farmer: ${name} (${phone})`);
}

async function verifyMixedAttribution() {
    const testVillage = 'MIXED_VILLAGE_' + Date.now();
    const phone1 = '+913333333333';
    const phone2 = '+914444444444';

    console.log('🚀 Starting Mixed Crop Attribution Verification...');

    try {
        await connectMongo();
        await cleanTestPools(testVillage);
        await createTestFarmer(phone1, 'Rice Farmer', testVillage);
        await createTestFarmer(phone2, 'Wheat Farmer', testVillage);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);

        // 1. Farmer 1 adds 1500kg RICE (GRAIN)
        console.log(`\n➡️  ${phone1} adding 1500kg RICE...`);
        await saveProduce(phone1, 'RICE', 1500, 'Addr1', testVillage, futureDate);
        await processPooling('RICE', testVillage, 1500, phone1);

        // 2. Farmer 2 adds 1200kg WHEAT (GRAIN)
        console.log(`➡️  ${phone2} adding 1200kg WHEAT...`);
        await saveProduce(phone2, 'WHEAT', 1200, 'Addr2', testVillage, futureDate);
        await processPooling('WHEAT', testVillage, 1200, phone2);

        // 3. Verify Pool
        console.log('\n📊 Checking Pool Attribution...');
        const pool = await Pool.findOne({ village: testVillage, category: 'GRAIN' });

        if (!pool) throw new Error('❌ Pool not found (GRAIN pool should exist)');

        console.log(`✅ Pool Found: ${pool._id}`);
        console.log(`   Category: ${pool.category}`);
        console.log(`   Total Quantity: ${pool.total_quantity}`);
        console.log(`   Crops in Pool: ${pool.crops.join(', ')}`);
        console.log(`   Contributions: ${pool.contributions.length}`);

        // Fetch detailed produce info for verification
        for (const c of pool.contributions) {
            const p = await Produce.findById(c.produceId);
            console.log(`   > Farmer: ${c.farmerPhone} | Qty: ${c.quantity} | Crop: ${p ? p.crop : 'Unknown'}`);
        }

        // Assertions
        let pass = true;

        // 1. Check Primary Full Pool (Should be 2500kg Mix of Rice + Wheat)
        if (pool.total_quantity !== 2500) {
            console.error(`❌ FAIL: Primary pool should be full (2500kg), got ${pool.total_quantity}`);
            pass = false;
        }

        // Crops array should contain both RICE and WHEAT
        if (!pool.crops.includes('RICE') || !pool.crops.includes('WHEAT')) {
            console.error(`❌ FAIL: Pool crops array missing items. Got: ${pool.crops}`);
            pass = false;
        }

        // Contributions
        const c1 = pool.contributions.find(c => c.farmerPhone === phone1);
        const c2 = pool.contributions.find(c => c.farmerPhone === phone2);

        if (!c1 || c1.quantity !== 1500) {
            console.error(`❌ FAIL: Rice Farmer contribution mismatch. Expected 1500.`);
            pass = false;
        }
        // Farmer 2 added 1200, but only 1000 fit in this pool (2500 - 1500 = 1000)
        if (!c2 || c2.quantity !== 1000) {
            console.error(`❌ FAIL: Wheat Farmer contribution mismatch. Expected 1000 (partial fill), got ${c2?.quantity}`);
            pass = false;
        }

        // 2. Check Overflow Pool (Should be 200kg Wheat)
        const overflowPool = await Pool.findOne({
            village: testVillage,
            category: 'GRAIN',
            _id: { $ne: pool._id }
        });

        if (overflowPool) {
            console.log(`\n✅ Overflow Pool Found: ${overflowPool._id}`);
            console.log(`   Quantity: ${overflowPool.total_quantity}`);
            if (overflowPool.total_quantity === 200) {
                console.log('   [PASS] Overflow correctly handled (200kg remaining)');
            } else {
                console.error(`❌ FAIL: Overflow quantity mismatch. Expected 200kg, got ${overflowPool.total_quantity}`);
                pass = false;
            }
        } else {
            console.error('❌ FAIL: No overflow pool found for remaining 200kg');
            pass = false;
        }

        if (pass) console.log('\n🎉 MIXED CROP ATTRIBUTION VERIFIED!');

    } catch (err) {
        console.error('\n❌ FAILURE:', err);
    } finally {
        await cleanTestPools(testVillage);
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

verifyMixedAttribution();
