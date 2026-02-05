/**
 * Farmer Rewards Service
 * 
 * Tracks cumulative dispatched weight per farmer and grants rewards.
 * - Threshold: 10,000 kg = 10 reward kg
 * - Reward kg acts as billing discount (reduces payable weight)
 * - Prevents duplicate rewards via checkpoint tracking
 */

import { Farmer, getFarmerByPhone } from './farmer.model.js';
import { Produce } from './produce.model.js';
import { sendSMS } from '../services/sms.gateway.js';

// Constants
const REWARD_THRESHOLD_KG = 1000;   // 1000 kg (1 ton) cumulative
const REWARD_KG_PER_THRESHOLD = 10;  // 10 reward kg per ton

/**
 * Process rewards for all farmers in a completed dispatch
 * Called after driver sends DONE command
 * @param {ObjectId} poolId - The completed pool's ID
 * @returns {Promise<{farmersUpdated, farmersRewarded, totalRewardsGranted}>}
 */
export async function processFarmerRewardsForCompletedDispatch(poolId) {
    if (!poolId) {
        console.log('⚠️ No poolId provided for reward processing');
        return { farmersUpdated: 0, farmersRewarded: 0, totalRewardsGranted: 0 };
    }

    // Get all produce entries for this completed dispatch
    const produceEntries = await Produce.find({ poolId });

    if (produceEntries.length === 0) {
        console.log('⚠️ No produce entries found for pool:', poolId);
        return { farmersUpdated: 0, farmersRewarded: 0, totalRewardsGranted: 0 };
    }

    // Aggregate weight by farmer phone
    const farmerContributions = {};
    for (const produce of produceEntries) {
        const phone = produce.farmer_phone;
        if (!farmerContributions[phone]) {
            farmerContributions[phone] = 0;
        }
        farmerContributions[phone] += produce.quantity || 0;
    }

    console.log(`📦 Processing rewards for ${Object.keys(farmerContributions).length} farmers`);

    let farmersUpdated = 0;
    let farmersRewarded = 0;
    let totalRewardsGranted = 0;

    // Process each farmer's contribution
    for (const [phone, dispatchedKg] of Object.entries(farmerContributions)) {
        try {
            const result = await updateFarmerDispatchedWeight(phone, dispatchedKg);
            farmersUpdated++;

            if (result.newRewardsGranted > 0) {
                farmersRewarded++;
                totalRewardsGranted += result.newRewardsGranted;

                // Notify farmer about rewards
                await sendSMS(phone,
                    `🎁 CONGRATULATIONS!\n` +
                    `You earned ${result.newRewardsGranted} reward kg!\n` +
                    `Total dispatched: ${result.farmer.total_dispatched_kg} kg\n` +
                    `Reward balance: ${result.farmer.reward_kg_balance} kg\n` +
                    `Send REWARDS to check status.`
                );
            }
        } catch (err) {
            console.error(`❌ Failed to process rewards for ${phone}:`, err.message);
        }
    }

    console.log(`🎁 Rewards summary: ${farmersUpdated} farmers updated, ${farmersRewarded} rewarded, ${totalRewardsGranted} kg granted`);

    return { farmersUpdated, farmersRewarded, totalRewardsGranted };
}

/**
 * Update farmer's cumulative dispatched weight and check for new rewards
 * @param {string} farmerPhone - Farmer's phone number
 * @param {number} dispatchedKg - Weight dispatched in this dispatch
 * @returns {Promise<{farmer, newRewardsGranted}>}
 */
export async function updateFarmerDispatchedWeight(farmerPhone, dispatchedKg) {
    const normalizedPhone = '+' + farmerPhone.replace(/[\s+]/g, '');

    // Find and update farmer's cumulative weight
    const farmer = await Farmer.findOneAndUpdate(
        { phone: normalizedPhone },
        { $inc: { total_dispatched_kg: dispatchedKg } },
        { new: true }
    );

    if (!farmer) {
        console.log(`⚠️ Farmer not found for phone: ${normalizedPhone}`);
        return { farmer: null, newRewardsGranted: 0 };
    }

    // Check and grant rewards
    const rewardResult = await calculateAndGrantRewards(farmer);

    return {
        farmer: rewardResult.updatedFarmer || farmer,
        newRewardsGranted: rewardResult.rewardsGranted
    };
}

/**
 * Calculate and grant rewards if farmer crossed a new threshold
 * @param {Object} farmer - Farmer document
 * @returns {Promise<{rewardsGranted, newBalance, newCheckpoint, updatedFarmer}>}
 */
