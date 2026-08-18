import { useState } from 'react';
import { DropZone } from './components/DropZone';
import { SaveAnalysis } from './components/SaveAnalysis';
import { Instructions } from './components/Instructions';
import { parseSaveFile } from './lib/saveParser';
import type { SaveData, PlayerInfo } from './lib/saveParser';
import './index.css';

export default function App() {
  const [saveData, setSaveData] = useState<SaveData | null>(null);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleFileLoaded = async (buffer: ArrayBuffer, name: string) => {
    setLoading(true);
    setError(null);
    setFileName(name);
    try {
      const data = await parseSaveFile(buffer);
      setSaveData(data);
      if (data.players.length === 1) {
        setSelectedPlayer(data.players[0]);
      } else if (data.players.length === 0) {
        setError("No player inventory found in this save.");
      }
    } catch (err: any) {
      setError(err.message || 'Error loading the save file.');
      setSaveData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (saveData?.db) {
      try { saveData.db.close(); } catch (_) {}
    }
    setSaveData(null);
    setSelectedPlayer(null);
    setError(null);
    setFileName('');
  };

  const handleRefresh = (data: Uint8Array) => {
    const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    parseSaveFile(buffer).then(parsed => {
      setSaveData(parsed);
      const p = parsed.players.find(
        p => p.containerInfo.container.id === selectedPlayer?.containerInfo.container.id
      );
      if (p) setSelectedPlayer(p);
    }).catch(err => setError(err.message));
  };

  return (
    <>
      <header className="header">
        <h1><span className="accent">SM</span> Lootbag Recovery</h1>
        <p>Easily recover your lost items in Scrap Mechanic Survival</p>
      </header>

      <main>
        {error && (
          <div className="alert alert-error fade-in">⚠️ {error}</div>
        )}

        {loading && (
          <div className="loading fade-in">
            <div className="spinner" />
            Analyzing save file…
          </div>
        )}

        {!saveData && !loading && (
          <DropZone onFileLoaded={handleFileLoaded} />
        )}

        {saveData && !loading && (
          <div className="fade-in">
            {saveData.players.length > 1 && (
              <div className="card" style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontWeight: 600 }}>Player:</span>
                  <select
                    className="player-select"
                    value={selectedPlayer?.containerInfo.container.id ?? ''}
                    onChange={e => {
                      const p = saveData.players.find(
                        p => p.containerInfo.container.id === Number(e.target.value)
                      );
                      setSelectedPlayer(p || null);
                    }}
                  >
                    <option value="">— Select a player —</option>
                    {saveData.players.map((p, i) => (
                      <option key={p.containerInfo.container.id} value={p.containerInfo.container.id}>
                        Player {i + 1} (inventory #{p.containerInfo.container.id})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}

            {selectedPlayer && (
              <SaveAnalysis
                saveData={saveData}
                selectedPlayer={selectedPlayer}
                fileName={fileName}
                onRefresh={handleRefresh}
                onReset={handleReset}
              />
            )}
          </div>
        )}
      </main>

      <div style={{ marginTop: '3rem' }}>
        <Instructions />
      </div>
    </>
  );
}
