
import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const MONGO_URI = "mongodb+srv://soumilsinha_db_user:VjNiugygV6ZMHgex@cluster0.esqfzu6.mongodb.net/logipool_db?appName=Cluster0";

const DriverSchema = new Schema({ phone: String });
const FarmerSchema = new Schema({ phone: String });
const SessionSchema = new Schema({ phone: String }); // Registration sessions

const Driver = mongoose.model('Driver', DriverSchema);
const Farmer = mongoose.model('Farmer', FarmerSchema);
const RegistrationSession = mongoose.model('RegistrationSession', SessionSchema);

async function clearDriver() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        const driverPhone = '+912121212121'; // Right Phone

        // Delete from all collections to ensure clean slate
        const d = await Driver.deleteMany({ phone: driverPhone });
        const f = await Farmer.deleteMany({ phone: driverPhone });
        const s = await RegistrationSession.deleteMany({ phone: driverPhone });

        console.log(`Deleted Driver records: ${d.deletedCount}`);
        console.log(`Deleted Farmer records (safety): ${f.deletedCount}`);
        console.log(`Deleted Active Sessions: ${s.deletedCount}`);

        console.log('✅ Driver number cleared! You can now register on the right phone.');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing driver:', error);
        process.exit(1);
    }
}

clearDriver();
