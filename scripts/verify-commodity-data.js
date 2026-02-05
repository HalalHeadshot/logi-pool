import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CommodityPrice } from '../src/models/commodityPrice.model.js';

dotenv.config();

async function verifyData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        const count = await CommodityPrice.countDocuments();
        console.log(`Total records in database: ${count}\n`);

        // Show sample records
        console.log('Sample records:');
        const samples = await CommodityPrice.find().limit(5);
        samples.forEach(record => {
            console.log(`  ${record.district} | ${record.commodityGroup} | ${record.commodity} | MSP: ₹${record.msp} | Price: ₹${record.priceLatest}`);
        });

        // Group by district
        console.log('\nRecords per district:');
        const districts = await CommodityPrice.aggregate([
            { $group: { _id: '$district', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);
        districts.forEach(d => {
            console.log(`  ${d._id}: ${d.count} records`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
    }
}

verifyData();
