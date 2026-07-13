/**
 * fixtures.js — Double Round Robin Fixture Routes
 *
 * All routes are nested under /api/fixtures
 * These work alongside the existing matches.js (Double Knockout)
 * without touching any existing files.
 *
 * Routes:
 *  POST   /api/fixtures/generate/:tournamentId  → generate DRR fixtures (admin)
 *  GET    /api/fixtures/tournament/:tournamentId → get all fixtures for a tournament
 *  PUT    /api/fixtures/:id                      → edit fixture (admin)
 *  DELETE /api/fixtures/:id                      → delete fixture (admin)
 *  DELETE /api/fixtures/tournament/:tournamentId → clear all fixtures (admin)
 */

const express = require('express');
const router = express.Router();
const Fixture = require('../models/Fixture');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { generateSingleRoundRobin, BYE_TEAM } = require('../utils/circleMethod');
const { adminAuth } = require('../middleware/auth');

// ─── Helper: build a fixture plain object ───────────────────────────
function buildFixture({ tournamentId, fixtureNumber, round, leg, teamA, teamB }) {
  const isBye = teamA.id === BYE_TEAM.id || teamB.id === BYE_TEAM.id;
  return {
    tournament: tournamentId,
    fixtureNumber,
    round,
    leg,
    teamA: teamA.name,
    teamB: teamB.name,
    status: isBye ? 'rest' : 'scheduled',
    date: '',
    time: '',
    venue: '',
    schedulingMode: 'none',
    scoreA: '',
    scoreB: '',
    winner: '',
  };
}

// ─── Helper: assign random schedule to fixtures ──────────────────────
function assignRandomSchedule(fixtures, startDate, venueList) {
  const TIME_SLOTS = ['09:00', '11:00', '14:00', '16:00', '18:00'];
  const DEFAULT_VENUES = [
    'University Sports Complex - Ground A',
    'University Sports Complex - Ground B',
    'Indoor Sports Hall - Court 1',
    'Main Stadium',
  ];
  const venues = venueList && venueList.length > 0 ? venueList : DEFAULT_VENUES;

  // Group by round
  const roundMap = new Map();
  fixtures.forEach(f => {
    if (!roundMap.has(f.round)) roundMap.set(f.round, []);
    roundMap.get(f.round).push(f);
  });

  const sortedRounds = [...roundMap.keys()].sort((a, b) => a - b);

  sortedRounds.forEach((round, roundIndex) => {
    const date = new Date(startDate || new Date());
    date.setDate(date.getDate() + roundIndex);
    const dateStr = date.toISOString().split('T')[0];

    roundMap.get(round).forEach((fixture, matchIndex) => {
      if (fixture.status === 'rest') return; // BYE rounds don't need scheduling
      fixture.date = dateStr;
      fixture.time = TIME_SLOTS[matchIndex % TIME_SLOTS.length];
      fixture.venue = venues[matchIndex % venues.length];
      fixture.schedulingMode = 'random';
    });
  });

  return fixtures;
}

