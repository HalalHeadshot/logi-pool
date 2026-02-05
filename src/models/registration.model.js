import mongoose from 'mongoose';

const registrationSchema = new mongoose.Schema({
    phone: { type: String, required: true, unique: true },
    step: {
        type: String,
        enum: ['ASK_ROLE', 'ASK_NAME', 'ASK_ADDRESS', 'ASK_AADHAR', 'ASK_PAYLOAD'],
        default: 'ASK_ROLE'
    },
    data: {
        role: String,
        name: String,
        address: String,
        aadhar: String
    },
    updatedAt: { type: Date, default: Date.now }
});

// TTL index to auto-delete stale sessions after 1 hour
registrationSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 3600 });

export const RegistrationSession = mongoose.model('RegistrationSession', registrationSchema);

export async function getOrCreateSession(phone) {
    const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
    let session = await RegistrationSession.findOne({ phone: normalizedPhone });
    if (!session) {
        session = await RegistrationSession.create({ phone: normalizedPhone, step: 'ASK_ROLE', data: {} });
    }
    return session;
}

export async function updateSession(phone, updates) {
    const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
    return await RegistrationSession.findOneAndUpdate(
        { phone: normalizedPhone },
        { ...updates, updatedAt: new Date() },
        { new: true }
    );
}

export async function deleteSession(phone) {
    const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
    return await RegistrationSession.deleteOne({ phone: normalizedPhone });
}

export async function getSession(phone) {
    const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
    return await RegistrationSession.findOne({ phone: normalizedPhone });
}
