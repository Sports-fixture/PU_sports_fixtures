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
