import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { CommodityPrice } from '../src/models/commodityPrice.model.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CSV files in the root directory
const CSV_FILES = [
    'Mumbai ALL.csv',
    'Nagpur ALL.csv',
    'Nashik ALL.csv',
    'Pune ALL.csv',
    'Sangli ALL.csv',
    'Thane ALL.csv'
];

// Parse a single CSV file
function parseCSV(filePath, district) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);

    // Skip first 3 lines (headers)
    const dataLines = lines.slice(3);

    const records = [];

    for (const line of dataLines) {
        // Split by comma, but respect quoted fields
        const fields = line.split(',').map(f => f.replace(/^"|"$/g, '').trim());

        if (fields.length < 4) continue; // Skip incomplete lines

        const commodityGroup = fields[0];
        const commodity = fields[1];
        const mspStr = fields[2];
        const priceLatestStr = fields[3];

        // Skip if commodity group is empty
        if (!commodityGroup) continue;

        const msp = parseFloat(mspStr) || 0;
        const priceLatest = parseFloat(priceLatestStr) || 0;

        records.push({
            district,
            commodityGroup,
            commodity,
            msp,
            priceLatest
        });
    }

    return records;
}

// Main function
async function importCSVData() {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI);
        console.log('Connected to MongoDB');

        // Clear existing data
        await CommodityPrice.deleteMany({});
        console.log('Cleared existing commodity price data');

        const allRecords = [];

        // Parse all CSV files
        for (const csvFile of CSV_FILES) {
            const filePath = path.join(__dirname, '..', csvFile);
            const district = csvFile.replace(' ALL.csv', '');

            console.log(`Parsing ${csvFile}...`);
            const records = parseCSV(filePath, district);
            allRecords.push(...records);
            console.log(`  Found ${records.length} records`);
        }

        // Insert into database
        console.log(`\nInserting ${allRecords.length} total records into database...`);
        await CommodityPrice.insertMany(allRecords);
        console.log('✓ Data imported successfully');

        // Generate combined CSV
        console.log('\nGenerating combined CSV...');
        const combinedCSVPath = path.join(__dirname, '..', 'combined_commodity_prices.csv');
        const csvHeader = 'District,Commodity Group,Commodity,MSP (Rs./Quintal),Price (Rs./Quintal)\n';
        const csvRows = allRecords.map(r =>
            `${r.district},${r.commodityGroup},${r.commodity},${r.msp},${r.priceLatest}`
        ).join('\n');

        fs.writeFileSync(combinedCSVPath, csvHeader + csvRows);
        console.log(`✓ Combined CSV saved to: ${combinedCSVPath}`);

        console.log('\n=== Summary ===');
        console.log(`Total records: ${allRecords.length}`);
        console.log(`Districts: ${CSV_FILES.length}`);

    } catch (error) {
        console.error('Error importing CSV data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('\nDisconnected from MongoDB');
    }
}

// Run the import
importCSVData();
