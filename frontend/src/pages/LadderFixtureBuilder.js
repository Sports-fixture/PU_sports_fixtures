// import React, { useState, useEffect, useCallback } from 'react';

// const LadderFixtureBuilder = ({ tournamentId, approvedTeams, onGenerated }) => {
//   const [mode, setMode] = useState('random'); // 'random' | 'manual'
//   const [pendingTeams, setPendingTeams] = useState(approvedTeams);
//   const [pairs, setPairs] = useState([]);
//   const [selectedA, setSelectedA] = useState(null);
//   const [genError, setGenError] = useState('');
//   const [genLoading, setGenLoading] = useState(false);

//   const pickTeam = (team) => {
//     if (!selectedA) { setSelectedA(team); return; }
//     if (selectedA._id === team._id) { setSelectedA(null); return; }
//     setPairs(p => [...p, { teamAId: selectedA._id, teamBId: team._id, teamAName: selectedA.teamName, teamBName: team.teamName }]);
//     setPendingTeams(pt => pt.filter(t => t._id !== selectedA._id && t._id !== team._id));
//     setSelectedA(null);
//   };

//   const addBye = (team) => {
//     setPairs(p => [...p, { teamAId: team._id, teamBId: null, teamAName: team.teamName, teamBName: null }]);
//     setPendingTeams(pt => pt.filter(t => t._id !== team._id));
//   };

//   const removePair = (i) => {
//     const pair = pairs[i];
//     const restored = approvedTeams.filter(t => t._id === pair.teamAId || t._id === pair.teamBId);
//     setPendingTeams(pt => [...pt, ...restored]);
//     setPairs(p => p.filter((_, j) => j !== i));
//   };

//   const handleGenerate = async () => {
//     setGenError(''); setGenLoading(true);
//     try {
//       if (mode === 'random') {
//         await matchAPI.generate(tournamentId, { format: 'Ladder Tournament' });
//       } else {
//         if (pendingTeams.length > 0) { setGenError('All teams must be paired (or given a bye) before generating.'); setGenLoading(false); return; }
//         await matchAPI.generateManual(tournamentId, { pairs });
//       }
//       onGenerated();
//     } catch (err) {
//       setGenError(err.response?.data?.message || 'Error generating fixture');
//     }
//     setGenLoading(false);
//   };

//   return (
//     <div className="card" style={{ marginBottom: 24 }}>
//       <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>🪜 Generate Ladder Fixture</h3>
//       <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
//         Choose how to pair the {approvedTeams.length} approved teams for Round 1
//       </p>

//       <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
//         <button className={`btn btn-sm ${mode === 'random' ? 'btn-royal' : 'btn-secondary'}`} onClick={() => { setMode('random'); setPairs([]); setPendingTeams(approvedTeams); setSelectedA(null); }}>
//           🎲 Random (by seed)
//         </button>
//         <button className={`btn btn-sm ${mode === 'manual' ? 'btn-royal' : 'btn-secondary'}`} onClick={() => { setMode('manual'); setPairs([]); setPendingTeams(approvedTeams); setSelectedA(null); }}>
//           ✋ Manual Pairing
//         </button>
//       </div>

