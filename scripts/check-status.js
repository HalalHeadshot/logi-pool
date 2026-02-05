import mongoose from 'mongoose';
import { Driver } from '../src/models/driver.model.js';
import { Pool } from '../src/models/pool.model.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
    const drivers = await Driver.find({});
    console.log('=== DRIVERS ===');
    drivers.forEach(d => console.log(d.phone + ' - ' + d.name + ' (' + d.vehicleType + ') - ' + d.village));

    const pools = await Pool.find({ crops: 'SPINACH' });
    console.log('\n=== SPINACH POOLS ===');
    pools.forEach(p => console.log(p.total_quantity + 'kg - ' + p.status + ' - ' + p.targetVehicleType));

    process.exit();
});
