import {
    Service,
    registerService,
    getAvailableService,
    getAvailableServicesInVillage,
    getServicesByPhone,
    markServiceUnavailable,
    markServiceAvailable,
    markServiceAvailableByOwner
} from '../models/service.model.js';

import {
    ServiceBooking,
    createBooking,
    getBookingsByFarmerPhone,
    getBusyServiceIds,
    completeBookingByOwner
} from '../models/serviceBooking.model.js';

import { extractVillageFromAddress } from '../services/location.service.js';
import { generateGoogleMapsLink } from '../services/maps.service.js';
import { getDriverByPhone, Driver, createOrUpdateDriver } from '../models/driver.model.js';

/**
 * Book a service (RENT command)
 * @param {string} type - Service type (TRACTOR, PLOUGH, etc.)
 * @param {number} hours - Number of hours to rent
 * @param {string} farmerPhone - Farmer's phone number
 * @param {string} farmerAddress - Farmer's address
 * @param {Date} startTime - Optional start time (defaults to now)
 * @returns {Object} Booking result with message and details
 */
export async function bookEquipment(type, hours, farmerPhone, farmerAddress, startTime = null) {
    try {
        const typeUpper = type.toUpperCase();

        // Extract village from farmer's address
        let farmerVillage = await extractVillageFromAddress(farmerAddress);

        if (!farmerVillage) {
            return { success: false, message: '❌ Could not extract village from address' };
        }

        farmerVillage = farmerVillage.toUpperCase();
        const now = new Date();
        const start = startTime ? new Date(startTime) : now;

        // Check if booking is too far in advance (max 48 hours)
        const hoursAhead = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        if (hoursAhead > 48) {
            return { success: false, message: '❌ You can only pre-book up to 2 days in advance' };
        }

        // Find busy services (with active bookings)
        const busyServiceIds = await getBusyServiceIds(start);

        // Find available service (exclude for_pooling_only trucks)
        const service = await Service.findOne({
            type: typeUpper,
            $or: [
                { village: new RegExp(`^${farmerVillage}$`, 'i') },
                { 'location.village': new RegExp(`^${farmerVillage}$`, 'i') }
            ],
            _id: { $nin: busyServiceIds },
            available: true,
            for_pooling_only: { $ne: true }  // Exclude driver trucks
        });

        // No available service - find earliest availability
        if (!service) {
            const allServices = await Service.find({
                type: typeUpper,
                $or: [
                    { village: new RegExp(`^${farmerVillage}$`, 'i') },
                    { 'location.village': new RegExp(`^${farmerVillage}$`, 'i') }
                ]
            });

            if (allServices.length === 0) {
                return {
                    success: false,
                    message: `❌ No ${typeUpper} registered in ${farmerVillage}`
                };
            }

            // Find earliest available time
            const upcoming = await ServiceBooking.find({
                service_id: { $in: allServices.map(s => s._id) },
                status: 'CONFIRMED',
                end_time: { $gt: now }
            }).sort({ end_time: 1 });

            const earliestAvailable = upcoming[0]?.end_time;

            return {
                success: false,
                message: `🚜 All ${typeUpper}s in ${farmerVillage} are currently rented`,
                earliest_available_at: earliestAvailable
            };
        }

        // Calculate pricing
        const end = new Date(start.getTime() + hours * 60 * 60 * 1000);
        const originalPrice = hours * (service.price_per_hour || 0);
        const finalPrice = originalPrice; // No discount for now

        // Create booking
        const booking = await createBooking(
            service._id,
            farmerPhone,
            farmerVillage,
            farmerAddress,
            start,
            end,
            originalPrice,
            finalPrice
        );

        // Mark service as unavailable
        await markServiceUnavailable(service._id);

        // Generate Google Maps link
        const ownerAddress = service.location?.address || service.location?.village || service.village || farmerVillage;
        const mapLink = generateGoogleMapsLink([ownerAddress, farmerAddress]);

        return {
            success: true,
            message: `✅ ${typeUpper} booked successfully!`,
            service: {
                type: service.type,
                owner_name: service.owner_name || 'Owner',
                phone: service.phone || service.owner_phone,
                village: service.location?.village || service.village,
                owner_address: service.location?.address
            },
            booking: {
                _id: booking._id,
                start_time: start,
                end_time: end,
                original_price: originalPrice,
                discount_percentage: 0,
                discount_amount: 0,
                final_price: finalPrice
            },
            maps_link: mapLink
        };

    } catch (err) {
        console.error('❌ Equipment booking error:', err);
        return { success: false, message: '❌ Server error during booking' };
    }
}

/**
 * Register a new service (REGISTER command)
 * @param {string} type - Service type
 * @param {string} address - Full address
 * @param {number} pricePerHour - Hourly rate
 * @param {string} phone - Owner's phone
 * @param {string} ownerName - Owner's name
 * @returns {Object} Registration result
 */
