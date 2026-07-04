import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { pyramidAPI } from '../utils/api';
import SetupScreen from '../components/pyramid/SetupScreen';
import PyramidBoard from '../components/pyramid/PyramidBoard';
import PyramidAdminComponent from '../components/pyramid/PyramidAdmin';
import PyramidHistory from '../components/pyramid/PyramidHistory';
import '../components/pyramid/Pyramid.css';

export default function PyramidAdmin() {
  const { id: tournamentId } = useParams();
  const [standings, setStandings] = useState([]);
  const [pendingChallenges, setPendingChallenges] = useState([]);
  const [completedMatches, setCompletedMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchStandings = useCallback(async () => {
    try {
      const { data } = await pyramidAPI.getStandings(tournamentId);
      setStandings(data.pyramidStandings);
      setPendingChallenges(data.pendingChallenges);
      setCompletedMatches(data.completedMatches);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    fetchStandings();
  }, [fetchStandings]);

  if (loading) return <div style={{ color: 'white', padding: '2rem' }}>Loading Pyramid Engine...</div>;

  return (
    <div className="pyramid-page" style={{ padding: '2rem', background: '#0f172a', minHeight: '100vh', color: '#f8fafc' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center', background: 'linear-gradient(to right, #60a5fa, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
        Pyramid Tournament Engine
      </h1>
      
      {standings.length === 0 ? (
        <SetupScreen tournamentId={tournamentId} refreshData={fetchStandings} />
      ) : (
        <div className="pyramid-content" style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
          <PyramidBoard tournamentId={tournamentId} standings={standings} refreshData={fetchStandings} />
          <div className="pyramid-side" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
            <PyramidAdminComponent pendingChallenges={pendingChallenges} standings={standings} refreshData={fetchStandings} />
            <PyramidHistory standings={standings} completedMatches={completedMatches} />
          </div>
        </div>
      )}
    </div>
  );
}
