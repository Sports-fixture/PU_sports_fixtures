import React, { useState } from 'react';
import { Users, UserPlus, Trash2, Zap, Hash, Star } from 'lucide-react';
import { calculateCapacity } from '../../utils/pyramidLogic';
import { pyramidAPI, teamAPI } from '../../utils/api';

export default function SetupScreen({ tournamentId, refreshData, onComplete }) {
  const [targetRows, setTargetRows] = useState(4);
  const [setupPlayers, setSetupPlayers] = useState([]);
  const [playerName, setPlayerName] = useState('');
  const [playerScore, setPlayerScore] = useState('');
  const [error, setError] = useState('');

  const capacity = calculateCapacity(targetRows);
  const isFull = setupPlayers.length >= capacity;
  const canGenerate = setupPlayers.length === capacity;

  const handleRowChange = (e) => {
    const val = Math.max(2, Math.min(10, Number(e.target.value) || 2));
    setTargetRows(val);
  };

  const handleAddPlayer = (e) => {
    e.preventDefault();
    setError('');

    const trimmedName = playerName.trim();
    if (!trimmedName) {
      setError('Player name is required.');
      return;
    }

    const scoreNum = Number(playerScore);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      setError('Score must be a number between 0 and 100.');
      return;
    }

    if (isFull) {
      setError(`Board is full (${capacity} players).`);
      return;
    }

    setSetupPlayers([
      ...setupPlayers,
      {
        playerId: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name: trimmedName,
        score: scoreNum,
      },
    ]);
    setPlayerName('');
    setPlayerScore('');
  };

  const handleRemovePlayer = (playerId) => {
    setSetupPlayers(setupPlayers.filter((p) => p.playerId !== playerId));
  };

  const handleImportTeams = async () => {
    try {
      const { data } = await teamAPI.getByTournament(tournamentId);
      const approvedTeams = data.filter(t => t.status === 'approved');
      
      if (approvedTeams.length === 0) {
        setError('No approved teams found in this tournament.');
        return;
      }

      const importedPlayers = approvedTeams.map((team) => ({
        playerId: team._id,
        name: team.teamName,
        score: team.points || 0,
      }));

      // Automatically adjust target rows to fit these teams
      let rows = 2;
      while (calculateCapacity(rows) < importedPlayers.length && rows < 10) {
        rows++;
      }
      setTargetRows(rows);
      
      // If we imported more than the exact capacity, slice it so it doesn't break the UI
      const cap = calculateCapacity(rows);
      setSetupPlayers(importedPlayers.slice(0, cap));
      setError('');
    } catch (err) {
      console.error(err);
      setError('Failed to fetch teams. Make sure they are approved in the dashboard.');
    }
  };

  const handleGenerate = async () => {
    if (canGenerate) {
      if (!window.confirm('Generate pyramid fixture? Existing matches will be deleted.')) {
        return;
      }
      try {
        await pyramidAPI.generateBoard(tournamentId, { setupPlayers });
        refreshData && refreshData();
        if (onComplete) onComplete();
      } catch (err) {
        console.error(err);
        setError('Failed to generate board.');
      }
    }
  };

  return (
    <div className="setup-container glass-panel">
      <div className="setup-header">
        <div className="setup-icon-wrap">
          <Users size={28} />
        </div>
        <h2 className="setup-title">Board Setup</h2>
        <p className="setup-subtitle">Configure your pyramid and add players to get started.</p>
      </div>

      <div className="setup-section">
        <label className="setup-label">
          <Hash size={16} />
          Target Number of Rows
        </label>
        <div className="row-config">
          <input
            id="target-rows-input"
            type="number"
            className="setup-input row-input"
            value={targetRows}
            onChange={handleRowChange}
            min={2}
            max={10}
          />
          <div className="capacity-badge">
            <span className="capacity-number">{capacity}</span>
            <span className="capacity-label">players needed</span>
          </div>
        </div>
      </div>

      <div className="setup-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <label className="setup-label" style={{ marginBottom: 0 }}>
            <UserPlus size={16} />
            Add Player / Team
          </label>
          <button type="button" className="btn btn-secondary btn-sm" onClick={handleImportTeams} style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '8px', cursor: 'pointer' }}>
            📥 Import Registered Teams
          </button>
        </div>
        <form onSubmit={handleAddPlayer} className="add-player-form">
          <input
            id="player-name-input"
            type="text"
            className="setup-input"
            placeholder="Player Name"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isFull}
          />
          <input
            id="player-score-input"
            type="number"
            className="setup-input score-input"
            placeholder="Score (0–100)"
            value={playerScore}
            onChange={(e) => setPlayerScore(e.target.value)}
            min={0}
            max={100}
            disabled={isFull}
          />
          <button
            id="add-player-btn"
            type="submit"
            className="btn-primary btn-add"
            disabled={isFull}
          >
            <UserPlus size={16} /> Add
          </button>
        </form>
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="setup-section">
        <div className="staging-header">
          <label className="setup-label">
            <Star size={16} />
            Player Roster
          </label>
          <span className="player-count-badge">
            {setupPlayers.length} / {capacity}
          </span>
        </div>

        {setupPlayers.length === 0 ? (
          <div className="staging-empty">
            <p>No players added yet. Start adding players above.</p>
          </div>
        ) : (
          <div className="staging-list">
            {setupPlayers.map((player, idx) => (
              <div key={player.playerId} className="staging-player-card">
                <span className="staging-index">{idx + 1}</span>
                <span className="staging-name">{player.name}</span>
                <span className="staging-score-badge">{player.score}</span>
                <button
                  className="btn-remove"
                  onClick={() => handleRemovePlayer(player.playerId)}
                  title="Remove player"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        id="generate-board-btn"
        className={`btn-generate ${canGenerate ? 'ready' : ''}`}
        onClick={handleGenerate}
        disabled={!canGenerate}
      >
        <Zap size={18} />
        {canGenerate
          ? 'Generate Board'
          : `Add ${capacity - setupPlayers.length} more player${
              capacity - setupPlayers.length !== 1 ? 's' : ''
            }`}
      </button>
    </div>
  );
}
