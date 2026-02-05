export const TRUCK_TYPES = {
    REGULAR: 'REGULAR',
    LARGE: 'LARGE'
};

export const TRUCK_CAPACITIES = {
    REGULAR: 1000, // kg
    LARGE: 2500    // kg
};

// Priority thresholds (percentage-based)
export const PRIORITY_THRESHOLDS = {
    CRITICAL: 90,  // Force dispatch if >= 90%
    HIGH: 50       // Prefer REGULAR truck if >= 50%
};
