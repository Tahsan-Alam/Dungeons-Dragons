import type { RoomView } from '../game/types.ts';

export interface StoredRoom {
  revision: number;
  room: RoomView;
  tokenHashes: Record<string, string>;
  requests: { id: string; playerId: string }[];
  admissions?: { kind:'create'|'join'; requestHash:string; payloadHash:string; playerId:string }[];
  expiresAt: number;
}

export interface RoomStore {
  read(code: string): Promise<StoredRoom | null>;
  insert(record: StoredRoom): Promise<boolean>;
  compareAndSwap(code: string, revision: number, next: StoredRoom): Promise<boolean>;
}

export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, StoredRoom>();
  async read(code: string) { return structuredClone(this.rooms.get(code) ?? null); }
  async insert(record: StoredRoom) {
    if (this.rooms.has(record.room.code)) return false;
    this.rooms.set(record.room.code, structuredClone(record));
    return true;
  }
  async compareAndSwap(code: string, revision: number, next: StoredRoom) {
    if (this.rooms.get(code)?.revision !== revision) return false;
    this.rooms.set(code, structuredClone(next));
    return true;
  }
}

// Only the server reads this table. Authentication hashes never enter RoomView.
export class D1RoomStore implements RoomStore {
  private database: D1Database;
  constructor(database: D1Database) { this.database = database; }
  async read(code: string): Promise<StoredRoom | null> {
    const row = await this.database.prepare('SELECT payload FROM rooms WHERE code = ?')
      .bind(code).first<{ payload: string }>();
    return row ? JSON.parse(row.payload) : null;
  }
  async insert(record: StoredRoom) {
    const result = await this.database.prepare('INSERT OR IGNORE INTO rooms (code, revision, payload, expires_at) VALUES (?, ?, ?, ?)')
      .bind(record.room.code, record.revision, JSON.stringify(record), record.expiresAt).run();
    return result.meta.changes === 1;
  }
  async compareAndSwap(code: string, revision: number, next: StoredRoom) {
    const result = await this.database.prepare('UPDATE rooms SET revision = ?, payload = ?, expires_at = ? WHERE code = ? AND revision = ?')
      .bind(next.revision, JSON.stringify(next), next.expiresAt, code, revision).run();
    return result.meta.changes === 1;
  }
}
