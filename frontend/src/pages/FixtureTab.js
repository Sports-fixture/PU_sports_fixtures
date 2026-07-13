import React, { useState, useEffect, useCallback } from "react";
import { fixtureAPI } from "../utils/api";
import { useAuth } from "../context/AuthContext";

// ─── Status Badge ────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    scheduled: ["badge-gray", "Scheduled"],
    live: ["badge-live", "● Live"],
    completed: ["badge-green", "✓ Done"],
    rest: ["badge-blue", "Rest Round"],
  };
  const [cls, label] = map[status] || ["badge-gray", status];
  return (
    <span className={`badge ${cls}`} style={{ fontSize: "0.62rem" }}>
      {label}
    </span>
  );
};

// ─── Single Fixture Card ─────────────────────────────────────────────
const FixtureCard = ({ fixture, onUpdate, onDelete, isAdmin }) => {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date: fixture.date || "",
    time: fixture.time || "",
    venue: fixture.venue || "",
    status: fixture.status || "scheduled",
    scoreA: fixture.scoreA || "",
    scoreB: fixture.scoreB || "",
    winner: fixture.winner || "",
  });

  const isRest = fixture.status === "rest";
  const legColor = fixture.leg === 1 ? "#2B4C8C" : "#C8963E";

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setLoading(true);
    try {
      await onUpdate(fixture._id, { ...form, schedulingMode: "manual" });
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update fixture");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (
      !window.confirm(`Delete fixture: ${fixture.teamA} vs ${fixture.teamB}?`)
    )
      return;
    setLoading(true);
    try {
      await onDelete(fixture._id);
    } finally {
      setLoading(false);
    }
  }

  // ── Rest / BYE Round ──
  if (isRest) {
    return (
      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-light)",
          borderRadius: 10,
          padding: "12px 16px",
          marginBottom: 8,
          opacity: 0.6,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <span
            style={{
              fontWeight: 600,
              color: "var(--text-secondary)",
              fontSize: "0.88rem",
            }}
          >
            {fixture.teamA === "BYE" ? fixture.teamB : fixture.teamA}
          </span>
          <span
            style={{
              marginLeft: 10,
              fontSize: "0.72rem",
              color: "var(--text-muted)",
            }}
          >
            Fixture #{fixture.fixtureNumber}
          </span>
        </div>
        <StatusBadge status="rest" />
      </div>
    );
  }

  return (
    <div
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderLeft: `3px solid ${legColor}`,
        borderRadius: 10,
        marginBottom: 10,
        overflow: "hidden",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* Card Header */}
      <div
        style={{
          padding: "10px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "var(--bg-secondary)",
          borderBottom: "1px solid var(--border-light)",
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              fontFamily: "monospace",
              fontSize: "0.7rem",
              color: "var(--text-muted)",
              background: "var(--bg-primary)",
              padding: "2px 8px",
              borderRadius: 4,
            }}
          >
            #{fixture.fixtureNumber}
          </span>
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              color: legColor,
              background: `${legColor}15`,
              padding: "2px 8px",
              borderRadius: 12,
              border: `1px solid ${legColor}30`,
            }}
          >
            LEG {fixture.leg}
          </span>
          <StatusBadge status={fixture.status} />
        </div>

        {/* Admin actions */}
        {isAdmin && !editing && (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setEditing(true)}
              style={{ padding: "4px 12px", fontSize: "0.75rem" }}
            >
              ✏️ Edit
            </button>
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={loading}
              style={{ padding: "4px 12px", fontSize: "0.75rem" }}
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Teams */}
      <div
        style={{
          padding: "14px 16px",
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 12,
          alignItems: "center",
        }}
      >
        <div
          style={{ fontWeight: 700, color: "var(--navy)", fontSize: "0.95rem" }}
        >
          {fixture.teamA}
          {fixture.winner === fixture.teamA && (
            <span style={{ color: "var(--gold)", marginLeft: 6 }}>🏆</span>
          )}
        </div>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: "var(--bg-secondary)",
            border: "2px solid var(--border)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.7rem",
            fontWeight: 700,
            color: "var(--text-muted)",
          }}
        >
          VS
        </div>
        <div
          style={{
            fontWeight: 700,
            color: "var(--navy)",
            fontSize: "0.95rem",
            textAlign: "right",
          }}
        >
          {fixture.winner === fixture.teamB && (
            <span style={{ color: "var(--gold)", marginRight: 6 }}>🏆</span>
          )}
          {fixture.teamB}
        </div>
      </div>

      {/* Schedule info (view mode) */}
      {!editing && (fixture.date || fixture.venue || fixture.scoreA) && (
        <div
          style={{
            padding: "8px 16px",
            background: "var(--bg-primary)",
            borderTop: "1px solid var(--border-light)",
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          {fixture.date && (
            <span>
              📅 {fixture.date}
              {fixture.time && ` · ${fixture.time}`}
            </span>
          )}
          {fixture.venue && <span>📍 {fixture.venue}</span>}
          {fixture.scoreA && fixture.scoreB && (
            <span
              style={{
                fontWeight: 600,
                color: "var(--navy)",
                fontFamily: "monospace",
              }}
            >
              {fixture.scoreA} – {fixture.scoreB}
            </span>
          )}
          {fixture.winner && (
            <span style={{ color: "var(--green)", fontWeight: 600 }}>
              Winner: {fixture.winner}
            </span>
          )}
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid var(--border-light)",
          }}
        >
          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Date</label>
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                className="form-input"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Time</label>
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                className="form-input"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Venue</label>
            <input
              type="text"
              name="venue"
              value={form.venue}
              onChange={handleChange}
              className="form-input"
              placeholder="e.g. University Sports Complex"
            />
          </div>

          <div className="grid-2" style={{ marginBottom: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Score — {fixture.teamA}</label>
              <input
                type="text"
                name="scoreA"
                value={form.scoreA}
                onChange={handleChange}
                className="form-input"
                placeholder="0"
              />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Score — {fixture.teamB}</label>
              <input
                type="text"
                name="scoreB"
                value={form.scoreB}
                onChange={handleChange}
                className="form-input"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid-2" style={{ marginBottom: 16 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Status</label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="form-select"
              >
                <option value="scheduled">Scheduled</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            {form.status === "completed" && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Winner</label>
                <select
                  name="winner"
                  value={form.winner}
                  onChange={handleChange}
                  className="form-select"
                >
                  <option value="">Select winner</option>
                  <option value={fixture.teamA}>{fixture.teamA}</option>
                  <option value={fixture.teamB}>{fixture.teamB}</option>
                  <option value="Draw">Draw</option>
                </select>
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Saving…" : "✓ Save"}
            </button>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setEditing(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Round Group ─────────────────────────────────────────────────────
const RoundGroup = ({ roundNumber, fixtures, onUpdate, onDelete, isAdmin }) => {
  const realCount = fixtures.filter((f) => f.status !== "rest").length;
  return (
    <div style={{ marginBottom: 24 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "0.75rem",
            fontWeight: 700,
            color: "var(--gold)",
            background: "var(--gold-bg)",
            padding: "3px 10px",
            borderRadius: 6,
            border: "1px solid #E8C07A",
          }}
        >
          ROUND {String(roundNumber).padStart(2, "0")}
        </span>
        <div
          style={{ flex: 1, height: 1, background: "var(--border-light)" }}
        />
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
          {realCount} match{realCount !== 1 ? "es" : ""}
        </span>
      </div>
      {fixtures.map((f) => (
        <FixtureCard
          key={f._id}
          fixture={f}
          onUpdate={onUpdate}
          onDelete={onDelete}
          isAdmin={isAdmin}
        />
      ))}
    </div>
  );
};

// ─── Main FixtureTab Component ───────────────────────────────────────
// Props: tournamentId, tournamentStatus
const FixtureTab = ({ tournamentId, tournamentStatus }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [fixtures, setFixtures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  // Generate modal state
  const [showGenModal, setShowGenModal] = useState(false);
  const [genForm, setGenForm] = useState({
    mode: "random",
    startDate: "",
    venues: "",
  });

  // ── Fetch fixtures ──
  const loadFixtures = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fixtureAPI.getByTournament(tournamentId);
      setFixtures(res.data);
    } catch {
      setError("Failed to load fixtures");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  useEffect(() => {
    loadFixtures();
  }, [loadFixtures]);

  // ── Generate ──
  async function handleGenerate(e) {
    e.preventDefault();
    setGenerating(true);
    setError("");
    try {
      const venueList = genForm.venues
        .split("\n")
        .map((v) => v.trim())
        .filter(Boolean);

      await fixtureAPI.generate(tournamentId, {
        mode: genForm.mode,
        startDate: genForm.startDate || null,
        venues: venueList,
      });

      setShowGenModal(false);
      await loadFixtures();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to generate fixtures");
    } finally {
      setGenerating(false);
    }
  }

  // ── Update ──
  async function handleUpdate(id, data) {
    const res = await fixtureAPI.update(id, data);
    setFixtures((prev) => prev.map((f) => (f._id === id ? res.data : f)));
  }

  // ── Delete ──
  async function handleDelete(id) {
    await fixtureAPI.delete(id);
    setFixtures((prev) => prev.filter((f) => f._id !== id));
  }

  // ── Filter & group logic ──
  const filtered = fixtures.filter((f) => {
    if (activeFilter === "leg1") return f.leg === 1;
    if (activeFilter === "leg2") return f.leg === 2;
    if (activeFilter === "scheduled") return f.status === "scheduled";
    if (activeFilter === "completed") return f.status === "completed";
    return true;
  });

  function groupByRound(fixtureList) {
    const map = new Map();
    fixtureList.forEach((f) => {
      if (!map.has(f.round)) map.set(f.round, []);
      map.get(f.round).push(f);
    });
    return [...map.entries()].sort(([a], [b]) => a - b);
  }

  const leg1Groups = groupByRound(filtered.filter((f) => f.leg === 1));
  const leg2Groups = groupByRound(filtered.filter((f) => f.leg === 2));
  const totalReal = fixtures.filter((f) => f.status !== "rest").length;
  const totalRounds = new Set(fixtures.map((f) => f.round)).size;

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "leg1", label: "🔵 Leg 1" },
    { key: "leg2", label: "🟡 Leg 2" },
    { key: "scheduled", label: "Scheduled" },
    { key: "completed", label: "Completed" },
  ];

  // ─── EMPTY STATE ────────────────────────────────────────────────────
  if (!loading && fixtures.length === 0) {
    return (
      <div className="fade-in">
        <div className="card empty-state">
          <div className="empty-icon">📅</div>
          <div className="empty-title">No Double Round Robin fixtures yet</div>
          <div className="empty-desc">
            {isAdmin
              ? "Generate fixtures after all teams are approved."
              : "Admin will generate the fixture schedule soon."}
          </div>
          {isAdmin && (
            <button
              className="btn btn-primary"
              style={{ marginTop: 20 }}
              onClick={() => setShowGenModal(true)}
            >
              ⚡ Generate DRR Fixtures
            </button>
          )}
        </div>

        {/* Generate Modal */}
        {showGenModal && (
          <GenerateModal
            genForm={genForm}
            setGenForm={setGenForm}
            onSubmit={handleGenerate}
            onClose={() => setShowGenModal(false)}
            generating={generating}
            error={error}
          />
        )}
      </div>
    );
  }

  // ─── MAIN VIEW ──────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      {/* Stats bar */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: "Real Matches", value: totalReal },
          { label: "Total Rounds", value: totalRounds },
          { label: "Leg 1 Rounds", value: Math.ceil(totalRounds / 2) },
          { label: "Leg 2 Rounds", value: Math.floor(totalRounds / 2) },
        ].map((s, i) => (
          <div key={i} className="stat-box">
            <div
              className="stat-value"
              style={{
                fontSize: "1.6rem",
                color: i === 0 ? "var(--gold)" : "var(--navy)",
              }}
            >
              {s.value}
            </div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Admin controls */}
      {isAdmin && (
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowGenModal(true)}
          >
            ↻ Regenerate Fixtures
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveFilter(key)}
            style={{
              padding: "5px 16px",
              borderRadius: 20,
              fontSize: "0.78rem",
              fontWeight: 600,
              cursor: "pointer",
              border: "none",
              background:
                activeFilter === key ? "var(--navy)" : "var(--bg-secondary)",
              color: activeFilter === key ? "#fff" : "var(--text-muted)",
              transition: "all 0.15s",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {/* Leg 1 */}
          {leg1Groups.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#2B4C8C",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#2B4C8C",
                    display: "inline-block",
                  }}
                />
                Leg 1 — First Fixtures
              </h3>
              {leg1Groups.map(([round, roundFixtures]) => (
                <RoundGroup
                  key={round}
                  roundNumber={round}
                  fixtures={roundFixtures}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {/* Leg 2 */}
          {leg2Groups.length > 0 && (
            <div>
              <h3
                style={{
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  color: "#C8963E",
                  marginBottom: 16,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: "#C8963E",
                    display: "inline-block",
                  }}
                />
                Leg 2 — Return Fixtures
              </h3>
              {leg2Groups.map(([round, roundFixtures]) => (
                <RoundGroup
                  key={round}
                  roundNumber={round}
                  fixtures={roundFixtures}
                  onUpdate={handleUpdate}
                  onDelete={handleDelete}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Generate Modal */}
      {showGenModal && (
        <GenerateModal
          genForm={genForm}
          setGenForm={setGenForm}
          onSubmit={handleGenerate}
          onClose={() => setShowGenModal(false)}
          generating={generating}
          error={error}
        />
      )}
    </div>
  );
};

// ─── Generate Modal ──────────────────────────────────────────────────
const GenerateModal = ({
  genForm,
  setGenForm,
  onSubmit,
  onClose,
  generating,
  error,
}) => (
  <div
    className="modal-overlay"
    onClick={(e) => e.target === e.currentTarget && onClose()}
  >
    <div className="modal">
      <div className="modal-header">
        <h2 className="modal-title">⚡ Generate DRR Fixtures</h2>
        <button className="modal-close" onClick={onClose}>
          ✕
        </button>
      </div>

      <p
        style={{
          color: "var(--text-secondary)",
          marginBottom: 20,
          fontSize: "0.875rem",
        }}
      >
        Double Round Robin — every team plays every other team{" "}
        <strong>twice</strong>. Odd team counts get automatic BYE rest rounds.
      </p>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 16 }}>
          {error}
        </div>
      )}

      <form onSubmit={onSubmit}>
        {/* Mode toggle */}
        <div className="form-group">
          <label className="form-label">Scheduling Mode</label>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
          >
            {[
              {
                key: "random",
                icon: "⚡",
                title: "Random",
                desc: "Auto-assign dates, times & venues",
              },
              {
                key: "manual",
                icon: "✏️",
                title: "Manual",
                desc: "Set date/time/venue per fixture yourself",
              },
            ].map(({ key, icon, title, desc }) => (
              <button
                key={key}
                type="button"
                onClick={() => setGenForm((f) => ({ ...f, mode: key }))}
                style={{
                  padding: "14px",
                  borderRadius: 10,
                  textAlign: "left",
                  cursor: "pointer",
                  border:
                    genForm.mode === key
                      ? "2px solid var(--navy)"
                      : "1.5px solid var(--border)",
                  background:
                    genForm.mode === key
                      ? "var(--blue-light)"
                      : "var(--bg-primary)",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ fontSize: "1.2rem", marginBottom: 4 }}>
                  {icon}
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "var(--navy)",
                    fontSize: "0.85rem",
                  }}
                >
                  {title}
                </div>
                <div
                  style={{
                    fontSize: "0.72rem",
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  {desc}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Random mode options */}
        {genForm.mode === "random" && (
          <>
            <div className="form-group">
              <label className="form-label">Start Date</label>
              <input
                type="date"
                className="form-input"
                value={genForm.startDate}
                onChange={(e) =>
                  setGenForm((f) => ({ ...f, startDate: e.target.value }))
                }
              />
              <p
                style={{
                  fontSize: "0.72rem",
                  color: "var(--text-muted)",
                  marginTop: 4,
                }}
              >
                Leave blank to use today. Each round gets the next day.
              </p>
            </div>

            <div className="form-group">
              <label className="form-label">Venues (one per line)</label>
              <textarea
                className="form-input"
                rows={4}
                value={genForm.venues}
                onChange={(e) =>
                  setGenForm((f) => ({ ...f, venues: e.target.value }))
                }
                placeholder={`University Sports Complex - Ground A\nUniversity Sports Complex - Ground B\nIndoor Sports Hall - Court 1`}
              />
            </div>
          </>
        )}

        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 2 }}
            disabled={generating}
          >
            {generating ? "Generating…" : "⚡ Generate Fixtures"}
          </button>
        </div>
      </form>
    </div>
  </div>
);

export default FixtureTab;
