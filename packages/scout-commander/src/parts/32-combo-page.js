// @@creamu-part:32-combo-page
const SCOUT_SEARCH_ROLE_LABELS = {
  required: '必须',
  preference: '偏好',
  excluded: '排除',
};

function createScoutSearchUiSession(previous) {
  return {
    runId: (previous && previous.runId ? previous.runId : 0) + 1,
    fingerprint: '',
    plan: null,
    reports: new Map(),
    running: false,
    phase: 'idle',
    completed: 0,
    total: 0,
    verificationCompleted: 0,
    verificationTotal: 0,
    errors: [],
    terms: [],
  };
}

let __scoutSearchUiSession = createScoutSearchUiSession(null);

function resetScoutSearchUiSession() {
  __scoutSearchUiSession = createScoutSearchUiSession(__scoutSearchUiSession);
  return __scoutSearchUiSession;
}

function getScoutSearchTarget(container) {
  const role = normalizeScoutSearchRole(
    container && container.getAttribute('data-search-target-role')
  );
  const priority = normalizeScoutSearchPriority(
    container && container.getAttribute('data-search-target-priority')
  );
  return { role, priority };
}

function setScoutSearchTarget(container, role, priority) {
  if (!container) return;
  container.setAttribute('data-search-target-role', normalizeScoutSearchRole(role));
  container.setAttribute(
    'data-search-target-priority',
    String(normalizeScoutSearchPriority(priority))
  );
}

function renderScoutSearchConditionOptions(selectedRole) {
  return SCOUT_SEARCH_ROLE_ORDER.map((role) => (
    `<option value="${role}"${role === selectedRole ? ' selected' : ''}>` +
      `${SCOUT_SEARCH_ROLE_LABELS[role]}</option>`
  )).join('');
}

function renderScoutSearchConditions(recipe) {
  const normalized = normalizeScoutSearchRecipe(recipe);
  return SCOUT_SEARCH_ROLE_ORDER.map((role) => {
    const conditions = normalized.conditions.filter((condition) => condition.role === role);
    const rows = conditions.length
      ? conditions.map((condition) => `
          <div class="scout-search-condition is-${role}" data-condition-id="${escapeHtml(condition.id)}">
            <span class="scout-search-condition-text" title="${escapeHtml(condition.text)}">${escapeHtml(condition.text)}</span>
            <select class="jlc-wb-select scout-search-condition-role" aria-label="条件类型">
              ${renderScoutSearchConditionOptions(role)}
            </select>
            <select class="jlc-wb-select scout-search-condition-priority" aria-label="偏好层级"${role === 'preference' ? '' : ' hidden'}>
              ${[1, 2, 3].map((priority) => (
                `<option value="${priority}"${condition.priority === priority ? ' selected' : ''}>` +
                  `${priority} 级</option>`
              )).join('')}
            </select>
            <button type="button" class="jlc-wb-icon-btn scout-search-condition-remove" title="移除" aria-label="移除 ${escapeHtml(condition.text)}">×</button>
          </div>`).join('')
      : '<div class="scout-search-condition-empty">暂无</div>';
    return `
      <section class="scout-search-condition-group is-${role}" data-condition-role="${role}">
        <div class="scout-search-section-head">
          <strong>${SCOUT_SEARCH_ROLE_LABELS[role]}</strong>
          <span>${conditions.length}</span>
        </div>
        <div class="scout-search-condition-list">${rows}</div>
      </section>`;
  }).join('');
}

function getScoutSearchPoolTerms(recipe, type, query, availableTerms) {
  const selected = new Set(
    normalizeScoutSearchRecipe(recipe).conditions.map((condition) =>
      lexiconIdentityKey(condition.text)
    )
  );
  const queryKey = lexiconIdentityKey(query);
  return (Array.isArray(availableTerms) ? availableTerms : getLexiconTerms())
    .filter((term) => term && term.status !== 'retired')
    .filter((term) => type === '全部' || term.type === type)
    .filter((term) => !selected.has(lexiconIdentityKey(term.text)))
    .filter((term) => {
      if (!queryKey) return true;
      return [term.text, term.zh, term.type].some((value) =>
        lexiconIdentityKey(value).includes(queryKey)
      );
    })
    .sort((left, right) => {
      if (!!right.loved !== !!left.loved) return right.loved ? 1 : -1;
      return getEffectiveHeat(right) - getEffectiveHeat(left);
    })
    .slice(0, 80);
}

