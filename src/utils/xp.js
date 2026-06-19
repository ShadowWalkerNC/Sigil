/**
 * XP formula and level calculation utilities.
 * Formula: XP required to reach level N = 5*N^2 + 50*N + 100
 */

function xpForLevel(level) {
    return 5 * level * level + 50 * level + 100;
}

/**
 * Given a total accumulated XP, return the current level and XP within that level.
 */
function calculateLevel(totalXp) {
    let level = 0;
    let remaining = totalXp;
    while (remaining >= xpForLevel(level)) {
        remaining -= xpForLevel(level);
        level++;
    }
    return { level, currentXp: remaining, requiredXp: xpForLevel(level) };
}

/**
 * Total XP needed to reach a given level from 0.
 */
function totalXpForLevel(targetLevel) {
    let total = 0;
    for (let i = 0; i < targetLevel; i++) total += xpForLevel(i);
    return total;
}

module.exports = { xpForLevel, calculateLevel, totalXpForLevel };
