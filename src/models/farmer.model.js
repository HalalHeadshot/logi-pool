import mongoose from 'mongoose';

const farmerSchema = new mongoose.Schema({
    name: String,
    phone: String,
    village: String,
    address: String,
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