function renderScoutSearchPoolHtml(recipe, type, query, availableTerms) {
  const pool = getScoutSearchPoolTerms(recipe, type, query, availableTerms);
  if (!pool.length) return '<div class="scout-search-pool-empty">没有匹配词条</div>';
  return pool.map((term) => {
    const suffix = term.zh ? ` · ${term.zh}` : '';
    return `
      <button type="button" class="jlc-wb-chip scout-search-pool-term" data-search-term="${escapeHtml(term.text)}" data-search-term-id="${escapeHtml(term.id || '')}" title="${escapeHtml(term.type || '未分类')}">
        ${term.loved ? '★ ' : ''}${escapeHtml(term.text)}${escapeHtml(suffix)}
      </button>`;
  }).join('');
}

function renderScoutRelatedSuggestions(recipe) {
  const suggestions = getScoutRelatedSearchSuggestions(recipe, 12);
  if (!suggestions.length) return '';
  return `
    <section class="scout-search-related" aria-label="关联词">
      <div class="scout-search-section-head"><strong>关联词</strong><span>${suggestions.length}</span></div>
      <div class="scout-search-related-list">
        ${suggestions.map((suggestion) => `
          <span class="scout-search-related-item">
            <button type="button" class="jlc-wb-chip scout-search-related-add" data-search-term="${escapeHtml(suggestion.text)}" title="来自 ${suggestion.count} 次标签共现">${escapeHtml(suggestion.text)}</button>
            <button type="button" class="scout-search-related-dismiss" data-related-dismiss="${escapeHtml(suggestion.text)}" title="不再推荐" aria-label="不再推荐 ${escapeHtml(suggestion.text)}">×</button>
          </span>`).join('')}
      </div>
    </section>`;
}

