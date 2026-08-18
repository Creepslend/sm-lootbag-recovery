import { useState } from 'react';
import { saveAs } from 'file-saver';
import type { SaveData, PlayerInfo, ContainerInfo } from '../lib/saveParser';
import { getItemName, getItemIconUrl } from '../lib/itemDatabase';
import { transferItems } from '../lib/saveModifier';

interface Props {
  saveData: SaveData;
  selectedPlayer: PlayerInfo;
  fileName: string;
  onRefresh: (data: Uint8Array) => void;
  onReset: () => void;
}

export function SaveAnalysis({ saveData, selectedPlayer, fileName, onRefresh, onReset }: Props) {
  const [modifiedData, setModifiedData] = useState<Uint8Array | null>(null);
  const [alerts, setAlerts] = useState<Record<number, { type: 'success' | 'error'; msg: string }>>({});
  const [orphanAlert, setOrphanAlert] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [selections, setSelections] = useState<Record<number, Set<number>>>({});

  const player = selectedPlayer.containerInfo.container;

  const containers = saveData.containers
    .filter(c => c.container.capacity !== 40 && c.container.items.length > 0)
    .sort((a, b) => b.container.id - a.container.id);

  const getSelection = (containerId: number): Set<number> => {
    return selections[containerId] || new Set();
  };

  const toggleItem = (containerId: number, itemIndex: number) => {
    setSelections(prev => {
      const current = new Set(prev[containerId] || []);
      if (current.has(itemIndex)) {
        current.delete(itemIndex);
      } else {
        current.add(itemIndex);
      }
      return { ...prev, [containerId]: current };
    });
  };

  const toggleAll = (containerId: number, items: number) => {
    setSelections(prev => {
      const current = prev[containerId];
      const allSelected = current && current.size === items;
      if (allSelected) {
        const copy = { ...prev };
        delete copy[containerId];
        return copy;
      }
      return { ...prev, [containerId]: new Set(Array.from({ length: items }, (_, i) => i)) };
    });
  };

  const handleTransfer = (container: ContainerInfo) => {
    const sel = getSelection(container.container.id);
    const hasPartialSelection = sel.size > 0 && sel.size < container.container.items.length;
    const selectedIndices = hasPartialSelection ? [...sel] : null;

    const res = transferItems(saveData.db, container, selectedPlayer, selectedIndices);

    if (res.success && res.data) {
      const containerId = container.container.id;
      const isFullTransfer = selectedIndices === null || selectedIndices.length === container.container.items.length;

      if (isFullTransfer) {
        setOrphanAlert({ type: 'success', msg: res.message });
      } else {
        setAlerts(prev => ({ ...prev, [containerId]: { type: 'success', msg: res.message } }));
      }

      // Clear selection for this container
      setSelections(prev => {
        const copy = { ...prev };
        delete copy[containerId];
        return copy;
      });

      setModifiedData(res.data);
      onRefresh(res.data);
    } else {
      setAlerts(prev => ({ ...prev, [container.container.id]: { type: 'error', msg: res.message } }));
    }
  };

  const handleDownload = () => {
    if (!modifiedData) return;
    const blob = new Blob([new Uint8Array(modifiedData)], { type: 'application/x-sqlite3' });
    saveAs(blob, fileName.replace('.db', '_modified.db'));
  };

  return (
    <div>
      {modifiedData && (
        <div className="download-area fade-in" style={{ marginBottom: '1.5rem', border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-card)' }}>
          <p style={{ marginBottom: '0.75rem', color: 'var(--text-dim)' }}>
            Your save file has been modified. Download it and replace the original.
          </p>
          <button className="btn btn-primary" onClick={handleDownload}>
            ⬇ Download {fileName.replace('.db', '_modified.db')}
          </button>
        </div>
      )}

      {/* Player inventory */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 className="section-title" style={{ marginBottom: 0 }}>Player Inventory</h3>
          <button className="btn" onClick={onReset} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
            Modify other save file
          </button>
        </div>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
          {player.items.length} items · {player.emptySlots} free slots out of {player.capacity}
        </p>
        <div className="inv-grid">
          {Array.from({ length: player.capacity }).map((_, i) => {
            const slotItem = player.items.find(item => item.slotIndex === i) || null;
            return (
              <div key={i} className={`inv-slot ${slotItem ? 'filled' : ''}`}>
                {slotItem && (
                  <>
                    <img src={getItemIconUrl(slotItem.uuid)} alt="" className="inv-icon" onError={e => (e.currentTarget.style.display = 'none')} />
                    {slotItem.quantity > 1 && <span className="qty">×{slotItem.quantity}</span>}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: '1.5rem', marginBottom: '0.5rem' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Containers ({containers.length})</h3>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.88rem', marginTop: '0.25rem' }}>
          Your death lootbag is almost certainly the <strong>first one</strong> in this list (highest ID).
        </p>
      </div>

      {containers.length === 0 && (
        <div className="card" style={{ marginTop: '0.5rem' }}>
          <p style={{ color: 'var(--text-dim)' }}>No containers found in this save file.</p>
        </div>
      )}

      {orphanAlert && (
        <div className={`alert ${orphanAlert.type === 'success' ? 'alert-success' : 'alert-error'} fade-in`} style={{ marginBottom: '1rem' }}>
          {orphanAlert.type === 'success' ? '✔' : '❌'} {orphanAlert.msg}
        </div>
      )}

      {containers.map((c) => {
        const sel = getSelection(c.container.id);
        const hasSelection = sel.size > 0;
        const isPartial = hasSelection && sel.size < c.container.items.length;
        const itemCount = hasSelection ? sel.size : c.container.items.length;
        const hasSpace = player.emptySlots >= itemCount;
        const alert = alerts[c.container.id];

        return (
          <div key={c.container.id} className="card fade-in" style={{ marginTop: '0.5rem' }}>
            {alert && (
              <div className={`alert ${alert.type === 'success' ? 'alert-success' : 'alert-error'} fade-in`} style={{ marginBottom: '1rem' }}>
                {alert.type === 'success' ? '✔' : '❌'} {alert.msg}
              </div>
            )}

            <div className="container-card">
              <div className="info">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span className="badge badge-lootbag">Container</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>#{c.container.id}</span>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    · {c.container.items.length} items · {c.container.capacity} slots
                  </span>
                </div>

                <div className="item-list">
                  {c.container.items.map((item, idx) => {
                    const isSelected = sel.has(idx);
                    const needsSelection = !hasSpace && !hasSelection;
                    return (
                      <label
                        key={idx}
                        className={`item-tag ${isSelected ? 'item-tag-selected' : ''} ${needsSelection ? 'item-tag-suggest' : ''}`}
                      >
                        <input
                          type="checkbox"
                          className="item-checkbox"
                          checked={isSelected}
                          onChange={() => toggleItem(c.container.id, idx)}
                        />
                        <img src={getItemIconUrl(item.uuid)} alt="" className="item-tag-icon" onError={e => (e.currentTarget.style.display = 'none')} />
                        {getItemName(item.uuid)}
                        <span className="qty">×{item.quantity}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="actions">
                {c.container.items.length > 1 && (
                  <button className="btn" onClick={() => toggleAll(c.container.id, c.container.items.length)}>
                    {sel.size === c.container.items.length ? 'Deselect all' : 'Select all'}
                  </button>
                )}

                <div className="tooltip-wrap">
                  <button
                    className="btn btn-primary"
                    disabled={!hasSpace}
                    onClick={() => handleTransfer(c)}
                  >
                    {isPartial
                      ? `Transfer ${sel.size} selected`
                      : 'Transfer to inventory'}
                  </button>
                  {!hasSpace && (
                    <span className="tooltip-text">
                      {hasSelection
                        ? `${sel.size} items selected but only ${player.emptySlots} free slots`
                        : `Not enough space (${c.container.items.length} items, ${player.emptySlots} free slots). Select specific items to do a partial transfer.`}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <button
        className="btn scroll-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        title="Back to top"
        aria-label="Back to top"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
      </button>
    </div>
  );
}
