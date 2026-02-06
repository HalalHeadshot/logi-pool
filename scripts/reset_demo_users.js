
import mongoose from 'mongoose';
import { Schema } from 'mongoose';

const MONGO_URI = "mongodb+srv://soumilsinha_db_user:VjNiugygV6ZMHgex@cluster0.esqfzu6.mongodb.net/logipool_db?appName=Cluster0";

// Define simplified schemas for this script
const FarmerSchema = new Schema({
    phone: String,
    name: String,
    address: String,
    village: String,
    language: String
});

const DriverSchema = new Schema({
    phone: String,
    name: String,
    vehicleType: String,
    language: String,
    available: Boolean,
    address: String,
    village: String
});

const Farmer = mongoose.model('Farmer', FarmerSchema);
const Driver = mongoose.model('Driver', DriverSchema);

async function resetUsers() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log('Connected to MongoDB');

        // Define numbers
        const farmerPhone = '+911212121212'; // Left Phone
        const driverPhone = '+912121212121'; // Right Phone

        // 1. Clean up
        await Farmer.deleteMany({ phone: { $in: [farmerPhone, driverPhone] } });
        await Driver.deleteMany({ phone: { $in: [farmerPhone, driverPhone] } });
        console.log('Cleaned up old records for demo numbers');

        // 2. Create Farmer
        await Farmer.create({
            phone: farmerPhone,
            name: "Demo Farmer",
            address: "Farm House, Punjab",
            village: "PUNJAB", // Matched village for demo logic
            language: "en"
        });
        console.log(`Created Farmer: ${farmerPhone}`);

        // 3. Create Driver
        await Driver.create({
            phone: driverPhone,
            name: "Demo Driver",
            address: "Transport Nagar, Punjab",
            village: "PUNJAB",
            vehicleType: "REGULAR",
            language: "en",
            available: true
        });
        console.log(`Created Driver: ${driverPhone}`);

        console.log('✅ Demo users reset successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error resetting users:', error);
        process.exit(1);
    }
}

resetUsers();
