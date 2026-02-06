import { Pool } from '../models/pool.model.js';
import { getSystemStats } from './equipment.controller.js';

export async function getUIData(req, res) {
    try {
        const stats = await getSystemStats();

        // Get latest active pool (READY or ASSIGNED)
        // We prioritize ASSIGNED pools to show active jobs, then READY pools
        const pools = await Pool.find({
            status: { $in: ['READY', 'ASSIGNED'] }
        }).sort({ createdAt: -1 }).limit(1);

        const response = {
            stats: stats.success ? {
                totalServices: stats.totalServices,
                availableServices: stats.availableServices,
                totalBookings: stats.totalBookings,
                activeBookings: stats.activeBookings
            } : {
                totalServices: 0,
                availableServices: 0,
                totalBookings: 0,
                activeBookings: 0
            },
            recentSMS: [], // Placeholder
            pools: pools,
            bookings: [],
            services: []
        };

        res.json(response);
    } catch (error) {
        console.error('UI Data Error:', error);
        res.status(500).json({ error: 'Failed to fetch UI data' });
    }
}
