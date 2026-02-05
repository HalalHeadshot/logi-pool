import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Pool } from '../src/models/pool.model.js';

dotenv.config();

async function testSellEndpoint() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        // Find a COMPLETED pool
        const pool = await Pool.findOne({ status: 'COMPLETED' });

        if (!pool) {
            console.log('No COMPLETED pools found to test with.');
            return;
        }

        console.log(`Testing with pool: ${pool._id}`);
        console.log(`Village: ${pool.village}`);
        console.log(`Crops: ${pool.crops.join(', ')}`);
        console.log(`Quantity: ${pool.total_quantity}\n`);

        // Simulate selling at 3000/quintal
        const price = 3000;
        const totalValue = price * pool.total_quantity;
        const soldAt = new Date();

        console.log('Updating pool to SOLD status...');
        await Pool.findByIdAndUpdate(pool._id, {
            status: 'SOLD',
            saleInfo: {
                pricePerQuintal: price,
                totalValue: totalValue,
                soldAt: soldAt
            }
        });

        // Verify the update
        const updatedPool = await Pool.findById(pool._id);
        console.log('\n✅ Pool updated successfully!');
        console.log(`Status: ${updatedPool.status}`);
        console.log(`Sale Price: ₹${updatedPool.saleInfo.pricePerQuintal}/quintal`);
        console.log(`Total Value: ₹${updatedPool.saleInfo.totalValue.toLocaleString()}`);
        console.log(`Sold At: ${updatedPool.saleInfo.soldAt}`);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

testSellEndpoint();
