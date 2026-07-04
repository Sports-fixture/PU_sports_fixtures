const express = require('express');
const router = express.Router();
const PyramidPlayer = require('../models/PyramidPlayer');
const PyramidChallenge = require('../models/PyramidChallenge');
const { canChallenge } = require('../utils/pyramidLogic');

// GET /standings/:tournamentId
router.get('/standings/:tournamentId', async (req, res) => {
  try {
    const standings = await PyramidPlayer.find({ tournament: req.params.tournamentId }).sort('rank');
    const completedMatches = await PyramidChallenge.find({ 
      tournament: req.params.tournamentId,
      status: { $in: ['CHALLENGER_WON', 'DEFENDER_WON', 'REJECTED'] }
    }).populate('challengerId defenderId').sort('-updatedAt');
    
    const pendingChallenges = await PyramidChallenge.find({
      tournament: req.params.tournamentId,
      status: 'PENDING'
    }).populate('challengerId defenderId').sort('createdAt');

    const formattedPending = pendingChallenges.map(c => ({
      id: c._id,
      challengerId: c.challengerId ? c.challengerId._id : null,
      challengerName: c.challengerId ? c.challengerId.name : 'Unknown',
      challengerRank: c.challengerId ? c.challengerId.rank : '?',
      defenderId: c.defenderId ? c.defenderId._id : null,
      defenderName: c.defenderId ? c.defenderId.name : 'Unknown',
      defenderRank: c.defenderId ? c.defenderId.rank : '?',
      date: c.date,
      venue: c.venue,
      createdAt: c.createdAt,
      status: c.status
    }));

    const formattedCompleted = completedMatches.map(c => ({
      id: c._id,
      challengerId: c.challengerId ? c.challengerId._id : null,
      challengerName: c.challengerId ? c.challengerId.name : 'Unknown',
      challengerRank: c.challengerId ? c.challengerId.rank : '?',
      defenderId: c.defenderId ? c.defenderId._id : null,
      defenderName: c.defenderId ? c.defenderId.name : 'Unknown',
      defenderRank: c.defenderId ? c.defenderId.rank : '?',
      date: c.date,
      venue: c.venue,
      resolvedAt: c.updatedAt,
      result: c.status
    }));

    const formattedStandings = standings.map(p => ({
      id: p._id,
      name: p.name,
      rank: p.rank,
      score: p.score,
      status: p.status
    }));

    res.json({
      pyramidStandings: formattedStandings,
      pendingChallenges: formattedPending,
      completedMatches: formattedCompleted,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /generate/:tournamentId
router.post('/generate/:tournamentId', async (req, res) => {
  try {
    const { setupPlayers } = req.body;
    const tournamentId = req.params.tournamentId;

    // Sort by score descending
    const sorted = [...setupPlayers].sort((a, b) => b.score - a.score);
    
    // Clear existing for tournament
    await PyramidPlayer.deleteMany({ tournament: tournamentId });
    await PyramidChallenge.deleteMany({ tournament: tournamentId });

    const playersToSave = sorted.map((player, index) => ({
      name: player.name,
      score: player.score,
      rank: index + 1,
      status: 'available',
      tournament: tournamentId
    }));

    const createdPlayers = await PyramidPlayer.insertMany(playersToSave);
    res.json(createdPlayers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /challenge
router.post('/challenge', async (req, res) => {
  try {
    const { tournamentId, challengerId, defenderId, date, venue } = req.body;
    const challenger = await PyramidPlayer.findById(challengerId);
    const defender = await PyramidPlayer.findById(defenderId);

    if (!challenger || !defender) return res.status(404).json({ error: 'Player not found' });

    const validation = canChallenge(
      { ...challenger.toObject(), playerId: challenger._id, currentRank: challenger.rank },
      { ...defender.toObject(), playerId: defender._id, currentRank: defender.rank }
    );

    if (!validation.valid) {
      return res.status(400).json({ error: validation.reason });
    }

    const challenge = new PyramidChallenge({
      tournament: tournamentId,
      challengerId,
      defenderId,
      date: date || new Date().toISOString().split('T')[0],
      venue: venue || 'TBD',
      status: 'PENDING'
    });

    await challenge.save();

    challenger.status = 'in_match';
    defender.status = 'in_match';
    await challenger.save();
    await defender.save();

    res.json(challenge);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /challenge/:id/resolve
router.put('/challenge/:id/resolve', async (req, res) => {
  try {
    const { status } = req.body; // 'CHALLENGER_WON', 'DEFENDER_WON', 'REJECTED'
    const challenge = await PyramidChallenge.findById(req.params.id);
    if (!challenge) return res.status(404).json({ error: 'Challenge not found' });
    if (challenge.status !== 'PENDING') return res.status(400).json({ error: 'Challenge already resolved' });

    const challenger = await PyramidPlayer.findById(challenge.challengerId);
    const defender = await PyramidPlayer.findById(challenge.defenderId);

    if (!challenger || !defender) return res.status(404).json({ error: 'Player not found' });

    if (status === 'CHALLENGER_WON') {
      const tempRank = challenger.rank;
      challenger.rank = defender.rank;
      defender.rank = tempRank;
    }

    challenge.status = status;
    await challenge.save();

    challenger.status = 'available';
    defender.status = 'available';
    await challenger.save();
    await defender.save();

    res.json({ message: 'Challenge resolved' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
