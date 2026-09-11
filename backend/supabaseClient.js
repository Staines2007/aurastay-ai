const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const isSupabaseConfigured = 
  supabaseUrl && 
  !supabaseUrl.includes('your-project-id') && 
  supabaseAnonKey && 
  !supabaseAnonKey.includes('placeholder_anon_key');

// ==========================================================================
// LOCAL JSON DATABASE ENGINE (Fallback / Offline Mode)
// ==========================================================================

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

class LocalQueryBuilder {
  constructor(table) {
    this.table = table;
    this.filePath = path.join(dataDir, `${table}.json`);
    this.data = this.readData();
    this.filters = [];
    this.sortField = null;
    this.sortAscending = true;
    this.isSingle = false;
    this.insertData = null;
    this.updateData = null;
    this.isDelete = false;
    this.upsertData = null;
  }

  readData() {
    try {
      const initialRooms = [
        { id: 1, name: "Premium Sea View Grand Deluxe", category: "deluxe", hotel: "Taj Mahal Palace, Mumbai", price: 24900, status: "available" },
        { id: 2, name: "Royal Club Studio Room 08", category: "standard", hotel: "The Leela Palace, New Delhi", price: 14900, status: "available" },
        { id: 3, name: "Wellness Penthouse Suite", category: "suite", hotel: "Wildflower Hall, Shimla", price: 37500, status: "available" },
        { id: 4, name: "Premier Lake View Pavilion", category: "suite", hotel: "The Oberoi Udaivilas, Udaipur", price: 45000, status: "available" },
        { id: 5, name: "Historical Royal Heritage Room", category: "deluxe", hotel: "Rambagh Palace, Jaipur", price: 38000, status: "available" },
        { id: 6, name: "Executive Towers Club Room", category: "standard", hotel: "ITC Grand Chola, Chennai", price: 12000, status: "available" },
        { id: 7, name: "Heritage Meandering Pool Villa", category: "suite", hotel: "Kumarakom Lake Resort, Kerala", price: 28000, status: "available" },
        { id: 8, name: "Luxury Lake View Royal Suite", category: "suite", hotel: "Taj Lake Palace, Udaipur", price: 55000, status: "available" },
        { id: 9, name: "Club Room Race Course Road", category: "deluxe", hotel: "Welcomhotel by ITC Hotels, Coimbatore", price: 7500, status: "available" },
        { id: 10, name: "Superior Room Avinashi Road", category: "standard", hotel: "Vivanta, Coimbatore", price: 8200, status: "available" },
        { id: 11, name: "Premium Business Suite", category: "suite", hotel: "Radisson Blu, Coimbatore", price: 11500, status: "available" },
        { id: 12, name: "Deluxe Heritage Suite", category: "deluxe", hotel: "The Residency Towers, Coimbatore", price: 9000, status: "available" }
      ];

      if (!fs.existsSync(this.filePath)) {
        if (this.table === 'rooms') {
          fs.writeFileSync(this.filePath, JSON.stringify(initialRooms, null, 2), 'utf8');
          return initialRooms;
        }
        if (this.table === 'settings') {
          const initialSettings = [
            { key: "subscription_price", value: "3000" },
            { key: "dynamic_pricing_enabled", value: "true" },
            { key: "dynamic_pricing_factor", value: "1.10" }
          ];
          fs.writeFileSync(this.filePath, JSON.stringify(initialSettings, null, 2), 'utf8');
          return initialSettings;
        }
        fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf8');
        return [];
      }

      const existing = JSON.parse(fs.readFileSync(this.filePath, 'utf8'));
      if (this.table === 'rooms' && existing.length < 12) {
        fs.writeFileSync(this.filePath, JSON.stringify(initialRooms, null, 2), 'utf8');
        return initialRooms;
      }
      return existing;
    } catch (e) {
      return [];
    }
  }

