const mongoose = require('mongoose');

const PyramidPlayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  score: { type: Number, required: true },
  rank: { type: Number, required: true },
  status: { type: String, enum: ['available', 'in_match'], default: 'available' },
  tournament: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true }
});

module.exports = mongoose.model('PyramidPlayer', PyramidPlayerSchema);
