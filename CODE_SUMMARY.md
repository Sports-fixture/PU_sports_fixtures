# Project Code Summary

## File: backend/makeAdmin.js
```javascript
const mongoose = require('mongoose');
const User = require('./models/User');

mongoose.connect('mongodb://localhost:27017/tournament_db')
  .then(async () => {
    const res = await User.updateMany({}, { role: 'admin' });
    console.log(`Successfully updated ${res.modifiedCount} users to admin role.`);
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });

```

## File: backend/middleware/auth.js
```javascript
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token provided' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) return res.status(401).json({ message: 'User not found' });
    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const adminAuth = async (req, res, next) => {
  await auth(req, res, () => {
    console.log("adminAuth check - User:", req.user?.username, "Role:", req.user?.role, "Type:", typeof req.user?.role);
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }
    next();
  });
};

module.exports = { auth, adminAuth };

```

## File: backend/models/Match.js
```javascript
const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  runs: { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs: { type: Number, default: 0 },
  extras: { type: Number, default: 0 }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  matchNumber: { type: Number },
  round: { type: Number, required: true },
  roundName: { type: String },
  bracketType: { type: String, enum: ['winners', 'losers', 'grand_final'], required: true },
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamAScore: scoreSchema,
  teamBScore: scoreSchema,
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  loser: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  venue: { type: String },
  scheduledDate: { type: Date },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'bye'],
    default: 'scheduled'
  },
  isBye: { type: Boolean, default: false },
  // Links to next matches for auto-advance
  nextWinnerMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  nextLoserMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  notes: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);

```

## File: backend/models/PyramidChallenge.js
```javascript
const mongoose = require('mongoose');

const PyramidChallengeSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  challengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'PyramidPlayer', required: true },
  defenderId: { type: mongoose.Schema.Types.ObjectId, ref: 'PyramidPlayer', required: true },
  date: { type: String, required: true },
  venue: { type: String, required: true },
  status: { type: String, enum: ['PENDING', 'CHALLENGER_WON', 'DEFENDER_WON', 'REJECTED'], default: 'PENDING' }
}, { timestamps: true });

module.exports = mongoose.model('PyramidChallenge', PyramidChallengeSchema);

```

## File: backend/models/PyramidPlayer.js
```javascript
const mongoose = require('mongoose');

const PyramidPlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  rank: { type: Number, required: true },
  status: { type: String, enum: ['available', 'in_match'], default: 'available' },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true }
});

module.exports = mongoose.model('PyramidPlayer', PyramidPlayerSchema);

```

## File: backend/models/Team.js
```javascript
const mongoose = require('mongoose');

const playerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: { type: String }, // batsman, bowler, all-rounder, wicketkeeper, etc.
  jerseyNumber: { type: Number }
});

const teamSchema = new mongoose.Schema({
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  teamName: { type: String, required: true },
  captainName: { type: String, required: true },
  captainContact: { type: String },
  captainEmail: { type: String },
  players: [playerSchema],
  registeredBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  seed: { type: Number, default: 0 }, // seeding based on past performance
  points: { type: Number, default: 0 }, // past performance points for seeding
  // Double Knockout tracking
  wins: { type: Number, default: 0 },
  losses: { type: Number, default: 0 },
  bracket: { type: String, enum: ['winners', 'losers', 'eliminated', 'pending'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Team', teamSchema);

```

## File: backend/models/Tournament.js
```javascript
const mongoose = require('mongoose');

const tournamentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sport: { type: String, required: true, enum: ['cricket', 'football', 'basketball', 'badminton', 'tennis', 'volleyball', 'other'] },
  format: { type: String, default: 'double_knockout' },
  maxTeams: { type: Number, required: true },
  playersPerTeam: { type: Number, required: true },
  venue: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  overs: { type: Number }, // for cricket
  description: { type: String },
  status: {
    type: String,
    enum: ['upcoming', 'registration_open', 'registration_closed', 'fixture_generated', 'ongoing', 'completed'],
    default: 'registration_open'
  },
  registrationDeadline: { type: Date },
  prizeInfo: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Tournament', tournamentSchema);

```

## File: backend/models/User.js
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  createdAt: { type: Date, default: Date.now }
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);

```

## File: backend/package.json
```json
{
  "name": "tournament-backend",
  "version": "1.0.0",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cors": "^2.8.5",
    "dotenv": "^16.0.3",
    "express": "^4.18.2",
    "jsonwebtoken": "^9.0.0",
    "mongoose": "^7.3.1"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}

```

## File: backend/routes/auth.js
```javascript
const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, adminCode } = req.body;
    const exists = await User.findOne({ $or: [{ email }, { username }] });
    if (exists) return res.status(400).json({ message: 'User already exists' });
    const role = adminCode === 'ADMIN2024' ? 'admin' : 'user';
    const user = new User({ username, email, password, role });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ token, user: { id: user._id, username, email, role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json(req.user);
});

module.exports = router;

```

## File: backend/routes/matches.js
```javascript
const express = require('express');
const mongoose = require('mongoose');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { adminAuth } = require('../middleware/auth');
const router = express.Router();