function renderScoutCurrentTagChoices(meta) {
  const tags = meta && Array.isArray(meta.tags) ? meta.tags : [];
  if (!tags.length) return '';
  return `
    <section class="scout-search-current-tags" aria-label="当前作品标签">
      <div class="scout-search-section-head"><strong>当前作品标签</strong><span>${tags.length}</span></div>
      <div class="scout-search-current-tag-list">
        ${tags.map((tag) => `
          <button type="button" class="jlc-wb-chip scout-search-current-tag" data-search-term="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`).join('')}
      </div>
    </section>`;
}

function renderScoutSearchPlan(recipe, preparedPlan) {
  const plan = preparedPlan || buildScoutSearchPlan(recipe);
  const rows = normalizeScoutSearchRecipe(recipe).sites.map((site) => {
    const probes = plan.probes.filter((probe) => probe.site === site);
    return `
      <div class="scout-search-plan-site">
        <span class="jlc-site-pill">${escapeHtml(scoutSiteShortLabel(site))}</span>
        <div class="scout-search-plan-probes">
          ${probes.map((probe) => `
            <a href="${escapeHtml(probe.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(probe.label)}">${escapeHtml(probe.query)}</a>`).join('') || '<span>无有效查询</span>'}
        </div>
      </div>`;
  }).join('');
  return `
    <details class="scout-search-plan">
      <summary>查询计划 · ${plan.probes.length} 组</summary>
      <div class="scout-search-plan-list">${rows}</div>
    </details>`;
}

function formatScoutAssessmentCount(value, kind) {
  if (value == null || !Number.isFinite(Number(value))) return '未知';
  const count = Math.max(0, Math.round(Number(value))).toLocaleString('zh-CN');
  if (kind === 'estimate') return `约 ${count}`;
  if (kind === 'minimum') return `至少 ${count}`;
  return count;
}

function formatScoutAssessmentDelta(value, baseline, approximate) {
  if (!Number.isFinite(Number(value)) || !Number.isFinite(Number(baseline))) return '';
  const delta = Math.round(Number(value) - Number(baseline));
  if (!delta) return '与完整组合相同';
  const prefix = approximate ? '约 ' : '';
  return `${prefix}${delta > 0 ? '+' : '-'}${Math.abs(delta).toLocaleString('zh-CN')}`;
}

function renderScoutSearchAssessmentStatus() {
  const status = document.getElementById('scout-search-result-status');
  const summary = document.getElementById('scout-search-result-summary');
  if (!status || !summary) return;
  const session = __scoutSearchUiSession;
  if (session.running) {
    status.textContent = session.phase === 'verify'
      ? `核验样本 ${session.verificationCompleted}/${session.verificationTotal}`
      : `读取结果 ${session.completed}/${session.total}`;
  } else if (session.plan) {
    status.textContent = session.errors.length
      ? `完成 · ${session.errors.length} 组失败`
      : '完成';
  } else {
    status.textContent = '未运行';
  }
  const siteCount = session.plan ? session.plan.recipe.sites.length : 0;
  summary.textContent = session.plan
    ? `${siteCount} 站 · ${session.reports.size}/${session.total} 组查询`
    : '按站比较结果量与精确样本';

  const errors = document.getElementById('scout-search-errors');
  if (errors) {
    errors.hidden = !session.errors.length;
    errors.innerHTML = session.errors.length
      ? `<summary>请求失败 ${session.errors.length}</summary>` +
        session.errors.map((error) => (
          `<div><b>${escapeHtml(scoutSiteShortLabel(error.site))}</b> ${escapeHtml(error.query)} · ${escapeHtml(error.message)}</div>`
        )).join('')
      : '';
  }
}

function renderScoutAssessmentConditionStats(report) {
  const verified = Math.max(0, Number(report && report.sample_verified) || 0);
  const stats = report && Array.isArray(report.condition_stats)
    ? report.condition_stats
    : [];
  if (!stats.length || !verified) {
    return '<div class="scout-search-assessment-pending">等待详情样本</div>';
  }
  return `<div class="scout-search-condition-stats">${stats.map((stat) => {
    const hits = Math.max(0, Number(stat.hits) || 0);
    const warning = stat.role === 'excluded' && hits > 0;
    const complete = stat.role !== 'excluded' && hits === verified;
    return `<span class="scout-search-condition-stat is-${escapeHtml(stat.role)}${warning ? ' is-warning' : ''}${complete ? ' is-complete' : ''}" title="${escapeHtml(SCOUT_SEARCH_ROLE_LABELS[stat.role] || stat.role)}">
      <span>${escapeHtml(stat.text)}</span><b>${hits}/${verified}</b>
    </span>`;
  }).join('')}</div>`;
}

function renderScoutAssessmentVariant(probe, report, strictReport) {
  const pending = !report;
  const total = pending ? '读取中' : (
    report.ok ? formatScoutAssessmentCount(report.total, report.total_kind) : '失败'
  );
  const approximate = !!(
    report && strictReport &&
    (report.total_kind !== 'exact' || strictReport.total_kind !== 'exact')
  );
  const delta = report && report.ok && strictReport && strictReport.ok
    ? formatScoutAssessmentDelta(report.total, strictReport.total, approximate)
    : '';
  const action = probe.level === 'reduced' && probe.removed_condition_ids?.length
    ? `<button type="button" class="jlc-wb-btn ghost scout-search-variant-adopt" data-search-remove-condition="${escapeHtml(probe.removed_condition_ids[0])}">采用</button>`
    : probe.level === 'alias' && probe.replacement_condition_id
      ? `<button type="button" class="jlc-wb-btn ghost scout-search-variant-adopt" data-search-replace-condition="${escapeHtml(probe.replacement_condition_id)}" data-search-replacement="${escapeHtml(probe.replacement_text || '')}">替换</button>`
      : '';
  return `
    <div class="scout-search-assessment-variant is-${escapeHtml(probe.level)}">
      <div class="scout-search-assessment-variant-copy">
        <strong>${escapeHtml(probe.label)}</strong>
        <span title="${escapeHtml(probe.query)}">${escapeHtml(probe.query)}</span>
      </div>
      <div class="scout-search-assessment-variant-count">
        <b>${escapeHtml(total)}</b>
        <span>${escapeHtml(delta)}</span>
      </div>
      <div class="scout-search-assessment-variant-actions">
        ${action}
        <a class="jlc-wb-open-btn" href="${escapeHtml(probe.url)}" target="_blank" rel="noopener noreferrer" title="打开此搜索" aria-label="打开 ${escapeHtml(probe.label)}">↗</a>
      </div>
    </div>`;
}

function renderScoutSearchAssessmentSite(site) {
  const session = __scoutSearchUiSession;
  const probes = session.plan.probes.filter((probe) => probe.site === site);
  const strictProbe = probes.find((probe) => probe.level === 'strict') || probes[0];
  const strictReport = strictProbe ? session.reports.get(strictProbe.id) : null;
  const verified = Math.max(0, Number(strictReport && strictReport.sample_verified) || 0);
  const exact = Math.max(0, Number(strictReport && strictReport.sample_exact) || 0);
  const failed = Math.max(0, Number(strictReport && strictReport.sample_failed) || 0);
  const rate = verified ? Math.round((exact / verified) * 1000) / 10 : null;
  const totalKind = strictReport && strictReport.total_kind;
  const totalNote = totalKind === 'estimate'
    ? '按分页估算'
    : totalKind === 'minimum'
      ? '当前可见下限'
      : '站点报告';
  const siteState = !strictReport
    ? '读取中'
    : !strictReport.ok
      ? strictReport.error || '读取失败'
      : session.running && verified + failed < strictReport.sample_target
        ? `核验 ${verified + failed}/${strictReport.sample_target}`
        : '已完成';
  const variants = probes
    .filter((probe) => probe !== strictProbe)
    .map((probe) => renderScoutAssessmentVariant(
      probe,
      session.reports.get(probe.id),
      strictReport
    ))
    .join('');
  return `
    <article class="scout-search-assessment-site" data-assessment-site="${escapeHtml(site)}">
      <header class="scout-search-assessment-site-head">
        <div>
          <span class="jlc-site-pill">${escapeHtml(scoutSiteShortLabel(site))}</span>
          <span class="scout-search-assessment-site-state">${escapeHtml(siteState)}</span>
        </div>
        ${strictProbe ? `
          <div class="scout-search-assessment-site-actions">
            <a class="jlc-wb-open-btn" href="${escapeHtml(strictProbe.url)}" target="_blank" rel="noopener noreferrer" title="打开完整组合" aria-label="在 ${escapeHtml(scoutSiteShortLabel(site))} 打开完整组合">↗</a>
            <a class="jlc-wb-open-btn scout-search-exact-open" href="${escapeHtml(buildScoutExactFilterUrl(strictProbe.url, session.plan.recipe))}" target="_blank" rel="noopener noreferrer" title="只看同时命中的作品" aria-label="在 ${escapeHtml(scoutSiteShortLabel(site))} 只看同时命中的作品">✓</a>
          </div>` : ''}
      </header>
      <div class="scout-search-assessment-metrics">
        <div><span>搜索结果</span><b>${strictReport && strictReport.ok ? escapeHtml(formatScoutAssessmentCount(strictReport.total, totalKind)) : '--'}</b><small>${escapeHtml(totalNote)}</small></div>
        <div><span>精确样本</span><b>${verified ? `${exact}/${verified}` : '--'}</b><small>顶部 ${strictReport ? strictReport.sample_target : 0} 条</small></div>
        <div><span>组合命中率</span><b>${rate == null ? '--' : `${rate}%`}</b><small>${failed ? `${failed} 条核验失败` : '全部搜索词同时命中'}</small></div>
      </div>
      <section class="scout-search-assessment-terms" aria-label="逐词命中">
        <div class="scout-search-section-head"><strong>逐词命中</strong><span>${verified ? `${verified} 个已核验样本` : '尚无样本'}</span></div>
        ${renderScoutAssessmentConditionStats(strictReport)}
      </section>
      ${variants ? `<section class="scout-search-assessment-variants" aria-label="减词与替换结果">
        <div class="scout-search-section-head"><strong>减词与替换</strong><span>对比完整组合结果量</span></div>
        ${variants}
      </section>` : ''}
    </article>`;
}

function renderScoutSearchAssessments() {
  const host = document.getElementById('scout-search-assessments');
  const empty = document.getElementById('scout-search-results-empty');
  if (!host || !empty) return;
  const session = __scoutSearchUiSession;
  if (!session.plan) {
    host.innerHTML = '';
    empty.hidden = false;
    empty.textContent = '评估组合后在此比较三个站点';
  } else {
    host.innerHTML = session.plan.recipe.sites
      .map((site) => renderScoutSearchAssessmentSite(site))
      .join('');
    empty.hidden = !!session.plan.recipe.sites.length;
  }
  renderScoutSearchAssessmentStatus();
}

function updateScoutSearchReport(report) {
  if (!report || !report.id) return;
  __scoutSearchUiSession.reports.set(report.id, report);
}

function renderScoutSearchRelatedSection() {
  const host = document.getElementById('scout-search-related-host');
  if (!host) return;
  const recipe = __scoutSearchUiSession.plan
    ? __scoutSearchUiSession.plan.recipe
    : getScoutSearchDraft();
  host.innerHTML = renderScoutRelatedSuggestions(recipe);
}

function renderScoutSearchRuntimeState() {
  const session = __scoutSearchUiSession;
  const runButton = document.getElementById('scout-combo-search-btn');
  if (runButton) {
    runButton.disabled = session.running;
    runButton.textContent = session.running ? '评估中' : '评估组合';
  }
  renderScoutSearchAssessments();
}

function startScoutRecipeSearch() {
  const recipe = getScoutSearchDraft();
  const terms = getLexiconTerms();
  const searchable = recipe.conditions.filter((condition) => condition.role !== 'excluded');
  if (!searchable.length) {
    showToast('请先添加必须或偏好条件', true);
    return false;
  }
  const plan = buildScoutSearchPlan(recipe, { terms });
  if (!plan.probes.length) {
    showToast('当前条件无法生成查询', true);
    return false;
  }

  incrementScoutRecipeTermUsage(recipe, terms);

  const session = resetScoutSearchUiSession();
  session.fingerprint = plan.fingerprint;
  session.plan = plan;
  session.terms = terms;
  session.running = true;
  session.phase = 'search';
  session.total = plan.probes.length;
  const runId = session.runId;
  markScoutWorkbenchPageRendered('combo');
  renderScoutSearchRuntimeState();

  runScoutSearchPlan(plan, {
    concurrency: 3,
    detailConcurrency: 3,
    sampleSize: 8,
    terms,
    shouldContinue() {
      return __scoutSearchUiSession.runId === runId;
    },
    onReport(report) {
      if (__scoutSearchUiSession.runId !== runId) return;
      updateScoutSearchReport(report);
      renderScoutSearchAssessments();
    },
    onProgress(progress) {
      if (__scoutSearchUiSession.runId !== runId) return;
      __scoutSearchUiSession.phase = progress.phase;
      if (progress.phase === 'verify') {
        __scoutSearchUiSession.verificationCompleted = progress.completed;
        __scoutSearchUiSession.verificationTotal = progress.total;
      } else {
        __scoutSearchUiSession.completed = progress.completed;
      }
      renderScoutSearchAssessmentStatus();
    },
  }).then((outcome) => {
    if (__scoutSearchUiSession.runId !== runId) return;
    outcome.reports.forEach(updateScoutSearchReport);
    __scoutSearchUiSession.errors = outcome.errors || [];
    __scoutSearchUiSession.completed = outcome.completed;
    __scoutSearchUiSession.total = outcome.total;
    __scoutSearchUiSession.verificationCompleted = outcome.verification_completed;
    __scoutSearchUiSession.verificationTotal = outcome.verification_total;
    __scoutSearchUiSession.running = false;
    __scoutSearchUiSession.phase = 'complete';
    renderScoutSearchRuntimeState();
    renderScoutSearchRelatedSection();
  }).catch((error) => {
    if (__scoutSearchUiSession.runId !== runId) return;
    __scoutSearchUiSession.running = false;
    __scoutSearchUiSession.phase = 'complete';
    __scoutSearchUiSession.errors = [{ site: '', query: '', message: error.message || String(error) }];
    renderScoutSearchRuntimeState();
  });
  return true;
}

function saveScoutRecipeAndRender(recipe, options) {
  const saved = saveScoutSearchDraft(recipe);
  if (!options || options.resetResults !== false) resetScoutSearchUiSession();
  renderComboPage();
  return saved;
}

function addScoutSearchTerms(recipe, values, role, priority) {
  let next = normalizeScoutSearchRecipe(recipe);
  (Array.isArray(values) ? values : [values]).forEach((value) => {
    const source = typeof value === 'string' ? { text: value } : value;
    next = putScoutRecipeCondition(next, source, role, priority);
  });
  return next;
}

function renderComboPage() {
  const container = document.querySelector('[data-jlc-wb-page="combo"]');
  if (!container) return;
  if (!container.hasAttribute('data-search-target-role')) {
    setScoutSearchTarget(container, 'required', 1);
  }
  const target = getScoutSearchTarget(container);
  const recipe = getScoutSearchDraft();
  const terms = getLexiconTerms();
  const types = ['全部', ...getLexiconTypes()];
  const selectedType = container.getAttribute('data-search-pool-type') || '全部';
  const currentMeta = scrapeVideoMeta();
  const preparedPlan = buildScoutSearchPlan(recipe, { terms });
  const planHtml = renderScoutSearchPlan(recipe, preparedPlan);
  const siteSwitches = SCOUT_SITE_IDS.map((site) => `
    <label class="scout-combo-site">
      <input type="checkbox" value="${site}"${recipe.sites.includes(site) ? ' checked' : ''}>
      <span>${escapeHtml(scoutSiteShortLabel(site))}</span>
    </label>`).join('');

  container.innerHTML = `
    <div class="jlc-wb-list-scroll scout-combo-scroll">
      <header class="scout-search-builder-head">
        <div>
          <strong>搜索条件</strong>
          <span>${escapeHtml(describeScoutSearchRecipe(recipe))}</span>
        </div>
        <div class="scout-search-role-switch" role="group" aria-label="添加目标">
          ${SCOUT_SEARCH_ROLE_ORDER.map((role) => `
            <button type="button" data-search-target="${role}" class="${target.role === role ? 'is-active' : ''}">${SCOUT_SEARCH_ROLE_LABELS[role]}</button>`).join('')}
        </div>
      </header>

      <div class="scout-search-add-row">
        <input type="text" class="jlc-wb-search" id="scout-combo-free-input" placeholder="输入词或短语">
        <div class="scout-search-priority-switch"${target.role === 'preference' ? '' : ' hidden'} role="group" aria-label="偏好层级">
          ${[1, 2, 3].map((priority) => `
            <button type="button" data-search-priority="${priority}" class="${target.priority === priority ? 'is-active' : ''}">${priority}</button>`).join('')}
        </div>
        <button type="button" class="jlc-wb-btn primary" id="scout-combo-add-btn">添加</button>
      </div>

      <div class="scout-search-builder-grid">
        <div class="scout-search-condition-column">
          ${renderScoutSearchConditions(recipe)}
        </div>
        <div class="scout-search-pool-column">
          <div class="scout-search-pool-toolbar">
            <input type="search" class="jlc-wb-search" id="scout-search-term-filter" placeholder="筛选词库">
            <select class="jlc-wb-select" id="scout-search-type-filter" aria-label="词库分类">
              ${types.map((type) => `<option value="${escapeHtml(type)}"${type === selectedType ? ' selected' : ''}>${escapeHtml(type)}</option>`).join('')}
            </select>
          </div>
          <div class="scout-search-pool" id="scout-combo-pool">${renderScoutSearchPoolHtml(recipe, selectedType, '', terms)}</div>
          <div id="scout-search-related-host">${renderScoutRelatedSuggestions(recipe)}</div>
          ${renderScoutCurrentTagChoices(currentMeta)}
        </div>
      </div>

      <section class="scout-search-site-plan">
        <div class="scout-search-site-row" role="group" aria-label="搜索站点">${siteSwitches}</div>
        ${planHtml}
      </section>

      <section class="scout-search-results-section" aria-label="组合评估">
        <header class="scout-search-results-head">
          <div>
            <strong id="scout-search-result-status">未运行</strong>
            <span id="scout-search-result-summary">按站比较结果量与精确样本</span>
          </div>
        </header>
        <details id="scout-search-errors" class="scout-search-errors" hidden></details>
        <div id="scout-search-assessments" class="scout-search-assessments"></div>
        <div id="scout-search-results-empty" class="jlc-wb-empty">评估组合后在此比较三个站点</div>
      </section>
    </div>

    <div class="jlc-wb-footer scout-combo-dock">
      <div class="scout-search-savebar" id="scout-search-savebar" hidden>
        <input type="text" class="jlc-wb-search" id="scout-search-label" placeholder="收藏名称" value="${escapeHtml(recipe.label || '')}">
        <button type="button" class="jlc-wb-btn primary" id="scout-search-save-confirm">保存</button>
        <button type="button" class="jlc-wb-icon-btn" id="scout-search-save-cancel" title="取消" aria-label="取消收藏">×</button>
      </div>
      <div class="scout-combo-dock-actions">
        <button type="button" class="jlc-wb-btn primary" id="scout-combo-search-btn">评估组合</button>
        <button type="button" class="jlc-wb-btn ghost" id="scout-save-current-search-btn">收藏配方</button>
        <button type="button" class="jlc-wb-btn ghost" id="scout-combo-clear-btn">清空</button>
      </div>
    </div>
  `;

  container.querySelectorAll('[data-search-target]').forEach((button) => {
    button.addEventListener('click', () => {
      setScoutSearchTarget(container, button.getAttribute('data-search-target'), target.priority);
      renderComboPage();
    });
  });
  container.querySelectorAll('[data-search-priority]').forEach((button) => {
    button.addEventListener('click', () => {
      setScoutSearchTarget(container, target.role, button.getAttribute('data-search-priority'));
      renderComboPage();
    });
  });

  const addManualTerms = () => {
    const input = container.querySelector('#scout-combo-free-input');
    const raw = compactText(input && input.value);
    if (!raw) return;
    const values = /[,，;；]/.test(raw) ? raw.split(/[,，;；]+/) : [raw];
    saveScoutRecipeAndRender(
      addScoutSearchTerms(recipe, values, target.role, target.priority)
    );
  };
  container.querySelector('#scout-combo-add-btn')?.addEventListener('click', addManualTerms);
  container.querySelector('#scout-combo-free-input')?.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addManualTerms();
  });

  container.querySelectorAll('.scout-search-condition').forEach((row) => {
    const id = row.getAttribute('data-condition-id');
    row.querySelector('.scout-search-condition-role')?.addEventListener('change', (event) => {
      const role = event.currentTarget.value;
      saveScoutRecipeAndRender(updateScoutRecipeCondition(recipe, id, {
        role,
        priority: role === 'preference' ? 1 : 0,
      }));
    });
    row.querySelector('.scout-search-condition-priority')?.addEventListener('change', (event) => {
      saveScoutRecipeAndRender(updateScoutRecipeCondition(recipe, id, {
        priority: event.currentTarget.value,
      }));
    });
    row.querySelector('.scout-search-condition-remove')?.addEventListener('click', () => {
      saveScoutRecipeAndRender(removeScoutRecipeCondition(recipe, id));
    });
  });

  container.querySelectorAll('[data-search-term]').forEach((button) => {
    button.addEventListener('click', () => {
      saveScoutRecipeAndRender(addScoutSearchTerms(recipe, {
        text: button.getAttribute('data-search-term'),
        term_id: button.getAttribute('data-search-term-id') || '',
      }, target.role, target.priority));
    });
  });
  container.querySelectorAll('[data-related-dismiss]').forEach((button) => {
    button.addEventListener('click', () => {
      rejectScoutSearchRelation(recipe, button.getAttribute('data-related-dismiss'));
      renderScoutSearchRelatedSection();
    });
  });

  const poolFilter = container.querySelector('#scout-search-term-filter');
  const typeFilter = container.querySelector('#scout-search-type-filter');
  const updatePool = () => {
    const type = typeFilter ? typeFilter.value : '全部';
    container.setAttribute('data-search-pool-type', type);
    const pool = container.querySelector('#scout-combo-pool');
    if (!pool) return;
    pool.innerHTML = renderScoutSearchPoolHtml(recipe, type, poolFilter && poolFilter.value, terms);
    pool.querySelectorAll('[data-search-term]').forEach((button) => {
      button.addEventListener('click', () => {
        saveScoutRecipeAndRender(addScoutSearchTerms(recipe, {
          text: button.getAttribute('data-search-term'),
          term_id: button.getAttribute('data-search-term-id') || '',
        }, target.role, target.priority));
      });
    });
  };
  poolFilter?.addEventListener('input', updatePool);
  typeFilter?.addEventListener('change', updatePool);

  container.querySelectorAll('.scout-search-site-row input[type="checkbox"]').forEach((input) => {
    input.addEventListener('change', () => {
      const selected = Array.from(
        container.querySelectorAll('.scout-search-site-row input:checked')
      ).map((element) => element.value);
      if (!selected.length) {
        input.checked = true;
        showToast('至少保留一个搜索站点', true);
        return;
      }
      saveScoutRecipeAndRender(Object.assign({}, recipe, { sites: selected }));
    });
  });

  container.querySelector('#scout-combo-search-btn')?.addEventListener('click', () => {
    startScoutRecipeSearch();
  });
  container.querySelector('#scout-combo-clear-btn')?.addEventListener('click', () => {
    saveScoutRecipeAndRender(Object.assign({}, recipe, { conditions: [], label: '' }));
  });

  const saveBar = container.querySelector('#scout-search-savebar');
  container.querySelector('#scout-save-current-search-btn')?.addEventListener('click', () => {
    saveBar.hidden = false;
    const labelInput = container.querySelector('#scout-search-label');
    if (labelInput && !labelInput.value) {
      labelInput.value = recipe.conditions
        .filter((condition) => condition.role !== 'excluded')
        .slice(0, 3)
        .map((condition) => condition.text)
        .join(' + ');
    }
    labelInput?.focus();
  });
  container.querySelector('#scout-search-save-cancel')?.addEventListener('click', () => {
    saveBar.hidden = true;
  });
  container.querySelector('#scout-search-save-confirm')?.addEventListener('click', () => {
    if (!recipe.conditions.some((condition) => condition.role !== 'excluded')) {
      showToast('请先添加搜索条件', true);
      return;
    }
    const label = compactText(container.querySelector('#scout-search-label')?.value) ||
      describeScoutSearchRecipe(recipe);
    const saved = saveScoutSearchDraft(Object.assign({}, recipe, { label }));
    const tracks = addTracksForScoutRecipe(saved, label, buildScoutSearchPlan(saved, { terms }));
    if (!tracks.length) {
      showToast('当前配方无法收藏', true);
      return;
    }
    if (typeof setupSearchClickTracking === 'function') setupSearchClickTracking();
    showToast(`已收藏 ${tracks.length} 个站点`);
    saveBar.hidden = true;
    markScoutWorkbenchPageRendered('combo');
  });

  container.querySelector('#scout-search-assessments')?.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-search-remove-condition]');
    if (removeButton) {
      saveScoutRecipeAndRender(removeScoutRecipeCondition(
        recipe,
        removeButton.getAttribute('data-search-remove-condition')
      ));
      return;
    }
    const replaceButton = event.target.closest('[data-search-replace-condition]');
    if (!replaceButton) return;
    saveScoutRecipeAndRender(updateScoutRecipeCondition(
      recipe,
      replaceButton.getAttribute('data-search-replace-condition'),
      { text: replaceButton.getAttribute('data-search-replacement') || '' }
    ));
  });

  markScoutWorkbenchPageRendered('combo');
  renderScoutSearchRuntimeState();
  if (window.__scoutRunSearchOnOpen) {
    window.__scoutRunSearchOnOpen = false;
    setTimeout(() => startScoutRecipeSearch(), 0);
  }
}
