const mongoose = require("mongoose");

/**
 * Fixture.js — Double Round Robin Fixture Model
 * Each fixture belongs to a tournament.
 * Leg 1 = first time teamA vs teamB
 * Leg 2 = return fixture (sides swapped)
 * status 'rest' = BYE round (odd team count)
 */
const fixtureSchema = new mongoose.Schema(
  {
    tournament: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tournament",
      required: true,
    },
    fixtureNumber: { type: Number, required: true },
    round: { type: Number, required: true },
    leg: { type: Number, enum: [1, 2], required: true },
    teamA: { type: String, required: true },
    teamB: { type: String, required: true },
    status: {
      type: String,
      enum: ["scheduled", "live", "completed", "rest"],
      default: "scheduled",
    },
    // Scheduling
    date: { type: String, default: "" }, // 'YYYY-MM-DD'
    time: { type: String, default: "" }, // 'HH:MM'
    venue: { type: String, default: "" },
    schedulingMode: {
      type: String,
      enum: ["manual", "random", "none"],
      default: "none",
    },
    // Result
    scoreA: { type: String, default: "" },
    scoreB: { type: String, default: "" },
    winner: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Fixture", fixtureSchema);
