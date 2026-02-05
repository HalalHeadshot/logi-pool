import { CommodityPrice } from '../models/commodityPrice.model.js';
import { CROP_CATEGORIES } from '../config/cropCategories.js';

const DEFAULT_BASE_PRICE = 2000; // Rs./Quintal fallback

/**
 * Normalize commodity name for matching
 * Example: "Bajra(Pearl Millet/Cumbu)" -> "BAJRA"
 */
function normalizeCommodityName(name) {
    if (!name) return '';
    // Extract the main name before any parentheses
    const mainName = name.split('(')[0].trim();
    return mainName.toUpperCase();
}

/**
 * Calculate average price for a specific commodity across all districts
 * @param {string} commodityName - Normalized commodity name
 * @returns {number} Average price or 0 if no data
 */
export async function getCommodityAveragePrice(commodityName) {
    const normalizedName = normalizeCommodityName(commodityName);

    const records = await CommodityPrice.find({
        commodity: { $regex: new RegExp(`^${normalizedName}`, 'i') }
    });

    if (records.length === 0) return 0;

    // Filter out zero prices and calculate average
    const validPrices = records
        .map(r => r.priceLatest)
        .filter(price => price > 0);

    if (validPrices.length === 0) return 0;

    const sum = validPrices.reduce((acc, price) => acc + price, 0);
    return Math.round(sum / validPrices.length);
}

/**
 * Calculate average price for all commodities in a category
 * @param {string} category - Category name (GRAIN, VEGETABLE, LEAFY, FRUIT)
 * @returns {number} Average price or DEFAULT_BASE_PRICE
 */
export async function getCategoryAveragePrice(category) {
    // Get all crops in this category
    const cropsInCategory = Object.entries(CROP_CATEGORIES)
        .filter(([_, cat]) => cat === category)
        .map(([crop, _]) => crop);

    // Get all commodity prices that match any crop in this category
    const allPrices = [];

    for (const crop of cropsInCategory) {
        const records = await CommodityPrice.find({
            commodity: { $regex: new RegExp(crop, 'i') }
        });

        const validPrices = records
            .map(r => r.priceLatest)
            .filter(price => price > 0);

        allPrices.push(...validPrices);
    }

    if (allPrices.length === 0) return DEFAULT_BASE_PRICE;

    const sum = allPrices.reduce((acc, price) => acc + price, 0);
    return Math.round(sum / allPrices.length);
}

/**
 * Get market price for a crop with fallback logic
 * @param {string} cropName - Crop name from farmer input
 * @returns {Object} { crop, category, price, source }
 */
export async function getMarketPrice(cropName) {
    const normalizedCrop = cropName.toUpperCase();
    const category = CROP_CATEGORIES[normalizedCrop];

    if (!category) {
        return {
            crop: cropName,
            category: 'UNKNOWN',
            price: DEFAULT_BASE_PRICE,
            source: 'default'
        };
    }

    // Try exact match first
    const exactPrice = await getCommodityAveragePrice(cropName);

    if (exactPrice > 0) {
        return {
            crop: cropName,
            category,
            price: exactPrice,
            source: 'exact'
        };
    }

    // Fallback to category average
    const categoryPrice = await getCategoryAveragePrice(category);

    return {
        crop: cropName,
        category,
        price: categoryPrice,
        source: 'category'
    };
}

/**
 * Get all market prices grouped by category
 * @returns {Object} Prices grouped by category with unique commodities
 */
export async function getAllMarketPrices() {
    const categories = ['GRAIN', 'VEGETABLE', 'LEAFY', 'FRUIT'];
    const result = {};

    // Get all unique commodities from database
    const allCommodities = await CommodityPrice.aggregate([
        {
            $group: {
                _id: '$commodity',
                avgPrice: { $avg: '$priceLatest' },
                msp: { $first: '$msp' },
                commodityGroup: { $first: '$commodityGroup' }
            }
        },
        { $match: { avgPrice: { $gt: 0 } } },
        { $sort: { _id: 1 } }
    ]);

    // Add unique commodities (only once, not duplicated across categories)
    result['COMMODITIES'] = allCommodities.map(r => ({
        commodity: r._id,
        price: Math.round(r.avgPrice),
        msp: r.msp,
        group: r.commodityGroup
    }));

    // Add category averages
    for (const category of categories) {
        const categoryAvg = await getCategoryAveragePrice(category);
        result[category + '_AVERAGE'] = categoryAvg;
    }

    return result;
}
