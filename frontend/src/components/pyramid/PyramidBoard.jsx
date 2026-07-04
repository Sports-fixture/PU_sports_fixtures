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
