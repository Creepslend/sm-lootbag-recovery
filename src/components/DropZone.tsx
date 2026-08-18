import { useRef, useState } from 'react';

interface DropZoneProps {
  onFileLoaded: (buffer: ArrayBuffer, fileName: string) => void;
}

export function DropZone({ onFileLoaded }: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => {
      if (e.target?.result) {
        onFileLoaded(e.target.result as ArrayBuffer, file.name);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files.length > 0) processFile(e.dataTransfer.files[0]);
  };

  const copyPath = () => {
    navigator.clipboard.writeText('%appdata%\\Axolot Games\\Scrap Mechanic\\User');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fade-in">
      <div className="card">
        <div
          className={`drop-zone ${isDragActive ? 'active' : ''}`}
          onDragOver={e => { e.preventDefault(); setIsDragActive(true); }}
          onDragLeave={e => { e.preventDefault(); setIsDragActive(false); }}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            type="file"
            ref={inputRef}
            style={{ display: 'none' }}
            accept=".db"
            onChange={e => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
          />
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v6h6v10H6z"/>
          </svg>
          <h2>Drag and drop your save file here</h2>
          <p>or click to select a .db file</p>
        </div>
      </div>

      <div className="card">
        <p style={{ fontWeight: 600, marginBottom: '0.5rem' }}>📁 Where to find your saves:</p>
        <div className="path-box">
          <span>%appdata%\Axolot Games\Scrap Mechanic\User</span>
          <button className="btn btn-primary" onClick={copyPath} type="button">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', margin: '0.5rem 0' }}>
          Paste this path into the Windows Explorer address bar.
          <br />
          Then navigate to <code>User_XXXXX &gt; Save &gt; Survival</code> and choose the file corresponding to your save.
        </p>
        <div className="alert alert-warning">
          <strong>⚠️ Important:</strong> Always make a backup copy of your save before modifying it!
        </div>
      </div>
    </div>
  );
}
