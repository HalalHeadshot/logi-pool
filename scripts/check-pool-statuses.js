import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pool } from '../src/models/pool.model.js';

dotenv.config();

async function checkPoolStatuses() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const allPools = await Pool.find({});
        console.log(`Total pools in database: ${allPools.length}\n`);

        if (allPools.length === 0) {
            console.log('No pools found in database.');
            return;
        }

        // Group by status
        const byStatus = {};
        allPools.forEach(pool => {
            const status = pool.status || 'UNKNOWN';
            if (!byStatus[status]) byStatus[status] = [];
            byStatus[status].push(pool);
        });

        console.log('Pools by status:');
        Object.entries(byStatus).forEach(([status, pools]) => {
            console.log(`\n${status}: ${pools.length} pools`);
            pools.forEach(pool => {
                console.log(`  - ${pool._id} | ${pool.village} | ${pool.crops.join(', ')} | ${pool.total_quantity}kg`);
            });
        });

        // Show first few pools in detail
        console.log('\n\nFirst 3 pools (detailed):');
        allPools.slice(0, 3).forEach(pool => {
            console.log(JSON.stringify(pool, null, 2));
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

checkPoolStatuses();
