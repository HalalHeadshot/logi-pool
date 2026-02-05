import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pool } from '../src/models/pool.model.js';

dotenv.config();

async function markPoolsCompleted() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // Find all pools that are not already COMPLETED
        const pools = await Pool.find({ status: { $ne: 'COMPLETED' } });
        console.log(`Found ${pools.length} pools to mark as COMPLETED\n`);

        if (pools.length === 0) {
            console.log('No pools to update.');
            return;
        }

        // Update each pool to COMPLETED
        for (const pool of pools) {
            await Pool.findByIdAndUpdate(pool._id, { status: 'COMPLETED' });
            console.log(`✓ Marked pool ${pool._id} (${pool.village}) as COMPLETED`);
        }

        console.log(`\n✅ Successfully marked ${pools.length} pools as COMPLETED`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

markPoolsCompleted();
