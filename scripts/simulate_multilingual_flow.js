
import { handleSMS } from '../src/controllers/sms.controller.js';
import mongoose from 'mongoose';
import 'dotenv/config';

// Mock Response Object
const mockRes = () => {
    const res = {};
    res.status = (code) => {
        res.statusCode = code;
        return res;
    };
    res.json = (data) => {
        console.log(`\n📤 [SYSTEM RESPONSE] Status: ${res.statusCode}`);
        console.log(`   Message: ${data.message || JSON.stringify(data)}\n`);
        return res;
    };
    return res;
};

// Helper for delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function simulateRefactoredFlow() {
    console.log('🚀 Starting Multilingual Flow Simulation...');

    try {
        // Connect to DB
        if (!process.env.MONGO_URI) throw new Error('MONGO_URI missing');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ DB Connected');

        const phone = '+919999977777'; // Different test phone to avoid state collision

        // Cleanup previous state
        const { RegistrationSession } = await import('../src/models/registration.model.js');
        const { Farmer } = await import('../src/models/farmer.model.js');
        await RegistrationSession.deleteOne({ phone });
        await Farmer.deleteOne({ phone });

        // Helper to send message
        const send = async (msg) => {
            console.log(`\n📱 [USER SENDS]: "${msg}"`);
            const req = { body: { From: phone, Body: msg } };
            await handleSMS(req, mockRes());
            await delay(2000);
        };

        // 1. User starts (Required)
        await send('START');

        // 2. User registers as Farmer
        await send('FARMER');
        await send('Raju Farmer');
        await send('Village Nashik');
        await send('123456789012'); // Aadhar

        // 3. Switch Language to Hindi
        await send('LANG HI');

        // 4. Ask for Help in Hindi
        await send('मदद'); // HELP

        // 5. Switch to Marathi
        await send('LANG MR');

        // 6. Ask for Help in Marathi
        await send('मदत'); // HELP

        console.log('🏁 Simulation Complete');
        process.exit(0);

    } catch (error) {
        console.error('❌ Simulation Error:', error);
        process.exit(1);
    }
}

simulateRefactoredFlow();
