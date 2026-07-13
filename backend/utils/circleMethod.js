/**
 * circleMethod.js — Double Round Robin Fixture Engine
 * Circle Method: one team fixed, others rotate each round.
 * Odd teams → virtual BYE added automatically.
 */

const BYE_TEAM = { id: "BYE", name: "BYE" };

function generateSingleRoundRobin(teams) {
  if (!Array.isArray(teams) || teams.length < 2) {
    throw new Error("At least 2 teams are required.");
  }

  const teamList = [...teams];

  // Odd count → add virtual BYE so circle works on even n
  if (teamList.length % 2 !== 0) teamList.push(BYE_TEAM);

  const totalTeams = teamList.length;
  const totalRounds = totalTeams - 1;
  const half = totalTeams / 2;

  const fixed = teamList[0];
  let rotating = teamList.slice(1);
  const rounds = [];

  for (let round = 0; round < totalRounds; round++) {
    const circle = [fixed, ...rotating];
    const pairings = [];

    for (let i = 0; i < half; i++) {
      const teamA = circle[i];
      const teamB = circle[totalTeams - 1 - i];
      // Alternate sides per round for home/away readiness
      pairings.push(
        round % 2 === 0 ? { teamA, teamB } : { teamA: teamB, teamB: teamA },
      );
    }

    rounds.push(pairings);

    // Rotate: last goes to front
    const last = rotating.pop();
    rotating.unshift(last);
  }

  return rounds;
}

module.exports = { generateSingleRoundRobin, BYE_TEAM };
