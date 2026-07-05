// // fixtures/ladder.js
// const Match = require('../models/Match');

// /**
//  * Ladder Tournament — Round 1 Generator
//  * Teams ranked 1..N by seed points (rank 1 = top of ladder).
//  * Pairs: Rank2 vs Rank1, Rank4 vs Rank3, Rank6 vs Rank5, ...
//  * Winner takes the higher position going into the next round.
//  * Odd team out gets a bye.
//  */
// async function generateLadder(tournament, teams) {
//   if (teams.length < 2) {
//     throw new Error('Ladder tournament needs at least 2 approved teams');
//   }

//   await Match.deleteMany({ tournament: tournament._id });

//   // Rank by seed points (fallback: registration order)
//   const ranked = [...teams].sort((a, b) => (b.points || 0) - (a.points || 0));

//   const matches = [];
//   let matchNumber = 1;
//   let i = 0;

//   const hasBye = ranked.length % 2 !== 0;
//   const byeTeam = hasBye ? ranked[ranked.length - 1] : null;
//   const pairCount = hasBye ? ranked.length - 1 : ranked.length;

//   while (i + 1 < pairCount) {
//     const higher = ranked[i];
//     const challenger = ranked[i + 1];

//     matches.push({
//       tournament: tournament._id,
//       teamA: higher._id,
//       teamB: challenger._id,
//       matchNumber: matchNumber++,
//       roundName: 'Ladder Round 1',
//       bracketType: 'ladder',
//       status: 'scheduled',
//       ladderMeta: { higherRank: i + 1, challengerRank: i + 2 },
//     });

//     i += 2;
//   }

//   if (byeTeam) {
//     matches.push({
//       tournament: tournament._id,
//       teamA: byeTeam._id,
//       teamB: null,
//       matchNumber: matchNumber++,
//       roundName: 'Ladder Round 1',
//       bracketType: 'ladder',
//       status: 'bye',
//       isBye: true,
//       winner: byeTeam._id,
//       ladderMeta: { higherRank: ranked.length, challengerRank: null },
//     });
//   }

//   return Match.insertMany(matches);
// }

// module.exports = generateLadder;

// fixtures/ladder.js
function buildLadder(teams, tournament) {
  const matches = [];
  let matchNumber = 1;

  const hasBye = teams.length % 2 !== 0;
  const byeTeam = hasBye ? teams[teams.length - 1] : null;
  const pairCount = hasBye ? teams.length - 1 : teams.length;

  for (let i = 0; i + 1 < pairCount; i += 2) {
    const higher = teams[i];       // better seed (rank i+1)
    const challenger = teams[i + 1]; // rank i+2

    matches.push({
      tournament: tournament._id,
      teamA: higher._id,
      teamB: challenger._id,
      matchNumber: matchNumber++,
      roundName: 'Ladder Round 1',
      bracketType: 'ladder',
      status: 'scheduled',
    });
  }

  if (byeTeam) {
    matches.push({
      tournament: tournament._id,
      teamA: byeTeam._id,
      teamB: null,
      matchNumber: matchNumber++,
      roundName: 'Ladder Round 1',
      bracketType: 'ladder',
      status: 'bye',
      isBye: true,
      winner: byeTeam._id,
    });
  }

  return matches;
}

module.exports = buildLadder;