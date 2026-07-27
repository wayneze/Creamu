// @@creamu-part:15-meta-fetch
    function getMetaCodeCandidates(value) {
        const raw = String(value || '').trim().toUpperCase();
        const candidates = new Set();
        const push = candidate => {
            const normalized = normalizeCode(candidate);
            if (normalized) candidates.add(normalized);
        };
        push(raw);
        push(raw.replace(
            /^(?:CARIB(?:BEAN)?(?:COM)?(?:PR)?|10MU(?:SUME)?|PACO(?:PACO)?(?:MAMA)?|MURA(?:MURA)?)[\s_-]*/i,
            ''
        ));
        const fc2 = raw.match(/^FC2(?:[\s_-]*PPV)?[\s_-]*(\d{3,})/i);
        if (fc2) push(`FC2-${fc2[1]}`);
        return candidates;
    }

    function pickMetaSearchHit(results, avid) {
        const list = (Array.isArray(results) ? results : []).map(normalizeMetaRecord);
        const targets = getMetaCodeCandidates(avid);
        const matches = value => {
            const normalized = normalizeCode(value);
            return !!normalized && targets.has(normalized);
        };
        return list.find(x => matches(x?.number))
            || list.find(x => matches(x?.id))
            || list.find(x => matches(x?.code))
            || null;
    }

    const META_REQUEST_TIMEOUT = 3000;
    const META_FETCH_BUDGET_MS = 8000;
    const META_MISS_TTL_MS = 60000;
    const metaMissCache = new Map();

    function getMetaRequestTimeout(deadline) {
        const remaining = Math.max(0, Number(deadline) - Date.now());
        return Math.min(META_REQUEST_TIMEOUT, remaining);
    }

    function getMetaSearchProviderCandidates(avid) {
        const code = String(avid || '').trim().toUpperCase();
        const providers = [];
        const push = (provider) => {
            if (provider && !providers.includes(provider)) providers.push(provider);
        };

        if (/^FC2(?:-|_)?PPV/.test(code) || /^FC2(?:-|_)?\d+/.test(code) || /^FC2PPV/.test(code)) {
            push('FC2');
            push('fc2hub');
            push('FC2PPVDB');
            push('JAV321');
            return providers;
        }
        if (/^HEYZO/.test(code)) {
            push('HEYZO');
            push('JAV321');
            return providers;
        }
        if (/^(CARIB|CARIBBEAN)/.test(code)) {
            push('Caribbeancom');
            push('CaribbeancomPR');
            return providers;
        }
        if (/^(10MU|10MUSUME)/.test(code)) {
            push('10musume');
            return providers;
        }
        if (/^(PACO|PACOPACOMAMA)/.test(code)) {
            push('PACOPACOMAMA');
            return providers;
        }
        if (/^(MURA|MURAMURA)/.test(code)) {
            push('MURAMURA');
            return providers;
        }
        if (/^C0930/.test(code)) push('C0930');
        if (/^H0930/.test(code)) push('H0930');
        if (/^H4610/.test(code)) push('H4610');
        if (/^KIN8/.test(code)) push('KIN8');
        if (/^SOD/.test(code)) push('SOD');
        if (isLikelyMgsAvid(code)) push('MGS');

        push('JavBus');
        push('JAV321');
        push('FANZA');
        push('DUGA');
        return providers;
    }

    function mergeMetaRecords(primary, secondary) {
        const base = normalizeMetaRecord(primary);
        const extra = normalizeMetaRecord(secondary);
        if (!base && !extra) return null;
        if (!base) return extra;
        if (!extra) return base;
        return {
            ...base,
            ...extra,
            genres: extra.genres?.length ? extra.genres : (base.genres || []),
            actors: extra.actors?.length ? extra.actors : (base.actors || []),
            releaseDate: extra.releaseDate || base.releaseDate || ''
        };
    }

    async function fetchMetaDetail(base, rawMeta, deadline) {
        const meta = normalizeMetaRecord(rawMeta);
        if (!meta?.provider || !meta?.id) return meta;
        const needDetail = !(meta.genres?.length);
        if (!needDetail) return meta;
        const timeout = getMetaRequestTimeout(deadline);
        if (timeout <= 0) return meta;
        const infoPayload = await requestJSON(
            `${base}/v1/movies/${encodeURIComponent(meta.provider)}/${encodeURIComponent(meta.id)}`,
            timeout
        );
        const info = normalizeMetaRecord(extractMetaTubeData(infoPayload));
        return mergeMetaRecords(meta, info) || meta;
    }

    async function fetchMetaWithProvider(base, avid, provider, deadline) {
        if (!provider) return null;
        const timeout = getMetaRequestTimeout(deadline);
        if (timeout <= 0) return null;
        const searchPayload = await requestJSON(
            `${base}/v1/movies/search?q=${encodeURIComponent(avid)}&provider=${encodeURIComponent(provider)}`,
            timeout
        );
        const searchResults = extractMetaTubeData(searchPayload);
        const hit = pickMetaSearchHit(searchResults, avid);
        if (!hit) return null;
        return fetchMetaDetail(base, hit, deadline);
    }

    function normalizeMetaBase(value) {
        return String(value || '').trim().replace(/\/+$/, '');
    }

    function getMetaFetchKey(avid, base = config.metatube_url) {
        const normalizedBase = normalizeMetaBase(base);
        const normalizedAvid = normalizeCode(avid);
        return normalizedBase && normalizedAvid ? `${normalizedBase}\n${normalizedAvid}` : '';
    }

    function hasRecentMetaMiss(key, now = Date.now()) {
        if (!key) return false;
        const expiresAt = Number(metaMissCache.get(key) || 0);
        if (expiresAt > now) return true;
        metaMissCache.delete(key);
        return false;
    }

    function rememberMetaMiss(key, now = Date.now()) {
        if (key) metaMissCache.set(key, now + META_MISS_TTL_MS);
    }

    function clearMetaMiss(key) {
        if (key) metaMissCache.delete(key);
    }

    function clearMetaMissCache() {
        metaMissCache.clear();
    }

    async function fetchMeta(avid, seedMeta = null, baseUrl = config.metatube_url) {
        const base = normalizeMetaBase(baseUrl);
        if (!base) return null;
        const deadline = Date.now() + META_FETCH_BUDGET_MS;
        const seed = normalizeMetaRecord(seedMeta);
        let fallback = null;

        if (seed?.provider && seed?.id) {
            const seeded = await fetchMetaDetail(base, seed, deadline);
            if (seeded?.genres?.length) return seeded;
            fallback = mergeMetaRecords(fallback, seeded) || seeded;
        } else if (seed) {
            fallback = mergeMetaRecords(fallback, seed) || seed;
        }

        const providers = getMetaSearchProviderCandidates(avid);
        for (const provider of providers) {
            if (getMetaRequestTimeout(deadline) <= 0) break;
            const hit = await fetchMetaWithProvider(base, avid, provider, deadline);
            if (!hit) continue;
            if (hit?.genres?.length) return mergeMetaRecords(fallback, hit) || hit;
            fallback = mergeMetaRecords(fallback, hit) || hit;
        }

        const timeout = getMetaRequestTimeout(deadline);
        if (timeout <= 0) return fallback;
        const searchPayload = await requestJSON(`${base}/v1/movies/search?q=${encodeURIComponent(avid)}`, timeout);
        const searchResults = extractMetaTubeData(searchPayload);
        const hit = pickMetaSearchHit(searchResults, avid);
        if (!hit) return fallback;
        const detailed = await fetchMetaDetail(base, hit, deadline);
        return mergeMetaRecords(fallback, detailed) || detailed || fallback;
    }