export async function registerEquipment(type, address, pricePerHour, phone, ownerName) {
    try {
        const typeUpper = type.toUpperCase();

        // Validate type (TRUCK is also valid but handled specially)
        const validTypes = ['TRACTOR', 'PLOUGH', 'LABOUR', 'WAREHOUSE', 'TRUCK'];
        if (!validTypes.includes(typeUpper)) {
            return {
                success: false,
                message: `❌ Invalid type. Use: ${validTypes.join(', ')}`
            };
        }

        // Extract village from address
        let village = await extractVillageFromAddress(address);
        if (!village) {
            // Fallback: use last word of address
            const words = address.replace(/[^\w\s]/gi, '').split(/\s+/);
            village = words[words.length - 1] || 'UNKNOWN';
        }
        village = village.toUpperCase();

        // Handle TRUCK type specially - auto-creates driver for Logi-Pool
        let truckOptions = {};
        if (typeUpper === 'TRUCK') {
            // Check if driver already has a truck registered
            const existingDriver = await getDriverByPhone(phone);
            if (existingDriver && existingDriver.truckId) {
                return {
                    success: false,
                    message: '❌ You already have a truck registered. Use MYSERVICES to view it.'
                };
            }

            // Determine vehicle type - use passed value or default to REGULAR
            // vehicleType can be passed via truckOptions.vehicle_type from SMS controller
            const vehicleType = truckOptions.vehicle_type || 'REGULAR';

            // Create or update driver record automatically
            const driver = await createOrUpdateDriver(phone, ownerName, village, vehicleType);

            // Set truck-specific options
            truckOptions = {
                for_pooling_only: true,
                driver_phone: phone,
                vehicle_type: driver.vehicleType
            };
        }

        // Register the service
        const service = await registerService(
            typeUpper,
            phone,
            village,
            ownerName,
            address,
            pricePerHour,
            truckOptions
        );

        // If TRUCK, link truck to driver profile
        if (typeUpper === 'TRUCK') {
            const normalizedPhone = '+' + phone.replace(/[\s+]/g, '');
            await Driver.findOneAndUpdate(
                { phone: normalizedPhone },
                { truckId: service._id }
            );
        }

        return {
            success: true,
            message: typeUpper === 'TRUCK' ? '🚛 Truck registered for Logi-Pool!' : '🚜 Service registered successfully',
            service: {
                _id: service._id,
                type: service.type,
                owner_name: service.owner_name,
                phone: service.phone,
                village: service.location?.village || service.village,
                address: service.location?.address,
                price_per_hour: service.price_per_hour,
                vehicle_type: service.vehicle_type,
                for_pooling_only: service.for_pooling_only
            }
        };

    } catch (err) {
        console.error('❌ Equipment registration error:', err);
        return { success: false, message: '❌ Server error during registration' };
    }
}

/**
 * Get available services in a village (AVAILABLE command)
 * @param {string} village - Village name
 * @returns {Object} List of available services
 */
export async function getAvailableEquipment(village) {
    try {
        const services = await getAvailableServicesInVillage(village);

        if (services.length === 0) {
            return {
                success: false,
                message: `📭 No available services in ${village.toUpperCase()}`
            };
        }

        return {
            success: true,
            village: village.toUpperCase(),
            count: services.length,
            services: services.map(s => ({
                type: s.type,
                owner_name: s.owner_name || 'Owner',
                price_per_hour: s.price_per_hour || 0,
                phone: s.phone || s.owner_phone
            }))
        };

    } catch (err) {
        console.error('❌ Get available equipment error:', err);
        return { success: false, message: '❌ Server error' };
    }
}

/**
 * Get owner's registered services (MYSERVICES command)
 * @param {string} phone - Owner's phone number
 * @returns {Object} List of services
 */
export async function getMyServices(phone) {
    try {
        const services = await getServicesByPhone(phone);

        if (services.length === 0) {
            return {
                success: false,
                message: `📭 No services registered with phone ${phone}`
            };
        }

        return {
            success: true,
            count: services.length,
            services: services.map(s => ({
                type: s.type,
                village: s.location?.village || s.village,
                price_per_hour: s.price_per_hour || 0,
                available: s.available
            }))
        };

    } catch (err) {
        console.error('❌ Get my services error:', err);
        return { success: false, message: '❌ Server error' };
    }
}

/**
 * Get farmer's bookings (MYBOOKINGS command)
 * @param {string} phone - Farmer's phone number
 * @returns {Object} List of bookings
 */
export async function getMyBookings(phone) {
    try {
        const bookings = await getBookingsByFarmerPhone(phone, 5);

        if (bookings.length === 0) {
            return {
                success: false,
                message: `📭 No bookings found for ${phone}`
            };
        }

        return {
            success: true,
            count: bookings.length,
            bookings: bookings.map(b => ({
                type: b.service_id?.type || 'N/A',
                status: b.status,
                final_price: b.final_price || 0,
                date: b.start_time || b.createdAt
            }))
        };

    } catch (err) {
        console.error('❌ Get my bookings error:', err);
        return { success: false, message: '❌ Server error' };
    }
}

/**
 * Get system statistics (STATS command)
 * @returns {Object} System stats
 */
export async function getSystemStats() {
    try {
        const totalServices = await Service.countDocuments();
        const availableServices = await Service.countDocuments({ available: true });
        const totalBookings = await ServiceBooking.countDocuments();
        const activeBookings = await ServiceBooking.countDocuments({
            status: { $in: ['ACTIVE', 'CONFIRMED'] }
        });

        return {
            success: true,
            totalServices,
            availableServices,
            totalBookings,
            activeBookings
        };

    } catch (err) {
        console.error('❌ Get stats error:', err);
        return { success: false, message: '❌ Server error' };
    }
}

/**
 * Handle equipment DONE (mark service complete and release)
 * @param {string} ownerPhone - Owner's phone number
 */
export async function handleEquipmentDone(ownerPhone) {
    await completeBookingByOwner(ownerPhone);
    await markServiceAvailableByOwner(ownerPhone);
}
