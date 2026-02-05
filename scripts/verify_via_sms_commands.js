
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectMongo } from '../src/config/mongo.js';
import { Pool } from '../src/models/pool.model.js';
import { Farmer } from '../src/models/farmer.model.js';
import { handleSMS } from '../src/controllers/sms.controller.js';
import { Produce } from '../src/models/produce.model.js';

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

// Mock Response Object
const mockRes = {
    status: function (code) {
        return {
            json: function (data) {
                console.log(`   📩 Response: ${JSON.stringify(data.message || data)}`);
                return data;
            }
        };
    }
};

async function runTest() {
    const testVillage = 'SMS_ATTRIB_VILLAGE_' + Date.now();
    const phone1 = '+911111111111';
    const phone2 = '+912222222222';

    console.log('🚀 Starting SMS Attribution Verification...');

    try {
        await connectMongo();
        await cleanTestPools(testVillage);
        await createTestFarmer(phone1, 'Alice', testVillage);
        await createTestFarmer(phone2, 'Bob', testVillage);

        // Define inputs toggling between farmers
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 10);
        const dateStr = futureDate.toISOString().split('T')[0];

        const inputs = [
            // Farmer 1 (Alice) adds 2000 WHEAT (GRAIN)
            { phone: phone1, msg: `LOG WHEAT 2000 ${dateStr}` },
            // Farmer 2 (Bob) adds 300 RICE (GRAIN) -> Should join WHEAT pool
            { phone: phone2, msg: `LOG RICE 300 ${dateStr}` },
            // Farmer 1 (Alice) adds 500 SPINACH (LEAFY)
            { phone: phone1, msg: `LOG SPINACH 500 ${dateStr}` },
        ];

        console.log('\n📱 Sending SMS Commands...');

        for (const input of inputs) {
            console.log(`\n📤 Sending from ${input.phone}: "${input.msg}"`);
            await handleSMS({
                body: {
                    From: input.phone,
                    Body: input.msg
                }
            }, mockRes);
        }

        console.log('\n📊 Checking Pools for Attribution...');
        const pools = await Pool.find({ village: testVillage }).sort({ category: 1 });

        // Assertions
        let pass = true;

        // 1. Check GRAIN Pool (Wheat + Rice)
        const grainPool = pools.find(p => p.category === 'GRAIN');
        if (grainPool) {
            console.log(`\n✅ GRAIN Pool Found (${grainPool.total_quantity} kg)`);
            console.log(`   Crops: ${grainPool.crops.join(', ')}`);
            console.log(`   Contributions Table:`);

            // Print Contributions Table
            for (const c of grainPool.contributions) {
                const pname = c.farmerPhone === phone1 ? 'Alice' : 'Bob';
                const p = await Produce.findById(c.produceId);
                console.log(`   - ${pname} (${c.farmerPhone}) | Qty: ${c.quantity} | Produce: ${p?.crop}`);
            }

            // Verify Logic
            if (grainPool.total_quantity !== 2300) {
                console.error('❌ FAIL: Grain pool quantity mismatch. Expected 2300.');
                pass = false;
            }
            if (!grainPool.crops.includes('WHEAT') || !grainPool.crops.includes('RICE')) {
                console.error('❌ FAIL: Grain pool missing crops.');
                pass = false;
            }
            const c1 = grainPool.contributions.find(c => c.farmerPhone === phone1 && c.quantity === 2000);
            const c2 = grainPool.contributions.find(c => c.farmerPhone === phone2 && c.quantity === 300);

            if (c1) console.log('   [PASS] Alice verified (2000kg)');
            else { console.error('❌ FAIL: Alice missing or wrong qty'); pass = false; }

            if (c2) console.log('   [PASS] Bob verified (300kg)');
            else { console.error('❌ FAIL: Bob missing or wrong qty'); pass = false; }

        } else {
            console.error('❌ FAIL: Grain pool not found.');
            pass = false;
        }

        // 2. Check Leafy Pool
        const leafyPool = pools.find(p => p.category === 'LEAFY');
        if (leafyPool) {
            console.log(`\n✅ LEAFY Pool Found (${leafyPool.total_quantity} kg)`);
            const c3 = leafyPool.contributions.find(c => c.farmerPhone === phone1);
            if (c3 && c3.quantity === 500) console.log('   [PASS] Alice Spinach verified (500kg)');
            else { console.error('❌ FAIL: Alice Spinach attribution incorrect'); pass = false; }
        } else {
            console.error('❌ FAIL: Leafy pool not found.');
            pass = false;
        }


        if (pass) console.log('\n🎉 SMS ATTRIBUTION VERIFIED CORRECTLY!');
        else console.log('\n❌ SOME CHECKS FAILED.');

    } catch (err) {
        console.error('\n❌ FAILURE:', err);
    } finally {
        await cleanTestPools(testVillage);
        await Farmer.deleteMany({ phone: { $in: [phone1, phone2] } });
        await mongoose.disconnect();
        console.log('👋 Disconnected');
    }
}

runTest();
