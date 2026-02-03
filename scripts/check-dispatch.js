import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import { Dispatch } from '../src/models/dispatch.model.js';

await mongoose.connect(process.env.MONGO_URI);

const dispatch = await Dispatch.findById('698262a46772cce8aaa6b65a');
console.log('Dispatch:', JSON.stringify(dispatch, null, 2));

// Also check by driver phone
const dispatchByPhone = await Dispatch.findOne({ driver_phone: '+919930485708' }).sort({ createdAt: -1 });
console.log('\nLatest dispatch for +919930485708:', JSON.stringify(dispatchByPhone, null, 2));

process.exit(0);
