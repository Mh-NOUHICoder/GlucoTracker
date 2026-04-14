import Dexie, { Table } from 'dexie';
import { supabase } from '@/lib/supabase';

export interface OfflineReading {
  id?: number;
  user_id: string;
  value: number;
  notes: string;
  source: string;
  is_valid: boolean;
  created_at: string;
}

export class GlucotrackDB extends Dexie {
  offlineReadings!: Table<OfflineReading, number>;

  constructor() {
    super('GlucotrackDB');
    this.version(1).stores({
      offlineReadings: '++id, user_id, created_at'
    });
  }
}

export const db = new GlucotrackDB();

export async function syncOfflineReadings() {
  if (!navigator.onLine) return;

  const pending = await db.offlineReadings.toArray();
  if (pending.length === 0) return;

  console.log(`Syncing ${pending.length} offline readings...`);

  // We push directly using supabase client 
  const { error } = await supabase.from("glucose_readings").insert(
    pending.map(({ user_id, value, notes, source, is_valid, created_at }) => ({
      user_id,
      value,
      notes,
      source,
      is_valid,
      created_at
    }))
  );

  if (!error) {
    console.log("Offline sync complete!");
    await db.offlineReadings.clear();
  } else {
    console.error("Failed to sync offline readings:", error);
  }
}
