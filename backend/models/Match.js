const mongoose = require('mongoose');

const scoreSchema = new mongoose.Schema({
  runs:    { type: Number, default: 0 },
  wickets: { type: Number, default: 0 },
  overs:   { type: Number, default: 0 },
  extras:  { type: Number, default: 0 }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  tournament:  { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  matchNumber: { type: Number },
  round:       { type: Number, required: true },
  roundName:   { type: String },

  // DKO bracket: 'winners' | 'losers' | 'grand_final'
  // DRR bracket: 'double_round_robin'
  bracketType: { type: String, enum: ['winners', 'losers', 'grand_final', 'double_round_robin'], required: true },

  // DKO: team refs | DRR: will be null (use teamAName/teamBName instead)
  teamA: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  teamB: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },

  // DRR specific — store team names directly (no ObjectId ref needed)
  leg:       { type: Number, enum: [1, 2], default: null },
  teamAName: { type: String, default: '' },
  teamBName: { type: String, default: '' },
  winnerName:{ type: String, default: '' },
  isRest:    { type: Boolean, default: false }, // BYE round for odd teams

  teamAScore: scoreSchema,
  teamBScore: scoreSchema,
  winner: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  loser:  { type: mongoose.Schema.Types.ObjectId, ref: 'Team', default: null },
  venue:  { type: String, default: '' },
  scheduledDate: { type: Date },
  time:   { type: String, default: '' },
  status: {
    type: String,
    enum: ['scheduled', 'live', 'completed', 'bye', 'rest'],
    default: 'scheduled'
  },
  isBye: { type: Boolean, default: false },
  // DKO auto-advance links
  nextWinnerMatch: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  nextLoserMatch:  { type: mongoose.Schema.Types.ObjectId, ref: 'Match', default: null },
  notes:     { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Match', matchSchema);
