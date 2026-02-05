import express from 'express';
import { Pool } from '../models/pool.model.js';
import { getAllMarketPrices, getMarketPrice } from '../utils/marketPricing.js';

const router = express.Router();

// GET /api/warehouse/inventory - Fetch COMPLETED pools (not yet sold)
router.get('/inventory', async (req, res) => {
    try {
        const completedPools = await Pool.find({ status: 'COMPLETED' })
            .populate('contributions.produceId')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: completedPools.length,
            pools: completedPools
        });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/warehouse/en-route - Fetch ASSIGNED pools
router.get('/en-route', async (req, res) => {
    try {
        const enRoutePools = await Pool.find({ status: 'ASSIGNED' })
            .populate('contributions.produceId')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: enRoutePools.length,
            pools: enRoutePools
        });
    } catch (error) {
        console.error('Error fetching en-route pools:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/warehouse/sold - Fetch SOLD pools
router.get('/sold', async (req, res) => {
    try {
        const soldPools = await Pool.find({ status: 'SOLD' })
            .populate('contributions.produceId')
            .sort({ 'saleInfo.soldAt': -1 });

        res.json({
            success: true,
            count: soldPools.length,
            pools: soldPools
        });
    } catch (error) {
        console.error('Error fetching sold pools:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// GET /api/market/prices - Fetch market prices
router.get('/prices', async (req, res) => {
    try {
        const prices = await getAllMarketPrices();

        res.json({
            success: true,
            data: prices
        });
    } catch (error) {
        console.error('Error fetching market prices:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// POST /api/market/sell - Mark pool as SOLD
router.post('/sell', async (req, res) => {
    try {
        const { poolId, price } = req.body;

        if (!poolId || !price) {
            return res.status(400).json({
                success: false,
                error: 'poolId and price are required'
            });
        }

        const pool = await Pool.findById(poolId);

        if (!pool) {
            return res.status(404).json({
                success: false,
                error: 'Pool not found'
            });
        }

        const totalValue = price * pool.total_quantity;
        const soldAt = new Date();

        // Update pool to SOLD status with sale information
        await Pool.findByIdAndUpdate(poolId, {
            status: 'SOLD',
            saleInfo: {
                pricePerQuintal: price,
                totalValue: totalValue,
                soldAt: soldAt
            }
        });

        console.log(`💰 SALE COMPLETED: Pool ${poolId} sold at ₹${price}/quintal`);
        console.log(`   Total Quantity: ${pool.total_quantity} quintals`);
        console.log(`   Total Value: ₹${totalValue}`);
        console.log(`   Contributors: ${pool.contributions.length} farmers`);

        res.json({
            success: true,
            message: 'Sale recorded successfully',
            sale: {
                poolId,
                pricePerQuintal: price,
                quantity: pool.total_quantity,
                totalValue,
                soldAt
            }
        });
    } catch (error) {
        console.error('Error processing sale:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

export default router;