export async function calculateAndGrantRewards(farmer) {
    const currentTotal = farmer.total_dispatched_kg;
    const lastCheckpoint = farmer.last_reward_checkpoint_kg;

    // Calculate how many complete thresholds the farmer has crossed
    const currentThresholdLevel = Math.floor(currentTotal / REWARD_THRESHOLD_KG);
    const lastThresholdLevel = Math.floor(lastCheckpoint / REWARD_THRESHOLD_KG);

    // How many NEW thresholds crossed since last reward
    const newThresholdsCrossed = currentThresholdLevel - lastThresholdLevel;

    if (newThresholdsCrossed <= 0) {
        // No new rewards
        return {
            rewardsGranted: 0,
            newBalance: farmer.reward_kg_balance,
            newCheckpoint: farmer.last_reward_checkpoint_kg,
            updatedFarmer: farmer
        };
    }

    // Grant rewards for each new threshold crossed
    const rewardsToGrant = newThresholdsCrossed * REWARD_KG_PER_THRESHOLD;
    const newCheckpoint = currentThresholdLevel * REWARD_THRESHOLD_KG;

    // Update farmer with new rewards
    const updatedFarmer = await Farmer.findByIdAndUpdate(
        farmer._id,
        {
            $inc: { reward_kg_balance: rewardsToGrant },
            $set: { last_reward_checkpoint_kg: newCheckpoint }
        },
        { new: true }
    );

    console.log(`🎁 Farmer ${farmer.phone}: +${rewardsToGrant} reward kg (crossed ${newThresholdsCrossed} thresholds)`);

    return {
        rewardsGranted: rewardsToGrant,
        newBalance: updatedFarmer.reward_kg_balance,
        newCheckpoint: newCheckpoint,
        updatedFarmer
    };
}

/**
 * Use reward kg (deduct from balance)
 * @param {string} farmerPhone - Farmer's phone number
 * @param {number} kgToUse - Amount of reward kg to use
 * @returns {Promise<{success, kgUsed, remainingBalance, error?}>}
 */
export async function useRewardKg(farmerPhone, kgToUse) {
    const normalizedPhone = '+' + farmerPhone.replace(/[\s+]/g, '');

    const farmer = await Farmer.findOne({ phone: normalizedPhone });

    if (!farmer) {
        return { success: false, kgUsed: 0, remainingBalance: 0, error: 'Farmer not found' };
    }

    if (farmer.reward_kg_balance < kgToUse) {
        return {
            success: false,
            kgUsed: 0,
            remainingBalance: farmer.reward_kg_balance,
            error: `Insufficient balance. Available: ${farmer.reward_kg_balance} kg`
        };
    }

    const updatedFarmer = await Farmer.findByIdAndUpdate(
        farmer._id,
        { $inc: { reward_kg_balance: -kgToUse } },
        { new: true }
    );

    console.log(`💰 Farmer ${farmerPhone}: Used ${kgToUse} reward kg, remaining: ${updatedFarmer.reward_kg_balance}`);

    return {
        success: true,
        kgUsed: kgToUse,
        remainingBalance: updatedFarmer.reward_kg_balance
    };
}

/**
 * Get farmer's reward status
 * @param {string} farmerPhone - Farmer's phone number
 * @returns {Promise<{totalDispatched, rewardBalance, progressToNext, nextThreshold, thresholdsCrossed}>}
 */
export async function getFarmerRewardStatus(farmerPhone) {
    const normalizedPhone = '+' + farmerPhone.replace(/[\s+]/g, '');

    const farmer = await Farmer.findOne({ phone: normalizedPhone });

    if (!farmer) {
        return {
            totalDispatched: 0,
            rewardBalance: 0,
            progressToNext: 0,
            nextThreshold: REWARD_THRESHOLD_KG,
            thresholdsCrossed: 0
        };
    }

    const currentThresholdLevel = Math.floor(farmer.total_dispatched_kg / REWARD_THRESHOLD_KG);
    const nextThreshold = (currentThresholdLevel + 1) * REWARD_THRESHOLD_KG;
    const progressToNext = farmer.total_dispatched_kg % REWARD_THRESHOLD_KG;

    return {
        totalDispatched: farmer.total_dispatched_kg,
        rewardBalance: farmer.reward_kg_balance,
        progressToNext,
        nextThreshold,
        thresholdsCrossed: currentThresholdLevel
    };
}

/**
 * Process automatic reward utilization
 * Called when farmer logs produce
 * @param {string} farmerPhone 
 * @param {number} produceWeight 
 * @returns {Promise<{ used: number, remaining: number, applied: boolean }>}
 */
export async function processRewardUtilization(farmerPhone, produceWeight) {
    const normalizedPhone = '+' + farmerPhone.replace(/[\s+]/g, '');
    const farmer = await Farmer.findOne({ phone: normalizedPhone });

    if (!farmer || farmer.reward_kg_balance <= 0) {
        return { used: 0, remaining: farmer ? farmer.reward_kg_balance : 0, applied: false };
    }

    // Determine how much reward specifically to use
    // If Balance >= Produce Weight: Use Produce Weight (Free dispatch)
    // If Balance < Produce Weight: Use All Balance (Partial discount)
    const usageAmount = Math.min(produceWeight, farmer.reward_kg_balance);

    if (usageAmount > 0) {
        const result = await useRewardKg(farmerPhone, usageAmount);
        if (result.success) {
            console.log(`🎁 Auto-applied ${usageAmount} kg rewards for ${farmerPhone}. Remaining: ${result.remainingBalance}`);
            return {
                used: usageAmount,
                remaining: result.remainingBalance,
                applied: true
            };
        }
    }

    return { used: 0, remaining: farmer.reward_kg_balance, applied: false };
}