// ─── POST /api/fixtures/generate/:tournamentId ───────────────────────
// Generate Double Round Robin fixtures for a tournament (admin only)
router.post('/generate/:tournamentId', adminAuth, async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { mode = 'manual', startDate = null, venues = [] } = req.body;

    // Validate tournament
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    // Only approved teams participate
    const teams = await Team.find({ tournament: tournamentId, status: 'approved' }).sort({ createdAt: 1 });
    if (teams.length < 2) {
      return res.status(400).json({ message: 'Need at least 2 approved teams to generate fixtures' });
    }

    // Map teams to algorithm format — seed auto-assigned by registration order
    const teamList = teams.map((t, i) => ({
      id: t._id.toString(),
      name: t.teamName,
      seed: i + 1,
    }));

    // Auto-assign seeds based on registration order
    for (let i = 0; i < teams.length; i++) {
      await Team.findByIdAndUpdate(teams[i]._id, { seed: i + 1 });
    }

    // ── Generate Leg 1 (Circle Method) ──
    const leg1Rounds = generateSingleRoundRobin(teamList);
    const totalLeg1Rounds = leg1Rounds.length;

    let fixtureNumber = 1;
    const allFixtures = [];

    // Leg 1 fixtures
    leg1Rounds.forEach((pairings, roundIndex) => {
      pairings.forEach(({ teamA, teamB }) => {
        allFixtures.push(buildFixture({
          tournamentId,
          fixtureNumber: fixtureNumber++,
          round: roundIndex + 1,
          leg: 1,
          teamA,
          teamB,
        }));
      });
    });

    // ── Generate Leg 2 (sides swapped — return fixtures) ──
    leg1Rounds.forEach((pairings, roundIndex) => {
      pairings.forEach(({ teamA, teamB }) => {
        allFixtures.push(buildFixture({
          tournamentId,
          fixtureNumber: fixtureNumber++,
          round: totalLeg1Rounds + roundIndex + 1,
          leg: 2,
          teamA: teamB, // sides swapped
          teamB: teamA,
        }));
      });
    });

    // Apply random scheduling if requested
    if (mode === 'random') {
      assignRandomSchedule(allFixtures, startDate, venues);
    }

    // Clear old DRR fixtures for this tournament and save new ones
    await Fixture.deleteMany({ tournament: tournamentId });
    const savedFixtures = await Fixture.insertMany(allFixtures);

    // Update tournament status
    await Tournament.findByIdAndUpdate(tournamentId, { status: 'fixture_generated' });

    return res.status(201).json({
      message: `Double Round Robin fixtures generated (${mode} scheduling)`,
      totalTeams: teams.length,
      totalFixtures: savedFixtures.length,
      realMatches: savedFixtures.filter(f => f.status !== 'rest').length,
      restRounds: savedFixtures.filter(f => f.status === 'rest').length,
      data: savedFixtures,
    });
  } catch (err) {
    console.error('Fixture generation error:', err);
    return res.status(500).json({ message: err.message });
  }
});

// ─── GET /api/fixtures/tournament/:tournamentId ──────────────────────
// Get all DRR fixtures for a tournament (public)
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const fixtures = await Fixture.find({ tournament: req.params.tournamentId })
      .sort({ round: 1, fixtureNumber: 1 });
    return res.json(fixtures);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── PUT /api/fixtures/:id ───────────────────────────────────────────
// Edit fixture — date, time, venue, status, scores, winner (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { date, time, venue, status, scoreA, scoreB, winner, schedulingMode } = req.body;

    const fixture = await Fixture.findByIdAndUpdate(
      req.params.id,
      { date, time, venue, status, scoreA, scoreB, winner, schedulingMode },
      { new: true, runValidators: true }
    );

    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });

    // Update team wins/losses when match completed
    if (status === 'completed' && winner && fixture.status !== 'rest') {
      const loser = winner === fixture.teamA ? fixture.teamB : fixture.teamA;
      await Team.findOneAndUpdate(
        { tournament: fixture.tournament, teamName: winner },
        { $inc: { wins: 1 } }
      );
      await Team.findOneAndUpdate(
        { tournament: fixture.tournament, teamName: loser },
        { $inc: { losses: 1 } }
      );
      // Mark tournament as ongoing
      await Tournament.findByIdAndUpdate(fixture.tournament, { status: 'ongoing' });
    }

    return res.json(fixture);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/fixtures/:id ────────────────────────────────────────
// Delete a single fixture (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const fixture = await Fixture.findByIdAndDelete(req.params.id);
    if (!fixture) return res.status(404).json({ message: 'Fixture not found' });
    return res.json({ message: 'Fixture deleted' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ─── DELETE /api/fixtures/tournament/:tournamentId ───────────────────
// Clear all DRR fixtures for a tournament (admin)
router.delete('/tournament/:tournamentId', adminAuth, async (req, res) => {
  try {
    await Fixture.deleteMany({ tournament: req.params.tournamentId });
    return res.json({ message: 'All fixtures cleared' });
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

module.exports = router;
