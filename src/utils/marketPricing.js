import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CROP_CATEGORIES } from '../config/cropCategories.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the CSV file (adjust relative path as needed)
// Assuming CSV is in the root of logi-pool, so two levels up from src/utils/
const CSV_PATH = path.join(__dirname, '../../combined_commodity_prices.csv');

const DEFAULT_BASE_PRICE = 2000; // Rs./Quintal fallback

/**
 * Helper to read and parse the CSV file.
 * Returns an array of objects: { district, group, commodity, msp, price }
 */
function readCsvData() {
    try {
        if (!fs.existsSync(CSV_PATH)) {
            console.error('CSV file not found at:', CSV_PATH);
            return [];
        }

        const fileContent = fs.readFileSync(CSV_PATH, 'utf-8');
        const lines = fileContent.split('\n').filter(line => line.trim() !== '');

        // Expected Header: District,Commodity Group,Commodity,MSP (Rs./Quintal),Price (Rs./Quintal)
        const data = [];

        for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Simple split by comma (assuming no commas in fields for now)
            const parts = line.split(',');

            // Handle cases where comma might be inside a field (basic handling)
            // But looking at the provided CSV, simpler split might suffice for now
            // If strictly following the provided file content:
            // 0: District, 1: Group, 2: Commodity, 3: MSP, 4: Price

            if (parts.length < 5) continue;

            const district = parts[0].trim();
            const group = parts[1].trim();
            // Handle commodity name which might span if logic was complex, but trusting index 2
            // Note: Line 6 in provided file: "Mumbai,Oil Seeds,Sesamum(Sesame,0,0" -> looks like missing closing paren?
            // We take index 2 as Commodity
            const commodity = parts[2].trim();

            const msp = parseFloat(parts[3]) || 0;
            const price = parseFloat(parts[4]) || 0;

            data.push({
                district,
                group,
                commodity,
                msp,
                price
            });
        }

        return data;

    } catch (error) {
        console.error('Error reading CSV:', error);
        return [];
    }
}

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
 * Get aggregated market data from CSV
 */
function getAggregatedData() {
    const rawData = readCsvData();
    const commodityMap = new Map();

    rawData.forEach(item => {
        // Skip items with 0 price if we want only valid market rates?
        // But keeping them might be useful if MSP exists. 
        // Let's filter for valid price > 0 for market price average.
        if (item.price > 0) {
            const key = item.commodity; // logical grouping by exact commodity name string
            if (!commodityMap.has(key)) {
                commodityMap.set(key, {
                    name: item.commodity,
                    group: item.group,
                    totalPrice: 0,
                    count: 0,
                    msp: item.msp
                });
            }
            const entry = commodityMap.get(key);
            entry.totalPrice += item.price;
            entry.count += 1;
            // distinct MSP handling? Assuming MSP is constant per commodity usually
            if (entry.msp === 0 && item.msp > 0) entry.msp = item.msp;
        }
    });

    return Array.from(commodityMap.values()).map(c => ({
        commodity: c.name,
        price: Math.round(c.totalPrice / c.count),
        msp: c.msp,
        group: c.group
    }));
}

/**
 * Calculate average price for a specific commodity across all districts
 * @param {string} commodityName - Commodity name to search for
 * @returns {number} Average price or 0 if no data
 */
export async function getCommodityAveragePrice(commodityName) {
    const normalizedTarget = normalizeCommodityName(commodityName);
    const rawData = readCsvData();

    // Filter for matches
    const validPrices = rawData
        .filter(item => {
            const itemNorm = normalizeCommodityName(item.commodity);
            return itemNorm === normalizedTarget || itemNorm.includes(normalizedTarget) || normalizedTarget.includes(itemNorm);
        })
        .map(item => item.price)
        .filter(price => price > 0);

    if (validPrices.length === 0) return 0;

    const sum = validPrices.reduce((acc, price) => acc + price, 0);
    return Math.round(sum / validPrices.length);
}

/**
 * Calculate average price for all commodities in a category
 * @param {string} category - Category name (e.g., 'Cereals', 'Pulses') 
 * Note: Input category might be from CROP_CATEGORIES ('GRAIN' etc) or CSV group ('Cereals')
 * we need to map them if possible.
 * @returns {number} Average price or DEFAULT_BASE_PRICE
 */
export async function getCategoryAveragePrice(category) {
    const rawData = readCsvData();

    // Mapping internal CROP_CATEGORIES to CSV Groups if needed
    // CSV Groups: 'Cereals', 'Oil Seeds', 'Pulses', 'Fibre Crops', etc.
    // CROP_CATEGORIES: 'GRAIN', 'VEGETABLE', 'LEAFY', 'FRUIT'

    // Simple heuristic regex or mapping
    let csvGroupRegex;
    if (category === 'GRAIN') csvGroupRegex = /Cereals/i;
    else if (category === 'VEGETABLE') csvGroupRegex = /Vegetable|Pulses/i; // Loose mapping
    else csvGroupRegex = new RegExp(category, 'i');

    const validPrices = rawData
        .filter(item => csvGroupRegex.test(item.group))
        .map(item => item.price)
        .filter(price => price > 0);

    if (validPrices.length === 0) return DEFAULT_BASE_PRICE;

    const sum = validPrices.reduce((acc, price) => acc + price, 0);
    return Math.round(sum / validPrices.length);
}

/**
 * Get market price for a crop with fallback logic
 * @param {string} cropName - Crop name from farmer input
 * @returns {Object} { crop, category, price, source }
 */
export async function getMarketPrice(cropName) {
    const normalizedCrop = cropName.toUpperCase();
    const category = CROP_CATEGORIES[normalizedCrop];

    const exactPrice = await getCommodityAveragePrice(cropName);

    if (exactPrice > 0) {
        return {
            crop: cropName,
            category: category || 'UNKNOWN',
            price: exactPrice,
            source: 'exact'
        };
    }

    // Fallback
    const catPrice = category ? await getCategoryAveragePrice(category) : DEFAULT_BASE_PRICE;

    return {
        crop: cropName,
        category: category || 'UNKNOWN',
        price: catPrice,
        source: 'category'
    };
}

/**
 * Get all market prices grouped by category
 * @returns {Object} Prices grouped by category with unique commodities
 */
export async function getAllMarketPrices() {
    const aggregatedCommodities = getAggregatedData();

    // Sort logic
    aggregatedCommodities.sort((a, b) => a.commodity.localeCompare(b.commodity));

    const result = {
        COMMODITIES: aggregatedCommodities
    };

    // Calculate averages for specific broad categories expected by UI
    // The UI uses GRAIN_AVERAGE, etc. for fallbacks? 
    // Actually looking at app.js line 341: data.data.GRAIN_AVERAGE

    // We can calculate these averages on the fly from the aggregated data
    const categories = ['Cereals', 'Pulses', 'Oil Seeds', 'Fibre Crops']; // CSV groups

    // Map CSV groups to UI expected keys if necessary, or just provide averages for CSV groups
    // The UI mainly iterates COMMODITIES.

    return result;
}

