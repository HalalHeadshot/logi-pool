
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Pool } from '../src/models/pool.model.js';
import { Farmer } from '../src/models/farmer.model.js';
import { processPooling } from '../src/services/pooling.service.js';
import { saveProduce } from '../src/models/produce.model.js';

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

async function verifyAttribution() {
    const testVillage = 'ATTRIB_VILLAGE_' + Date.now();
    const phone1 = '+911111111111';
    const phone2 = '+912222222222';

    console.log('🚀 Starting Farmer Attribution Verification...');

    try {
        await connectMongo();
        await cleanTestPools(testVillage);
        await createTestFarmer(phone1, 'Farmer One', testVillage);
        await createTestFarmer(phone2, 'Farmer Two', testVillage);

        // 1. Farmer 1 adds 2000kg Wheat
        console.log(`\n➡️  ${phone1} adding 2000kg WHEAT...`);
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 5);

        await saveProduce(phone1, 'WHEAT', 2000, 'Addr1', testVillage, futureDate);
        await processPooling('WHEAT', testVillage, 2000, phone1);

        // 2. Farmer 2 adds 500kg Wheat
        console.log(`➡️  ${phone2} adding 500kg WHEAT...`);
        await saveProduce(phone2, 'WHEAT', 500, 'Addr2', testVillage, futureDate);
        await processPooling('WHEAT', testVillage, 500, phone2);

        // 3. Verify Pool
        console.log('\n📊 Checking Pool Attribution...');
        const pool = await Pool.findOne({ village: testVillage, category: 'GRAIN' });

        if (!pool) throw new Error('❌ Pool not found!');

        console.log(`✅ Pool Found: ${pool._id}`);
        console.log(`   Total Quantity: ${pool.total_quantity}`);
        console.log(`   Contributions: ${pool.contributions.length}`);

        pool.contributions.forEach((c, i) => {
            console.log(`   [${i + 1}] Farmer: ${c.farmerPhone}, Qty: ${c.quantity}, Added: ${c.addedAt}`);
        });

        // Assertions
        let pass = true;
        if (pool.total_quantity !== 2500) {
            console.error('❌ FAIL: Total quantity should be 2500');
            pass = false;
        }

        const c1 = pool.contributions.find(c => c.farmerPhone === phone1);
        const c2 = pool.contributions.find(c => c.farmerPhone === phone2);

        if (!c1 || c1.quantity !== 2000) {
            console.error(`❌ FAIL: Farmer 1 contribution incorrect. Expected 2000, found ${c1?.quantity}`);
            pass = false;
        }
        if (!c2 || c2.quantity !== 500) {
            console.error(`❌ FAIL: Farmer 2 contribution incorrect. Expected 500, found ${c2?.quantity}`);
            pass = false;
        }

        if (pass) console.log('\n🎉 ATTRIBUTION VERIFIED SUCCESSFULLY!');

    } catch (err) {
        console.error('\n❌ FAILURE:', err);
    } finally {
        await cleanTestPools(testVillage);
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

verifyAttribution();
