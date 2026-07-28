// 18-webdav.js

// WebDAV（createCreamuWebDavSync 来自 shared 注入）
let scoutSync = null;

function triggerWebDavDirty() {
  if (scoutSync) {
    scoutSync.markLocalDirty();
  }
}

function initScoutWebDav() {
  if (typeof createCreamuWebDavSync !== 'function') {
    console.warn('[Creamu Scout] WebDAV module not found in shared script.');
    return;
  }

  scoutSync = createCreamuWebDavSync({
    product: 'scout',
    notify(msg, isErr) {
      showToast(msg, isErr);
    },
    async exportPayload() {
      return {
        terms: getLexiconTerms(),
        blocks: getBlockList(),
        tracks: getTracks(),
        types: getLexiconTypes(),
        config: getConfig(),
        publishers: getPublishers(),
        // 已点片库（与 tracks 断点分离）
        clicks: getClickedList(),
        // 作品收藏
        works: getWorks(),
        search_draft: typeof getScoutSearchDraft === 'function' ? getScoutSearchDraft() : null,
        search_relations: typeof getScoutSearchRelations === 'function'
          ? getScoutSearchRelations()
          : []
      };
    },
    async importPayload(payload) {
      if (!payload) return;
      if (Array.isArray(payload.terms)) {
        saveLexiconTerms(payload.terms);
      }
      if (Array.isArray(payload.blocks)) {
        saveBlockList(payload.blocks);
      }
      if (Array.isArray(payload.tracks)) {
        saveTracks(payload.tracks);
      }
      if (Array.isArray(payload.types)) {
        saveLexiconTypes(payload.types);
      }
      if (payload.config) {
        saveConfig(payload.config);
      }
      if (Array.isArray(payload.publishers)) {
        savePublishers(payload.publishers);
      }
      // 已点：vault 整包覆盖（与 terms/tracks 一致；清空后同步才能对端清空）
      if (payload.clicks != null) {
        replaceClickRecords(payload.clicks);
      }
      if (Array.isArray(payload.works)) {
        saveWorks(payload.works);
      }
      if (payload.search_draft && typeof saveScoutSearchDraft === 'function') {
        saveScoutSearchDraft(payload.search_draft);
      }
      if (
        Array.isArray(payload.search_relations) &&
        typeof saveScoutSearchRelations === 'function'
      ) {
        saveScoutSearchRelations(payload.search_relations);
      }
    },
    getSettings() {
      const cfg = getConfig();
      return {
        enabled: cfg.webdav_enabled,
        url: cfg.webdav_url,
        user: cfg.webdav_user,
        password: cfg.webdav_password,
        path: cfg.webdav_path,
        auto: cfg.webdav_auto,
        conflict: cfg.webdav_conflict
      };
    }
  });
}
