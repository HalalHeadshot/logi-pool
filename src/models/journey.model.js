import mongoose from 'mongoose';

const journeySchema = new mongoose.Schema({
  journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', required: true, unique: true },
  r2Key: { type: String, required: true },
  contentHash: { type: String, required: true },
  txHash: { type: String, default: null },
  poolId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pool', required: true },
  completedAt: { type: Date, default: Date.now },
  // Fallback for page when R2 payload is missing
  display: {
    category: String,
    village: String,
    crops: [String],
    total_quantity: Number,
    contribution_count: Number
  }
});

export const Journey = mongoose.model('Journey', journeySchema);

export async function createJourneyRecord(data) {
  return await Journey.create(data);
}

export async function getJourneyByJourneyId(journeyId) {
  return await Journey.findOne({ journeyId }).lean();
}

export async function getJourneyByPoolId(poolId) {
  return await Journey.findOne({ poolId }).lean();
}
