import { ServiceBooking, findAndCompleteExpiredBookings } from '../models/serviceBooking.model.js';
import { Service, markServiceAvailable } from '../models/service.model.js';

/**
 * Check for expired equipment bookings and release services
 * Runs every 5 minutes
 */
export async function checkExpiredBookings() {
    try {
        const now = new Date();

        // Find CONFIRMED bookings that have expired (end_time <= now)
        const expiredBookings = await findAndCompleteExpiredBookings();

        for (const booking of expiredBookings) {
            // Mark booking as completed
            await ServiceBooking.findByIdAndUpdate(booking._id, { status: 'COMPLETED' });

            // Release the service
            if (booking.service_id) {
                await markServiceAvailable(booking.service_id);
                console.log(`🔓 Service ${booking.service_id} released (booking ${booking._id} completed)`);
            }
        }

        if (expiredBookings.length > 0) {
            console.log(`⏰ Equipment scheduler: Released ${expiredBookings.length} expired booking(s)`);
        }

    } catch (err) {
        console.error('❌ Equipment expiry scheduler error:', err);
    }
}

/**
 * Start the equipment expiry scheduler
 * Runs an initial sweep and then every 5 minutes
 */
export function startEquipmentScheduler() {
    console.log('⏰ Equipment scheduler started: checking for expired bookings every 5 minutes...');

    // Run on startup
    checkExpiredBookings();

    // Run every 5 minutes (5 * 60 * 1000 = 300000ms)
    setInterval(checkExpiredBookings, 5 * 60 * 1000);
}
