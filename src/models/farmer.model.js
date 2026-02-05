import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    village: String,
    address: String,
    aadhar: { type: String, unique: true, sparse: true },
    total_dispatched_kg: { type: Number, default: 0 },
    reward_kg_balance: { type: Number, default: 0 },
    last_reward_checkpoint_kg: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

export const Farmer = mongoose.model('Farmer', farmerSchema);

export async function getFarmerByPhone(phone) {
    const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
    return await Farmer.findOne({ phone: normalizedPhone });
}

export async function createOrUpdateFarmer(phone, address, village) {
    const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
    return await Farmer.findOneAndUpdate(
        { phone: normalizedPhone },
        { address, village },
        { new: true, upsert: true }
    );
}
