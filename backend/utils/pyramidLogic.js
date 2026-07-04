const getTier = (rank) => {
  if (!rank || rank < 1) return 0;
  return Math.ceil((-1 + Math.sqrt(1 + 8 * rank)) / 2);
};

const calculateCapacity = (rows) => {
  if (!rows || rows < 1) return 0;
  return (rows * (rows + 1)) / 2;
};

const isValidChallenge = (challengerRank, defenderRank) => {
  if (!challengerRank || !defenderRank) return false;
  if (challengerRank <= defenderRank) return false;

  const challengerTier = getTier(challengerRank);
  const defenderTier = getTier(defenderRank);

  return defenderTier === challengerTier || defenderTier === challengerTier - 1;
};

const canChallenge = (challenger, defender) => {
  if (!challenger || !defender) {
    return { valid: false, reason: 'Both players must be selected.' };
  }
  if (challenger.playerId === defender.playerId) {
    return { valid: false, reason: 'A player cannot challenge themselves.' };
  }
  if (challenger.status !== 'available') {
    return { valid: false, reason: `${challenger.name} is currently in a match.` };
  }
  if (defender.status !== 'available') {
    return { valid: false, reason: `${defender.name} is currently in a match.` };
  }
  if (!isValidChallenge(challenger.currentRank, defender.currentRank)) {
    return {
      valid: false,
      reason: 'Invalid challenge: you can only target someone in your tier or exactly one tier above.',
    };
  }
  return { valid: true, reason: null };
};

module.exports = {
  getTier,
  calculateCapacity,
  isValidChallenge,
  canChallenge,
};