router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const matches = await Match.find({ tournament: req.params.tournamentId })
      .populate('teamA', 'teamName captainName seed points')
      .populate('teamB', 'teamName captainName seed points')
      .populate('winner', 'teamName')
      .populate('loser', 'teamName')
      .sort({ matchNumber: 1 });
    res.json(matches);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/generate/:tournamentId', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });

    const teams = await Team.find({ tournament: req.params.tournamentId, status: 'approved' })
      .sort({ points: -1, createdAt: 1 });

    if (teams.length < 2) return res.status(400).json({ message: 'Need at least 2 approved teams' });

    await Match.deleteMany({ tournament: req.params.tournamentId });

    for (let i = 0; i < teams.length; i++) {
      await Team.findByIdAndUpdate(teams[i]._id, { seed: i + 1, wins: 0, losses: 0, bracket: 'pending' });
      teams[i].seed = i + 1;
    }

    const matches = buildDKO(teams, tournament);
    await Match.insertMany(matches);
    await Tournament.findByIdAndUpdate(req.params.tournamentId, { status: 'fixture_generated' });
    res.json({ message: 'Fixture generated', matches: matches.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/score', adminAuth, async (req, res) => {
  try {
    const { teamAScore, teamBScore, winnerId, status, notes } = req.body;
    const match = await Match.findById(req.params.id);
    if (!match) return res.status(404).json({ message: 'Match not found' });
    if (match.isBye) return res.status(400).json({ message: 'Bye matches cannot be scored' });

    if (teamAScore) match.teamAScore = teamAScore;
    if (teamBScore) match.teamBScore = teamBScore;
    match.status = status || 'completed';
    if (notes !== undefined) match.notes = notes;

    if (winnerId && match.status === 'completed') {
      const teamAId = match.teamA?.toString();
      const teamBId = match.teamB?.toString();
      if (!teamAId || !teamBId) return res.status(400).json({ message: 'Match does not have two teams yet' });

      const loserId = teamAId === winnerId ? teamBId : teamAId;
      match.winner = winnerId;
      match.loser = loserId;

      await Team.findByIdAndUpdate(winnerId, { $inc: { wins: 1 } });
      await Team.findByIdAndUpdate(loserId, { $inc: { losses: 1 } });

      if (match.bracketType === 'winners') {
        await Team.findByIdAndUpdate(winnerId, { bracket: 'winners' });
        await Team.findByIdAndUpdate(loserId, { bracket: 'losers' });
      } else if (match.bracketType === 'losers') {
        await Team.findByIdAndUpdate(winnerId, { bracket: 'losers' });
        await Team.findByIdAndUpdate(loserId, { bracket: 'eliminated' });
      } else {
        await Team.findByIdAndUpdate(winnerId, { bracket: 'champion' });
        await Team.findByIdAndUpdate(loserId, { bracket: 'eliminated' });
      }

      if (match.nextWinnerMatch) {
        const nwm = await Match.findById(match.nextWinnerMatch);
        if (nwm) {
          if (!nwm.teamA) nwm.teamA = winnerId;
          else if (!nwm.teamB) nwm.teamB = winnerId;
          await nwm.save();
        }
      }
      if (match.nextLoserMatch) {
        const nlm = await Match.findById(match.nextLoserMatch);
        if (nlm) {
          if (!nlm.teamA) nlm.teamA = loserId;
          else if (!nlm.teamB) nlm.teamB = loserId;
          await nlm.save();
        }
      }
    }

    await match.save();
    await Tournament.findByIdAndUpdate(match.tournament, { status: 'ongoing' });

    const updated = await Match.findById(match._id)
      .populate('teamA', 'teamName')
      .populate('teamB', 'teamName')
      .populate('winner', 'teamName')
      .populate('loser', 'teamName');
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', adminAuth, async (req, res) => {
  try {
    const match = await Match.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('teamA', 'teamName').populate('teamB', 'teamName');
    if (!match) return res.status(404).json({ message: 'Match not found' });
    res.json(match);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ═══════════════════════════════════════════════════════════════════════
// DOUBLE KNOCKOUT FIXTURE BUILDER
//
// Strategy: represent every "slot" as an object that knows:
//   - which match produces the team for this slot (sourceMatch)
//   - whether it's a winner or loser slot
//   - the pre-filled team (for byes)
//
// We build WB rounds slot-by-slot, then build LB by tracking
// exactly which slots feed into which matches.
// ═══════════════════════════════════════════════════════════════════════
function buildDKO(teams, tournament) {
  const n = teams.length;
  const tId = tournament._id;
  const venue = tournament.venue;
  const date = tournament.startDate;
  const size = Math.pow(2, Math.ceil(Math.log2(Math.max(n, 2))));

  let mNum = 0;
  // Create a match shell
  const mkMatch = (bracketType, roundName, round) => ({
    _id: new mongoose.Types.ObjectId(),
    tournament: tId,
    matchNumber: ++mNum,
    round,
    roundName,
    bracketType,
    teamA: null,
    teamB: null,
    winner: null,
    loser: null,
    isBye: false,
    status: 'scheduled',
    venue,
    scheduledDate: date,
    nextWinnerMatch: null,
    nextLoserMatch: null,
  });

  // A "slot" represents "the team that will come from source"
  // slot.team = pre-known team (bye) | null (TBD)
  // slot.match = the match object that produces this team
  // slot.role  = 'winner' | 'loser'
  const slot = (match, role, team = null) => ({ match, role, team });

  // ── WB Round 1 ──────────────────────────────────────────────────────
  // Place seeds into bracket using standard seeding
  const seedPos = seededSlots(size); // seedPos[i] = seed number at position i

  // wbSlots[i] = slot for position i after WB R1
  // These are the "winner slots" that feed into WB R2
  const wbR1Matches = [];
  const wbR1WinnerSlots = []; // slots feeding into WB R2
  const wbR1LoserSlots  = []; // slots feeding into LB R1

  for (let i = 0; i < size; i += 2) {
    const seedA = seedPos[i];
    const seedB = seedPos[i + 1];
    const teamA = seedA <= n ? teams[seedA - 1] : null;
    const teamB = seedB <= n ? teams[seedB - 1] : null;

    const m = mkMatch('winners', 'WB Round 1', 1);

    if (teamA && teamB) {
      // Real match
      m.teamA = teamA._id;
      m.teamB = teamB._id;
      wbR1Matches.push(m);
      wbR1WinnerSlots.push(slot(m, 'winner'));
      wbR1LoserSlots.push(slot(m, 'loser'));
    } else {
      // Bye: one real team, auto advances
      const realTeam = teamA || teamB;
      m.teamA = realTeam._id;
      m.isBye = true;
      m.status = 'bye';
      m.winner = realTeam._id;
      wbR1Matches.push(m);
      // Winner slot pre-filled with real team
      wbR1WinnerSlots.push(slot(m, 'winner', realTeam));
      // No loser slot for byes
    }
  }

  // ── WB subsequent rounds ─────────────────────────────────────────────
  // wbRoundSlots[r] = array of winner-slots entering round r+2
  // wbRoundMatches[r] = array of matches in WB round r+2
  // wbRoundLoserSlots[r] = loser slots from WB round r+2

  const allWBMatches   = [...wbR1Matches];
  const wbRoundSlots   = [wbR1WinnerSlots]; // index 0 = slots that produce WB R2 inputs
  const wbRoundLosers  = [wbR1LoserSlots];  // index 0 = WB R1 loser slots → LB R1

  let wbRound = 2;
  let currentWBSlots = wbR1WinnerSlots;

  while (currentWBSlots.length > 1) {
    const isWBFinal = currentWBSlots.length === 2;
    const rName = isWBFinal ? 'WB Final' : `WB Round ${wbRound}`;
    const nextWBSlots    = [];
    const thisRoundLosers = [];
    const thisRoundMatches = [];

    for (let i = 0; i < currentWBSlots.length; i += 2) {
      const slotA = currentWBSlots[i];
      const slotB = currentWBSlots[i + 1];
      const m = mkMatch('winners', rName, wbRound);

      // Pre-fill known bye-advancers
      // if (slotA.team) m.teamA = slotA.team._id;
      // if (slotB && slotB.team) m.teamB = slotB.team._id;

if (slotA.team && slotB?.team) {
  m.teamA = slotA.team._id;
  m.teamB = slotB.team._id;
}


      // Wire: slotA.match winner/loser → this match's teamA
      if (slotA.role === 'winner') slotA.match.nextWinnerMatch = m._id;
      else slotA.match.nextLoserMatch = m._id;

      if (slotB) {
        if (slotB.role === 'winner') slotB.match.nextWinnerMatch = m._id;
        else slotB.match.nextLoserMatch = m._id;
      }

      thisRoundMatches.push(m);
      allWBMatches.push(m);
      nextWBSlots.push(slot(m, 'winner'));
      thisRoundLosers.push(slot(m, 'loser'));
    }

    wbRoundSlots.push(nextWBSlots);
    wbRoundLosers.push(thisRoundLosers);
    currentWBSlots = nextWBSlots;
    wbRound++;
  }

  // WB Final match
  const wbFinalMatch = allWBMatches[allWBMatches.length - 1];
  const wbFinalWinnerSlot = slot(wbFinalMatch, 'winner');
  const wbFinalLoserSlot  = slot(wbFinalMatch, 'loser');

  // ── LB bracket ───────────────────────────────────────────────────────
  //
  // LB is built round by round.
  // We maintain a list of "current LB survivor slots" = teams still alive in LB.
  //
  // LB R1: pair up WB R1 loser slots
  // Then for each subsequent WB round (R2, R3..., WB Final):
  //   FEED round:  pair each LB survivor slot with one WB-round loser slot → 1:1
  //   ELIM round:  pair up the feed round winner slots (halve the count)
  //
  // KEY: feed round is strictly 1:1 — LB survivor[i] vs WB loser[i]
  //      So the number of feed matches = number of WB losers from that round
  //      = number of LB survivors coming in

  const allLBMatches = [];
  let lbRound = 1;

  // LB R1: pair WB R1 real losers
  const lbR1LoserSlots = wbRoundLosers[0]; // WB R1 real loser slots
  let currentLBSlots = []; // survivor slots after each LB round

  if (lbR1LoserSlots.length >= 2) {
    const lb1Matches = [];
    for (let i = 0; i + 1 < lbR1LoserSlots.length; i += 2) {
      const sA = lbR1LoserSlots[i];
      const sB = lbR1LoserSlots[i + 1];
      const m = mkMatch('losers', 'LB Round 1', lbRound);

      sA.match.nextLoserMatch = m._id;
      sB.match.nextLoserMatch = m._id;

      lb1Matches.push(m);
      allLBMatches.push(m);
      currentLBSlots.push(slot(m, 'winner'));
    }
    // If odd number of WB R1 real losers, the leftover goes to first feed
    if (lbR1LoserSlots.length % 2 === 1) {
      const leftover = lbR1LoserSlots[lbR1LoserSlots.length - 1];
      currentLBSlots.push(leftover); // carries over as a "pre-seeded" LB slot
    }
    lbRound++;
  } else if (lbR1LoserSlots.length === 1) {
    // Only 1 WB R1 real loser → carries directly to first feed
    currentLBSlots = [lbR1LoserSlots[0]];
  }

  // Now process WB R2, R3, ..., WB Final losers
  // wbRoundLosers[1] = WB R2 losers, wbRoundLosers[2] = WB R3 losers, etc.
  for (let wi = 1; wi < wbRoundLosers.length; wi++) {
    const wbLosers = wbRoundLosers[wi]; // loser slots dropping from WB this round
    const isLastWBRound = wi === wbRoundLosers.length - 1;

    // FEED ROUND: pair as many lower-bracket survivors as possible with incoming WB losers.
    // Any unmatched slots are carried into the elimination round instead of being reused.
    const pairCount = Math.min(currentLBSlots.length, wbLosers.length);
    const feedRName = (isLastWBRound && pairCount === 1) ? 'LB Final' : `LB Round ${lbRound}`;
    const feedMatches = [];
    const feedWinnerSlots = [];
    const carrySlots = [];

    for (let i = 0; i < pairCount; i++) {
      const lbSurvivorSlot = currentLBSlots[i] || currentLBSlots[0];
      const wbLoserSlot    = wbLosers[i];
      const m = mkMatch('losers', feedRName, lbRound);

      // Wire LB survivor into this match
      if (lbSurvivorSlot.role === 'winner') lbSurvivorSlot.match.nextWinnerMatch = m._id;
      else lbSurvivorSlot.match.nextLoserMatch = m._id;

      // Wire WB loser into this match
      wbLoserSlot.match.nextLoserMatch = m._id;

      feedMatches.push(m);
      allLBMatches.push(m);
      feedWinnerSlots.push(slot(m, 'winner'));
    }

    for (let i = pairCount; i < currentLBSlots.length; i++) {
      carrySlots.push(currentLBSlots[i]);
    }

    for (let i = pairCount; i < wbLosers.length; i++) {
      carrySlots.push(wbLosers[i]);
    }

    lbRound++;

    // ELIM ROUND: pair up feed winners (only if more than 1 feed match)
    const elimSources = [...feedWinnerSlots, ...carrySlots];

    if (elimSources.length > 1) {
      const elimCount = Math.ceil(elimSources.length / 2);
      const elimRName = (isLastWBRound && elimCount === 1) ? 'LB Final' : `LB Round ${lbRound}`;
      const elimMatches = [];
      const elimWinnerSlots = [];

      for (let i = 0; i < elimSources.length; i += 2) {
        const sA = elimSources[i];
        const sB = elimSources[i + 1];
        const m = mkMatch('losers', elimRName, lbRound);

        if (sA.role === 'winner') sA.match.nextWinnerMatch = m._id;
        else sA.match.nextLoserMatch = m._id;

        if (sB) {
          if (sB.role === 'winner') sB.match.nextWinnerMatch = m._id;
          else sB.match.nextLoserMatch = m._id;
        }

        elimMatches.push(m);
        allLBMatches.push(m);
        elimWinnerSlots.push(slot(m, 'winner'));
      }
      lbRound++;
      currentLBSlots = elimWinnerSlots;
    } else {
      currentLBSlots = elimSources;
    }
  }

  // Last LB match = LB Final
  if (allLBMatches.length > 0) {
    allLBMatches[allLBMatches.length - 1].roundName = 'LB Final';
  }
  const lbFinalMatch = allLBMatches[allLBMatches.length - 1];

  // ── Grand Final ──────────────────────────────────────────────────────
  const gfMatch = mkMatch('grand_final', 'Grand Final', 99);


const allMatches = [...allWBMatches, ...allLBMatches, gfMatch];

for (const match of allMatches) {
  if (
    match.isBye &&
    match.winner &&
    match.nextWinnerMatch
  ) {
    const next = allMatches.find(
      m => m._id.toString() === match.nextWinnerMatch.toString()
    );

    if (next) {
      if (!next.teamA) next.teamA = match.winner;
      else if (!next.teamB) next.teamB = match.winner;
    }
  }
}


  // WB Final winner → GF
  wbFinalMatch.nextWinnerMatch = gfMatch._id;

  // WB Final loser → LB Final
  if (lbFinalMatch) wbFinalMatch.nextLoserMatch = lbFinalMatch._id;

  // LB Final winner → GF
  if (lbFinalMatch) {
    const lbFinalSlot = currentLBSlots[0];
    if (lbFinalSlot) lbFinalSlot.match.nextWinnerMatch = gfMatch._id;
  }

  // ── Return all matches ───────────────────────────────────────────────
  return [...allWBMatches, ...allLBMatches, gfMatch];
}

function seededSlots(size) {
  let slots = [1, 2];
  while (slots.length < size) {
    const next = [];
    const total = slots.length * 2 + 1;
    for (const s of slots) next.push(s, total - s);
    slots = next;
  }
  return slots;
}

module.exports = router;

```

## File: backend/routes/pyramid.js
```javascript
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

```

## File: backend/routes/teams.js
```javascript
const express = require('express');
const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get teams for a tournament
router.get('/tournament/:tournamentId', async (req, res) => {
  try {
    const teams = await Team.find({ tournament: req.params.tournamentId });
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all teams (admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const teams = await Team.find().populate('tournament', 'name sport');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Register team for tournament
router.post('/register', auth, async (req, res) => {
  try {
    const { tournamentId, teamName, captainName, captainContact, captainEmail, players, points } = req.body;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    if (tournament.status !== 'registration_open') {
      return res.status(400).json({ message: 'Registration is not open for this tournament' });
    }
    const existingCount = await Team.countDocuments({ tournament: tournamentId, status: 'approved' });
    if (existingCount >= tournament.maxTeams) {
      return res.status(400).json({ message: 'Tournament is full' });
    }
    const existingTeam = await Team.findOne({ tournament: tournamentId, teamName });
    if (existingTeam) return res.status(400).json({ message: 'Team name already taken' });

    const team = new Team({
      tournament: tournamentId,
      teamName,
      captainName,
      captainContact,
      captainEmail,
      players: players || [],
      points: points || 0,
      registeredBy: req.user._id
    });
    await team.save();
    res.status(201).json({ message: 'Team registered successfully, pending approval', team });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Approve/Reject team (admin)
router.put('/:id/status', adminAuth, async (req, res) => {
  try {
    const { status, seed, points } = req.body;
    const team = await Team.findByIdAndUpdate(req.params.id, { status, seed, points }, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update team seed/points (admin)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const team = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!team) return res.status(404).json({ message: 'Team not found' });
    res.json(team);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete team (admin)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Team.findByIdAndDelete(req.params.id);
    res.json({ message: 'Team deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get my teams
router.get('/my/teams', auth, async (req, res) => {
  try {
    const teams = await Team.find({ registeredBy: req.user._id }).populate('tournament', 'name sport status');
    res.json(teams);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

```

## File: backend/routes/tournaments.js
```javascript
const express = require('express');
const Tournament = require('../models/Tournament');
const { auth, adminAuth } = require('../middleware/auth');
const router = express.Router();

// Get all tournaments (public)
router.get('/', async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ createdAt: -1 });
    res.json(tournaments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single tournament
router.get('/:id', async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id);
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create tournament (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const tournament = new Tournament({ ...req.body, createdBy: req.user._id });
    await tournament.save();
    res.status(201).json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update tournament (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const tournament = await Tournament.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!tournament) return res.status(404).json({ message: 'Tournament not found' });
    res.json(tournament);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete tournament (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Tournament.findByIdAndDelete(req.params.id);
    res.json({ message: 'Tournament deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;

```

## File: backend/server.js
```javascript
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/tournaments', require('./routes/tournaments'));
app.use('/api/teams', require('./routes/teams'));
app.use('/api/matches', require('./routes/matches'));
app.use('/api/pyramid', require('./routes/pyramid'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tournament_db';

mongoose.connect(MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB error:', err));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

```

## File: backend/utils/pyramidLogic.js
```javascript
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

```

## File: frontend/src/App.js
```javascript
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Tournaments from './pages/Tournaments';
import TournamentDetail from './pages/TournamentDetail';
import { Login, Register } from './pages/Auth';
import AdminDashboard from './pages/AdminDashboard';
import MyTeams from './pages/MyTeams';
import PyramidAdmin from './pages/PyramidAdmin';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner" />;
  if (!user) return <Navigate to="/login" />;
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;
  return children;
};

const AppRoutes = () => (
  <>
    <Navbar />
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tournaments" element={<Tournaments />} />
      <Route path="/tournaments/:id" element={<TournamentDetail />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/my-teams" element={<ProtectedRoute><MyTeams /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
      <Route path="/tournaments/:id/pyramid" element={<ProtectedRoute adminOnly><PyramidAdmin /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  </>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;

```

## File: frontend/src/components/Navbar.css
```css
.navbar {
  background: var(--navy);
  position: sticky; top: 0; z-index: 200;
  box-shadow: 0 2px 12px rgba(27,42,74,0.25);
}
.navbar-top-bar {
  background: var(--navy-dark);
  padding: 5px 0;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.55);
  letter-spacing: 0.04em;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}
.navbar-top-inner {
  max-width: 1280px; margin: 0 auto; padding: 0 24px;
  display: flex; align-items: center; justify-content: space-between;
}
.navbar-inner {
  max-width: 1280px; margin: 0 auto; padding: 0 24px;
  height: 64px; display: flex; align-items: center; gap: 24px;
}
.navbar-brand {
  display: flex; align-items: center; gap: 10px;
  text-decoration: none; flex-shrink: 0;
}
.brand-logo {
  width: 38px; height: 38px;
  background: var(--gold);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 1.2rem; font-weight: 800; color: var(--navy);
}
.brand-text-wrap { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name {
  font-weight: 800; font-size: 1rem; color: #fff;
  letter-spacing: 0.02em;
}
.brand-sub { font-size: 0.62rem; color: rgba(255,255,255,0.5); font-weight: 400; letter-spacing: 0.06em; text-transform: uppercase; }
.navbar-links { display: flex; align-items: center; gap: 2px; flex: 1; }
.nav-link {
  padding: 7px 14px; border-radius: 6px;
  text-decoration: none; color: rgba(255,255,255,0.7);
  font-size: 0.85rem; font-weight: 500; transition: all 0.2s;
}
.nav-link:hover { color: #fff; background: rgba(255,255,255,0.08); }
.nav-link.active { color: #fff; background: rgba(255,255,255,0.12); }
.admin-link { color: var(--gold-light) !important; }
.admin-link:hover { background: rgba(245,166,35,0.12) !important; }
.admin-link.active { background: rgba(245,166,35,0.15) !important; }
.navbar-auth { margin-left: auto; display: flex; align-items: center; gap: 10px; }
.user-menu { display: flex; align-items: center; gap: 10px; }
.user-info { display: flex; align-items: center; gap: 8px; }
.user-avatar {
  width: 34px; height: 34px;
  background: var(--royal);
  border: 2px solid rgba(255,255,255,0.2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 0.85rem; color: #fff;
}
.user-name { font-size: 0.85rem; font-weight: 500; color: rgba(255,255,255,0.9); }
.auth-buttons { display: flex; gap: 8px; }
.btn-nav-login {
  padding: 7px 16px; border-radius: 6px; font-size: 0.82rem;
  font-weight: 600; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.3);
  background: transparent; color: rgba(255,255,255,0.85);
  text-decoration: none; display: inline-flex; align-items: center;
  transition: all 0.2s; font-family: 'Inter', sans-serif;
}
.btn-nav-login:hover { background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.5); color: #fff; }
.btn-nav-register {
  padding: 7px 16px; border-radius: 6px; font-size: 0.82rem;
  font-weight: 600; cursor: pointer; border: none;
  background: var(--gold); color: var(--navy);
  text-decoration: none; display: inline-flex; align-items: center;
  transition: all 0.2s; font-family: 'Inter', sans-serif;
}
.btn-nav-register:hover { background: var(--gold-light); transform: translateY(-1px); }
.btn-nav-logout {
  padding: 7px 14px; border-radius: 6px; font-size: 0.8rem;
  font-weight: 600; cursor: pointer; border: 1.5px solid rgba(255,255,255,0.2);
  background: transparent; color: rgba(255,255,255,0.7);
  transition: all 0.2s; font-family: 'Inter', sans-serif;
}
.btn-nav-logout:hover { border-color: rgba(255,255,255,0.4); color: #fff; }
.menu-toggle {
  display: none; background: none; border: none;
  color: rgba(255,255,255,0.8); font-size: 1.3rem;
  cursor: pointer; margin-left: auto; padding: 4px;
}
@media (max-width: 768px) {
  .navbar-links {
    display: none; position: absolute;
    top: 64px; left: 0; right: 0;
    background: var(--navy-dark);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-direction: column; padding: 12px; gap: 4px;
  }
  .navbar-links.open { display: flex; }
  .menu-toggle { display: block; }
  .navbar-auth { display: none; }
  .nav-link { width: 100%; }
  .navbar-top-bar { display: none; }
}

```

## File: frontend/src/components/Navbar.js
```javascript
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); };
  const isActive = (path) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <nav className="navbar">
      <div className="navbar-top-bar">
        <div className="navbar-top-inner">
          <span>🏛️ Panjab University Sports Department</span>
          <span>Official Tournament Management System</span>
        </div>
      </div>
      <div className="navbar-inner">
        <Link to="/" className="navbar-brand">
          <div className="brand-logo">🏆</div>
          <div className="brand-text-wrap">
            <span className="brand-name">PU TMS</span>
            <span className="brand-sub">Sports Portal</span>
          </div>
        </Link>

        <div className={`navbar-links ${menuOpen ? 'open' : ''}`}>
          <Link to="/" className={`nav-link ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}>Home</Link>
          <Link to="/tournaments" className={`nav-link ${isActive('/tournaments') ? 'active' : ''}`}>Tournaments</Link>
          {user && <Link to="/my-teams" className={`nav-link ${isActive('/my-teams') ? 'active' : ''}`}>My Teams</Link>}
          {isAdmin && <Link to="/admin" className={`nav-link admin-link ${isActive('/admin') ? 'active' : ''}`}>⚙ Admin</Link>}
        </div>

        <div className="navbar-auth">
          {user ? (
            <div className="user-menu">
              <div className="user-info">
                <div className="user-avatar">{user.username?.charAt(0).toUpperCase()}</div>
                <span className="user-name">{user.username}</span>
                {isAdmin && <span className="badge badge-gold" style={{fontSize:'0.6rem'}}>ADMIN</span>}
              </div>
              <button onClick={handleLogout} className="btn-nav-logout">Logout</button>
            </div>
          ) : (
            <div className="auth-buttons">
              <Link to="/login" className="btn-nav-login">Login</Link>
              <Link to="/register" className="btn-nav-register">Register</Link>
            </div>
          )}
        </div>

        <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
          {menuOpen ? '✕' : '☰'}
        </button>
      </div>
    </nav>
  );
};

export default Navbar;

```

## File: frontend/src/components/pyramid/Pyramid.css
```css
/* Pyramid Engine Styles */

:root {
  --bg-dark: #0f172a;
  --bg-panel: rgba(30, 41, 59, 0.7);
  --text-main: #f8fafc;
  --text-muted: #94a3b8;
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --turf: #10b981;
  --crimson: #ef4444;
  --border: rgba(255, 255, 255, 0.1);
  --glass-bg: rgba(15, 23, 42, 0.6);
  --glass-border: rgba(255, 255, 255, 0.08);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  background: var(--bg-dark);
  background-image: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%),
    radial-gradient(at 100% 100%, rgba(16, 185, 129, 0.15) 0px, transparent 50%);
  color: var(--text-main);
  min-height: 100vh;
  line-height: 1.5;
  padding: 2rem;
}

.app-layout {
  max-width: 1200px;
  margin: 0 auto;
}

.app-header {
  text-align: center;
  margin-bottom: 3rem;
}

.app-header h1 {
  font-size: 3rem;
  font-weight: 800;
  background: linear-gradient(to right, #60a5fa, #34d399);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 0.5rem;
}

.app-header p {
  color: var(--text-muted);
  font-size: 1.1rem;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}
/* ═══════════════════════════════════════════════════════════════════════════
   Glassmorphism utility
   ═══════════════════════════════════════════════════════════════════════════ */
.glass-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(12px);
  border: 1px solid var(--glass-border);
  border-radius: 16px;
  padding: 2rem;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: var(--text-main);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reset Button
   ═══════════════════════════════════════════════════════════════════════════ */
.btn-reset {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1rem;
  padding: 0.5rem 1.25rem;
  border-radius: 8px;
  border: 1px solid rgba(239, 68, 68, 0.3);
  background: rgba(239, 68, 68, 0.08);
  color: #f87171;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-reset:hover {
  background: rgba(239, 68, 68, 0.18);
  border-color: rgba(239, 68, 68, 0.5);
  transform: translateY(-1px);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Setup Screen
   ═══════════════════════════════════════════════════════════════════════════ */
.setup-container {
  max-width: 700px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.setup-header {
  text-align: center;
}

.setup-icon-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(16, 185, 129, 0.2));
  color: #60a5fa;
  margin-bottom: 0.75rem;
}

.setup-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--text-main);
  margin-bottom: 0.25rem;
}

.setup-subtitle {
  color: var(--text-muted);
  font-size: 0.95rem;
}

.setup-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.setup-label {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.setup-input {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-main);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.setup-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
}

.setup-input:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

/* Row config */
.row-config {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.row-input {
  width: 100px;
  text-align: center;
  font-size: 1.4rem;
  font-weight: 700;
}

.capacity-badge {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  background: rgba(16, 185, 129, 0.1);
  border: 1px solid rgba(16, 185, 129, 0.2);
  border-radius: 8px;
  padding: 0.5rem 1rem;
}

.capacity-number {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--turf);
}

.capacity-label {
  font-size: 0.85rem;
  color: var(--text-muted);
}

/* Add player form */
.add-player-form {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.add-player-form .setup-input {
  flex: 1;
  min-width: 160px;
}

.score-input {
  max-width: 140px;
  flex: 0 1 140px !important;
  min-width: 100px !important;
}

.btn-add {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  height: 46px;
}

.btn-add:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

/* Staging list */
.staging-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.player-count-badge {
  background: rgba(59, 130, 246, 0.12);
  border: 1px solid rgba(59, 130, 246, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 100px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #60a5fa;
}

.staging-empty {
  text-align: center;
  color: var(--text-muted);
  padding: 2rem;
  border: 1px dashed var(--border);
  border-radius: 10px;
  font-size: 0.9rem;
}

.staging-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 320px;
  overflow-y: auto;
  padding-right: 0.25rem;
}

.staging-player-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 1rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--border);
  border-radius: 10px;
  transition: border-color 0.2s;
}

.staging-player-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.staging-index {
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--text-muted);
  background: rgba(255, 255, 255, 0.05);
  width: 26px;
  height: 26px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.staging-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.95rem;
}

.staging-score-badge {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(139, 92, 246, 0.15));
  color: #a78bfa;
  font-weight: 700;
  font-size: 0.8rem;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  font-family: monospace;
}

.btn-remove {
  background: none;
  border: none;
  color: var(--text-muted);
  cursor: pointer;
  padding: 0.3rem;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.btn-remove:hover {
  color: var(--crimson);
  background: rgba(239, 68, 68, 0.1);
}

/* Generate button */
.btn-generate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  padding: 1rem;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: rgba(255, 255, 255, 0.03);
  color: var(--text-muted);
  font-size: 1.05rem;
  font-weight: 700;
  cursor: not-allowed;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.btn-generate.ready {
  background: linear-gradient(135deg, #3b82f6, #10b981);
  color: white;
  border-color: transparent;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(59, 130, 246, 0.25);
}

.btn-generate.ready:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(59, 130, 246, 0.35);
}

.btn-generate:disabled:not(.ready) {
  opacity: 0.6;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Pyramid Board
   ═══════════════════════════════════════════════════════════════════════════ */
.board-container {
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.pyramid-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  overflow-x: auto;
  padding: 1rem 0;
}

.pyramid-row {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
}

.player-card {
  background: linear-gradient(145deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 12px;
  padding: 1rem;
  width: 150px;
  text-align: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 6px rgba(0,0,0,0.3);
  position: relative;
}

.player-card:hover {
  transform: translateY(-5px) scale(1.05);
  border-color: rgba(59, 130, 246, 0.5);
  box-shadow: 0 10px 20px rgba(0,0,0,0.4), 0 0 15px rgba(59, 130, 246, 0.2);
}

.player-card.in-match {
  border-color: rgba(251, 191, 36, 0.35);
  box-shadow: 0 4px 6px rgba(0,0,0,0.3), 0 0 12px rgba(251, 191, 36, 0.1);
}

.player-card.in-match:hover {
  border-color: rgba(251, 191, 36, 0.5);
  box-shadow: 0 10px 20px rgba(0,0,0,0.4), 0 0 15px rgba(251, 191, 36, 0.2);
}

.player-rank {
  font-size: 0.8rem;
  color: var(--turf);
  font-family: monospace;
  margin-bottom: 0.35rem;
  font-weight: bold;
}

.player-name {
  font-size: 0.95rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 0.2rem;
}

.player-score-label {
  font-size: 0.7rem;
  color: var(--text-muted);
  margin-bottom: 0.5rem;
  font-family: monospace;
}

/* Status indicators */
.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  padding-top: 0.4rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.status-indicator.available {
  color: #34d399;
}

.status-indicator.available .status-dot {
  background: #34d399;
  box-shadow: 0 0 6px rgba(52, 211, 153, 0.5);
}

.status-indicator.in_match {
  color: #fbbf24;
}

.status-indicator.in_match .status-dot {
  background: #fbbf24;
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
  animation: pulse-amber 1.5s ease-in-out infinite;
}

@keyframes pulse-amber {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.3); }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Challenge Form
   ═══════════════════════════════════════════════════════════════════════════ */
.challenge-form-wrapper {
  background: rgba(255,255,255,0.02);
  border-radius: 12px;
  padding: 1.5rem;
  border: 1px solid var(--border);
}

.challenge-form {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 1.5rem;
}

.input-group {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-size: 0.9rem;
  color: var(--text-muted);
}

select {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #0f172a;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-main);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

select:focus {
  border-color: var(--primary);
}

.vs-badge {
  color: var(--text-muted);
  font-weight: bold;
  font-size: 1.2rem;
  padding-bottom: 0.5rem;
}

.btn-primary {
  background: var(--primary);
  color: white;
  border: none;
  padding: 0.75rem 2rem;
  border-radius: 8px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 46px;
}

.btn-primary:hover {
  background: var(--primary-hover);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.error-message {
  color: var(--crimson);
  font-size: 0.9rem;
  margin-top: 1rem;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Admin Panel
   ═══════════════════════════════════════════════════════════════════════════ */
.empty-state {
  text-align: center;
  color: var(--text-muted);
}

.challenges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.challenge-card {
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.challenge-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.match-player {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.match-rank {
  font-size: 0.7rem;
  font-family: monospace;
  color: var(--text-muted);
}

.challenger-side .match-rank {
  color: rgba(96, 165, 250, 0.6);
}

.defender-side .match-rank {
  color: rgba(192, 132, 252, 0.6);
}

.challenger-name {
  color: #60a5fa;
}

.defender-name {
  color: #c084fc;
}

.vs-text {
  font-size: 0.7rem;
  background: rgba(255,255,255,0.1);
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  color: var(--text-muted);
}

.challenge-actions {
  display: flex;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

.btn-action {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
}

.challenger-win {
  background: rgba(52, 211, 153, 0.1);
  color: #34d399;
}

.challenger-win:hover {
  background: rgba(52, 211, 153, 0.2);
}

.defender-win {
  background: rgba(148, 163, 184, 0.1);
  color: #94a3b8;
}

.defender-win:hover {
  background: rgba(148, 163, 184, 0.2);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Responsive
   ═══════════════════════════════════════════════════════════════════════════ */
@media (max-width: 768px) {
  .challenge-form {
    flex-direction: column;
    align-items: stretch;
  }
  .vs-badge {
    text-align: center;
  }
  .add-player-form {
    flex-direction: column;
  }
  .score-input {
    max-width: none;
    flex: 1 !important;
  }
  .row-config {
    flex-direction: column;
    align-items: flex-start;
  }
  .tab-nav {
    flex-direction: column;
  }
  .history-layout {
    grid-template-columns: 1fr !important;
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Tab Navigation
   ═══════════════════════════════════════════════════════════════════════════ */
.tab-nav {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 2rem;
  padding: 0.35rem;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid var(--border);
  border-radius: 12px;
  justify-content: center;
}

.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 1.5rem;
  border-radius: 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  white-space: nowrap;
}

.tab-btn:hover {
  color: var(--text-main);
  background: rgba(255, 255, 255, 0.04);
}

.tab-btn.active {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.15));
  color: var(--text-main);
  border-color: rgba(59, 130, 246, 0.25);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.tab-btn .tab-badge {
  background: rgba(239, 68, 68, 0.2);
  color: #f87171;
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.5rem;
  border-radius: 100px;
  font-family: monospace;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Header Actions
   ═══════════════════════════════════════════════════════════════════════════ */
.header-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 1rem;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Reject Button
   ═══════════════════════════════════════════════════════════════════════════ */
.btn-reject {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.5rem;
  border-radius: 6px;
  border: none;
  font-weight: 600;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  flex-shrink: 0;
  min-width: 40px;
}

.btn-reject:hover {
  background: rgba(239, 68, 68, 0.2);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Challenge Card Meta (Date / Venue)
   ═══════════════════════════════════════════════════════════════════════════ */
.challenge-meta {
  display: flex;
  justify-content: center;
  gap: 1.25rem;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.challenge-meta span {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

/* ═══════════════════════════════════════════════════════════════════════════
   History Component
   ═══════════════════════════════════════════════════════════════════════════ */
.history-container {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.history-tab-nav {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--border);
}

.history-tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-muted);
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.history-tab-btn:hover {
  color: var(--text-main);
}

.history-tab-btn.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

/* Ranks Table */
.ranks-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.ranks-table th {
  text-align: left;
  padding: 0.75rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-muted);
  border-bottom: 1px solid var(--border);
}

.ranks-table td {
  padding: 0.75rem 1rem;
  font-size: 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
}

.ranks-table tr {
  transition: background 0.15s;
}

.ranks-table tbody tr:hover {
  background: rgba(255, 255, 255, 0.03);
}

.rank-number {
  font-family: monospace;
  font-weight: 800;
  font-size: 1rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
}

.rank-1 {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1));
  color: #fbbf24;
  border: 1px solid rgba(251, 191, 36, 0.3);
}

.rank-2 {
  background: linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.1));
  color: #cbd5e1;
  border: 1px solid rgba(148, 163, 184, 0.3);
}

.rank-3 {
  background: linear-gradient(135deg, rgba(180, 83, 9, 0.2), rgba(146, 64, 14, 0.1));
  color: #d97706;
  border: 1px solid rgba(180, 83, 9, 0.3);
}

.rank-default {
  background: rgba(255, 255, 255, 0.05);
  color: var(--text-muted);
  border: 1px solid var(--border);
}

/* Match History Feed */
.match-feed {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.match-history-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: border-color 0.2s;
}

.match-history-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
}

.match-result-icon {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.result-challenger-won {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
}

.result-defender-won {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
}

.result-rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
}

.match-details {
  flex: 1;
  min-width: 0;
}

.match-summary {
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--text-main);
}

.match-summary strong {
  font-weight: 700;
}

.match-summary .challenger-highlight {
  color: #60a5fa;
}

.match-summary .defender-highlight {
  color: #c084fc;
}

.match-date-venue {
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 0.25rem;
  display: flex;
  gap: 1rem;
}

.match-date-venue span {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.result-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.6rem;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
  flex-shrink: 0;
}

.result-badge.challenger-won {
  background: rgba(52, 211, 153, 0.12);
  color: #34d399;
  border: 1px solid rgba(52, 211, 153, 0.25);
}

.result-badge.defender-won {
  background: rgba(148, 163, 184, 0.12);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.result-badge.rejected {
  background: rgba(239, 68, 68, 0.12);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.25);
}

.empty-history {
  text-align: center;
  padding: 3rem 2rem;
  color: var(--text-muted);
}

.empty-history-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.3;
}

.empty-history p {
  font-size: 0.95rem;
}


.opacity-50 { opacity: 0.5; }
.mx-auto { margin-left: auto; margin-right: auto; }
.mb-3 { margin-bottom: 0.75rem; }
.mt-8 { margin-top: 2rem; }

```

## File: frontend/src/components/pyramid/PyramidAdmin.jsx
```javascript
import React from 'react';
import { ShieldAlert, Trophy, X, Calendar, MapPin } from 'lucide-react';
import { pyramidAPI } from '../../utils/api';

export default function PyramidAdmin({ pendingChallenges, standings, refreshData }) {
  const handleResolve = async (challengeId, status) => {
    try {
      await pyramidAPI.resolveChallenge(challengeId, { status });
      refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const getCurrentRank = (playerId) => {
    const player = standings.find((p) => p.id === playerId);
    return player ? player.rank : '?';
  };

  if (!pendingChallenges || pendingChallenges.length === 0) {
    return (
      <div className="admin-container glass-panel empty-state">
        <ShieldAlert size={32} className="opacity-50 mx-auto mb-3" />
        <p>No pending challenges to resolve.</p>
      </div>
    );
  }

  return (
    <div className="admin-container glass-panel">
      <h3 className="section-title">
        <ShieldAlert size={20} /> Admin: Resolve Matches
      </h3>
      <div className="challenges-grid">
        {pendingChallenges.map((challenge) => (
          <div key={challenge.id} className="challenge-card">
            <div className="challenge-header">
              <div className="match-player challenger-side">
                <span className="match-rank">#{getCurrentRank(challenge.challengerId)}</span>
                <span className="challenger-name">{challenge.challengerName}</span>
              </div>
              <span className="vs-text">VS</span>
              <div className="match-player defender-side">
                <span className="match-rank">#{getCurrentRank(challenge.defenderId)}</span>
                <span className="defender-name">{challenge.defenderName}</span>
              </div>
            </div>

            <div className="challenge-meta">
              <span>
                <Calendar size={12} />
                {challenge.date}
              </span>
              <span>
                <MapPin size={12} />
                {challenge.venue}
              </span>
            </div>

            <div className="challenge-actions">
              <button
                onClick={() => handleResolve(challenge.id, 'CHALLENGER_WON')}
                className="btn-action challenger-win"
              >
                <Trophy size={14} /> Challenger Won
              </button>
              <button
                onClick={() => handleResolve(challenge.id, 'DEFENDER_WON')}
                className="btn-action defender-win"
              >
                <Trophy size={14} /> Defender Won
              </button>
              <button
                onClick={() => handleResolve(challenge.id, 'REJECTED')}
                className="btn-reject"
                title="Reject / Dismiss Challenge"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

```

## File: frontend/src/components/pyramid/PyramidBoard.jsx
```javascript
import React, { useState, useMemo } from 'react';
import { Swords, Calendar, MapPin } from 'lucide-react';
import { getTier, canChallenge } from '../../utils/pyramidLogic';
import { pyramidAPI } from '../../utils/api';

const VENUES = [
  'Indoor Stadium 1',
  'Indoor Stadium 2',
  'Lake Side Floor',
  'Open Arena Mat',
];

export default function PyramidBoard({ tournamentId, standings, refreshData }) {
  const [challengerId, setChallengerId] = useState('');
  const [defenderId, setDefenderId] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [venue, setVenue] = useState('');
  const [error, setError] = useState('');

  const tiers = useMemo(() => {
    const grouped = {};
    standings.forEach((player) => {
      const tier = getTier(player.rank);
      if (!grouped[tier]) grouped[tier] = [];
      grouped[tier].push(player);
    });
    return Object.entries(grouped).sort(([a], [b]) => Number(a) - Number(b));
  }, [standings]);

  const availablePlayers = useMemo(
    () => standings.filter((p) => p.status === 'available'),
    [standings]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!challengerId || !defenderId) {
      setError('Please select both a challenger and a defender.');
      return;
    }

    if (!matchDate) {
      setError('Please select a match date.');
      return;
    }

    if (!venue) {
      setError('Please select a venue.');
      return;
    }

    const challenger = standings.find((p) => p.id === challengerId);
    const defender = standings.find((p) => p.id === defenderId);

    const result = canChallenge(
      { ...challenger, playerId: challenger.id, currentRank: challenger.rank },
      { ...defender, playerId: defender.id, currentRank: defender.rank }
    );

    if (!result.valid) {
      setError(result.reason);
      return;
    }

    try {
      await pyramidAPI.issueChallenge({
        tournamentId,
        challengerId: challenger.id,
        defenderId: defender.id,
        date: matchDate,
        venue,
      });
      setChallengerId('');
      setDefenderId('');
      setMatchDate('');
      setVenue('');
      refreshData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to issue challenge');
    }
  };

  if (!standings || standings.length === 0) {
    return null;
  }

  return (
    <div className="board-container glass-panel">
      <div className="pyramid-wrapper">
        {tiers.map(([tierNum, players]) => (
          <div key={tierNum} className="pyramid-row">
            {players
              .sort((a, b) => a.rank - b.rank)
              .map((player) => (
                <div
                  key={player.id}
                  className={`player-card ${player.status === 'in_match' ? 'in-match' : ''}`}
                >
                  <div className="player-rank">Rank {player.rank}</div>
                  <div className="player-name">{player.name}</div>
                  <div className="player-score-label">Score: {player.score}</div>
                  <div className={`status-indicator ${player.status}`}>
                    <span className="status-dot"></span>
                    {player.status === 'available' ? 'Available' : 'In Match'}
                  </div>
                </div>
              ))}
          </div>
        ))}
      </div>

      <div className="challenge-form-wrapper">
        <h3 className="section-title">
          <Swords size={20} /> Issue a Challenge
        </h3>
        <form onSubmit={handleSubmit} className="challenge-form">
          <div className="input-group">
            <label>Challenger</label>
            <select
              id="challenger-select"
              value={challengerId}
              onChange={(e) => setChallengerId(e.target.value)}
            >
              <option value="">Select Challenger</option>
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  Rank {p.rank}: {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="vs-badge">VS</div>
          <div className="input-group">
            <label>Defender</label>
            <select
              id="defender-select"
              value={defenderId}
              onChange={(e) => setDefenderId(e.target.value)}
            >
              <option value="">Select Defender</option>
              {availablePlayers.map((p) => (
                <option key={p.id} value={p.id}>
                  Rank {p.rank}: {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>
              <Calendar size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Date
            </label>
            <input
              id="match-date-input"
              type="date"
              className="setup-input"
              value={matchDate}
              onChange={(e) => setMatchDate(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>
              <MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
              Venue
            </label>
            <select
              id="venue-select"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
            >
              <option value="">Select Venue</option>
              {VENUES.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <button id="issue-challenge-btn" type="submit" className="btn-primary">
            Issue Challenge
          </button>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>
    </div>
  );
}

```

## File: frontend/src/components/pyramid/PyramidHistory.jsx
```javascript
import React, { useState } from 'react';
import { Trophy, Calendar, MapPin, ListOrdered, History, X } from 'lucide-react';
import { getTier } from '../../utils/pyramidLogic';

export default function PyramidHistory({ standings, completedMatches }) {
  const [activeTab, setActiveTab] = useState('ranks');

  const sortedStandings = [...(standings || [])].sort((a, b) => a.rank - b.rank);
  const sortedMatches = [...(completedMatches || [])];

  const getRankClass = (rank) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-default';
  };

  const getResultLabel = (result) => {
    switch (result) {
      case 'CHALLENGER_WON': return 'Challenger Won';
      case 'DEFENDER_WON': return 'Defender Won';
      case 'REJECTED': return 'Rejected';
      default: return result;
    }
  };

  const getResultBadgeClass = (result) => {
    switch (result) {
      case 'CHALLENGER_WON': return 'challenger-won';
      case 'DEFENDER_WON': return 'defender-won';
      case 'REJECTED': return 'rejected';
      default: return '';
    }
  };

  const getResultIconClass = (result) => {
    switch (result) {
      case 'CHALLENGER_WON': return 'result-challenger-won';
      case 'DEFENDER_WON': return 'result-defender-won';
      case 'REJECTED': return 'result-rejected';
      default: return '';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const buildMatchNarrative = (match) => {
    if (match.result === 'CHALLENGER_WON') {
      return (
        <>
          Challenger <strong className="challenger-highlight">{match.challengerName}</strong>{' '}
          defeated Defender <strong className="defender-highlight">{match.defenderName}</strong>
        </>
      );
    }
    if (match.result === 'DEFENDER_WON') {
      return (
        <>
          Defender <strong className="defender-highlight">{match.defenderName}</strong>{' '}
          held off Challenger <strong className="challenger-highlight">{match.challengerName}</strong>
        </>
      );
    }
    return (
      <>
        Challenge from <strong className="challenger-highlight">{match.challengerName}</strong>{' '}
        to <strong className="defender-highlight">{match.defenderName}</strong> was rejected
      </>
    );
  };

  if (!standings || standings.length === 0) {
    return null;
  }

  return (
    <div className="history-container glass-panel mt-8">
      <div className="history-tab-nav">
        <button
          className={`history-tab-btn ${activeTab === 'ranks' ? 'active' : ''}`}
          onClick={() => setActiveTab('ranks')}
        >
          <ListOrdered size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Current Ranks
        </button>
        <button
          className={`history-tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} />
          Match History
          {sortedMatches.length > 0 && (
            <span style={{
              marginLeft: 6,
              background: 'rgba(59,130,246,0.15)',
              color: '#60a5fa',
              fontSize: '0.7rem',
              fontWeight: 700,
              padding: '0.1rem 0.5rem',
              borderRadius: '100px',
              fontFamily: 'monospace',
            }}>
              {sortedMatches.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'ranks' && (
        <div>
          <table className="ranks-table" style={{ width: '100%', textAlign: 'left', marginTop: '1rem' }}>
            <thead>
              <tr>
                <th style={{ width: '70px', padding: '0.5rem' }}>Rank</th>
                <th style={{ padding: '0.5rem' }}>Player</th>
                <th style={{ width: '80px', padding: '0.5rem' }}>Tier</th>
                <th style={{ width: '80px', padding: '0.5rem' }}>Score</th>
                <th style={{ width: '100px', padding: '0.5rem' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedStandings.map((player) => (
                <tr key={player.id}>
                  <td style={{ padding: '0.5rem' }}>
                    <div className={`rank-number ${getRankClass(player.rank)}`}>
                      {player.rank}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, padding: '0.5rem' }}>{player.name}</td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', padding: '0.5rem' }}>
                    Tier {getTier(player.rank)}
                  </td>
                  <td style={{ fontFamily: 'monospace', color: 'var(--text-muted)', padding: '0.5rem' }}>
                    {player.score}
                  </td>
                  <td style={{ padding: '0.5rem' }}>
                    <div className={`status-indicator ${player.status}`} style={{ justifyContent: 'flex-start', borderTop: 'none', paddingTop: 0 }}>
                      <span className="status-dot"></span>
                      {player.status === 'available' ? 'Available' : 'In Match'}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'history' && (
        <div style={{ marginTop: '1rem' }}>
          {sortedMatches.length === 0 ? (
            <div className="empty-history" style={{ textAlign: 'center', padding: '2rem' }}>
              <div className="empty-history-icon" style={{ fontSize: '2rem' }}>📜</div>
              <p>No completed matches yet. Resolve some challenges to see history here.</p>
            </div>
          ) : (
            <div className="match-feed" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {sortedMatches.map((match) => (
                <div key={match.id + '_' + match.resolvedAt} className="match-history-card" style={{ display: 'flex', gap: '1rem', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px' }}>
                  <div className={`match-result-icon ${getResultIconClass(match.result)}`}>
                    {match.result === 'REJECTED' ? <X size={18} /> : <Trophy size={18} />}
                  </div>
                  <div className="match-details" style={{ flex: 1 }}>
                    <div className="match-summary" style={{ marginBottom: '0.5rem' }}>
                      {buildMatchNarrative(match)}
                    </div>
                    <div className="match-date-venue" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '1rem' }}>
                      <span><Calendar size={11} /> {formatDate(match.date)}</span>
                      <span><MapPin size={11} /> {match.venue}</span>
                    </div>
                  </div>
                  <span className={`result-badge ${getResultBadgeClass(match.result)}`} style={{ fontSize: '0.8rem', padding: '0.2rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.1)' }}>
                    {getResultLabel(match.result)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

```

## File: frontend/src/components/pyramid/SetupScreen.jsx
```javascript
import React, { useState } from 'react';
import { Users, UserPlus, Trash2, Zap, Hash, Star } from 'lucide-react';
import { calculateCapacity } from '../../utils/pyramidLogic';
import { pyramidAPI } from '../../utils/api';

export default function SetupScreen({ tournamentId, refreshData }) {
  const [targetRows, setTargetRows] = useState(4);
  const [setupPlayers, setSetupPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerScore, setPlayerScore] = useState('');
  const [error, setError] = useState('');

  const capacity = calculateCapacity(targetRows);
  const isFull = setupPlayers.length >= capacity;
  const canGenerate = setupPlayers.length === capacity;

  const handleRowChange = (e) => {
    const val = Math.max(2, Math.min(10, Number(e.target.value) || 2));
    setTargetRows(val);
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError('Player name is required.');
      return;
    }

    const scoreNum = Number(playerScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError('Score must be a number between 0 and 100.');
      return;
    }

    if (isFull) {
      setError(`Board is full (${capacity} players).`);
      return;
    }

    setSetupPlayers([
      ...setupPlayers,
      {
        playerId: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        score: scoreNum,
      },
    ]);
    setPlayerName('');
    setPlayerScore('');
  };

  const handleRemovePlayer = (playerId) => {
    setSetupPlayers(setupPlayers.filter((p) => p.playerId !== playerId));
  };

  const handleGenerate = async () => {
    if (canGenerate) {
      try {
        await pyramidAPI.generateBoard(tournamentId, { setupPlayers });
        refreshData();
      } catch (err) {
        console.error(err);
        setError('Failed to generate board.');
      }
    }
  };

  return (
    <div className="setup-container glass-panel">
      <div className="setup-header">
        <div className="setup-icon-wrap">
          <Users size={28} />
        </div>
        <h2 className="setup-title">Board Setup</h2>
        <p className="setup-subtitle">Configure your pyramid and add players to get started.</p>
      </div>

      <div className="setup-section">
        <label className="setup-label">
          <Hash size={16} />
          Target Number of Rows
        </label>
        <div className="row-config">
          <input
            id="target-rows-input"
            type="number"
            className="setup-input row-input"
            value={targetRows}
            onChange={handleRowChange}
            min={2}
            max={10}
          />
          <div className="capacity-badge">
            <span className="capacity-number">{capacity}</span>
            <span className="capacity-label">players needed</span>
          </div>
        </div>
      </div>

      <div className="setup-section">
        <label className="setup-label">
          <UserPlus size={16} />
          Add Player
        </label>
        <form onSubmit={handleAddPlayer} className="add-player-form">
          <input
            id="player-name-input"
            type="text"
            className="setup-input"
            placeholder="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isFull}
          />
          <input
            id="player-score-input"
            type="number"
            className="setup-input score-input"
            placeholder="Score (0–100)"
            value={playerScore}
            onChange={(e) => setPlayerScore(e.target.value)}
            min={0}
            max={100}
            disabled={isFull}
          />
          <button
            id="add-player-btn"
            type="submit"
            className="btn-primary btn-add"
            disabled={isFull}
          >
            <UserPlus size={16} /> Add
          </button>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="setup-section">
        <div className="staging-header">
          <label className="setup-label">
            <Star size={16} />
            Player Roster
          </label>
          <span className="player-count-badge">
            {setupPlayers.length} / {capacity}
          </span>
        </div>

        {setupPlayers.length === 0 ? (
          <div className="staging-empty">
            <p>No players added yet. Start adding players above.</p>
          </div>
        ) : (
          <div className="staging-list">
            {setupPlayers.map((player, idx) => (
              <div key={player.playerId} className="staging-player-card">
                <span className="staging-index">{idx + 1}</span>
                <span className="staging-name">{player.name}</span>
                <span className="staging-score-badge">{player.score}</span>
                <button
                  className="btn-remove"
                  onClick={() => handleRemovePlayer(player.playerId)}
                  title="Remove player"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        id="generate-board-btn"
        className={`btn-generate ${canGenerate ? 'ready' : ''}`}
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        <Zap size={18} />
        {canGenerate
          ? 'Generate Board'
          : `Add ${capacity - setupPlayers.length} more player${
              capacity - setupPlayers.length !== 1 ? 's' : ''
            }`}
      </button>
    </div>
  );
}

```

## File: frontend/src/context/AuthContext.js
```javascript
import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
};

```

## File: frontend/src/index.css
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Bebas+Neue&display=swap');

:root {
  /* PU Color Palette */
  --bg-primary: #F9FAF4;
  --bg-secondary: #EEF0E8;
  --bg-card: #FFFFFF;
  --bg-card-hover: #F4F6EE;

  --navy: #1B2A4A;
  --navy-light: #243558;
  --navy-dark: #111C33;
  --royal: #2B4C8C;
  --royal-light: #3A5FA0;
  --blue-accent: #4A90D9;
  --blue-light: #E8F1FB;

  --gold: #C8963E;
  --gold-light: #F5A623;
  --gold-bg: #FDF3E3;

  --green: #1E7C4A;
  --green-bg: #E8F7EE;
  --red: #C0392B;
  --red-bg: #FDECEC;
  --orange: #E67E22;
  --orange-bg: #FEF0E3;

  --text-primary: #1B2A4A;
  --text-secondary: #4A5568;
  --text-muted: #718096;
  --text-light: #A0AEC0;

  --border: #D8DCE8;
  --border-light: #E8EAF2;
  --shadow-sm: 0 1px 4px rgba(27,42,74,0.08);
  --shadow: 0 4px 16px rgba(27,42,74,0.12);
  --shadow-lg: 0 8px 32px rgba(27,42,74,0.16);
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: 'Inter', sans-serif;
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  line-height: 1.6;
}

::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--bg-secondary); }
::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.fade-in { animation: fadeIn 0.35s ease forwards; }

/* ── Spinner ── */
.spinner {
  width: 36px; height: 36px;
  border: 3px solid var(--border);
  border-top-color: var(--royal);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 60px auto;
}

/* ── Badges ── */
.badge {
  display: inline-flex; align-items: center; gap: 4px;
  padding: 3px 10px; border-radius: 20px;
  font-size: 0.68rem; font-weight: 700;
  letter-spacing: 0.06em; text-transform: uppercase;
}
.badge-gold { background: var(--gold-bg); color: var(--gold); border: 1px solid #E8C07A; }
.badge-blue { background: var(--blue-light); color: var(--royal); border: 1px solid #C0D4F0; }
.badge-green { background: var(--green-bg); color: var(--green); border: 1px solid #A8DBC0; }
.badge-red { background: var(--red-bg); color: var(--red); border: 1px solid #F0B8B8; }
.badge-navy { background: var(--navy); color: #fff; border: none; }
.badge-gray { background: var(--bg-secondary); color: var(--text-muted); border: 1px solid var(--border); }
.badge-orange { background: var(--orange-bg); color: var(--orange); border: 1px solid #F0C8A0; }
.badge-live { background: #C0392B; color: #fff; border: none; animation: pulse 1.5s infinite; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  padding: 10px 20px; border-radius: 8px;
  font-size: 0.875rem; font-weight: 600;
  cursor: pointer; border: none;
  transition: all 0.2s; text-decoration: none;
  font-family: 'Inter', sans-serif;
}
.btn:disabled { opacity: 0.5; cursor: not-allowed; }

.btn-primary { background: var(--navy); color: #fff; }
.btn-primary:hover:not(:disabled) { background: var(--navy-light); transform: translateY(-1px); box-shadow: var(--shadow); }

.btn-royal { background: var(--royal); color: #fff; }
.btn-royal:hover:not(:disabled) { background: var(--royal-light); transform: translateY(-1px); box-shadow: var(--shadow); }

.btn-secondary { background: var(--bg-card); color: var(--text-primary); border: 1.5px solid var(--border); }
.btn-secondary:hover:not(:disabled) { background: var(--bg-secondary); border-color: var(--royal); color: var(--royal); }

.btn-outline { background: transparent; color: var(--navy); border: 1.5px solid var(--navy); }
.btn-outline:hover:not(:disabled) { background: var(--navy); color: #fff; }

.btn-danger { background: var(--red-bg); color: var(--red); border: 1px solid #F0B8B8; }
.btn-danger:hover:not(:disabled) { background: #f8d7d7; }

.btn-success { background: var(--green-bg); color: var(--green); border: 1px solid #A8DBC0; }
.btn-success:hover:not(:disabled) { background: #d0eedd; }

.btn-gold { background: var(--gold); color: #fff; }
.btn-gold:hover:not(:disabled) { background: var(--gold-light); transform: translateY(-1px); }

.btn-sm { padding: 6px 14px; font-size: 0.8rem; }
.btn-lg { padding: 13px 28px; font-size: 1rem; }
.btn-xl { padding: 16px 36px; font-size: 1.05rem; }

/* ── Forms ── */
.form-group { margin-bottom: 18px; }
.form-label {
  display: block; font-size: 0.78rem; font-weight: 600;
  color: var(--text-secondary); margin-bottom: 6px;
  letter-spacing: 0.05em; text-transform: uppercase;
}
.form-input {
  width: 100%; padding: 10px 14px;
  background: var(--bg-primary); border: 1.5px solid var(--border);
  border-radius: 8px; color: var(--text-primary);
  font-family: 'Inter', sans-serif; font-size: 0.9rem;
  transition: border-color 0.2s; outline: none;
}
.form-input:focus { border-color: var(--royal); box-shadow: 0 0 0 3px rgba(43,76,140,0.1); }
.form-input::placeholder { color: var(--text-light); }
.form-select {
  width: 100%; padding: 10px 14px;
  background: var(--bg-primary); border: 1.5px solid var(--border);
  border-radius: 8px; color: var(--text-primary);
  font-family: 'Inter', sans-serif; font-size: 0.9rem;
  cursor: pointer; outline: none; transition: border-color 0.2s;
}
.form-select:focus { border-color: var(--royal); }
.form-select option { background: #fff; }
textarea.form-input { resize: vertical; min-height: 80px; }

/* ── Cards ── */
.card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 12px; padding: 24px;
  box-shadow: var(--shadow-sm); transition: all 0.2s;
}
.card:hover { box-shadow: var(--shadow); }

/* ── Tables ── */
.table-wrap { overflow-x: auto; border-radius: 10px; border: 1px solid var(--border); }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.875rem; }
.data-table th {
  background: var(--navy); color: #fff;
  font-size: 0.72rem; font-weight: 600;
  text-transform: uppercase; letter-spacing: 0.08em;
  padding: 12px 16px; text-align: left;
}
.data-table td {
  padding: 12px 16px; border-bottom: 1px solid var(--border-light);
  vertical-align: middle; color: var(--text-primary);
}
.data-table tr:last-child td { border-bottom: none; }
.data-table tr:hover td { background: var(--bg-secondary); }
.data-table tr:nth-child(even) td { background: var(--bg-primary); }
.data-table tr:nth-child(even):hover td { background: var(--bg-secondary); }

/* Points table specific */
.pts-table th { background: var(--royal); }
.pts-rank { font-weight: 800; color: var(--royal); font-size: 1rem; }
.pts-rank-1 { color: var(--gold); }
.pts-rank-2 { color: var(--text-secondary); }
.pts-rank-3 { color: var(--orange); }

/* ── Alerts ── */
.alert { padding: 12px 16px; border-radius: 8px; font-size: 0.875rem; margin-bottom: 16px; }
.alert-error { background: var(--red-bg); border: 1px solid #F0B8B8; color: var(--red); }
.alert-success { background: var(--green-bg); border: 1px solid #A8DBC0; color: var(--green); }
.alert-info { background: var(--blue-light); border: 1px solid #C0D4F0; color: var(--royal); }
.alert-warning { background: var(--gold-bg); border: 1px solid #E8C07A; color: var(--gold); }

/* ── Modal ── */
.modal-overlay {
  position: fixed; inset: 0; background: rgba(27,42,74,0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 1000; padding: 20px; backdrop-filter: blur(4px);
}
.modal {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 16px; padding: 28px; width: 100%; max-width: 600px;
  max-height: 90vh; overflow-y: auto; animation: fadeIn 0.25s ease;
  box-shadow: var(--shadow-lg);
}
.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 24px; padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}
.modal-title { font-size: 1.25rem; font-weight: 700; color: var(--navy); }
.modal-close {
  background: none; border: none; color: var(--text-muted);
  font-size: 1.4rem; cursor: pointer; line-height: 1;
  width: 32px; height: 32px; display: flex; align-items: center;
  justify-content: center; border-radius: 6px; transition: all 0.2s;
}
.modal-close:hover { background: var(--bg-secondary); color: var(--navy); }

/* ── Section titles ── */
.section-title { font-size: 1.6rem; font-weight: 800; color: var(--navy); letter-spacing: -0.02em; }
.section-subtitle { color: var(--text-secondary); font-size: 0.9rem; margin-top: 4px; }

/* ── Layout ── */
.page-container { max-width: 1280px; margin: 0 auto; padding: 0 24px; }
.page-wrapper { padding: 36px 0 60px; }

/* ── Grid ── */
.grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.grid-3 { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
.grid-4 { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; }

/* ── Empty state ── */
.empty-state { text-align: center; padding: 60px 20px; color: var(--text-muted); }
.empty-icon { font-size: 3rem; margin-bottom: 12px; }
.empty-title { font-size: 1.1rem; color: var(--text-secondary); font-weight: 600; }
.empty-desc { font-size: 0.875rem; margin-top: 6px; }

/* ── Divider ── */
.divider { height: 1px; background: var(--border); margin: 24px 0; }

/* ── Tabs ── */
.tabs { display: flex; gap: 2px; border-bottom: 2px solid var(--border); margin-bottom: 28px; }
.tab-btn {
  padding: 10px 20px; background: none; border: none;
  font-size: 0.875rem; font-weight: 600; color: var(--text-muted);
  cursor: pointer; border-bottom: 2px solid transparent;
  margin-bottom: -2px; transition: all 0.2s; font-family: 'Inter', sans-serif;
}
.tab-btn:hover { color: var(--navy); }
.tab-btn.active { color: var(--royal); border-bottom-color: var(--royal); }

/* ── Bracket ── */
.bracket-winners { border-left: 3px solid var(--gold); }
.bracket-losers { border-left: 3px solid var(--royal); }
.bracket-final { border-left: 3px solid var(--navy); }

/* ── Stat boxes ── */
.stat-box {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px 24px;
  box-shadow: var(--shadow-sm);
}
.stat-value { font-size: 2rem; font-weight: 800; color: var(--navy); line-height: 1; }
.stat-label { font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; margin-top: 4px; }

/* ── Match card ── */
.match-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 12px; padding: 20px;
  box-shadow: var(--shadow-sm); transition: all 0.2s;
}
.match-card:hover { box-shadow: var(--shadow); border-color: var(--blue-accent); }
.match-card.live { border-color: var(--red); border-width: 2px; }
.match-card.completed { background: var(--bg-primary); }

@media (max-width: 1024px) {
  .grid-3 { grid-template-columns: repeat(2,1fr); }
  .grid-4 { grid-template-columns: repeat(2,1fr); }
}
@media (max-width: 768px) {
  .grid-2, .grid-3, .grid-4 { grid-template-columns: 1fr; }
  .page-container { padding: 0 16px; }
}

```

## File: frontend/src/index.js
```javascript
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

```

## File: frontend/src/pages/AdminDashboard.js
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tournamentAPI, teamAPI, matchAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const sports = ['cricket','football','basketball','badminton','tennis','volleyball','other'];

const AdminDashboard = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('tournaments');
  const [tournaments, setTournaments] = useState([]);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showTModal, setShowTModal] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(null);
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const [tForm, setTForm] = useState({
    name:'', sport:'cricket', maxTeams:8, playersPerTeam:11,
    venue:'', startDate:'', endDate:'', overs:20, description:'',
    registrationDeadline:'', prizeInfo:'', status:'registration_open'
  });

  const [scoreForm, setScoreForm] = useState({
    teamAScore:{runs:0,wickets:0,overs:0,extras:0},
    teamBScore:{runs:0,wickets:0,overs:0,extras:0},
    winnerId:'', status:'completed', notes:''
  });

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [t, tm] = await Promise.all([tournamentAPI.getAll(), teamAPI.getAll()]);
      setTournaments(t.data); setTeams(tm.data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchAll();
  }, [isAdmin, fetchAll, navigate]);

  const showMsg = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const fetchMatchesForTournament = async (tId) => {
    const m = await matchAPI.getByTournament(tId);
    setMatches(m.data); setSelectedTournament(tId); setTab('matches');
  };

  const handleCreateTournament = async (e) => {
    e.preventDefault(); setError('');
    try {
      await tournamentAPI.create(tForm);
      showMsg('✅ Tournament created successfully!');
      setShowTModal(false); await fetchAll();
      setTForm({ name:'', sport:'cricket', maxTeams:8, playersPerTeam:11, venue:'', startDate:'', endDate:'', overs:20, description:'', registrationDeadline:'', prizeInfo:'', status:'registration_open' });
    } catch (err) { setError(err.response?.data?.message || 'Error creating tournament'); }
  };

  const handleApproveTeam = async (teamId, status) => {
    try { await teamAPI.updateStatus(teamId, { status }); await fetchAll(); showMsg(`Team ${status}!`); }
    catch { setError('Error updating team status'); }
  };

  const handleGenerateFixture = async (tId) => {
    if (!window.confirm('Generate double knockout fixture? Existing matches will be deleted.')) return;
    try { await matchAPI.generate(tId); showMsg('⚡ Fixture generated!'); await fetchMatchesForTournament(tId); }
    catch (err) { setError(err.response?.data?.message || 'Error generating fixture'); }
  };

  const handleUpdateTournamentStatus = async (tId, status) => {
    try { await tournamentAPI.update(tId, { status }); await fetchAll(); }
    catch { setError('Error updating status'); }
  };

  const handleDeleteTournament = async (tId, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try { await tournamentAPI.delete(tId); showMsg('Tournament deleted'); await fetchAll(); }
    catch { setError('Error deleting tournament'); }
  };

  const openScoreModal = (match) => {
    setScoreForm({
      teamAScore: match.teamAScore || {runs:0,wickets:0,overs:0,extras:0},
      teamBScore: match.teamBScore || {runs:0,wickets:0,overs:0,extras:0},
      winnerId: match.winner?._id || '',
      status: match.status === 'completed' ? 'completed' : 'live',
      notes: match.notes || ''
    });
    setError(''); setShowScoreModal(match);
  };

  const handleUpdateScore = async (e) => {
    e.preventDefault(); setError('');
    if (!scoreForm.winnerId && scoreForm.status === 'completed')
      return setError('Please select the winning team');
    try {
      await matchAPI.updateScore(showScoreModal._id, scoreForm);
      showMsg('✅ Score saved & teams advanced!');
      setShowScoreModal(null);
      if (selectedTournament) await fetchMatchesForTournament(selectedTournament);
    } catch (err) { setError(err.response?.data?.message || 'Error saving score'); }
  };

  const pendingTeams = teams.filter(t => t.status === 'pending');
  const liveMatches = matches.filter(m => m.status === 'live' || m.status === 'completed').length;

  const tabs = [
    { key:'tournaments', label:'Tournaments', count: tournaments.length },
    { key:'teams', label:'All Teams', count: teams.length },
    { key:'pending', label:'Pending Approval', count: pendingTeams.length, highlight: pendingTeams.length > 0 },
    { key:'matches', label:'Matches', count: matches.length },
  ];

  return (
    <div className="page-container page-wrapper fade-in">

      {/* Admin header bar */}
      <div style={{ background:'linear-gradient(135deg,var(--navy-dark),var(--navy))', borderRadius:14, padding:'24px 28px', marginBottom:28, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
        <div>
          <div style={{ fontSize:'0.72rem', color:'rgba(255,255,255,0.5)', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:6 }}>⚙️ Admin Portal</div>
          <h1 style={{ fontSize:'1.6rem', fontWeight:800, color:'#fff', marginBottom:4 }}>Tournament Dashboard</h1>
          <p style={{ fontSize:'0.85rem', color:'rgba(255,255,255,0.55)' }}>Manage tournaments, approve teams, generate fixtures & update scores</p>
        </div>
        <button className="btn btn-gold btn-lg" onClick={() => setShowTModal(true)}>+ Create Tournament</button>
      </div>

      {/* Flash messages */}
      {msg && <div className="alert alert-success">{msg}</div>}
      {error && <div className="alert alert-error">{error} <button onClick={()=>setError('')} style={{float:'right',background:'none',border:'none',cursor:'pointer',fontWeight:700}}>✕</button></div>}

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom:28 }}>
        {[
          { label:'Tournaments', value:tournaments.length, color:'var(--navy)', icon:'🏆' },
          { label:'Total Teams', value:teams.length, color:'var(--royal)', icon:'👥' },
          { label:'Pending Approval', value:pendingTeams.length, color:pendingTeams.length>0?'var(--red)':'var(--green)', icon:'⏳' },
          { label:'Matches Loaded', value:matches.length, color:'var(--blue-accent)', icon:'📅' },
        ].map((s,i) => (
          <div key={i} className="stat-box" style={{ borderTop:`3px solid ${s.color}` }}>
            <div style={{ fontSize:'1.4rem', marginBottom:6 }}>{s.icon}</div>
            <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab-btn ${tab===t.key?'active':''}`} onClick={()=>setTab(t.key)}>
            {t.label}
            {t.count > 0 && (
              <span style={{ marginLeft:6, background:t.highlight?'var(--red)':'var(--bg-secondary)', color:t.highlight?'#fff':'var(--text-muted)', borderRadius:10, padding:'1px 7px', fontSize:'0.68rem', fontWeight:700 }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── TOURNAMENTS TAB ── */}
      {tab==='tournaments' && (
        <div className="fade-in">
          {loading ? <div className="spinner"/> : (
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>Tournament</th><th>Sport</th><th>Teams</th><th>Venue</th><th>Dates</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {tournaments.length===0 ? (
                    <tr><td colSpan={7} style={{textAlign:'center',padding:48,color:'var(--text-muted)'}}>No tournaments yet. Click "Create Tournament" to get started.</td></tr>
                  ) : tournaments.map(t => {
                    const approved = teams.filter(tm=>tm.tournament?._id===t._id&&tm.status==='approved').length;
                    const pending = teams.filter(tm=>tm.tournament?._id===t._id&&tm.status==='pending').length;
                    return (
                      <tr key={t._id}>
                        <td>
                          <div style={{fontWeight:700,color:'var(--navy)'}}>{t.name}</div>
                          {t.prizeInfo&&<div style={{fontSize:'0.72rem',color:'var(--gold)',marginTop:2}}>🏆 {t.prizeInfo}</div>}
                        </td>
                        <td><span className="badge badge-blue">{t.sport}</span></td>
                        <td>
                          <div style={{fontWeight:600,color:'var(--navy)'}}>{approved}/{t.maxTeams} approved</div>
                          {pending>0&&<div style={{fontSize:'0.72rem',color:'var(--gold)',marginTop:2}}>⏳ {pending} pending</div>}
                        </td>
                        <td style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{t.venue}</td>
                        <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>
                          {t.startDate&&<div>📅 {new Date(t.startDate).toLocaleDateString('en-IN')}</div>}
                          {t.endDate&&<div>🏁 {new Date(t.endDate).toLocaleDateString('en-IN')}</div>}
                        </td>
                        <td>
                          <select className="form-select" style={{fontSize:'0.75rem',padding:'5px 8px',minWidth:140}}
                            value={t.status} onChange={e=>handleUpdateTournamentStatus(t._id,e.target.value)}>
                            {['upcoming','registration_open','registration_closed','fixture_generated','ongoing','completed'].map(s=>(
                              <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            <Link to={`/tournaments/${t._id}`} className="btn btn-secondary btn-sm">View</Link>
                            <button className="btn btn-royal btn-sm" onClick={()=>handleGenerateFixture(t._id)}>⚡ Fixture</button>
                            <button className="btn btn-secondary btn-sm" onClick={()=>fetchMatchesForTournament(t._id)}>📅 Matches</button>
                            <button className="btn btn-danger btn-sm" onClick={()=>handleDeleteTournament(t._id,t.name)}>🗑</button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ALL TEAMS TAB ── */}
      {tab==='teams' && (
        <div className="fade-in table-wrap">
          <table className="data-table">
            <thead><tr><th>Team</th><th>Tournament</th><th>Captain</th><th>Contact</th><th>Players</th><th>Seed Pts</th><th>W/L</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {teams.length===0?(
                <tr><td colSpan={9} style={{textAlign:'center',padding:40,color:'var(--text-muted)'}}>No teams yet</td></tr>
              ):teams.map(team=>(
                <tr key={team._id}>
                  <td><div style={{fontWeight:700,color:'var(--navy)'}}>{team.teamName}</div>{team.seed>0&&<div style={{fontSize:'0.7rem',color:'var(--text-muted)'}}>Seed #{team.seed}</div>}</td>
                  <td style={{fontSize:'0.82rem',color:'var(--text-secondary)'}}>{team.tournament?.name}</td>
                  <td style={{color:'var(--text-secondary)',fontSize:'0.85rem'}}>{team.captainName}</td>
                  <td style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>{team.captainContact||'—'}</td>
                  <td style={{textAlign:'center'}}>{team.players?.length||0}</td>
                  <td>
                    <input type="number" className="form-input" style={{width:70,padding:'4px 8px',fontSize:'0.8rem'}}
                      defaultValue={team.points||0}
                      onBlur={e=>teamAPI.update(team._id,{points:parseInt(e.target.value)})}/>
                  </td>
                  <td>
                    <span style={{color:'var(--green)',fontWeight:700}}>{team.wins||0}W</span>
                    &nbsp;/&nbsp;
                    <span style={{color:'var(--red)',fontWeight:700}}>{team.losses||0}L</span>
                  </td>
                  <td><span className={`badge ${team.status==='approved'?'badge-green':team.status==='rejected'?'badge-red':'badge-gold'}`}>{team.status}</span></td>
                  <td>
                    <div style={{display:'flex',gap:4}}>
                      {team.status==='pending'&&<>
                        <button className="btn btn-success btn-sm" onClick={()=>handleApproveTeam(team._id,'approved')}>✓</button>
                        <button className="btn btn-danger btn-sm" onClick={()=>handleApproveTeam(team._id,'rejected')}>✕</button>
                      </>}
                      {team.status!=='pending'&&<span style={{fontSize:'0.78rem',color:'var(--text-muted)'}}>—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── PENDING APPROVAL TAB ── */}
      {tab==='pending' && (
        <div className="fade-in">
          {pendingTeams.length===0 ? (
            <div className="card" style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'3rem',marginBottom:12}}>✅</div>
              <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--navy)',marginBottom:8}}>All caught up!</div>
              <p style={{color:'var(--text-secondary)'}}>No pending team registrations to review</p>
            </div>
          ) : (
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              {pendingTeams.map(team=>(
                <div key={team._id} style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderLeft:'4px solid var(--gold)',borderRadius:12,padding:'20px 24px',boxShadow:'var(--shadow-sm)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:10}}>
                        <h3 style={{fontWeight:800,fontSize:'1.1rem',color:'var(--navy)'}}>{team.teamName}</h3>
                        <span className="badge badge-gold">⏳ Pending</span>
                      </div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:'6px 24px',marginBottom:12}}>
                        <div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>🏆 <strong>{team.tournament?.name}</strong></div>
                        <div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>🏅 {team.tournament?.sport}</div>
                        <div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>👤 {team.captainName}</div>
                        {team.captainContact&&<div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>📞 {team.captainContact}</div>}
                        {team.captainEmail&&<div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>✉️ {team.captainEmail}</div>}
                        <div style={{fontSize:'0.85rem',color:'var(--text-secondary)'}}>👥 {team.players?.length||0} players · {team.points||0} seeding pts</div>
                      </div>
                      {team.players?.length>0&&(
                        <div>
                          <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.08em',marginBottom:6}}>Players</div>
                          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                            {team.players.map((p,i)=><span key={i} className="badge badge-gray">{p.name}{p.role?` (${p.role})`:''}</span>)}
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{display:'flex',gap:10}}>
                      <button className="btn btn-success" onClick={()=>handleApproveTeam(team._id,'approved')}>✓ Approve</button>
                      <button className="btn btn-danger" onClick={()=>handleApproveTeam(team._id,'rejected')}>✕ Reject</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MATCHES TAB ── */}
      {tab==='matches' && (
        <div className="fade-in">
          {!selectedTournament ? (
            <div className="card" style={{textAlign:'center',padding:'60px 20px'}}>
              <div style={{fontSize:'3rem',marginBottom:12}}>📅</div>
              <div style={{fontSize:'1.1rem',fontWeight:700,color:'var(--navy)',marginBottom:8}}>Select a Tournament</div>
              <p style={{color:'var(--text-secondary)',marginBottom:20}}>Go to the Tournaments tab and click "Matches" on any tournament</p>
              <button className="btn btn-royal" onClick={()=>setTab('tournaments')}>← Go to Tournaments</button>
            </div>
          ) : (
            <>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
                <div>
                  <h3 style={{fontWeight:800,fontSize:'1.15rem',color:'var(--navy)'}}>
                    {tournaments.find(t=>t._id===selectedTournament)?.name}
                  </h3>
                  <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:2}}>
                    Complete matches in order — winners & losers auto-advance to next round
                  </p>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button className="btn btn-royal" onClick={()=>handleGenerateFixture(selectedTournament)}>⚡ Regenerate</button>
                  <button className="btn btn-secondary" onClick={()=>setTab('tournaments')}>← Back</button>
                </div>
              </div>

              {matches.length===0 ? (
                <div className="card" style={{textAlign:'center',padding:40}}>
                  <div style={{fontSize:'2.5rem',marginBottom:12}}>📅</div>
                  <div style={{fontWeight:700,color:'var(--navy)',marginBottom:8}}>No matches yet</div>
                  <p style={{color:'var(--text-secondary)',marginBottom:20}}>Generate the fixture first using the Tournaments tab</p>
                </div>
              ) : (
                <>
                  {/* Progress summary */}
                  <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 20px',marginBottom:20,display:'flex',gap:20,flexWrap:'wrap'}}>
                    {[
                      {label:'Total',count:matches.filter(m=>!m.isBye).length,color:'var(--navy)'},
                      {label:'Completed',count:matches.filter(m=>m.status==='completed').length,color:'var(--green)'},
                      {label:'Live',count:matches.filter(m=>m.status==='live').length,color:'var(--red)'},
                      {label:'Scheduled',count:matches.filter(m=>m.status==='scheduled').length,color:'var(--text-muted)'},
                    ].map((s,i)=>(
                      <div key={i} style={{textAlign:'center',padding:'0 16px',borderRight:i<3?'1px solid var(--border)':'none'}}>
                        <div style={{fontSize:'1.4rem',fontWeight:800,color:s.color}}>{s.count}</div>
                        <div style={{fontSize:'0.72rem',color:'var(--text-muted)',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.06em'}}>{s.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
                    <span className="badge badge-gold">🥇 Winners Bracket</span>
                    <span className="badge badge-blue">🔁 Losers Bracket</span>
                    <span className="badge badge-navy">🏆 Grand Final</span>
                    <span className="badge badge-green">✅ Completed</span>
                    <span className="badge badge-gray">⏳ Waiting</span>
                  </div>

                  {/* Match sections */}
                  {[
                    {label:'🥇 Winners Bracket',type:'winners',color:'var(--gold)',cls:'badge-gold'},
                    {label:'🔁 Losers Bracket',type:'losers',color:'var(--royal)',cls:'badge-blue'},
                    {label:'🏆 Grand Final',type:'grand_final',color:'var(--navy)',cls:'badge-navy'},
                  ].map(({label,type,color,cls})=>{
                    const section=matches.filter(m=>m.bracketType===type);
                    if(!section.length) return null;
                    const done=section.filter(m=>m.status==='completed'||m.status==='bye').length;
                    return (
                      <div key={type} style={{marginBottom:28}}>
                        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                          <span style={{fontSize:'0.82rem',fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.08em'}}>{label}</span>
                          <span style={{fontSize:'0.72rem',color:'var(--text-muted)',background:'var(--bg-secondary)',padding:'2px 8px',borderRadius:10,fontWeight:600}}>{done}/{section.length} done</span>
                        </div>
                        <div style={{display:'flex',flexDirection:'column',gap:10}}>
                          {section.map(match=>{
                            const hasBoth=match.teamA&&match.teamB;
                            const isReady=hasBoth&&match.status!=='completed'&&match.status!=='bye';
                            const isDone=match.status==='completed'||match.status==='bye';
                            const isLive=match.status==='live';
                            return (
                              <div key={match._id} style={{
                                background:isLive?'var(--red-bg)':isReady?'var(--blue-light)':isDone?'var(--bg-primary)':'var(--bg-card)',
                                border:`1px solid ${isLive?'var(--red)':isReady?'var(--blue-accent)':isDone?'var(--border)':'var(--border)'}`,
                                borderLeft:`4px solid ${isLive?'var(--red)':isReady?color:isDone?'var(--border)':'var(--border-light)'}`,
                                borderRadius:10, padding:'16px 20px',
                                transition:'all 0.2s', opacity:isDone&&!isLive?0.8:1
                              }}>
                                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                                  <div style={{flex:1}}>
                                    {/* Match header */}
                                    <div style={{display:'flex',gap:8,marginBottom:12,flexWrap:'wrap',alignItems:'center'}}>
                                      <span style={{fontFamily:'monospace',fontSize:'0.72rem',color:'var(--text-muted)',background:'var(--bg-secondary)',padding:'2px 8px',borderRadius:4,fontWeight:700}}>M{match.matchNumber}</span>
                                      <span className={`badge ${cls}`} style={{fontSize:'0.65rem'}}>{match.roundName}</span>
                                      <span className={`badge ${isDone?'badge-green':isLive?'badge-live':isReady?'badge-blue':'badge-gray'}`} style={{fontSize:'0.65rem'}}>
                                        {match.isBye?'BYE':isDone?'✓ DONE':isLive?'● LIVE':isReady?'▶ READY':'⏳ WAITING'}
                                      </span>
                                    </div>

                                    {match.isBye?(
                                      <div style={{display:'flex',alignItems:'center',gap:10}}>
                                        <span style={{fontWeight:700,color:'var(--navy)',fontSize:'0.95rem'}}>{match.teamA?.teamName||'TBD'}</span>
                                        <span className="badge badge-blue" style={{fontSize:'0.65rem'}}>Auto Advances (BYE)</span>
                                      </div>
                                    ):(
                                      <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',alignItems:'center',gap:12}}>
                                        <div>
                                          <div style={{fontWeight:match.winner?._id===match.teamA?._id?800:500,color:match.winner?._id===match.teamA?._id?color:match.teamA?'var(--navy)':'var(--text-muted)',fontSize:'0.95rem',fontStyle:match.teamA?'normal':'italic'}}>
                                            {match.winner?._id===match.teamA?._id&&'🏆 '}{match.teamA?.teamName||'TBD — waiting'}
                                          </div>
                                          {match.teamAScore?.runs>0&&<div style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:3}}>{match.teamAScore.runs}/{match.teamAScore.wickets} ({match.teamAScore.overs}ov)</div>}
                                        </div>
                                        <div style={{textAlign:'center',color:'var(--text-muted)',fontWeight:700,fontSize:'0.75rem',padding:'5px 12px',background:'var(--bg-secondary)',borderRadius:6}}>VS</div>
                                        <div style={{textAlign:'right'}}>
                                          <div style={{fontWeight:match.winner?._id===match.teamB?._id?800:500,color:match.winner?._id===match.teamB?._id?color:match.teamB?'var(--navy)':'var(--text-muted)',fontSize:'0.95rem',fontStyle:match.teamB?'normal':'italic'}}>
                                            {match.winner?._id===match.teamB?._id&&'🏆 '}{match.teamB?.teamName||'TBD — waiting'}
                                          </div>
                                          {match.teamBScore?.runs>0&&<div style={{fontFamily:'monospace',fontSize:'0.78rem',color:'var(--text-secondary)',marginTop:3}}>{match.teamBScore.runs}/{match.teamBScore.wickets} ({match.teamBScore.overs}ov)</div>}
                                        </div>
                                      </div>
                                    )}

                                    {match.winner&&(
                                      <div style={{marginTop:10,fontSize:'0.78rem',display:'flex',gap:16,flexWrap:'wrap'}}>
                                        <span style={{color:'var(--green)'}}>🏆 Winner: <strong>{match.winner.teamName}</strong> → advances</span>
                                        {match.loser&&<span style={{color:'var(--red)'}}>⬇️ {match.loser.teamName} → {match.bracketType==='losers'?'eliminated':'Losers Bracket'}</span>}
                                      </div>
                                    )}
                                  </div>

                                  {/* Action */}
                                  {!match.isBye&&hasBoth&&(
                                    <button className={`btn btn-sm ${isDone?'btn-secondary':'btn-royal'}`} onClick={()=>openScoreModal(match)}>
                                      {isDone?'✏️ Edit Score':'📊 Enter Score'}
                                    </button>
                                  )}
                                  {!match.isBye&&!hasBoth&&(
                                    <span style={{fontSize:'0.75rem',color:'var(--text-muted)',padding:'6px 12px',background:'var(--bg-secondary)',borderRadius:8}}>⏳ Awaiting teams</span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* ── CREATE TOURNAMENT MODAL ── */}
      {showTModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowTModal(false)}>
          <div className="modal" style={{maxWidth:700}}>
            <div className="modal-header">
              <h2 className="modal-title">🏟️ Create New Tournament</h2>
              <button className="modal-close" onClick={()=>setShowTModal(false)}>✕</button>
            </div>
            {error&&<div className="alert alert-error">{error}</div>}
            <form onSubmit={handleCreateTournament}>
              <div className="form-group">
                <label className="form-label">Tournament Name *</label>
                <input className="form-input" value={tForm.name} onChange={e=>setTForm({...tForm,name:e.target.value})} placeholder="e.g., PU Summer Cricket Cup 2026" required/>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Sport *</label>
                  <select className="form-select" value={tForm.sport} onChange={e=>setTForm({...tForm,sport:e.target.value})}>
                    {sports.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Venue *</label>
                  <input className="form-input" value={tForm.venue} onChange={e=>setTForm({...tForm,venue:e.target.value})} placeholder="e.g., PU Sports Complex" required/>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Max Teams *</label>
                  <input className="form-input" type="number" min="2" max="64" value={tForm.maxTeams} onChange={e=>setTForm({...tForm,maxTeams:parseInt(e.target.value)})} required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Players per Team *</label>
                  <input className="form-input" type="number" min="1" max="30" value={tForm.playersPerTeam} onChange={e=>setTForm({...tForm,playersPerTeam:parseInt(e.target.value)})} required/>
                </div>
              </div>
              {tForm.sport==='cricket'&&(
                <div className="form-group">
                  <label className="form-label">Overs per Innings</label>
                  <input className="form-input" type="number" min="1" value={tForm.overs} onChange={e=>setTForm({...tForm,overs:parseInt(e.target.value)})}/>
                </div>
              )}
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Start Date *</label>
                  <input className="form-input" type="date" value={tForm.startDate} onChange={e=>setTForm({...tForm,startDate:e.target.value})} required/>
                </div>
                <div className="form-group">
                  <label className="form-label">End Date</label>
                  <input className="form-input" type="date" value={tForm.endDate} onChange={e=>setTForm({...tForm,endDate:e.target.value})}/>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Registration Deadline</label>
                  <input className="form-input" type="date" value={tForm.registrationDeadline} onChange={e=>setTForm({...tForm,registrationDeadline:e.target.value})}/>
                </div>
                <div className="form-group">
                  <label className="form-label">Prize Info</label>
                  <input className="form-input" value={tForm.prizeInfo} onChange={e=>setTForm({...tForm,prizeInfo:e.target.value})} placeholder="e.g., Trophy + ₹25,000"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Description / Rules</label>
                <textarea className="form-input" rows="3" value={tForm.description} onChange={e=>setTForm({...tForm,description:e.target.value})} placeholder="Tournament rules, eligibility, format details..."/>
              </div>
              <div className="form-group">
                <label className="form-label">Initial Status</label>
                <select className="form-select" value={tForm.status} onChange={e=>setTForm({...tForm,status:e.target.value})}>
                  <option value="upcoming">Upcoming (not open yet)</option>
                  <option value="registration_open">Registration Open</option>
                </select>
              </div>
              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setShowTModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{flex:2}}>🏟️ Create Tournament</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── SCORE MODAL ── */}
      {showScoreModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowScoreModal(null)}>
          <div className="modal" style={{maxWidth:640}}>
            <div className="modal-header">
              <div>
                <h2 className="modal-title">📊 Update Match Score</h2>
                <div style={{display:'flex',gap:8,marginTop:6}}>
                  <span className={`badge ${showScoreModal.bracketType==='winners'?'badge-gold':showScoreModal.bracketType==='losers'?'badge-blue':'badge-navy'}`} style={{fontSize:'0.65rem'}}>{showScoreModal.roundName}</span>
                  <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>Match #{showScoreModal.matchNumber}</span>
                </div>
              </div>
              <button className="modal-close" onClick={()=>{setShowScoreModal(null);setError('');}}>✕</button>
            </div>
            {error&&<div className="alert alert-error">{error}</div>}
            <form onSubmit={handleUpdateScore}>
              {/* Match status */}
              <div className="form-group">
                <label className="form-label">Match Status</label>
                <div style={{display:'flex',gap:8}}>
                  {['live','completed'].map(s=>(
                    <button key={s} type="button"
                      className={`btn btn-sm ${scoreForm.status===s?s==='live'?'btn-danger':'btn-success':'btn-secondary'}`}
                      onClick={()=>setScoreForm(f=>({...f,status:s}))}>
                      {s==='live'?'● Set Live':'✓ Mark Completed'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Winner picker */}
              <div className="form-group">
                <label className="form-label">Select Winner *</label>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {[showScoreModal.teamA,showScoreModal.teamB].map(team=>{
                    const sel=scoreForm.winnerId===team?._id;
                    return (
                      <button key={team?._id} type="button"
                        onClick={()=>setScoreForm(f=>({...f,winnerId:team?._id,status:'completed'}))}
                        style={{padding:'14px 16px',background:sel?'var(--blue-light)':'var(--bg-secondary)',border:`2px solid ${sel?'var(--royal)':'var(--border)'}`,borderRadius:10,color:sel?'var(--navy)':'var(--text-primary)',fontWeight:sel?800:500,fontSize:'0.95rem',cursor:'pointer',transition:'all 0.15s',fontFamily:'Inter',textAlign:'center'}}>
                        {sel?'🏆 ':''}{team?.teamName||'TBD'}
                      </button>
                    );
                  })}
                </div>
                {scoreForm.winnerId&&(
                  <div style={{marginTop:8,fontSize:'0.8rem',color:'var(--green)'}}>
                    ✅ <strong>{showScoreModal.teamA?._id===scoreForm.winnerId?showScoreModal.teamA?.teamName:showScoreModal.teamB?.teamName}</strong> wins
                    {showScoreModal.bracketType==='winners'&&<span style={{color:'var(--text-muted)'}}> — loser drops to Losers Bracket</span>}
                    {showScoreModal.bracketType==='losers'&&<span style={{color:'var(--red)'}}> — loser is eliminated</span>}
                    {showScoreModal.bracketType==='grand_final'&&<span style={{color:'var(--gold)'}}> — 🎉 Champion!</span>}
                  </div>
                )}
              </div>

              <div className="divider"/>

              {/* Scores side by side */}
              <div className="grid-2" style={{marginBottom:16}}>
                {[
                  {team:showScoreModal.teamA,key:'teamAScore',color:'var(--gold)'},
                  {team:showScoreModal.teamB,key:'teamBScore',color:'var(--royal)'},
                ].map(({team,key,color})=>(
                  <div key={key} style={{background:'var(--bg-secondary)',border:'1px solid var(--border)',borderRadius:10,padding:16}}>
                    <div style={{fontWeight:700,marginBottom:12,color,fontSize:'0.88rem'}}>🏏 {team?.teamName}</div>
                    <div className="form-group">
                      <label className="form-label">Runs / Score</label>
                      <input className="form-input" type="number" min="0" value={scoreForm[key].runs}
                        onChange={e=>setScoreForm(f=>({...f,[key]:{...f[key],runs:parseInt(e.target.value)||0}}))}/>
                    </div>
                    <div className="grid-2">
                      <div className="form-group">
                        <label className="form-label">Wickets</label>
                        <input className="form-input" type="number" min="0" max="10" value={scoreForm[key].wickets}
                          onChange={e=>setScoreForm(f=>({...f,[key]:{...f[key],wickets:parseInt(e.target.value)||0}}))}/>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Overs</label>
                        <input className="form-input" type="number" min="0" step="0.1" value={scoreForm[key].overs}
                          onChange={e=>setScoreForm(f=>({...f,[key]:{...f[key],overs:parseFloat(e.target.value)||0}}))}/>
                      </div>
                    </div>
                    <div className="form-group" style={{marginBottom:0}}>
                      <label className="form-label">Extras</label>
                      <input className="form-input" type="number" min="0" value={scoreForm[key].extras}
                        onChange={e=>setScoreForm(f=>({...f,[key]:{...f[key],extras:parseInt(e.target.value)||0}}))}/>
                    </div>
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Notes (optional)</label>
                <input className="form-input" value={scoreForm.notes} onChange={e=>setScoreForm({...scoreForm,notes:e.target.value})} placeholder="DLS applied, Super Over, Walkover, etc."/>
              </div>

              <div style={{display:'flex',gap:10,marginTop:8}}>
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>{setShowScoreModal(null);setError('');}}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{flex:2}} disabled={!scoreForm.winnerId&&scoreForm.status==='completed'}>
                  {scoreForm.winnerId?'✅ Save & Auto-Advance':'Select a winner first'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

```

## File: frontend/src/pages/Auth.js
```javascript
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const authStyles = `
  .auth-page {
    min-height: 100vh; display: flex;
    background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 60%, var(--royal) 100%);
  }
  .auth-left {
    flex: 1; display: flex; flex-direction: column; justify-content: center; align-items: center;
    padding: 60px 48px; color: #fff;
  }
  .auth-right {
    width: 480px; background: var(--bg-primary);
    display: flex; align-items: center; justify-content: center;
    padding: 48px 40px; min-height: 100vh;
  }
  .auth-box { width: 100%; max-width: 400px; }
  .auth-logo { font-size: 2.2rem; margin-bottom: 24px; }
  .auth-brand { font-size: 1.8rem; font-weight: 800; margin-bottom: 8px; }
  .auth-brand-sub { font-size: 0.85rem; opacity: 0.6; margin-bottom: 40px; letter-spacing: 0.04em; }
  .auth-feature { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 20px; }
  .auth-feature-icon { font-size: 1.4rem; flex-shrink: 0; margin-top: 2px; }
  .auth-feature-text h4 { font-size: 0.95rem; font-weight: 600; margin-bottom: 2px; }
  .auth-feature-text p { font-size: 0.8rem; opacity: 0.6; }
  .auth-title { font-size: 1.5rem; font-weight: 800; color: var(--navy); margin-bottom: 4px; }
  .auth-subtitle { font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 32px; }
  .auth-divider { text-align: center; margin: 20px 0; position: relative; }
  .auth-divider::before { content:''; position:absolute; top:50%; left:0; right:0; height:1px; background:var(--border); }
  .auth-divider span { background: var(--bg-primary); padding: 0 12px; position:relative; font-size:0.8rem; color:var(--text-muted); }
  @media(max-width:768px){.auth-left{display:none}.auth-right{width:100%;min-height:100vh}}
`;

export const Login = () => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data.token, res.data.user);
      navigate(res.data.user.role === 'admin' ? '/admin' : '/');
    } catch (err) { setError(err.response?.data?.message || 'Login failed'); }
    setLoading(false);
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-logo">🏆</div>
          <div className="auth-brand">PU TMS</div>
          <div className="auth-brand-sub">PANJAB UNIVERSITY TOURNAMENT MANAGEMENT SYSTEM</div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🌐</div>
            <div className="auth-feature-text"><h4>Public Access</h4><p>Anyone can view tournaments, live scores & fixtures</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">👤</div>
            <div className="auth-feature-text"><h4>Team Registration</h4><p>Login to register your team in tournaments</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">⚙️</div>
            <div className="auth-feature-text"><h4>Admin Control</h4><p>Full tournament management and live scoring</p></div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-title">Welcome Back</div>
            <p className="auth-subtitle">Sign in to your PU TMS account</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Enter password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:8}} disabled={loading}>
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <p style={{textAlign:'center',fontSize:'0.875rem',color:'var(--text-secondary)'}}>
              Don't have an account? <Link to="/register" style={{color:'var(--royal)',fontWeight:600}}>Register here</Link>
            </p>
            <p style={{textAlign:'center',marginTop:16}}>
              <Link to="/tournaments" style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>← Continue as guest (view only)</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

export const Register = () => {
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', adminCode: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    if (form.password.length < 6) return setError('Password must be at least 6 characters');
    setLoading(true);
    try {
      const res = await authAPI.register({ username: form.username, email: form.email, password: form.password, adminCode: form.adminCode });
      login(res.data.token, res.data.user);
      navigate('/tournaments');
    } catch (err) { setError(err.response?.data?.message || 'Registration failed'); }
    setLoading(false);
  };

  return (
    <>
      <style>{authStyles}</style>
      <div className="auth-page">
        <div className="auth-left">
          <div className="auth-logo">🏆</div>
          <div className="auth-brand">PU TMS</div>
          <div className="auth-brand-sub">PANJAB UNIVERSITY TOURNAMENT MANAGEMENT SYSTEM</div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📋</div>
            <div className="auth-feature-text"><h4>Register Teams</h4><p>Submit your team for any open tournament</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">📊</div>
            <div className="auth-feature-text"><h4>Track Progress</h4><p>Follow your team through the bracket live</p></div>
          </div>
          <div className="auth-feature">
            <div className="auth-feature-icon">🏆</div>
            <div className="auth-feature-text"><h4>Compete & Win</h4><p>Double Knockout — second chances for every team</p></div>
          </div>
        </div>
        <div className="auth-right">
          <div className="auth-box">
            <div className="auth-title">Create Account</div>
            <p className="auth-subtitle">Join PU TMS to register your team</p>
            {error && <div className="alert alert-error">{error}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Username</label>
                <input className="form-input" type="text" placeholder="Choose a username" value={form.username} onChange={e => setForm({...form, username: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-input" type="email" placeholder="your@email.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm({...form, password: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Confirm Password</label>
                <input className="form-input" type="password" placeholder="Re-enter password" value={form.confirmPassword} onChange={e => setForm({...form, confirmPassword: e.target.value})} required />
              </div>
              <div className="form-group">
                <label className="form-label">Admin Code (Optional)</label>
                <input className="form-input" type="text" placeholder="Leave blank for regular user" value={form.adminCode} onChange={e => setForm({...form, adminCode: e.target.value})} />
              </div>
              <button type="submit" className="btn btn-primary btn-lg" style={{width:'100%',marginTop:8}} disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
            </form>
            <div className="auth-divider"><span>or</span></div>
            <p style={{textAlign:'center',fontSize:'0.875rem',color:'var(--text-secondary)'}}>
              Already have an account? <Link to="/login" style={{color:'var(--royal)',fontWeight:600}}>Sign in</Link>
            </p>
            <p style={{textAlign:'center',marginTop:12}}>
              <Link to="/tournaments" style={{color:'var(--text-muted)',fontSize:'0.8rem'}}>← Browse tournaments without account</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
};

```

## File: frontend/src/pages/Home.css
```css
.home-page { min-height: 100vh; }

/* Hero */
.hero {
  background: linear-gradient(135deg, var(--navy-dark) 0%, var(--navy) 50%, var(--royal) 100%);
  position: relative; overflow: hidden; padding: 80px 0 100px;
}
.hero::before {
  content: ''; position: absolute; inset: 0;
  background-image: radial-gradient(circle at 20% 50%, rgba(74,144,217,0.15) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(200,150,62,0.1) 0%, transparent 40%);
}
.hero::after {
  content: ''; position: absolute; inset: 0;
  background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
  background-size: 48px 48px;
}
.hero-content { position: relative; z-index: 1; padding: 0 24px; }
.hero-eyebrow {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 7px 16px; border-radius: 24px;
  background: rgba(200,150,62,0.15); border: 1px solid rgba(200,150,62,0.4);
  font-size: 0.78rem; font-weight: 600; color: var(--gold-light);
  margin-bottom: 24px; letter-spacing: 0.06em; text-transform: uppercase;
}
.hero-title {
  font-size: clamp(2.4rem, 6vw, 4.2rem);
  font-weight: 800; line-height: 1.1; color: #fff;
  margin-bottom: 8px; letter-spacing: -0.02em;
}
.hero-title-accent { color: var(--gold-light); }
.hero-subtitle { font-size: 1.15rem; color: rgba(255,255,255,0.65); font-weight: 400; margin-bottom: 8px; }
.hero-desc { max-width: 560px; color: rgba(255,255,255,0.55); font-size: 0.95rem; line-height: 1.75; margin-bottom: 36px; }
.hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 60px; }
.hero-stats { display: flex; gap: 0; }
.hero-stat {
  padding: 20px 36px; border-right: 1px solid rgba(255,255,255,0.1);
  text-align: center;
}
.hero-stat:first-child { padding-left: 0; }
.hero-stat:last-child { border-right: none; }
.hero-stat-value { font-size: 2rem; font-weight: 800; color: var(--gold-light); line-height: 1; }
.hero-stat-label { font-size: 0.7rem; color: rgba(255,255,255,0.45); font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 4px; }

/* Info banner */
.info-banner {
  background: var(--blue-light); border-bottom: 2px solid #C0D4F0;
  padding: 14px 0;
}
.info-banner-inner {
  display: flex; align-items: center; justify-content: space-between;
  flex-wrap: wrap; gap: 12px; font-size: 0.82rem; color: var(--royal);
}
.info-item { display: flex; align-items: center; gap: 6px; font-weight: 500; }

/* Section */
.section { padding: 72px 0; }
.section-alt { background: var(--bg-secondary); }
.section-header { margin-bottom: 40px; }
.section-label {
  font-size: 0.72rem; font-weight: 700; color: var(--royal);
  text-transform: uppercase; letter-spacing: 0.12em;
  margin-bottom: 8px; display: flex; align-items: center; gap: 8px;
}
.section-label::before { content: ''; width: 24px; height: 2px; background: var(--royal); }

/* How it works */
.steps-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 0; position: relative; }
.steps-grid::before {
  content: ''; position: absolute; top: 40px; left: 10%; right: 10%;
  height: 2px; background: linear-gradient(90deg, var(--navy) 0%, var(--royal) 100%);
  z-index: 0;
}
.step-card { text-align: center; padding: 0 20px; position: relative; z-index: 1; }
.step-number {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--navy); color: #fff;
  font-size: 1.1rem; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  margin: 0 auto 20px; border: 3px solid var(--bg-primary);
  box-shadow: var(--shadow);
}
.step-icon { font-size: 1.4rem; margin-bottom: 12px; }
.step-title { font-size: 0.95rem; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
.step-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6; }

/* Tournament cards */
.tournament-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
.t-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 14px; padding: 0;
  text-decoration: none; transition: all 0.25s;
  display: flex; flex-direction: column;
  box-shadow: var(--shadow-sm); overflow: hidden;
}
.t-card:hover { box-shadow: var(--shadow-lg); transform: translateY(-3px); border-color: var(--royal); }
.t-card-top {
  background: linear-gradient(135deg, var(--navy) 0%, var(--royal) 100%);
  padding: 20px 20px 16px;
  display: flex; align-items: flex-start; justify-content: space-between;
}
.t-card-sport { font-size: 2.2rem; }
.t-card-body { padding: 16px 20px 20px; flex: 1; display: flex; flex-direction: column; gap: 12px; }
.t-card-name { font-size: 1.05rem; font-weight: 700; color: var(--navy); }
.t-card-meta { display: flex; flex-direction: column; gap: 5px; }
.t-meta-row { display: flex; align-items: center; gap: 6px; font-size: 0.8rem; color: var(--text-secondary); }
.t-card-footer {
  padding: 12px 20px; border-top: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  background: var(--bg-primary);
}
.t-format-tag { font-size: 0.72rem; color: var(--text-muted); font-weight: 500; }
.t-view { font-size: 0.8rem; color: var(--royal); font-weight: 700; }

/* Sport filters */
.sport-filters { display: flex; gap: 8px; margin-bottom: 28px; flex-wrap: wrap; }
.sport-btn {
  padding: 7px 16px; background: var(--bg-card);
  border: 1.5px solid var(--border); border-radius: 20px;
  color: var(--text-secondary); font-size: 0.8rem;
  font-weight: 500; cursor: pointer; transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}
.sport-btn:hover { border-color: var(--royal); color: var(--royal); }
.sport-btn.active { background: var(--navy); border-color: var(--navy); color: #fff; }

/* DKO section */
.dko-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; align-items: center; }
.dko-features { list-style: none; display: flex; flex-direction: column; gap: 14px; margin-top: 20px; }
.dko-feature { display: flex; align-items: flex-start; gap: 12px; font-size: 0.9rem; color: var(--text-secondary); }
.dko-feature-icon { font-size: 1rem; margin-top: 1px; flex-shrink: 0; }
.dko-feature strong { color: var(--navy); }
.dko-diagram {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: 16px; padding: 28px;
  box-shadow: var(--shadow);
}
.dko-diagram-title { font-size: 0.75rem; font-weight: 700; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 20px; }
.bracket-vis { display: flex; flex-direction: column; gap: 12px; }
.bracket-row { display: flex; align-items: center; gap: 10px; }
.bracket-box {
  flex: 1; padding: 10px 14px; border-radius: 8px;
  font-size: 0.82rem; font-weight: 600; text-align: center;
}
.bracket-box.wb { background: var(--gold-bg); color: var(--gold); border: 1px solid #E8C07A; }
.bracket-box.lb { background: var(--blue-light); color: var(--royal); border: 1px solid #C0D4F0; }
.bracket-box.gf { background: var(--navy); color: #fff; border: none; }
.bracket-arr { color: var(--text-light); font-weight: 700; }
.bracket-drop { text-align: center; font-size: 0.75rem; color: var(--text-muted); }

/* User types section */
.user-types { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
.user-type-card {
  border-radius: 14px; padding: 28px 24px; text-align: center;
  border: 1px solid var(--border); background: var(--bg-card);
  box-shadow: var(--shadow-sm); transition: all 0.25s;
}
.user-type-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
.user-type-icon { font-size: 2.5rem; margin-bottom: 14px; }
.user-type-title { font-size: 1rem; font-weight: 700; color: var(--navy); margin-bottom: 8px; }
.user-type-desc { font-size: 0.82rem; color: var(--text-secondary); line-height: 1.6; margin-bottom: 16px; }
.user-type-card.public { border-top: 4px solid var(--blue-accent); }
.user-type-card.registered { border-top: 4px solid var(--royal); }
.user-type-card.admin { border-top: 4px solid var(--navy); }

/* Footer */
.footer { background: var(--navy-dark); color: rgba(255,255,255,0.7); padding: 48px 0 24px; }
.footer-grid { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 48px; margin-bottom: 40px; }
.footer-brand-name { font-size: 1.1rem; font-weight: 800; color: #fff; margin-bottom: 8px; }
.footer-brand-desc { font-size: 0.82rem; color: rgba(255,255,255,0.45); line-height: 1.7; }
.footer-col-title { font-size: 0.72rem; font-weight: 700; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 16px; }
.footer-links { display: flex; flex-direction: column; gap: 10px; }
.footer-links a { color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.85rem; transition: color 0.2s; }
.footer-links a:hover { color: #fff; }
.footer-bottom { padding-top: 24px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; justify-content: space-between; font-size: 0.75rem; color: rgba(255,255,255,0.35); }

@media (max-width: 1024px) {
  .tournament-grid { grid-template-columns: repeat(2,1fr); }
  .steps-grid { grid-template-columns: repeat(2,1fr); gap: 32px; }
  .steps-grid::before { display: none; }
}
@media (max-width: 768px) {
  .tournament-grid, .user-types, .dko-grid, .footer-grid { grid-template-columns: 1fr; }
  .hero-stats { flex-wrap: wrap; }
  .hero-stat { border-right: none; border-bottom: 1px solid rgba(255,255,255,0.1); padding: 16px; }
}

```

## File: frontend/src/pages/Home.js
```javascript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentAPI } from '../utils/api';
import './Home.css';

const sportEmoji = { cricket:'🏏', football:'⚽', basketball:'🏀', badminton:'🏸', tennis:'🎾', volleyball:'🏐', other:'🏅' };

const statusBadge = (status) => {
  const map = {
    registration_open: ['badge-green','Registration Open'],
    registration_closed: ['badge-gray','Closed'],
    fixture_generated: ['badge-blue','Fixture Ready'],
    ongoing: ['badge-live','● Live'],
    completed: ['badge-gray','Completed'],
    upcoming: ['badge-orange','Upcoming'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

const Home = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    tournamentAPI.getAll().then(r => { setTournaments(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? tournaments : tournaments.filter(t => t.sport === filter);
  const sports = ['all', ...new Set(tournaments.map(t => t.sport).filter(Boolean))];
  const liveCount = tournaments.filter(t => t.status === 'ongoing').length;
  const openCount = tournaments.filter(t => t.status === 'registration_open').length;

  return (
    <div className="home-page">
      {/* Hero */}
      <section className="hero">
        <div className="hero-content page-container">
          <div className="hero-eyebrow">🏛️ Panjab University Sports Department</div>
          <h1 className="hero-title">
            Official <span className="hero-title-accent">Tournament</span><br />
            Management System
          </h1>
          <p className="hero-subtitle">Fixture Generator & Administration Portal</p>
          <p className="hero-desc">
            A centralized platform for managing inter-university sporting tournaments — from team registration and fixture generation to live scoring and standings.
          </p>
          <div className="hero-actions">
            <Link to="/tournaments" className="btn btn-gold btn-xl">Browse Tournaments</Link>
            <Link to="/register" className="btn btn-outline btn-xl" style={{color:'#fff',borderColor:'rgba(255,255,255,0.4)'}}>Register Team</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="hero-stat-value">{tournaments.length}</div>
              <div className="hero-stat-label">Tournaments</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{liveCount}</div>
              <div className="hero-stat-label">Live Now</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">{openCount}</div>
              <div className="hero-stat-label">Open for Reg.</div>
            </div>
            <div className="hero-stat">
              <div className="hero-stat-value">DKO</div>
              <div className="hero-stat-label">Format</div>
            </div>
          </div>
        </div>
      </section>

      {/* Info banner */}
      <div className="info-banner">
        <div className="page-container">
          <div className="info-banner-inner">
            <div className="info-item">🌐 <span>Public access — no login required to view fixtures & scores</span></div>
            <div className="info-item">👤 <span>Login to register your team</span></div>
            <div className="info-item">⚙️ <span>Admin portal for tournament management</span></div>
          </div>
        </div>
      </div>

      {/* Who can use this */}
      <section className="section">
        <div className="page-container">
          <div className="section-header">
            <div className="section-label">Access Levels</div>
            <h2 className="section-title">Designed for Everyone</h2>
            <p className="section-subtitle">Three levels of access to suit your role</p>
          </div>
          <div className="user-types">
            <div className="user-type-card public">
              <div className="user-type-icon">🌐</div>
              <div className="user-type-title">Public Visitor</div>
              <p className="user-type-desc">No login needed. View all active tournaments, live scores, match results, fixtures, and standings in real time.</p>
              <Link to="/tournaments" className="btn btn-secondary btn-sm">View Tournaments →</Link>
            </div>
            <div className="user-type-card registered">
              <div className="user-type-icon">👤</div>
              <div className="user-type-title">Registered User</div>
              <p className="user-type-desc">Create an account to register your team in tournaments, track your team's bracket progress, and manage your registrations.</p>
              <Link to="/register" className="btn btn-royal btn-sm">Create Account →</Link>
            </div>
            <div className="user-type-card admin">
              <div className="user-type-icon">⚙️</div>
              <div className="user-type-title">Admin</div>
              <p className="user-type-desc">Full control — create and manage tournaments, approve teams, generate double-knockout fixtures, and update live match scores.</p>
              <Link to="/login" className="btn btn-primary btn-sm">Admin Login →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* Active Tournaments */}
      <section className="section section-alt">
        <div className="page-container">
          <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:24,flexWrap:'wrap',gap:12}}>
            <div>
              <div className="section-label">Live & Upcoming</div>
              <h2 className="section-title">Active Tournaments</h2>
              <p className="section-subtitle">Browse and register — no login needed to view</p>
            </div>
            <Link to="/tournaments" className="btn btn-secondary">View All Tournaments →</Link>
          </div>

          <div className="sport-filters">
            {sports.map(s => (
              <button key={s} className={`sport-btn ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
                {s !== 'all' && sportEmoji[s]} {s === 'all' ? 'All Sports' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {loading ? <div className="spinner" /> : filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏟️</div>
              <div className="empty-title">No tournaments yet</div>
              <div className="empty-desc">Check back soon or contact the sports department</div>
            </div>
          ) : (
            <div className="tournament-grid">
              {filtered.slice(0, 6).map(t => (
                <Link to={`/tournaments/${t._id}`} key={t._id} className="t-card">
                  <div className="t-card-top">
                    <div className="t-card-sport">{sportEmoji[t.sport] || '🏅'}</div>
                    {statusBadge(t.status)}
                  </div>
                  <div className="t-card-body">
                    <div className="t-card-name">{t.name}</div>
                    <div className="t-card-meta">
                      <div className="t-meta-row">📍 <span>{t.venue}</span></div>
                      <div className="t-meta-row">👥 <span>{t.maxTeams} Teams max · {t.playersPerTeam} players/team</span></div>
                      {t.startDate && <div className="t-meta-row">📅 <span>{new Date(t.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span></div>}
                      {t.sport === 'cricket' && t.overs && <div className="t-meta-row">🏏 <span>{t.overs} Overs</span></div>}
                    </div>
                  </div>
                  <div className="t-card-footer">
                    <span className="t-format-tag">🔄 Double Knockout</span>
                    <span className="t-view">View Details →</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="section">
        <div className="page-container">
          <div className="section-header" style={{textAlign:'center'}}>
            <div className="section-label" style={{justifyContent:'center'}}>Process</div>
            <h2 className="section-title">How It Works</h2>
            <p className="section-subtitle">From registration to championship in 4 steps</p>
          </div>
          <div className="steps-grid">
            {[
              {n:'01', icon:'📋', title:'Admin Creates Tournament', desc:'Sets sport, max teams, players, venue, dates, and opens registration.'},
              {n:'02', icon:'✍️', title:'Teams Register', desc:'Users register their team with captain & player details. Admin reviews and approves.'},
              {n:'03', icon:'⚡', title:'Fixture Generated', desc:'Admin generates double-knockout bracket with automatic seeding and bye assignment.'},
              {n:'04', icon:'🏆', title:'Live Matches & Results', desc:'Admin updates scores live. Standings and points table update automatically.'},
            ].map((s, i) => (
              <div key={i} className="step-card">
                <div className="step-number">{s.n}</div>
                <div className="step-icon">{s.icon}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DKO Explanation */}
      <section className="section section-alt">
        <div className="page-container">
          <div className="dko-grid">
            <div>
              <div className="section-label">Tournament Format</div>
              <h2 className="section-title">Double Knockout</h2>
              <p className="section-subtitle" style={{marginBottom:16}}>Every team gets a second chance</p>
              <p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:'0.9rem'}}>
                In Double Knockout, a team is eliminated only after losing <strong style={{color:'var(--navy)'}}>twice</strong>. After the first loss in the Winners Bracket, teams drop to the Losers Bracket — still in contention.
              </p>
              <ul className="dko-features">
                <li className="dko-feature"><span className="dko-feature-icon">🥇</span><span><strong>Seeding</strong> based on past performance & points</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🎰</span><span><strong>Byes</strong> automatically assigned to top seeds</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">⬇️</span><span><strong>Winners Bracket</strong> — undefeated teams</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🔁</span><span><strong>Losers Bracket</strong> — one loss, still fighting</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">🏆</span><span><strong>Grand Final</strong> — WB champion vs LB champion</span></li>
                <li className="dko-feature"><span className="dko-feature-icon">📊</span><span><strong>Points Table</strong> with NRR, wins, losses auto-calculated</span></li>
              </ul>
            </div>
            <div className="dko-diagram">
              <div className="dko-diagram-title">Bracket Structure</div>
              <div className="bracket-vis">
                <div className="bracket-row">
                  <div className="bracket-box wb">🥇 WB Round 1</div>
                  <div className="bracket-arr">→</div>
                  <div className="bracket-box wb">WB Final</div>
                </div>
                <div className="bracket-drop">↓ First Loss drops here</div>
                <div className="bracket-row">
                  <div className="bracket-box lb">🔁 LB Round 1</div>
                  <div className="bracket-arr">→</div>
                  <div className="bracket-box lb">LB Final</div>
                </div>
                <div style={{display:'flex',justifyContent:'center',marginTop:8}}>
                  <div className="bracket-arr" style={{fontSize:'1.2rem'}}>↓</div>
                </div>
                <div className="bracket-box gf">🏆 Grand Final</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="page-container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand-name">🏆 PU Tournament Management System</div>
              <p className="footer-brand-desc">Official platform of the Panjab University Sports Department for managing inter-university sporting tournaments with automated fixture generation and live scoring.</p>
            </div>
            <div>
              <div className="footer-col-title">Quick Links</div>
              <div className="footer-links">
                <Link to="/tournaments">Tournaments</Link>
                <Link to="/register">Register Team</Link>
                <Link to="/login">Login</Link>
                <Link to="/my-teams">My Teams</Link>
              </div>
            </div>
            <div>
              <div className="footer-col-title">Portal Access</div>
              <div className="footer-links">
                <Link to="/tournaments">Public View</Link>
                <Link to="/register">Team Registration</Link>
                <Link to="/admin">Admin Dashboard</Link>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <span>© 2026 Panjab University Sports Department. All rights reserved.</span>
            <span>Built with MERN Stack</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;

```

## File: frontend/src/pages/MyTeams.js
```javascript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { teamAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const MyTeams = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    teamAPI.getMyTeams()
      .then(res => { setTeams(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const borderColor = (status) => {
    if (status === 'approved') return 'var(--green)';
    if (status === 'rejected') return 'var(--red)';
    return 'var(--gold)';
  };

  return (
    <div className="page-container page-wrapper fade-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--royal)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 24, height: 2, background: 'var(--royal)', display: 'inline-block' }}></span>
          Team Management
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--navy)' }}>My Teams</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>Track your team registrations and their approval status</p>
          </div>
          <Link to="/tournaments" className="btn btn-royal">+ Register in a Tournament</Link>
        </div>
      </div>

      {/* Stats row */}
      {!loading && teams.length > 0 && (
        <div className="grid-4" style={{ marginBottom: 32 }}>
          {[
            { label: 'Total Registered', value: teams.length, color: 'var(--navy)' },
            { label: 'Approved', value: teams.filter(t => t.status === 'approved').length, color: 'var(--green)' },
            { label: 'Pending', value: teams.filter(t => t.status === 'pending').length, color: 'var(--gold)' },
            { label: 'Rejected', value: teams.filter(t => t.status === 'rejected').length, color: 'var(--red)' },
          ].map((s, i) => (
            <div key={i} className="stat-box" style={{ borderTop: `3px solid ${s.color}` }}>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="spinner" /> : teams.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 8 }}>No teams registered yet</div>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 24, fontSize: '0.875rem' }}>Browse open tournaments and register your team to get started</p>
          <Link to="/tournaments" className="btn btn-primary btn-lg">Browse Tournaments</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 40 }}>
          {teams.map(team => (
            <div key={team._id} style={{
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderLeft: `4px solid ${borderColor(team.status)}`,
              borderRadius: 12, padding: '24px', boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
                <div style={{ flex: 1 }}>
                  {/* Team header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                    <h3 style={{ fontWeight: 800, fontSize: '1.15rem', color: 'var(--navy)' }}>{team.teamName}</h3>
                    <span className={`badge ${team.status === 'approved' ? 'badge-green' : team.status === 'rejected' ? 'badge-red' : 'badge-gold'}`}>
                      {team.status === 'approved' ? '✅ Approved' : team.status === 'rejected' ? '❌ Rejected' : '⏳ Pending Review'}
                    </span>
                  </div>

                  {/* Info grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '6px 24px', marginBottom: 12 }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🏆 <strong style={{ color: 'var(--navy)' }}>{team.tournament?.name}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      🏅 {team.tournament?.sport?.charAt(0).toUpperCase() + team.tournament?.sport?.slice(1)}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      👤 Captain: <strong style={{ color: 'var(--text-primary)' }}>{team.captainName}</strong>
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      👥 {team.players?.length || 0} players registered
                    </div>
                    {team.wins > 0 || team.losses > 0 ? (
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        📊 W: <span style={{ color: 'var(--green)', fontWeight: 700 }}>{team.wins || 0}</span> &nbsp; L: <span style={{ color: 'var(--red)', fontWeight: 700 }}>{team.losses || 0}</span>
                      </div>
                    ) : null}
                    {team.bracket && team.bracket !== 'pending' && (
                      <div style={{ fontSize: '0.85rem' }}>
                        {team.bracket === 'winners' && <span className="badge badge-gold">🥇 Winners Bracket</span>}
                        {team.bracket === 'losers' && <span className="badge badge-blue">🔁 Losers Bracket</span>}
                        {team.bracket === 'eliminated' && <span className="badge badge-red">Eliminated</span>}
                        {team.bracket === 'champion' && <span className="badge badge-green">🏆 Champion!</span>}
                      </div>
                    )}
                  </div>

                  {/* Players */}
                  {team.players?.length > 0 && (
                    <div style={{ marginTop: 12 }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Squad</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {team.players.map((p, i) => (
                          <span key={i} className="badge badge-gray">{p.name}{p.role ? ` · ${p.role}` : ''}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status alerts */}
                  {team.status === 'pending' && (
                    <div className="alert alert-warning" style={{ marginTop: 14, marginBottom: 0 }}>
                      ⏳ Your registration is <strong>pending admin review</strong>. You'll be notified once approved.
                    </div>
                  )}
                  {team.status === 'rejected' && (
                    <div className="alert alert-error" style={{ marginTop: 14, marginBottom: 0 }}>
                      ❌ Your registration was <strong>not approved</strong>. Contact the tournament admin for more info.
                    </div>
                  )}
                  {team.status === 'approved' && (
                    <div className="alert alert-success" style={{ marginTop: 14, marginBottom: 0 }}>
                      ✅ Your team is <strong>approved and competing</strong>! Follow your progress in the tournament bracket.
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                  <Link to={`/tournaments/${team.tournament?._id}`} className="btn btn-royal btn-sm">View Tournament →</Link>
                  {team.status === 'approved' && (
                    <Link to={`/tournaments/${team.tournament?._id}`} className="btn btn-secondary btn-sm">📊 See Bracket</Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTeams;

```

## File: frontend/src/pages/PyramidAdmin.js
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { pyramidAPI } from '../utils/api';
import SetupScreen from '../components/pyramid/SetupScreen';
import PyramidBoard from '../components/pyramid/PyramidBoard';
import PyramidAdminComponent from '../components/pyramid/PyramidAdmin';
import PyramidHistory from '../components/pyramid/PyramidHistory';
import '../components/pyramid/Pyramid.css';

export default function PyramidAdmin() {
  const { id: tournamentId } = useParams();
  const [standings, setStandings] = useState([]);
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStandings = useCallback(async () => {
    try {
      const { data } = await pyramidAPI.getStandings(tournamentId);
      setStandings(data.pyramidStandings);
      setPendingChallenges(data.pendingChallenges);
      setCompletedMatches(data.completedMatches);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Pyramid Engine...</div>;

  return (
    <div className="pyramid-page" style={{ padding: '2rem', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Pyramid Tournament Engine
      </h1>
      
      {standings.length === 0 ? (
        <SetupScreen tournamentId={tournamentId} refreshData={fetchStandings} />
      ) : (
        <div className="pyramid-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <PyramidBoard tournamentId={tournamentId} standings={standings} refreshData={fetchStandings} />
          <div className="pyramid-side" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <PyramidAdminComponent pendingChallenges={pendingChallenges} standings={standings} refreshData={fetchStandings} />
            <PyramidHistory standings={standings} completedMatches={completedMatches} />
          </div>
        </div>
      )}
    </div>
  );
}

```

## File: frontend/src/pages/TournamentDetail.js
```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { tournamentAPI, teamAPI, matchAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const sportEmoji = { cricket:'🏏', football:'⚽', basketball:'🏀', badminton:'🏸', tennis:'🎾', volleyball:'🏐', other:'🏅' };

const statusBadge = (status) => {
  const map = {
    registration_open: ['badge-green','Registration Open'],
    registration_closed: ['badge-gray','Registration Closed'],
    fixture_generated: ['badge-blue','Fixture Ready'],
    ongoing: ['badge-live','● Live'],
    completed: ['badge-navy','Completed'],
    upcoming: ['badge-orange','Upcoming'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

// ── Points Table calculator ──────────────────────────────────────────
const buildPointsTable = (teams, matches) => {
  const approved = teams.filter(t => t.status === 'approved');
  const completed = matches.filter(m => m.status === 'completed' && !m.isBye && m.winner);

  const stats = {};
  for (const t of approved) {
    stats[t._id] = {
      team: t, played: 0, won: 0, lost: 0, points: 0,
      runsFor: 0, runsAgainst: 0, oversFor: 0, oversAgainst: 0, nrr: 0
    };
  }

  for (const m of completed) {
    const aId = m.teamA?._id?.toString();
    const bId = m.teamB?._id?.toString();
    const wId = m.winner?._id?.toString();
    if (!aId || !bId || !wId) continue;

    if (stats[aId]) {
      stats[aId].played++;
      if (wId === aId) { stats[aId].won++; stats[aId].points += 2; }
      else stats[aId].lost++;
      if (m.teamAScore?.runs) { stats[aId].runsFor += m.teamAScore.runs; stats[aId].oversFor += m.teamAScore.overs || 0; }
      if (m.teamBScore?.runs) { stats[aId].runsAgainst += m.teamBScore.runs; stats[aId].oversAgainst += m.teamBScore.overs || 0; }
    }
    if (stats[bId]) {
      stats[bId].played++;
      if (wId === bId) { stats[bId].won++; stats[bId].points += 2; }
      else stats[bId].lost++;
      if (m.teamBScore?.runs) { stats[bId].runsFor += m.teamBScore.runs; stats[bId].oversFor += m.teamBScore.overs || 0; }
      if (m.teamAScore?.runs) { stats[bId].runsAgainst += m.teamAScore.runs; stats[bId].oversAgainst += m.teamAScore.overs || 0; }
    }
  }

  return Object.values(stats).map(s => {
    const rrf = s.oversFor > 0 ? s.runsFor / s.oversFor : 0;
    const rra = s.oversAgainst > 0 ? s.runsAgainst / s.oversAgainst : 0;
    s.nrr = parseFloat((rrf - rra).toFixed(3));
    return s;
  }).sort((a, b) => b.points - a.points || b.nrr - a.nrr || b.won - a.won);
};

// ── Match Summary (completed) ────────────────────────────────────────
const MatchSummary = ({ match }) => {
  const isCricket = match.teamAScore?.runs !== undefined;
  const winner = match.winner;
  const teamA = match.teamA;
  const teamB = match.teamB;
  const isAWinner = winner?._id === teamA?._id || winner?.teamName === teamA?.teamName;

  return (
    <div style={{background:'var(--bg-card)',border:'1.5px solid var(--border)',borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow-sm)',marginBottom:16}}>
      {/* Header */}
      <div style={{background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',padding:'14px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{background:'rgba(255,255,255,0.1)',borderRadius:4,padding:'2px 8px',fontSize:'0.7rem',color:'rgba(255,255,255,0.7)',fontWeight:600}}>M{match.matchNumber}</span>
          <span style={{fontSize:'0.8rem',color:'rgba(255,255,255,0.85)',fontWeight:600}}>{match.roundName}</span>
        </div>
        <span className="badge badge-green" style={{fontSize:'0.65rem'}}>✓ COMPLETED</span>
      </div>

      {/* Score area */}
      <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center'}}>
        {/* Team A */}
        <div style={{textAlign:'left'}}>
          <div style={{fontSize:'1rem',fontWeight:isAWinner?800:500,color:isAWinner?'var(--navy)':'var(--text-secondary)',marginBottom:4}}>
            {isAWinner && <span style={{color:'var(--gold)',marginRight:4}}>🏆</span>}
            {teamA?.teamName || 'TBD'}
          </div>
          {isCricket && match.teamAScore && (
            <div style={{fontSize:'1.3rem',fontWeight:800,color:isAWinner?'var(--navy)':'var(--text-muted)',fontFamily:'monospace'}}>
              {match.teamAScore.runs}/{match.teamAScore.wickets}
              <span style={{fontSize:'0.8rem',fontWeight:400,color:'var(--text-muted)',marginLeft:4}}>({match.teamAScore.overs} ov)</span>
            </div>
          )}
          {isAWinner && <span className="badge badge-gold" style={{marginTop:6}}>Winner</span>}
          {!isAWinner && match.winner && <span className="badge badge-gray" style={{marginTop:6}}>Runner-up</span>}
        </div>

        {/* VS */}
        <div style={{textAlign:'center'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--bg-secondary)',border:'2px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:700,color:'var(--text-muted)',margin:'0 auto'}}>VS</div>
        </div>

        {/* Team B */}
        <div style={{textAlign:'right'}}>
          <div style={{fontSize:'1rem',fontWeight:!isAWinner?800:500,color:!isAWinner?'var(--navy)':'var(--text-secondary)',marginBottom:4}}>
            {teamB?.teamName || 'TBD'}
            {!isAWinner && match.winner && <span style={{color:'var(--gold)',marginLeft:4}}>🏆</span>}
          </div>
          {isCricket && match.teamBScore && (
            <div style={{fontSize:'1.3rem',fontWeight:800,color:!isAWinner&&match.winner?'var(--navy)':'var(--text-muted)',fontFamily:'monospace'}}>
              {match.teamBScore.runs}/{match.teamBScore.wickets}
              <span style={{fontSize:'0.8rem',fontWeight:400,color:'var(--text-muted)',marginLeft:4}}>({match.teamBScore.overs} ov)</span>
            </div>
          )}
          {!isAWinner && match.winner && <span className="badge badge-gold" style={{marginTop:6}}>Winner</span>}
          {isAWinner && <span className="badge badge-gray" style={{marginTop:6}}>Runner-up</span>}
        </div>
      </div>

      {/* Footer */}
      <div style={{padding:'10px 20px',background:'var(--bg-primary)',borderTop:'1px solid var(--border)',display:'flex',gap:20,fontSize:'0.78rem',color:'var(--text-muted)'}}>
        {match.venue && <span>📍 {match.venue}</span>}
        {match.scheduledDate && <span>📅 {new Date(match.scheduledDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</span>}
        {match.notes && <span>📝 {match.notes}</span>}
      </div>
    </div>
  );
};

// ── Live Match Card ──────────────────────────────────────────────────
const LiveMatchCard = ({ match }) => {
  const teamA = match.teamA;
  const teamB = match.teamB;
  const isCricket = match.teamAScore?.runs !== undefined;

  return (
    <div style={{background:'var(--bg-card)',border:'2px solid var(--red)',borderRadius:14,overflow:'hidden',boxShadow:'0 4px 20px rgba(192,57,43,0.15)',marginBottom:16}}>
      <div style={{background:'var(--red)',padding:'10px 20px',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{color:'#fff',fontWeight:700,fontSize:'0.82rem',display:'flex',alignItems:'center',gap:6}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#fff',display:'inline-block',animation:'pulse 1s infinite'}}></span>
          LIVE · {match.roundName}
        </span>
        <span style={{color:'rgba(255,255,255,0.8)',fontSize:'0.72rem'}}>M{match.matchNumber}</span>
      </div>
      <div style={{padding:'20px',display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:16,alignItems:'center'}}>
        <div>
          <div style={{fontWeight:700,color:'var(--navy)',marginBottom:4}}>{teamA?.teamName || 'TBD'}</div>
          {isCricket && match.teamAScore && (
            <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--navy)',fontFamily:'monospace'}}>
              {match.teamAScore.runs}/{match.teamAScore.wickets}
              <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:400,marginLeft:4}}>({match.teamAScore.overs} ov)</span>
            </div>
          )}
        </div>
        <div style={{textAlign:'center'}}>
          <div style={{width:44,height:44,borderRadius:'50%',background:'var(--red)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'0.75rem',fontWeight:800,color:'#fff',margin:'0 auto'}}>VS</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div style={{fontWeight:700,color:'var(--navy)',marginBottom:4}}>{teamB?.teamName || 'TBD'}</div>
          {isCricket && match.teamBScore && (
            <div style={{fontSize:'1.5rem',fontWeight:800,color:'var(--navy)',fontFamily:'monospace'}}>
              {match.teamBScore.runs}/{match.teamBScore.wickets}
              <span style={{fontSize:'0.8rem',color:'var(--text-muted)',fontWeight:400,marginLeft:4}}>({match.teamBScore.overs} ov)</span>
            </div>
          )}
        </div>
      </div>
      {match.venue && (
        <div style={{padding:'8px 20px',background:'var(--red-bg)',borderTop:'1px solid var(--border)',fontSize:'0.78rem',color:'var(--text-muted)'}}>
          📍 {match.venue}
        </div>
      )}
    </div>
  );
};

// ── Scheduled Match Card ─────────────────────────────────────────────
const ScheduledMatchCard = ({ match, color }) => (
  <div style={{background:'var(--bg-card)',border:`1px solid ${color}30`,borderLeft:`3px solid ${color}`,borderRadius:10,padding:'14px 18px',marginBottom:10}}>
    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,flexWrap:'wrap',gap:6}}>
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        <span style={{fontFamily:'monospace',fontSize:'0.72rem',color:'var(--text-muted)',background:'var(--bg-secondary)',padding:'2px 8px',borderRadius:4}}>M{match.matchNumber}</span>
        <span style={{fontSize:'0.8rem',color,fontWeight:600}}>{match.roundName}</span>
      </div>
      <span className={`badge ${match.status==='live'?'badge-live':match.status==='bye'?'badge-blue':'badge-gray'}`} style={{fontSize:'0.65rem'}}>
        {match.isBye?'BYE':match.status?.toUpperCase()}
      </span>
    </div>
    {match.isBye ? (
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <span style={{fontWeight:700,color:'var(--text-primary)'}}>{match.teamA?.teamName||'TBD'}</span>
        <span className="badge badge-blue" style={{fontSize:'0.65rem'}}>Auto Advance</span>
      </div>
    ) : (
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <div style={{flex:1,fontWeight:500,color:'var(--text-primary)'}}>{match.teamA?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}</div>
        <div style={{color:'var(--text-muted)',fontWeight:700,fontSize:'0.78rem',padding:'4px 10px',background:'var(--bg-secondary)',borderRadius:6}}>VS</div>
        <div style={{flex:1,textAlign:'right',fontWeight:500,color:'var(--text-primary)'}}>{match.teamB?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}</div>
      </div>
    )}
    {match.venue && (
      <div style={{marginTop:8,fontSize:'0.75rem',color:'var(--text-muted)',display:'flex',gap:12}}>
        <span>📍 {match.venue}</span>
        {match.scheduledDate&&<span>📅 {new Date(match.scheduledDate).toLocaleDateString('en-IN')}</span>}
      </div>
    )}
  </div>
);

// ── Points Table component ───────────────────────────────────────────
const PointsTable = ({ teams, matches, isCricket }) => {
  const rows = buildPointsTable(teams, matches);
  if (rows.length === 0) return (
    <div className="empty-state"><div className="empty-icon">📊</div><div className="empty-title">No teams yet</div></div>
  );

  return (
    <div className="table-wrap">
      <table className="data-table pts-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Team</th>
            <th>P</th>
            <th>W</th>
            <th>L</th>
            <th>Pts</th>
            {isCricket && <th>NRR</th>}
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.team._id}>
              <td><span className={`pts-rank ${i===0?'pts-rank-1':i===1?'pts-rank-2':i===2?'pts-rank-3':''}`}>{i+1}</span></td>
              <td><strong style={{color:'var(--navy)'}}>{r.team.teamName}</strong><div style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{r.team.captainName}</div></td>
              <td>{r.played}</td>
              <td style={{color:'var(--green)',fontWeight:600}}>{r.won}</td>
              <td style={{color:'var(--red)',fontWeight:600}}>{r.lost}</td>
              <td><strong style={{color:'var(--navy)',fontSize:'1rem'}}>{r.points}</strong></td>
              {isCricket && <td style={{color:r.nrr>=0?'var(--green)':'var(--red)',fontWeight:600}}>{r.nrr>=0?'+':''}{r.nrr}</td>}
              <td>
                {r.team.bracket==='winners'&&<span className="badge badge-gold">WB</span>}
                {r.team.bracket==='losers'&&<span className="badge badge-blue">LB</span>}
                {r.team.bracket==='eliminated'&&<span className="badge badge-red">Eliminated</span>}
                {r.team.bracket==='champion'&&<span className="badge badge-green">🏆 Champion</span>}
                {(!r.team.bracket||r.team.bracket==='pending')&&<span className="badge badge-gray">Pending</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Bracket View ─────────────────────────────────────────────────────
const BracketView = ({ winnerMatches, loserMatches, finalMatches }) => {
  const groupByRound = arr => {
    const map = {};
    for (const m of arr) { if (!map[m.round]) map[m.round]=[]; map[m.round].push(m); }
    return Object.entries(map).sort(([a],[b])=>Number(a)-Number(b));
  };

  const BMini = ({ match, color }) => {
    const isAWin = match.winner && (match.winner._id === match.teamA?._id || match.winner.teamName === match.teamA?.teamName);
    return (
      <div style={{background:'var(--bg-card)',border:`1px solid ${color}35`,borderLeft:`3px solid ${color}`,borderRadius:8,padding:'10px 14px',minWidth:200,maxWidth:240}}>
        <div style={{fontSize:'0.65rem',color:'var(--text-muted)',marginBottom:6,display:'flex',gap:6}}>
          <span style={{background:'var(--bg-secondary)',padding:'1px 6px',borderRadius:3,fontFamily:'monospace'}}>M{match.matchNumber}</span>
          <span style={{color}}>{match.roundName}</span>
        </div>
        {match.isBye ? (
          <><div style={{fontWeight:600,fontSize:'0.82rem',color:'var(--text-primary)',marginBottom:3}}>{match.teamA?.teamName||'TBD'}</div><span className="badge badge-blue" style={{fontSize:'0.6rem'}}>BYE</span></>
        ) : (<>
          <div style={{fontWeight:isAWin?700:400,color:isAWin?color:'var(--text-primary)',fontSize:'0.82rem',marginBottom:2}}>
            {match.teamA?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}{isAWin?' ✓':''}
          </div>
          <div style={{height:1,background:'var(--border)',margin:'5px 0'}}/>
          <div style={{fontWeight:!isAWin&&match.winner?700:400,color:!isAWin&&match.winner?color:'var(--text-primary)',fontSize:'0.82rem'}}>
            {match.teamB?.teamName||<span style={{color:'var(--text-muted)',fontStyle:'italic'}}>TBD</span>}{!isAWin&&match.winner?' ✓':''}
          </div>
        </>)}
        <div style={{marginTop:6}}>
          <span className={`badge ${match.status==='completed'?'badge-green':match.status==='live'?'badge-live':match.status==='bye'?'badge-blue':'badge-gray'}`} style={{fontSize:'0.58rem'}}>
            {match.status==='live'?'● LIVE':match.status?.toUpperCase()}
          </span>
        </div>
      </div>
    );
  };

  const RoundCol = ({label,matches,color}) => (
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <div style={{fontSize:'0.68rem',fontWeight:700,color,textTransform:'uppercase',letterSpacing:'0.08em',padding:'4px 10px',background:`${color}12`,borderRadius:4,textAlign:'center',border:`1px solid ${color}20`}}>{label}</div>
      {matches.map(m=><BMini key={m._id} match={m} color={color}/>)}
    </div>
  );

  const wbG=groupByRound(winnerMatches), lbG=groupByRound(loserMatches);
  const WB='#C8963E', LB='#2B4C8C', GF='#1B2A4A';
  return (
    <div>
      <div style={{display:'flex',gap:10,marginBottom:20,flexWrap:'wrap'}}>
        <span className="badge badge-gold">🥇 Winners Bracket</span>
        <span className="badge badge-blue">🔁 Losers Bracket</span>
        <span className="badge badge-navy">🏆 Grand Final</span>
      </div>
      {wbG.length>0&&<div style={{marginBottom:32}}>
        <div style={{fontSize:'0.75rem',fontWeight:700,color:WB,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>🥇 Winners Bracket</div>
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>{wbG.map(([r,ms])=><RoundCol key={r} label={ms[0]?.roundName||`WB R${r}`} matches={ms} color={WB}/>)}</div>
      </div>}
      {lbG.length>0&&<div style={{marginBottom:32}}>
        <div style={{fontSize:'0.75rem',fontWeight:700,color:LB,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>🔁 Losers Bracket</div>
        <div style={{display:'flex',gap:16,overflowX:'auto',paddingBottom:8}}>{lbG.map(([r,ms])=><RoundCol key={r} label={ms[0]?.roundName||`LB R${r}`} matches={ms} color={LB}/>)}</div>
      </div>}
      {finalMatches.length>0&&<div>
        <div style={{fontSize:'0.75rem',fontWeight:700,color:GF,marginBottom:12,textTransform:'uppercase',letterSpacing:'0.1em'}}>🏆 Grand Final</div>
        <div style={{display:'flex',gap:16}}>{finalMatches.map(m=><BMini key={m._id} match={m} color={GF}/>)}</div>
      </div>}
    </div>
  );
};

// ── Main TournamentDetail component ─────────────────────────────────
const TournamentDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showRegModal, setShowRegModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [regForm, setRegForm] = useState({ teamName:'', captainName:'', captainContact:'', captainEmail:'', players:[], points:0 });
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [t, tm, m] = await Promise.all([tournamentAPI.getOne(id), teamAPI.getByTournament(id), matchAPI.getByTournament(id)]);
      setTournament(t.data); setTeams(tm.data); setMatches(m.data);
    } catch {}
    setLoading(false);
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleRegister = async (e) => {
    e.preventDefault(); setRegError(''); setRegSuccess('');
    if (!regForm.teamName||!regForm.captainName) return setRegError('Team name and captain name are required');
    setRegLoading(true);
    try {
      await teamAPI.register({ tournamentId: id, ...regForm });
      setRegSuccess('Team registered! Pending admin approval.');
      setTimeout(() => { setShowRegModal(false); setRegSuccess(''); }, 3000);
      const tm = await teamAPI.getByTournament(id);
      setTeams(tm.data);
    } catch (err) { setRegError(err.response?.data?.message || 'Registration failed'); }
    setRegLoading(false);
  };

  if (loading) return <div className="page-container"><div className="spinner"/></div>;
  if (!tournament) return <div className="page-container page-wrapper"><div className="alert alert-error">Tournament not found</div></div>;

  const approvedTeams = teams.filter(t => t.status === 'approved');
  const liveMatches = matches.filter(m => m.status === 'live');
  const completedMatches = matches.filter(m => m.status === 'completed' && !m.isBye);
  const scheduledMatches = matches.filter(m => m.status === 'scheduled');
  const winnerMatches = matches.filter(m => m.bracketType === 'winners').sort((a,b)=>a.matchNumber-b.matchNumber);
  const loserMatches = matches.filter(m => m.bracketType === 'losers').sort((a,b)=>a.matchNumber-b.matchNumber);
  const finalMatches = matches.filter(m => m.bracketType === 'grand_final').sort((a,b)=>a.matchNumber-b.matchNumber);
  const isCricket = tournament.sport === 'cricket';

  const tabs = [
    {id:'overview',label:'Overview'},
    {id:'scores',label:`Scores ${liveMatches.length>0?'🔴':''}`},
    {id:'points',label:'Points Table'},
    {id:'fixtures',label:'Fixtures'},
    {id:'bracket',label:'Bracket'},
    {id:'teams',label:'Teams'},
  ];

  return (
    <div className="page-container page-wrapper fade-in">
      {/* Header */}
      <div style={{marginBottom:28}}>
        <Link to="/tournaments" style={{color:'var(--royal)',textDecoration:'none',fontSize:'0.82rem',display:'inline-flex',alignItems:'center',gap:6,marginBottom:16,fontWeight:500}}>
          ← Back to Tournaments
        </Link>
        <div style={{background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',borderRadius:16,padding:'28px 32px',color:'#fff',display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:16}}>
          <div style={{display:'flex',gap:20,alignItems:'center'}}>
            <div style={{fontSize:'3.5rem',background:'rgba(255,255,255,0.08)',borderRadius:14,width:72,height:72,display:'flex',alignItems:'center',justifyContent:'center'}}>{sportEmoji[tournament.sport]||'🏅'}</div>
            <div>
              <h1 style={{fontSize:'1.8rem',fontWeight:800,color:'#fff',marginBottom:10,lineHeight:1.1}}>{tournament.name}</h1>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                <span className="badge badge-gold">{tournament.sport?.toUpperCase()}</span>
                {statusBadge(tournament.status)}
                <span className="badge badge-blue">🔄 Double Knockout</span>
                {liveMatches.length>0&&<span className="badge badge-live">🔴 {liveMatches.length} Live</span>}
              </div>
            </div>
          </div>
          <div style={{display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end'}}>
            {tournament.status==='registration_open'&&user&&(
              <button className="btn btn-gold btn-lg" onClick={()=>setShowRegModal(true)}>✍️ Register Team</button>
            )}
            {tournament.status==='registration_open'&&!user&&(
              <Link to="/login" className="btn btn-gold btn-lg">Login to Register</Link>
            )}
            {!user&&<Link to="/tournaments" style={{color:'rgba(255,255,255,0.5)',fontSize:'0.78rem',textAlign:'center'}}>Viewing as guest</Link>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t=>(
          <button key={t.id} className={`tab-btn ${activeTab===t.id?'active':''}`} onClick={()=>setActiveTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab==='overview'&&(
        <div className="fade-in">
          {liveMatches.length>0&&(
            <div style={{marginBottom:32}}>
              <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--red)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
                <span style={{width:10,height:10,borderRadius:'50%',background:'var(--red)',display:'inline-block',animation:'pulse 1s infinite'}}></span>
                Live Matches
              </h3>
              {liveMatches.map(m=><LiveMatchCard key={m._id} match={m}/>)}
            </div>
          )}
          <div className="grid-4" style={{marginBottom:32}}>
            {[
              {label:'Sport',value:tournament.sport?.charAt(0).toUpperCase()+tournament.sport?.slice(1)},
              {label:'Teams',value:`${approvedTeams.length}/${tournament.maxTeams}`},
              {label:'Matches',value:matches.filter(m=>!m.isBye).length},
              {label:'Completed',value:completedMatches.length},
            ].map((s,i)=>(
              <div key={i} className="stat-box">
                <div className="stat-value">{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="grid-2" style={{marginBottom:32}}>
            <div className="card">
              <h4 style={{fontWeight:700,color:'var(--navy)',marginBottom:16,fontSize:'0.95rem'}}>📋 Tournament Details</h4>
              {[
                ['📍 Venue', tournament.venue],
                ['👥 Players/Team', tournament.playersPerTeam],
                ['📅 Start Date', tournament.startDate?new Date(tournament.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'TBD'],
                ['📅 End Date', tournament.endDate?new Date(tournament.endDate).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}):'TBD'],
                isCricket&&['🏏 Overs', tournament.overs],
                tournament.prizeInfo&&['🏆 Prize', tournament.prizeInfo],
                tournament.registrationDeadline&&['⏰ Reg. Deadline', new Date(tournament.registrationDeadline).toLocaleDateString('en-IN')],
              ].filter(Boolean).map(([k,v])=>(
                <div key={k} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-light)',fontSize:'0.875rem'}}>
                  <span style={{color:'var(--text-muted)'}}>{k}</span>
                  <span style={{fontWeight:600,color:'var(--navy)'}}>{v}</span>
                </div>
              ))}
            </div>
            <div className="card">
              <h4 style={{fontWeight:700,color:'var(--navy)',marginBottom:16,fontSize:'0.95rem'}}>📊 Quick Points Table</h4>
              {approvedTeams.length===0?(
                <div className="empty-state" style={{padding:'24px 0'}}><div className="empty-icon">👥</div><div className="empty-title" style={{fontSize:'0.9rem'}}>No approved teams yet</div></div>
              ):(
                <PointsTable teams={teams} matches={matches} isCricket={isCricket}/>
              )}
            </div>
          </div>
          {tournament.description&&(
            <div className="card"><h4 style={{fontWeight:700,color:'var(--navy)',marginBottom:12}}>📝 Description</h4><p style={{color:'var(--text-secondary)',lineHeight:1.8,fontSize:'0.9rem'}}>{tournament.description}</p></div>
          )}
        </div>
      )}

      {/* SCORES TAB */}
      {activeTab==='scores'&&(
        <div className="fade-in">
          {liveMatches.length>0&&(
            <div style={{marginBottom:32}}>
              <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--red)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>● Live Now</h3>
              {liveMatches.map(m=><LiveMatchCard key={m._id} match={m}/>)}
            </div>
          )}
          {completedMatches.length>0&&(
            <div>
              <h3 style={{fontSize:'1rem',fontWeight:700,color:'var(--navy)',marginBottom:14}}>✓ Match Summaries</h3>
              {completedMatches.sort((a,b)=>b.matchNumber-a.matchNumber).map(m=><MatchSummary key={m._id} match={m}/>)}
            </div>
          )}
          {liveMatches.length===0&&completedMatches.length===0&&(
            <div className="empty-state card"><div className="empty-icon">📺</div><div className="empty-title">No scores yet</div><div className="empty-desc">Scores will appear here once matches begin</div></div>
          )}
        </div>
      )}

      {/* POINTS TABLE TAB */}
      {activeTab==='points'&&(
        <div className="fade-in">
          <div className="card" style={{marginBottom:20}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:12}}>
              <div>
                <h3 style={{fontSize:'1.1rem',fontWeight:700,color:'var(--navy)'}}>📊 Points Table</h3>
                <p style={{fontSize:'0.82rem',color:'var(--text-muted)',marginTop:4}}>
                  Points: Win = 2 pts, Loss = 0 pts{isCricket&&' · NRR = Net Run Rate (Runs/Over scored − Runs/Over conceded)'}
                </p>
              </div>
              <div style={{display:'flex',gap:8,fontSize:'0.78rem',color:'var(--text-muted)'}}>
                <span className="badge badge-gold">#1</span>
                <span className="badge badge-gray">#2</span>
                <span className="badge badge-orange">#3</span>
              </div>
            </div>
            <PointsTable teams={teams} matches={matches} isCricket={isCricket}/>
          </div>
          <div className="card" style={{background:'var(--blue-light)',border:'1px solid #C0D4F0'}}>
            <div style={{fontSize:'0.82rem',color:'var(--royal)',lineHeight:1.8}}>
              <strong>How points are calculated:</strong><br/>
              • Each win = <strong>2 points</strong> | Each loss = <strong>0 points</strong><br/>
              • Tiebreaker: Net Run Rate (NRR) = (Runs scored ÷ Overs faced) − (Runs conceded ÷ Overs bowled)<br/>
              • Table updates automatically after each match result is entered
            </div>
          </div>
        </div>
      )}

      {/* FIXTURES TAB */}
      {activeTab==='fixtures'&&(
        <div className="fade-in">
          {matches.length===0?(
            <div className="card empty-state"><div className="empty-icon">📅</div><div className="empty-title">No fixtures generated yet</div><div className="empty-desc">Admin will generate the fixture after all teams are registered</div></div>
          ):(
            <>
              {liveMatches.length>0&&<div style={{marginBottom:28}}>
                <h3 style={{fontSize:'0.95rem',fontWeight:700,color:'var(--red)',marginBottom:12}}>● Live</h3>
                {liveMatches.map(m=><ScheduledMatchCard key={m._id} match={m} color="var(--red)"/>)}
              </div>}
              {[
                {title:'🥇 Winners Bracket',list:winnerMatches.filter(m=>m.status!=='live'),color:'#C8963E'},
                {title:'🔁 Losers Bracket',list:loserMatches.filter(m=>m.status!=='live'),color:'#2B4C8C'},
                {title:'🏆 Grand Final',list:finalMatches.filter(m=>m.status!=='live'),color:'#1B2A4A'},
              ].map(({title,list,color})=>list.length>0&&(
                <div key={title} style={{marginBottom:28}}>
                  <h3 style={{fontSize:'0.95rem',fontWeight:700,color,marginBottom:12}}>{title}</h3>
                  {list.map(m=><ScheduledMatchCard key={m._id} match={m} color={color}/>)}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* BRACKET TAB */}
      {activeTab==='bracket'&&(
        <div className="fade-in">
          {matches.length===0?(
            <div className="card empty-state"><div className="empty-icon">🏆</div><div className="empty-title">Bracket not generated yet</div></div>
          ):(
            <div className="card"><BracketView winnerMatches={winnerMatches} loserMatches={loserMatches} finalMatches={finalMatches}/></div>
          )}
        </div>
      )}

      {/* TEAMS TAB */}
      {activeTab==='teams'&&(
        <div className="fade-in">
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>#</th><th>Team</th><th>Captain</th><th>Players</th><th>W</th><th>L</th><th>Bracket</th><th>Status</th></tr></thead>
              <tbody>
                {teams.length===0?<tr><td colSpan={8} style={{textAlign:'center',color:'var(--text-muted)',padding:40}}>No teams registered yet</td></tr>:
                  teams.map((t,i)=>(
                    <tr key={t._id}>
                      <td style={{color:'var(--text-muted)',fontWeight:600}}>{i+1}</td>
                      <td><strong style={{color:'var(--navy)'}}>{t.teamName}</strong>{t.seed>0&&<span style={{marginLeft:6,fontSize:'0.72rem',color:'var(--text-muted)'}}>Seed #{t.seed}</span>}</td>
                      <td style={{color:'var(--text-secondary)'}}>{t.captainName}</td>
                      <td>{t.players?.length||0}</td>
                      <td style={{color:'var(--green)',fontWeight:600}}>{t.wins||0}</td>
                      <td style={{color:'var(--red)',fontWeight:600}}>{t.losses||0}</td>
                      <td>
                        {t.bracket==='winners'&&<span className="badge badge-gold">WB</span>}
                        {t.bracket==='losers'&&<span className="badge badge-blue">LB</span>}
                        {t.bracket==='eliminated'&&<span className="badge badge-red">Eliminated</span>}
                        {t.bracket==='champion'&&<span className="badge badge-green">🏆 Champion</span>}
                        {(!t.bracket||t.bracket==='pending')&&<span className="badge badge-gray">—</span>}
                      </td>
                      <td><span className={`badge ${t.status==='approved'?'badge-green':t.status==='rejected'?'badge-red':'badge-gray'}`}>{t.status}</span></td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REGISTRATION MODAL */}
      {showRegModal&&(
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setShowRegModal(false)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">✍️ Register Your Team</h2>
              <button className="modal-close" onClick={()=>setShowRegModal(false)}>✕</button>
            </div>
            <p style={{color:'var(--text-secondary)',marginBottom:20,fontSize:'0.875rem'}}>Tournament: <strong style={{color:'var(--navy)'}}>{tournament.name}</strong></p>
            {regError&&<div className="alert alert-error">{regError}</div>}
            {regSuccess&&<div className="alert alert-success">{regSuccess}</div>}
            <form onSubmit={handleRegister}>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Team Name *</label>
                  <input className="form-input" value={regForm.teamName} onChange={e=>setRegForm({...regForm,teamName:e.target.value})} placeholder="e.g., Royal Challengers" required/>
                </div>
                <div className="form-group">
                  <label className="form-label">Captain Name *</label>
                  <input className="form-input" value={regForm.captainName} onChange={e=>setRegForm({...regForm,captainName:e.target.value})} placeholder="Captain's full name" required/>
                </div>
              </div>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">Captain Contact</label>
                  <input className="form-input" value={regForm.captainContact} onChange={e=>setRegForm({...regForm,captainContact:e.target.value})} placeholder="+91 98765 43210"/>
                </div>
                <div className="form-group">
                  <label className="form-label">Captain Email</label>
                  <input className="form-input" type="email" value={regForm.captainEmail} onChange={e=>setRegForm({...regForm,captainEmail:e.target.value})} placeholder="captain@email.com"/>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Past Performance Points <span style={{color:'var(--text-muted)',textTransform:'none',fontWeight:400}}>— for seeding</span></label>
                <input className="form-input" type="number" min="0" value={regForm.points} onChange={e=>setRegForm({...regForm,points:parseInt(e.target.value)||0})} placeholder="0"/>
              </div>
              <div className="divider"/>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <label className="form-label" style={{margin:0}}>Players <span style={{color:'var(--text-muted)',textTransform:'none',fontWeight:400}}>(optional)</span></label>
                <button type="button" className="btn btn-secondary btn-sm" onClick={()=>{if(regForm.players.length<tournament.playersPerTeam)setRegForm(f=>({...f,players:[...f.players,{name:'',role:''}]}))}}>+ Add Player</button>
              </div>
              {regForm.players.map((pl,i)=>(
                <div key={i} style={{display:'flex',gap:10,marginBottom:10,alignItems:'center'}}>
                  <input className="form-input" style={{flex:2}} placeholder={`Player ${i+1} name`} value={pl.name} onChange={e=>{const p=[...regForm.players];p[i].name=e.target.value;setRegForm({...regForm,players:p});}}/>
                  <select className="form-select" style={{flex:1}} value={pl.role} onChange={e=>{const p=[...regForm.players];p[i].role=e.target.value;setRegForm({...regForm,players:p});}}>
                    <option value="">Role</option>
                    {(isCricket?['Batsman','Bowler','All-Rounder','Wicketkeeper']:tournament.sport==='football'?['Goalkeeper','Defender','Midfielder','Forward']:['Player','Captain','Vice Captain']).map(r=><option key={r}>{r}</option>)}
                  </select>
                  <button type="button" className="btn btn-danger btn-sm" onClick={()=>setRegForm(f=>({...f,players:f.players.filter((_,j)=>j!==i)}))}>✕</button>
                </div>
              ))}
              <div style={{display:'flex',gap:10,marginTop:20}}>
                <button type="button" className="btn btn-secondary" style={{flex:1}} onClick={()=>setShowRegModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{flex:2}} disabled={regLoading}>{regLoading?'Submitting...':'✍️ Submit Registration'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentDetail;

```

## File: frontend/src/pages/Tournaments.js
```javascript
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { tournamentAPI } from '../utils/api';

const sportEmoji = { cricket:'🏏', football:'⚽', basketball:'🏀', badminton:'🏸', tennis:'🎾', volleyball:'🏐', other:'🏅' };

const statusBadge = (status) => {
  const map = {
    registration_open: ['badge-green','Registration Open'],
    registration_closed: ['badge-gray','Closed'],
    fixture_generated: ['badge-blue','Fixture Ready'],
    ongoing: ['badge-live','● Live'],
    completed: ['badge-navy','Completed'],
    upcoming: ['badge-orange','Upcoming'],
  };
  const [cls, label] = map[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
};

const Tournaments = () => {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sportFilter, setSportFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    tournamentAPI.getAll().then(r => { setTournaments(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const sports = ['all', ...new Set(tournaments.map(t => t.sport).filter(Boolean))];
  const statuses = ['all','registration_open','ongoing','fixture_generated','upcoming','completed'];

  const filtered = tournaments.filter(t => {
    const matchSport = sportFilter === 'all' || t.sport === sportFilter;
    const matchStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchSearch = !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.venue?.toLowerCase().includes(search.toLowerCase());
    return matchSport && matchStatus && matchSearch;
  });

  return (
    <div className="page-container page-wrapper">
      {/* Page header */}
      <div style={{marginBottom:32}}>
        <div style={{fontSize:'0.72rem',fontWeight:700,color:'var(--royal)',textTransform:'uppercase',letterSpacing:'0.12em',marginBottom:8,display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:24,height:2,background:'var(--royal)',display:'inline-block'}}></span>All Events
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-end',flexWrap:'wrap',gap:16}}>
          <div>
            <h1 style={{fontSize:'2rem',fontWeight:800,color:'var(--navy)'}}>Tournaments</h1>
            <p style={{color:'var(--text-secondary)',marginTop:4}}>Browse all PU Sports tournaments — no login required</p>
          </div>
          <div style={{background:'var(--blue-light)',border:'1px solid #C0D4F0',borderRadius:8,padding:'8px 16px',fontSize:'0.8rem',color:'var(--royal)',fontWeight:500}}>
            🌐 Public Access — View fixtures, scores & standings freely
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:12,padding:'20px 24px',marginBottom:28,boxShadow:'var(--shadow-sm)'}}>
        <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-end'}}>
          <div style={{flex:'1 1 200px'}}>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Search</label>
            <input className="form-input" placeholder="Search by name or venue..." value={search} onChange={e=>setSearch(e.target.value)} style={{margin:0}}/>
          </div>
          <div>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Sport</label>
            <select className="form-select" value={sportFilter} onChange={e=>setSportFilter(e.target.value)} style={{minWidth:140}}>
              {sports.map(s=><option key={s} value={s}>{s==='all'?'All Sports':s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label style={{display:'block',fontSize:'0.72rem',fontWeight:600,color:'var(--text-muted)',textTransform:'uppercase',letterSpacing:'0.06em',marginBottom:6}}>Status</label>
            <select className="form-select" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{minWidth:160}}>
              {statuses.map(s=><option key={s} value={s}>{s==='all'?'All Statuses':s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
            </select>
          </div>
          {(sportFilter!=='all'||statusFilter!=='all'||search)&&(
            <button className="btn btn-secondary btn-sm" onClick={()=>{setSportFilter('all');setStatusFilter('all');setSearch('')}}>Clear Filters</button>
          )}
        </div>
      </div>

      {/* Results count */}
      <div style={{marginBottom:20,fontSize:'0.82rem',color:'var(--text-muted)',fontWeight:500}}>
        Showing {filtered.length} of {tournaments.length} tournaments
      </div>

      {loading ? <div className="spinner"/> : filtered.length===0 ? (
        <div style={{textAlign:'center',padding:'60px 20px',color:'var(--text-muted)'}}>
          <div style={{fontSize:'3rem',marginBottom:12}}>🏟️</div>
          <div style={{fontSize:'1.1rem',fontWeight:600,color:'var(--text-secondary)',marginBottom:6}}>No tournaments found</div>
          <div style={{fontSize:'0.875rem'}}>Try adjusting your filters</div>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))',gap:20}}>
          {filtered.map(t=>(
            <Link to={`/tournaments/${t._id}`} key={t._id} style={{textDecoration:'none'}}>
              <div style={{background:'var(--bg-card)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',boxShadow:'var(--shadow-sm)',transition:'all 0.25s',display:'flex',flexDirection:'column'}}
                onMouseEnter={e=>{e.currentTarget.style.boxShadow='var(--shadow-lg)';e.currentTarget.style.transform='translateY(-3px)';e.currentTarget.style.borderColor='var(--royal)';}}
                onMouseLeave={e=>{e.currentTarget.style.boxShadow='var(--shadow-sm)';e.currentTarget.style.transform='none';e.currentTarget.style.borderColor='var(--border)';}}>
                <div style={{background:'linear-gradient(135deg,var(--navy-dark),var(--navy))',padding:'18px 20px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
                  <div style={{fontSize:'2.4rem'}}>{sportEmoji[t.sport]||'🏅'}</div>
                  {statusBadge(t.status)}
                </div>
                <div style={{padding:'16px 20px',flex:1,display:'flex',flexDirection:'column',gap:10}}>
                  <div style={{fontSize:'1.05rem',fontWeight:700,color:'var(--navy)'}}>{t.name}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:5}}>
                    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',color:'var(--text-secondary)'}}>📍 {t.venue}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',color:'var(--text-secondary)'}}>👥 {t.maxTeams} teams · {t.playersPerTeam} players/team</div>
                    {t.startDate&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',color:'var(--text-secondary)'}}>📅 {new Date(t.startDate).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</div>}
                    {t.sport==='cricket'&&t.overs&&<div style={{display:'flex',alignItems:'center',gap:6,fontSize:'0.8rem',color:'var(--text-secondary)'}}>🏏 {t.overs} overs</div>}
                  </div>
                </div>
                <div style={{padding:'12px 20px',borderTop:'1px solid var(--border)',background:'var(--bg-primary)',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                  <span style={{fontSize:'0.72rem',color:'var(--text-muted)'}}>🔄 Double Knockout</span>
                  <span style={{fontSize:'0.8rem',color:'var(--royal)',fontWeight:700}}>View Details →</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tournaments;

```

## File: frontend/src/utils/api.js
```javascript
import axios from 'axios';

const API = axios.create({ baseURL: '/api' });

API.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const authAPI = {
  register: (data) => API.post('/auth/register', data),
  login: (data) => API.post('/auth/login', data),
  me: () => API.get('/auth/me'),
};

export const tournamentAPI = {
  getAll: () => API.get('/tournaments'),
  getOne: (id) => API.get(`/tournaments/${id}`),
  create: (data) => API.post('/tournaments', data),
  update: (id, data) => API.put(`/tournaments/${id}`, data),
  delete: (id) => API.delete(`/tournaments/${id}`),
};

export const teamAPI = {
  getByTournament: (tournamentId) => API.get(`/teams/tournament/${tournamentId}`),
  getAll: () => API.get('/teams'),
  register: (data) => API.post('/teams/register', data),
  updateStatus: (id, data) => API.put(`/teams/${id}/status`, data),
  update: (id, data) => API.put(`/teams/${id}`, data),
  delete: (id) => API.delete(`/teams/${id}`),
  getMyTeams: () => API.get('/teams/my/teams'),
};

export const matchAPI = {
  getByTournament: (tournamentId) => API.get(`/matches/tournament/${tournamentId}`),
  generate: (tournamentId) => API.post(`/matches/generate/${tournamentId}`),
  updateScore: (id, data) => API.put(`/matches/${id}/score`, data),
  update: (id, data) => API.put(`/matches/${id}`, data),
};

export const pyramidAPI = {
  getStandings: (tournamentId) => API.get(`/pyramid/standings/${tournamentId}`),
  generateBoard: (tournamentId, data) => API.post(`/pyramid/generate/${tournamentId}`, data),
  issueChallenge: (data) => API.post('/pyramid/challenge', data),
  resolveChallenge: (id, data) => API.put(`/pyramid/challenge/${id}/resolve`, data),
};

export default API;

```

## File: frontend/src/utils/pyramidLogic.js
```javascript
/**
 * Pyramid Logic Utilities
 * -----------------------
 * Pure functions that encode the rules of the pyramid ranking system.
 */
export const getTier = (rank) => {
  if (!rank || rank < 1) return 0;
  return Math.ceil((-1 + Math.sqrt(1 + 8 * rank)) / 2);
};

export const calculateCapacity = (rows) => {
  if (!rows || rows < 1) return 0;
  return (rows * (rows + 1)) / 2;
};

export const isValidChallenge = (challengerRank, defenderRank) => {
  if (!challengerRank || !defenderRank) return false;
  if (challengerRank <= defenderRank) return false;

  const challengerTier = getTier(challengerRank);
  const defenderTier = getTier(defenderRank);

  return defenderTier === challengerTier || defenderTier === challengerTier - 1;
};

export const canChallenge = (challenger, defender) => {
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

```

## File: frontend/package.json
```json
{
  "name": "tournament-frontend",
  "version": "0.1.0",
  "private": true,
  "dependencies": {
    "@testing-library/jest-dom": "^5.16.5",
    "@testing-library/react": "^13.4.0",
    "@testing-library/user-event": "^13.5.0",
    "axios": "^1.4.0",
    "lucide-react": "^1.23.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.0",
    "react-scripts": "5.0.1",
    "react-toastify": "^9.1.3",
    "web-vitals": "^2.1.4"
  },
  "scripts": {
    "start": "react-scripts start",
    "build": "react-scripts build",
    "test": "react-scripts test",
    "eject": "react-scripts eject"
  },
  "eslintConfig": {
    "extends": [
      "react-app"
    ]
  },
  "browserslist": {
    "production": [
      ">0.2%",
      "not dead",
      "not op_mini all"
    ],
    "development": [
      "last 1 chrome version",
      "last 1 firefox version",
      "last 1 safari version"
    ]
  },
  "proxy": "http://localhost:4030"
}

```

