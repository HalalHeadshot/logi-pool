import mongoose from 'mongoose';
import { Pool } from '../src/models/pool.model.js';
import { Produce } from '../src/models/produce.model.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to DB');
    const pools = await Pool.find({});
    console.log(`Found ${pools.length} pools`);

    for (const pool of pools) {
        const produces = await Produce.find({ poolId: pool._id });
        console.log(`Pool ${pool._id} (${pool.targetVehicleType}, Status: ${pool.status}): ${produces.length} produce items`);
        if (produces.length === 0) {
            console.log(`   WARNING: Pool ${pool._id} has no produce!`);
        }
    }
    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
