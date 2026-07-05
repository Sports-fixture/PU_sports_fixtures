// controllers/matchController.js
// const generateDoubleKnockout = require('../fixtures/doubleKnockout');
// const generateSingleKnockout = require('../fixtures/singleKnockout');
const generateLadder = require('../fixtures/ladder'); 

exports.generateFixture = async (req, res) => {
  const { tournamentId } = req.params;
  const { format } = req.body;

  try {
    const tournament = await Tournament.findById(tournamentId);
    const teams = await Team.find({ tournament: tournamentId, status: 'approved' });

    let matches;
    switch (format) {
      case 'Double Knockout':
        matches = await generateDoubleKnockout(tournament, teams);
        break;
      case 'Single Knockout':
        matches = await generateSingleKnockout(tournament, teams);
        break;
      case 'Ladder Tournament':
        matches = await generateLadder(tournament, teams);
        break;
      case 'Repechage Tournament':
        matches = await generateRepechege(tournament, teams);
        break;
      default:
        return res.status(400).json({ message: 'Unknown tournament format.' });
    }

    res.json({ matches });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};