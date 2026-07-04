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
