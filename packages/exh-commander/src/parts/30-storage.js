  const STORE_WORKS = 'works';
  const STORE_EDITIONS = 'editions';
  const STORE_ARCHIVES = 'local_archives';
  const STORE_LINKS = 'links';
  const STORE_PROGRESS = 'progress';
  const STORE_TRACKING = 'tracking_searches';

  const TRACKING_GROUP_ORDER = ['artist', 'group', 'parody', 'character', 'female', 'male', 'tag', 'category', 'uploader', 'search', 'favorites', 'other'];
  const TRACKING_GROUP_LABELS = {
    artist: '画师',
    group: '社团/汉化组',
    parody: '原作',
    character: '角色',
    female: '女性标签',
    male: '男性标签',
    tag: '标签',
    category: '分类',
    uploader: '上传者',
    search: '搜索',
    favorites: '站内收藏夹',
    other: '其它',
  };

  function openDb() {
    return new Promise((resolve, reject) => {
      if (db) {
        resolve(db);
        return;
      }
      if (typeof indexedDB === 'undefined') {
        reject(new Error('indexedDB unavailable'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(STORE_WORKS)) {
          const s = d.createObjectStore(STORE_WORKS, { keyPath: 'work_id' });
          s.createIndex('title_core', 'title_core', { unique: false });
          s.createIndex('status', 'status', { unique: false });
          s.createIndex('favorite', 'favorite', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_EDITIONS)) {
          const s = d.createObjectStore(STORE_EDITIONS, { keyPath: 'id' });
          s.createIndex('work_id', 'work_id', { unique: false });
          s.createIndex('gid', 'gid', { unique: false });
          s.createIndex('title_core', 'title_core', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_ARCHIVES)) {
          const s = d.createObjectStore(STORE_ARCHIVES, { keyPath: 'arcid' });
          s.createIndex('title_core', 'title_core', { unique: false });
          s.createIndex('eh_gid', 'eh_gid', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_LINKS)) {
          const s = d.createObjectStore(STORE_LINKS, { keyPath: 'id' });
          s.createIndex('work_id', 'work_id', { unique: false });
          s.createIndex('edition_id', 'edition_id', { unique: false });
          s.createIndex('arcid', 'arcid', { unique: false });
        }
        if (!d.objectStoreNames.contains(STORE_PROGRESS)) {
          d.createObjectStore(STORE_PROGRESS, { keyPath: 'work_id' });
        }
        if (!d.objectStoreNames.contains(STORE_TRACKING)) {
          const s = d.createObjectStore(STORE_TRACKING, { keyPath: 'id' });
          s.createIndex('query_signature', 'query_signature', { unique: false });
          s.createIndex('group_type', 'group_type', { unique: false });
          s.createIndex('archived', 'archived', { unique: false });
        }
      };
      req.onsuccess = () => {
        db = req.result;
        resolve(db);
      };
      req.onerror = () => reject(req.error || new Error('idb open failed'));
    });
  }

  function idbReq(req) {
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  /** 与 exportBackup 一致的仓库；写后标 WebDAV 脏（import 批量时可 suppress） */
  const SYNCABLE_IDB_STORES = new Set([
    STORE_WORKS,
    STORE_EDITIONS,
    STORE_ARCHIVES,
    STORE_LINKS,
    STORE_PROGRESS,
    STORE_TRACKING,
  ]);
  let idbSyncSuppress = false;

  function notifyTrackingStoreChanged() {
    if (idbSyncSuppress) return;
    if (typeof GM_setValue !== 'function') return;
    try {
      GM_setValue(GM_TRACKING_REV_KEY, String(nowMs()) + ':' + Math.random().toString(36).slice(2, 8));
    } catch (_) { /* private mode / blocked storage */ }
  }

  function markIdbStoreDirty(store) {
    if (idbSyncSuppress) return;
    if (store === STORE_TRACKING) notifyTrackingStoreChanged();
    if (!SYNCABLE_IDB_STORES.has(store)) return;
    if (typeof markCreamuLocalDirty === 'function') markCreamuLocalDirty();
  }

  async function idbPut(store, value) {
    const d = await openDb();
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).put(value);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        markIdbStoreDirty(store);
        resolve(value);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGet(store, key) {
    const d = await openDb();
    return idbReq(d.transaction(store, 'readonly').objectStore(store).get(key));
  }

  async function idbDelete(store, key) {
    const d = await openDb();
    const tx = d.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => {
        markIdbStoreDirty(store);
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async function idbGetAll(store) {
    const d = await openDb();
    return idbReq(d.transaction(store, 'readonly').objectStore(store).getAll());
  }

  async function idbIndexGetAll(store, indexName, query) {
    const d = await openDb();
    const idx = d.transaction(store, 'readonly').objectStore(store).index(indexName);
    return idbReq(query === undefined ? idx.getAll() : idx.getAll(query));
  }

  async function idbGetAllFromStores(storeNames) {
    const names = Array.from(new Set(storeNames || [])).filter(Boolean);
    if (!names.length) return {};
    const d = await openDb();
    const tx = d.transaction(names, 'readonly');
    const entries = await Promise.all(
      names.map(async (name) => [name, await idbReq(tx.objectStore(name).getAll())])
    );
    return Object.fromEntries(entries);
  }

  async function idbPutBatches(batches) {
    const entries = Object.entries(batches || {}).filter(
      ([, rows]) => Array.isArray(rows) && rows.length
    );
    if (!entries.length) return 0;
    const names = entries.map(([name]) => name);
    const d = await openDb();
    const tx = d.transaction(names, 'readwrite');
    const done = new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('idb batch write failed'));
      tx.onabort = () => reject(tx.error || new Error('idb batch write aborted'));
    });
    let count = 0;
    for (const [name, rows] of entries) {
      const store = tx.objectStore(name);
      for (const row of rows) {
        store.put(row);
        count++;
      }
    }
    await done;
    if (!idbSyncSuppress) {
      if (names.indexOf(STORE_TRACKING) >= 0) notifyTrackingStoreChanged();
      if (names.some((name) => SYNCABLE_IDB_STORES.has(name))) {
        if (typeof markCreamuLocalDirty === 'function') markCreamuLocalDirty();
      }
    }
    return count;
  }
