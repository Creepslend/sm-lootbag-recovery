import initSqlJs from 'sql.js';

export interface ParsedItem {
  uuid: string;
  slotId: number;
  quantity: number;
  slotIndex: number;
}

export interface ParsedContainer {
  id: number;
  capacity: number;
  filter: number;
  items: ParsedItem[];
  emptySlots: number;
}

export interface ContainerInfo {
  container: ParsedContainer;
}

export interface PlayerInfo {
  containerInfo: ContainerInfo;
}

export interface SaveData {
  players: PlayerInfo[];
  containers: ContainerInfo[];
  db: any;
}

function parseUuid(buffer: Uint8Array): string {
  const reversed = new Uint8Array([...buffer].reverse());
  return [...reversed]
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

function parseContainerBlob(blob: Uint8Array): ParsedContainer | null {
  if (blob.length < 11) return null;
  if (blob[0] !== 0x04 || blob[1] !== 0x00 || blob[2] !== 0x01 || blob[3] !== 0x00) return null;

  const id = (blob[5] << 8) | blob[6];
  const capacity = blob[8];
  const filter = (blob[9] << 8) | blob[10];

  const items: ParsedItem[] = [];
  let emptySlots = 0;
  let offset = 11;

  for (let i = 0; i < capacity; i++) {
    if (offset + 22 > blob.length) break;

    const slotData = blob.slice(offset, offset + 22);
    offset += 22;

    const uuid = parseUuid(slotData.slice(0, 16));
    let slotId = (slotData[16] << 24) | (slotData[17] << 16) | (slotData[18] << 8) | slotData[19];
    if (slotId === 0xFFFFFFFF || slotId === -1) slotId = -1;
    const quantity = (slotData[20] << 8) | slotData[21];

    if (quantity === 0 && uuid === '00000000-0000-0000-0000-000000000000') {
      emptySlots++;
    } else {
      items.push({ uuid, slotId, quantity, slotIndex: i });
    }
  }

  return { id, capacity, filter, items, emptySlots };
}

export async function parseSaveFile(fileBuffer: ArrayBuffer): Promise<SaveData> {
  const SQL = await initSqlJs({ locateFile: () => `/sql-wasm.wasm` });
  const db = new SQL.Database(new Uint8Array(fileBuffer));

  const containers: Map<number, ParsedContainer> = new Map();
  try {
    const res = db.exec("SELECT id, data FROM Container");
    if (res.length > 0) {
      for (const row of res[0].values) {
        const dbId = row[0] as number;
        const data = row[1] as Uint8Array;
        const parsed = parseContainerBlob(data);
        if (parsed) {
          parsed.id = dbId;
          containers.set(dbId, parsed);
        }
      }
    }
  } catch (e) {
    console.error("Error reading Container table", e);
  }

  const allContainers: ContainerInfo[] = [];
  const players: PlayerInfo[] = [];

  for (const [, container] of containers.entries()) {
    const info: ContainerInfo = { container };

    if (container.capacity === 40) {
      players.push({ containerInfo: info });
    }

    allContainers.push(info);
  }

  return { players, containers: allContainers, db };
}
