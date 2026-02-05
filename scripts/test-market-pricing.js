import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { getMarketPrice, getAllMarketPrices, getCommodityAveragePrice, getCategoryAveragePrice } from '../src/utils/marketPricing.js';

dotenv.config();

async function testPricingLogic() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB\n');

        console.log('=== Testing Exact Match Pricing ===');

        // Test crops that exist in CSV
        const exactMatchCrops = ['WHEAT', 'BAJRA', 'SOYABEAN', 'COTTON'];

        for (const crop of exactMatchCrops) {
            const result = await getMarketPrice(crop);
            console.log(`${crop}:`);
            console.log(`  Category: ${result.category}`);
            console.log(`  Price: ₹${result.price}/quintal`);
            console.log(`  Source: ${result.source}`);
            console.log();
        }

        console.log('=== Testing Category Fallback Pricing ===');

        // Test crops that DON'T exist in CSV but are in cropCategories
        const fallbackCrops = ['TOMATO', 'ONION', 'SPINACH', 'MANGO'];

        for (const crop of fallbackCrops) {
            const result = await getMarketPrice(crop);
            console.log(`${crop}:`);
            console.log(`  Category: ${result.category}`);
            console.log(`  Price: ₹${result.price}/quintal`);
            console.log(`  Source: ${result.source}`);
            console.log();
        }

        console.log('=== Testing Category Averages ===');

        const categories = ['GRAIN', 'VEGETABLE', 'LEAFY', 'FRUIT'];

        for (const category of categories) {
            const avgPrice = await getCategoryAveragePrice(category);
            console.log(`${category} Average: ₹${avgPrice}/quintal`);
        }

        console.log('\n=== Testing Commodity-Specific Averages ===');

        const commodities = ['WHEAT', 'BAJRA', 'SOYABEAN'];

        for (const commodity of commodities) {
            const avgPrice = await getCommodityAveragePrice(commodity);
            console.log(`${commodity} Average: ₹${avgPrice}/quintal`);
        }

        console.log('\n=== Testing All Market Prices (API Response) ===');

        const allPrices = await getAllMarketPrices();
        console.log(JSON.stringify(allPrices, null, 2));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

testPricingLogic();
