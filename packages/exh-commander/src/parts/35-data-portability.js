
  async function exportBackup() {
    return {
      version: VERSION,
      exported_at: new Date().toISOString(),
      kind: 'exh_full',
      // 配置去掉本机显示相关字段（缩略倍率、工作台宽度等）
      config: typeof cloneConfigForSync === 'function' ? cloneConfigForSync() : deepClone(config),
      // 列表「已点」描边
      seen_gids: typeof loadSeenGids === 'function' ? loadSeenGids() : {},
      // LRR 同步元数据 / 熟人汇总（可被 LRR 再刷新，但仍应跨机）
      lrr_meta: typeof loadLrrMeta === 'function' ? loadLrrMeta() : {},
      tracking_searches: await idbGetAll(STORE_TRACKING),
      works: await idbGetAll(STORE_WORKS),
      editions: await idbGetAll(STORE_EDITIONS),
      local_archives: await idbGetAll(STORE_ARCHIVES),
      links: await idbGetAll(STORE_LINKS),
      progress: await idbGetAll(STORE_PROGRESS),
    };
  }

  /**
   * 合并单条追更：同 id 或同 query_signature 视为同一项。
   * 按 updated_at 取较新侧为主，并保留断点 / 未读估数等「更完整」字段。
   */
  function mergeTrackingRecord(local, remote) {
    if (!local) return remote;
    if (!remote) return local;
    const lu = Number(local.updated_at) || 0;
    const ru = Number(remote.updated_at) || 0;
    const newer = ru >= lu ? remote : local;
    const older = ru >= lu ? local : remote;
    const out = Object.assign({}, older, newer);
    // 固定用本机已有 id，避免同 signature 双份
    out.id = local.id || remote.id;
    out.query_signature = local.query_signature || remote.query_signature;
    // 断点：谁更新更晚且有断点用谁；否则拼较完整的一侧
    const localBpAt = Number(local.breakpoint_at) || 0;
    const remoteBpAt = Number(remote.breakpoint_at) || 0;
    if (remoteBpAt > localBpAt && remote.breakpoint_gid) {
      out.breakpoint_gid = remote.breakpoint_gid;
      out.breakpoint_token = remote.breakpoint_token || '';
      out.breakpoint_title = remote.breakpoint_title || '';
      out.breakpoint_page = remote.breakpoint_page;
      out.breakpoint_url = remote.breakpoint_url || '';
      out.breakpoint_at = remote.breakpoint_at;
      out.breakpoint_posted_at = remote.breakpoint_posted_at || 0;
      out.breakpoint_newer_gid = remote.breakpoint_newer_gid || '';
      out.breakpoint_older_gid = remote.breakpoint_older_gid || '';
    } else if (local.breakpoint_gid) {
      out.breakpoint_gid = local.breakpoint_gid;
      out.breakpoint_token = local.breakpoint_token || out.breakpoint_token || '';
      out.breakpoint_title = local.breakpoint_title || out.breakpoint_title || '';
      out.breakpoint_page = local.breakpoint_page != null ? local.breakpoint_page : out.breakpoint_page;
      out.breakpoint_url = local.breakpoint_url || out.breakpoint_url || '';
      out.breakpoint_at = local.breakpoint_at || out.breakpoint_at;
      out.breakpoint_posted_at = local.breakpoint_posted_at || out.breakpoint_posted_at || 0;
      out.breakpoint_newer_gid = local.breakpoint_newer_gid || out.breakpoint_newer_gid || '';
      out.breakpoint_older_gid = local.breakpoint_older_gid || out.breakpoint_older_gid || '';
    }
    // 未读：跟断点会变小，不能 Math.max 把旧大数粘回来；跟较新断点一侧
    const top = compactText(out.top_gid || '');
    const bp = compactText(out.breakpoint_gid || '');
    const caughtUp = !!(top && bp && top === bp);
    if (caughtUp) {
      out.has_update = 0;
      out.unread_estimate = 0;
      out.unread_estimate_capped = 0;
      out.unread_estimate_source = 'home_caught_up';
    } else {
      out.has_update = local.has_update || remote.has_update ? 1 : out.has_update || 0;
      const bpSide = remoteBpAt > localBpAt ? remote : localBpAt > remoteBpAt ? local : newer;
      if (bpSide && bpSide.unread_estimate != null) {
        out.unread_estimate = Math.max(0, Math.floor(Number(bpSide.unread_estimate) || 0));
        out.unread_estimate_capped = bpSide.unread_estimate_capped ? 1 : 0;
        out.unread_estimate_source = bpSide.unread_estimate_source || out.unread_estimate_source || '';
      }
    }
    // 分类 / 自定义名：非空优先较新，空则回退旧
    if (!compactText(out.custom_folder || '')) {
      out.custom_folder = compactText(older.custom_folder || '') || '';
    }
    if (!compactText(out.custom_label || '')) {
      out.custom_label = compactText(older.custom_label || '') || '';
    }
    out.updated_at = Math.max(lu, ru, Number(out.updated_at) || 0);
    return out;
  }

  /** @param {{ fromSync?: boolean }} [options] fromSync 时不标脏 */
  async function importBackup(payload, options) {
    if (!payload || typeof payload !== 'object') throw new Error('invalid backup');
    options = options || {};
    idbSyncSuppress = true;
    try {
      if (payload.config && typeof payload.config === 'object') {
        // 保留本机显示类配置，不被云端/备份覆盖
        const localKeep = typeof pickConfigLocalOnly === 'function' ? pickConfigLocalOnly(config) : {};
        saveConfig(Object.assign({}, payload.config, localKeep));
      }
      if (payload.seen_gids && typeof payload.seen_gids === 'object' && typeof saveSeenGids === 'function') {
        // 合并：云端 + 本机（本机更新时间较新的保留）
        const local = typeof loadSeenGids === 'function' ? loadSeenGids() : {};
        const merged = Object.assign({}, payload.seen_gids);
        Object.keys(local).forEach((gid) => {
          const a = Number(local[gid]) || 0;
          const b = Number(merged[gid]) || 0;
          if (a >= b) merged[gid] = local[gid];
        });
        saveSeenGids(merged);
      }
      if (payload.lrr_meta && typeof payload.lrr_meta === 'object' && typeof saveLrrMeta === 'function') {
        saveLrrMeta(payload.lrr_meta);
      }
      // 追更：按 id / signature 合并，避免「空本机推上去」或「双端各写几条」丢收藏
      if (Array.isArray(payload.tracking_searches) && payload.tracking_searches.length) {
        const localRows = (await idbGetAll(STORE_TRACKING)) || [];
        const byId = new Map();
        const bySig = new Map();
        localRows.forEach((r) => {
          if (!r) return;
          if (r.id) byId.set(String(r.id), r);
          if (r.query_signature) bySig.set(String(r.query_signature), r);
        });
        const consumedLocal = new Set();
        for (const remote of payload.tracking_searches) {
          if (!remote || typeof remote !== 'object') continue;
          let local = remote.id ? byId.get(String(remote.id)) : null;
          if (!local && remote.query_signature) {
            local = bySig.get(String(remote.query_signature)) || null;
          }
          if (local && local.id) consumedLocal.add(String(local.id));
          const merged = mergeTrackingRecord(local, remote);
          if (!merged.id) merged.id = uid('trk');
          await idbPut(STORE_TRACKING, merged);
        }
      }
      for (const w of payload.works || []) await idbPut(STORE_WORKS, w);
      for (const e of payload.editions || []) await idbPut(STORE_EDITIONS, e);
      for (const a of payload.local_archives || []) await idbPut(STORE_ARCHIVES, a);
      for (const l of payload.links || []) await idbPut(STORE_LINKS, l);
      for (const p of payload.progress || []) await idbPut(STORE_PROGRESS, p);
    } finally {
      idbSyncSuppress = false;
      if (!options.fromSync && typeof markCreamuLocalDirty === 'function') {
        markCreamuLocalDirty();
      }
    }
  }
