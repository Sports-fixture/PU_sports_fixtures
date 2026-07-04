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