//       {mode === 'manual' && (
//         <>
//           <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
//             <div style={{ flex: 1, minWidth: 220 }}>
//               <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
//                 Unpaired Teams ({pendingTeams.length})
//               </div>
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                 {pendingTeams.map(team => (
//                   <div key={team._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
//                     <button
//                       onClick={() => pickTeam(team)}
//                       style={{
//                         flex: 1, textAlign: 'left', padding: '10px 14px',
//                         background: selectedA?._id === team._id ? 'var(--blue-light)' : 'var(--bg-secondary)',
//                         border: `2px solid ${selectedA?._id === team._id ? 'var(--royal)' : 'var(--border)'}`,
//                         borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: 'var(--navy)', fontFamily: 'Inter',
//                       }}
//                     >
//                       {selectedA?._id === team._id ? '👉 ' : ''}{team.teamName}
//                     </button>
//                     <button className="btn btn-secondary btn-sm" onClick={() => addBye(team)} title="Give this team a bye">Bye</button>
//                   </div>
//                 ))}
//                 {pendingTeams.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All teams paired ✓</div>}
//               </div>
//               {selectedA && <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--royal)' }}>Select another team to pair with {selectedA.teamName}</div>}
//             </div>

//             <div style={{ flex: 1, minWidth: 220 }}>
//               <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
//                 Paired Matches ({pairs.length})
//               </div>
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//                 {pairs.map((pair, i) => (
//                   <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--royal)', borderRadius: 8 }}>
//                     <span style={{ fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600 }}>
//                       {pair.teamAName} {pair.teamBName ? `vs ${pair.teamBName}` : <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: '0.6rem' }}>BYE</span>}
//                     </span>
//                     <button className="btn btn-danger btn-sm" onClick={() => removePair(i)}>✕</button>
//                   </div>
//                 ))}
//                 {pairs.length === 0 && <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No pairs yet — click two teams to pair them</div>}
//               </div>
//             </div>
//           </div>
//         </>
//       )}

//       {mode === 'random' && (
//         <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
//           Teams will be ranked by seed points and paired automatically (Rank 2 vs Rank 1, Rank 4 vs Rank 3, ...). An odd team out gets a bye.
//         </div>
//       )}

//       {genError && <div className="alert alert-error">{genError}</div>}

//       <button className="btn btn-primary" onClick={handleGenerate} disabled={genLoading || approvedTeams.length < 2}>
//         {genLoading ? 'Generating...' : '⚡ Generate Ladder Fixture'}
//       </button>
//       {approvedTeams.length < 2 && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>Need at least 2 approved teams</div>}
//     </div>
//   );
// };

import React, { useState } from 'react';
import { matchAPI } from '../utils/api';

const LadderFixtureBuilder = ({ tournamentId, approvedTeams, onGenerated }) => {
  const [mode, setMode] = useState('random'); // 'random' | 'manual'
  const [pendingTeams, setPendingTeams] = useState(approvedTeams);
  const [pairs, setPairs] = useState([]);
  const [selectedA, setSelectedA] = useState(null);
  const [genError, setGenError] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  const pickTeam = (team) => {
    if (!selectedA) { setSelectedA(team); return; }
    if (selectedA._id === team._id) { setSelectedA(null); return; }
    setPairs(p => [...p, { teamAId: selectedA._id, teamBId: team._id, teamAName: selectedA.teamName, teamBName: team.teamName }]);
    setPendingTeams(pt => pt.filter(t => t._id !== selectedA._id && t._id !== team._id));
    setSelectedA(null);
  };

  const addBye = (team) => {
    setPairs(p => [...p, { teamAId: team._id, teamBId: null, teamAName: team.teamName, teamBName: null }]);
    setPendingTeams(pt => pt.filter(t => t._id !== team._id));
  };

  const removePair = (i) => {
    const pair = pairs[i];
    const restored = approvedTeams.filter(t => t._id === pair.teamAId || t._id === pair.teamBId);
    setPendingTeams(pt => [...pt, ...restored]);
    setPairs(p => p.filter((_, j) => j !== i));
  };

  const handleGenerate = async () => {
    setGenError(''); setGenLoading(true);
    try {
      if (mode === 'random') {
        await matchAPI.generate(tournamentId, { format: 'Ladder Tournament' });
      } else {
        if (pendingTeams.length > 0) {
          setGenError('All teams must be paired (or given a bye) before generating.');
          setGenLoading(false);
          return;
        }
        await matchAPI.generateManual(tournamentId, { pairs });
      }
      onGenerated();
    } catch (err) {
      setGenError(err.response?.data?.message || 'Error generating fixture');
    }
    setGenLoading(false);
  };

  return (
    <div className="card" style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--navy)', marginBottom: 6 }}>🪜 Generate Ladder Fixture</h3>
      <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: 16 }}>
        Choose how to pair the {approvedTeams.length} approved teams for Round 1
      </p>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        <button
          className={`btn btn-sm ${mode === 'random' ? 'btn-royal' : 'btn-secondary'}`}
          onClick={() => { setMode('random'); setPairs([]); setPendingTeams(approvedTeams); setSelectedA(null); }}
        >
          🎲 Random (by seed)
        </button>
        <button
          className={`btn btn-sm ${mode === 'manual' ? 'btn-royal' : 'btn-secondary'}`}
          onClick={() => { setMode('manual'); setPairs([]); setPendingTeams(approvedTeams); setSelectedA(null); }}
        >
          ✋ Manual Pairing
        </button>
      </div>

      {mode === 'manual' && (
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 20 }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Unpaired Teams ({pendingTeams.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendingTeams.map(team => (
                <div key={team._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={() => pickTeam(team)}
                    style={{
                      flex: 1, textAlign: 'left', padding: '10px 14px',
                      background: selectedA?._id === team._id ? 'var(--blue-light)' : 'var(--bg-secondary)',
                      border: `2px solid ${selectedA?._id === team._id ? 'var(--royal)' : 'var(--border)'}`,
                      borderRadius: 8, cursor: 'pointer', fontWeight: 600, color: 'var(--navy)', fontFamily: 'Inter',
                    }}
                  >
                    {selectedA?._id === team._id ? '👉 ' : ''}{team.teamName}
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => addBye(team)} title="Give this team a bye">
                    Bye
                  </button>
                </div>
              ))}
              {pendingTeams.length === 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>All teams paired ✓</div>
              )}
            </div>
            {selectedA && (
              <div style={{ marginTop: 8, fontSize: '0.75rem', color: 'var(--royal)' }}>
                Select another team to pair with {selectedA.teamName}
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Paired Matches ({pairs.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pairs.map((pair, i) => (
                <div
                  key={`${pair.teamAId}-${pair.teamBId || 'bye'}-${i}`}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--bg-card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--royal)', borderRadius: 8 }}
                >
                  <span style={{ fontSize: '0.85rem', color: 'var(--navy)', fontWeight: 600 }}>
                    {pair.teamAName}{' '}
                    {pair.teamBName ? (
                      `vs ${pair.teamBName}`
                    ) : (
                      <span className="badge badge-blue" style={{ marginLeft: 6, fontSize: '0.6rem' }}>BYE</span>
                    )}
                  </span>
                  <button className="btn btn-danger btn-sm" onClick={() => removePair(i)}>✕</button>
                </div>
              ))}
              {pairs.length === 0 && (
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No pairs yet — click two teams to pair them</div>
              )}
            </div>
          </div>
        </div>
      )}

      {mode === 'random' && (
        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          Teams will be ranked by seed points and paired automatically (Rank 2 vs Rank 1, Rank 4 vs Rank 3, ...). An odd team out gets a bye.
        </div>
      )}

      {genError && <div className="alert alert-error">{genError}</div>}

      <button className="btn btn-primary" onClick={handleGenerate} disabled={genLoading || approvedTeams.length < 2}>
        {genLoading ? 'Generating...' : '⚡ Generate Ladder Fixture'}
      </button>
      {approvedTeams.length < 2 && (
        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 8 }}>Need at least 2 approved teams</div>
      )}
    </div>
  );
};

export default LadderFixtureBuilder;