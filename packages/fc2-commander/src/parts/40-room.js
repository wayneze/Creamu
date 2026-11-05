function mountFc2Room() {
  const root = document.documentElement;
  root.classList.add('creamu-fc2', 'creamu-fc2-room');
  const header = fc2El('div', { class: 'fc-app' }, fc2Header());
  document.querySelector('.js-wrap').before(header);
  const tools = fc2El('section', { class: 'fc-app fc-room-tools', 'aria-label': '观看布局与主播管理' });
  const heading = fc2El('div', { class: 'fc-room-heading' });
  const actions = fc2El('div', { class: 'fc-room-buttons' });
  const playerMode = fc2Button('原生播放器', () => player.toggle(), { title: '切换播放器界面，保留当前直播连接' });
  const player = mountFc2Player(enhanced => {
    playerMode.textContent = enhanced ? '原生播放器' : '增强播放器';
    playerMode.setAttribute('aria-label', enhanced ? '切换到原生播放器' : '切换到增强播放器');
  });
  const cinema = fc2Button('影院模式', () => {
    setFc2Preferences({ cinema: !readFc2Preferences().cinema });
    applyLayout();
  });
  const chat = fc2Button('收起聊天', () => {
    setFc2Preferences({ chatHidden: !readFc2Preferences().chatHidden });
    applyLayout();
  });
  const width = fc2El('input', { type: 'range', min: 280, max: 460, step: 20, 'aria-label': '聊天宽度' });
  width.value = readFc2Preferences().chatWidth;
  width.addEventListener('input', () => {
    setFc2Preferences({ chatWidth: Number(width.value) });
    applyLayout();
  });
  tools.append(heading, actions, fc2El('div', { class: 'fc-room-buttons' }, playerMode, cinema, chat,
    fc2El('label', { class: 'fc-width-control', text: '聊天宽度' }, width)));
  document.querySelector('.m-viewPlayer').before(tools);

  function applyLayout() {
    const prefs = readFc2Preferences();
    root.style.setProperty('--fc-chat-width', `${prefs.chatWidth}px`);
    root.classList.toggle('fc-chat-hidden', prefs.chatHidden);
    root.classList.toggle('fc-cinema', prefs.cinema);
    cinema.setAttribute('aria-pressed', String(prefs.cinema));
    chat.setAttribute('aria-pressed', String(prefs.chatHidden));
    chat.textContent = prefs.chatHidden ? '展开聊天' : '收起聊天';
    // FC2 recalculates canvas/overlay geometry on resize; never replace the video node.
    window.dispatchEvent(new Event('resize'));
  }
  let lastSignature = '';
  let recorded = false;
  function updateInfo() {
    const channel = readFc2Room();
    if (!channel) return;
    const signature = JSON.stringify([channel.name, channel.title, channel.image]);
    if (signature === lastSignature) return;
    lastSignature = signature;
    heading.replaceChildren(fc2El('strong', { text: channel.title || '直播间' }),
      fc2El('span', { text: `${channel.name} · ${channel.id}` }));
    renderActions();
    if (!recorded && channel.title) {
      recorded = true;
      updateFc2Record(channel, { visitedAt: Date.now() });
    }
  }
  function renderActions() {
    const channel = readFc2Room();
    if (channel) actions.replaceChildren(...fc2ChannelActions(channel));
  }
  document.addEventListener('creamu-fc2-library', renderActions);
  const info = document.getElementById('js-live_info');
  const observer = new MutationObserver(updateInfo);
  if (info) observer.observe(info, { subtree: true, childList: true, characterData: true });
  updateInfo();
  applyLayout();
}
