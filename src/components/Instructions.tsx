import { useState } from 'react';

export function Instructions() {
  const [copied, setCopied] = useState(false);

  const copyPath = () => {
    navigator.clipboard.writeText('%appdata%\\Axolot Games\\Scrap Mechanic\\User');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card">
      <h3 className="section-title">Step-by-step Guide</h3>
      <ol className="steps">
        <li>
          <strong>Find your save file</strong>
          <p>
            Open Windows Explorer and paste this path into the address bar:
          </p>
          <div className="path-box" style={{ marginTop: '0.5rem' }}>
            <span>%appdata%\Axolot Games\Scrap Mechanic\User</span>
            <button className="btn btn-primary" onClick={copyPath} type="button">
              {copied ? '✓' : 'Copy'}
            </button>
          </div>
          <p style={{ marginTop: '0.35rem' }}>
            Then navigate to <code>User_XXXXX &gt; Save &gt; Survival</code> and choose the file corresponding to your save.
          </p>
        </li>
        <li>
          <strong>Make a backup copy</strong>
          <p>
            Before making any modifications, copy your <code>.db</code> file to another location (like your Desktop)
            so you can restore it if anything goes wrong.
          </p>
        </li>
        <li>
          <strong>Drop the file into the tool</strong>
          <p>
            Drag and drop your <code>.db</code> file into the drop zone above,
            or click it to select the file manually.
          </p>
        </li>
        <li>
          <strong>Transfer your items</strong>
          <p>
            Find your lootbag in the container list and transfer its contents to your player inventory.
            If your inventory is full, you can select specific items to transfer partially.
          </p>
        </li>
        <li>
          <strong>Download and replace</strong>
          <p>
            Download the modified file, then replace the original in your save folder.
            Restart the game to see the changes.
          </p>
        </li>
      </ol>
    </div>
  );
}
