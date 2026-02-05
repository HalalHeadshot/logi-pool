import mongoose from 'mongoose';

const commodityPriceSchema = new mongoose.Schema({
    district: String,
    commodityGroup: String,
    commodity: String,
    msp: Number, // MSP (Rs./Quintal) 2026-27
    priceLatest: Number, // Price on 03 Feb, 2026
    dateRecorded: { type: Date, default: Date.now }
});

export const CommodityPrice = mongoose.model('CommodityPrice', commodityPriceSchema);
