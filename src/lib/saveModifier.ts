import type { Database } from 'sql.js';
import type { ContainerInfo, PlayerInfo, ParsedItem } from './saveParser';

export interface ModifyResult {
  success: boolean;
  message: string;
  data?: Uint8Array;
}

function writeUint16BE(value: number): [number, number] {
  return [(value >> 8) & 0xFF, value & 0xFF];
}

function uuidToBytes(uuid: string): number[] {
  const clean = uuid.replace(/-/g, '');
  const bytes: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    bytes.push(parseInt(clean.substring(i, i + 2), 16));
  }
  return bytes.reverse();
}

const HEADER_SIZE = 11;
const SLOT_SIZE = 22;
const EMPTY_UUID = '00000000-0000-0000-0000-000000000000';

const EMPTY_SLOT = new Uint8Array([
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0xFF, 0xFF, 0xFF, 0xFF,
  0, 0,
]);

function countFreeSlots(blob: Uint8Array): number {
  let free = 0;
  for (let offset = HEADER_SIZE; offset + SLOT_SIZE <= blob.length - 2; offset += SLOT_SIZE) {
    let isEmpty = true;
    for (let i = 0; i < SLOT_SIZE; i++) {
      if (blob[offset + i] !== EMPTY_SLOT[i]) { isEmpty = false; break; }
    }
    if (isEmpty) free++;
  }
  return free;
}

function writeItemToSlot(blob: Uint8Array, offset: number, item: ParsedItem): void {
  const ub = uuidToBytes(item.uuid);
  for (let i = 0; i < 16; i++) blob[offset + i] = ub[i];
  blob[offset + 16] = 0xFF;
  blob[offset + 17] = 0xFF;
  blob[offset + 18] = 0xFF;
  blob[offset + 19] = 0xFF;
  const [qh, ql] = writeUint16BE(item.quantity);
  blob[offset + 20] = qh;
  blob[offset + 21] = ql;
}

function clearSlot(blob: Uint8Array, offset: number): void {
  for (let i = 0; i < SLOT_SIZE; i++) blob[offset + i] = EMPTY_SLOT[i];
}

/**
 * Transfer selected items from a container to the player inventory.
 * If `selectedIndices` is null, transfers all items.
 * Returns the remaining items not transferred (if any).
 */
export function transferItems(
  db: Database,
  source: ContainerInfo,
  player: PlayerInfo,
  selectedIndices: number[] | null,
): ModifyResult {
  try {
    const playerId = player.containerInfo.container.id;
    const res = db.exec(`SELECT data FROM Container WHERE id = ${playerId}`);
    if (!res.length || !res[0].values.length) {
      return { success: false, message: "Player inventory not found." };
    }

    const itemsToTransfer = selectedIndices
      ? selectedIndices.map(i => source.container.items[i]).filter(Boolean)
      : source.container.items.filter(it => it.quantity > 0 && it.uuid !== EMPTY_UUID);

    if (itemsToTransfer.length === 0) {
      return { success: false, message: "No items selected." };
    }

    const playerBlob = new Uint8Array(res[0].values[0][0] as Uint8Array);
    const freeSlots = countFreeSlots(playerBlob);

    if (freeSlots < itemsToTransfer.length) {
      return {
        success: false,
        message: `Not enough space: ${itemsToTransfer.length} items selected but only ${freeSlots} free slots.`,
      };
    }

    // Write items into player inventory
    const newPlayerBlob = new Uint8Array(playerBlob);
    let transferred = 0;

    for (let offset = HEADER_SIZE; offset + SLOT_SIZE <= newPlayerBlob.length - 2 && transferred < itemsToTransfer.length; offset += SLOT_SIZE) {
      let isEmpty = true;
      for (let i = 0; i < SLOT_SIZE; i++) {
        if (newPlayerBlob[offset + i] !== EMPTY_SLOT[i]) { isEmpty = false; break; }
      }
      if (isEmpty) {
        writeItemToSlot(newPlayerBlob, offset, itemsToTransfer[transferred]);
        transferred++;
      }
    }

    db.run(`UPDATE Container SET data = ? WHERE id = ?`, [newPlayerBlob, playerId]);

    // Update source container
    const srcId = source.container.id;
    const isFullTransfer = selectedIndices === null || selectedIndices.length === source.container.items.length;

    if (isFullTransfer) {
      db.run(`DELETE FROM Container WHERE id = ?`, [srcId]);
    } else {
      // Clear transferred slots in the source container
      const srcRes = db.exec(`SELECT data FROM Container WHERE id = ${srcId}`);
      if (srcRes.length && srcRes[0].values.length) {
        const srcBlob = new Uint8Array(srcRes[0].values[0][0] as Uint8Array);
        const newSrcBlob = new Uint8Array(srcBlob);

        for (const item of itemsToTransfer) {
          const slotOffset = HEADER_SIZE + item.slotIndex * SLOT_SIZE;
          if (slotOffset + SLOT_SIZE <= newSrcBlob.length - 2) {
            clearSlot(newSrcBlob, slotOffset);
          }
        }

        db.run(`UPDATE Container SET data = ? WHERE id = ?`, [newSrcBlob, srcId]);
      }
    }

    const msg = transferred === 1
      ? "1 item transferred."
      : `${transferred} items transferred.`;

    return { success: true, message: msg, data: db.export() };
  } catch (error: any) {
    return { success: false, message: `Error: ${error.message}` };
  }
}