  writeData(data) {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      console.error(`Failed to write local database for ${this.table}:`, e);
    }
  }

  select(fields) {
    return this;
  }

  eq(field, value) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  ilike(field, pattern) {
    this.filters.push({ type: 'ilike', field, value: pattern });
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  order(field, options = { ascending: true }) {
    this.sortField = field;
    this.sortAscending = options.ascending;
    return this;
  }

  insert(rows) {
    this.insertData = rows;
    return this;
  }

  update(changes) {
    this.updateData = changes;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  upsert(row) {
    this.upsertData = row;
    return this;
  }

  async then(resolve, reject) {
    try {
      let result = [...this.data];

      // Apply Filters
      for (const filter of this.filters) {
        if (filter.type === 'eq') {
          result = result.filter(item => String(item[filter.field]) === String(filter.value));
        } else if (filter.type === 'ilike') {
          const cleanPattern = filter.value.replace(/%/g, '');
          result = result.filter(item => String(item[filter.field]).toLowerCase().includes(cleanPattern.toLowerCase()));
        }
      }

      // Apply Sorting
      if (this.sortField) {
        result.sort((a, b) => {
          let valA = a[this.sortField];
          let valB = b[this.sortField];
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
          if (valA < valB) return this.sortAscending ? -1 : 1;
          if (valA > valB) return this.sortAscending ? 1 : -1;
          return 0;
        });
      }

      // Handle INSERT
      if (this.insertData) {
        const rows = Array.isArray(this.insertData) ? this.insertData : [this.insertData];

        // Check for duplicate email in users table
        if (this.table === 'users') {
          for (const row of rows) {
            if (row.email && this.data.some(existing => String(existing.email).toLowerCase() === String(row.email).toLowerCase())) {
              resolve({ data: null, error: { message: 'duplicate key value violates unique constraint', code: '23505' } });
              return;
            }
          }
        }

        const newRows = rows.map(row => {
          const newRow = { ...row };
          if (newRow.id === undefined && this.table !== 'users' && this.table !== 'settings') {
            newRow.id = this.data.length > 0 ? Math.max(...this.data.map(item => Number(item.id) || 0)) + 1 : 1;
          }
          if (newRow.created_at === undefined) {
            newRow.created_at = new Date().toISOString();
          }
          return newRow;
        });
        this.data.push(...newRows);
        this.writeData(this.data);
        
        const returnData = this.isSingle ? (newRows[0] || null) : (Array.isArray(this.insertData) ? newRows : newRows[0]);
        resolve({ data: returnData, error: null });
        return;
      }

      // Handle UPDATE
      if (this.updateData) {
        let updatedCount = 0;
        let updatedItems = [];
        this.data = this.data.map(item => {
          let match = true;
          for (const filter of this.filters) {
            if (filter.type === 'eq' && String(item[filter.field]) !== String(filter.value)) {
              match = false;
            }
          }
          if (match) {
            const updated = { ...item, ...this.updateData };
            updatedCount++;
            updatedItems.push(updated);
            return updated;
          }
          return item;
        });

        if (updatedCount > 0) {
          this.writeData(this.data);
        }

        const returnData = this.isSingle ? (updatedItems[0] || null) : updatedItems;
        resolve({ data: returnData, error: null });
        return;
      }

      // Handle DELETE
      if (this.isDelete) {
        const initialLen = this.data.length;
        this.data = this.data.filter(item => {
          let match = true;
          for (const filter of this.filters) {
            if (filter.type === 'eq' && String(item[filter.field]) !== String(filter.value)) {
              match = false;
            }
          }
          return !match;
        });

        if (this.data.length !== initialLen) {
          this.writeData(this.data);
        }
        resolve({ data: null, error: null });
        return;
      }

      // Handle UPSERT
      if (this.upsertData) {
        const row = this.upsertData;
        if (this.table === 'settings') {
          const existingIdx = this.data.findIndex(item => item.key === row.key);
          if (existingIdx !== -1) {
            this.data[existingIdx] = { ...this.data[existingIdx], ...row };
          } else {
            this.data.push(row);
          }
        } else {
          const existingIdx = this.data.findIndex(item => item.id === row.id);
          if (existingIdx !== -1) {
            this.data[existingIdx] = { ...this.data[existingIdx], ...row };
          } else {
            this.data.push(row);
          }
        }
        this.writeData(this.data);
        resolve({ data: row, error: null });
        return;
      }

      // Handle SELECT
      if (this.isSingle) {
        if (result.length === 0) {
          resolve({ data: null, error: { message: 'Row not found', code: 'PGRST116' } });
        } else {
          resolve({ data: result[0], error: null });
        }
      } else {
        resolve({ data: result, error: null });
      }

    } catch (e) {
      resolve({ data: null, error: { message: e.message } });
    }
  }
}

// ==========================================================================
// SUPABASE CLIENT WITH AUTOMATIC LOCAL FALLBACK
// ==========================================================================

/**
 * Creates a wrapper around the real Supabase client that transparently falls
 * back to the LocalQueryBuilder if any query fails due to a network error
 * (e.g. DNS failure, connection refused, project paused/deleted).
 */
class SupabaseWithFallback {
  constructor(realClient) {
    this.realClient = realClient;
    this.useLocal = false; // start optimistic; flip on first failure
  }

  from(tableName) {
    if (this.useLocal) {
      return new LocalQueryBuilder(tableName);
    }
    // Return a proxy builder that falls back to local on network errors
    return new FallbackQueryBuilder(tableName, this);
  }
}

class FallbackQueryBuilder {
  constructor(tableName, parent) {
    this.tableName = tableName;
    this.parent = parent; // SupabaseWithFallback instance
    this.ops = []; // queued method calls
  }

  _queue(method, args) {
    this.ops.push({ method, args });
    return this;
  }

  select(...args)  { return this._queue('select', args); }
  eq(...args)      { return this._queue('eq', args); }
  ilike(...args)   { return this._queue('ilike', args); }
  single(...args)  { return this._queue('single', args); }
  order(...args)   { return this._queue('order', args); }
  insert(...args)  { return this._queue('insert', args); }
  update(...args)  { return this._queue('update', args); }
  delete(...args)  { return this._queue('delete', args); }
  upsert(...args)  { return this._queue('upsert', args); }

  _buildLocal() {
    let q = new LocalQueryBuilder(this.tableName);
    for (const { method, args } of this.ops) {
      q = q[method](...args);
    }
    return q;
  }

  _buildReal() {
    let q = this.parent.realClient.from(this.tableName);
    for (const { method, args } of this.ops) {
      q = q[method](...args);
    }
    return q;
  }

  then(resolve, reject) {
    if (this.parent.useLocal) {
      return this._buildLocal().then(resolve, reject);
    }

    // Try the real Supabase client first
    return this._buildReal().then(
      (result) => {
        // If Supabase returns a network-level error, switch to local permanently
        if (result && result.error) {
          const msg = (result.error.message || '').toLowerCase();
          const isNetworkError = msg.includes('fetch failed') || 
                                 msg.includes('enotfound') || 
                                 msg.includes('network') ||
                                 msg.includes('econnrefused') ||
                                 result.status === 0;
          if (isNetworkError) {
            if (!this.parent.useLocal) {
              console.warn('⚠️  Supabase unreachable. Switching to Local JSON Database Engine permanently for this session.');
              this.parent.useLocal = true;
            }
            return this._buildLocal().then(resolve, reject);
          }
        }
        resolve(result);
      },
      (err) => {
        // Promise rejection from the real client → switch to local
        if (!this.parent.useLocal) {
          console.warn('⚠️  Supabase threw an error. Switching to Local JSON Database Engine permanently for this session.', err.message);
          this.parent.useLocal = true;
        }
        return this._buildLocal().then(resolve, reject);
      }
    );
  }
}

// ==========================================================================
// EXPORT
// ==========================================================================

let supabase;

if (isSupabaseConfigured) {
  console.log('⚡ Supabase configured. Will attempt cloud connection and fall back to local if unreachable...');
  const realClient = createClient(supabaseUrl, supabaseAnonKey);
  supabase = new SupabaseWithFallback(realClient);
} else {
  console.log('💾 Supabase credentials missing. Using Local JSON Database Engine.');
  supabase = {
    from: (tableName) => new LocalQueryBuilder(tableName)
  };
}

module.exports = supabase;
