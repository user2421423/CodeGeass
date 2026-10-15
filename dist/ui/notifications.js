/* Nonblocking notifications, turn feedback, and this-session history. War Report remains authoritative. */
'use strict';

const NOTICE_LABELS = Object.freeze({
  info: 'INFORMATION',
  success: 'ORDER CONFIRMED',
  warning: 'ATTENTION',
  strategic: 'STRATEGIC UPDATE'
});
const noticeHistory = [];
const pendingNotices = [];
let activeNotice = null;
let noticeTimeout = null;
let turnBannerTimeout = null;
let politicalTimeout = null;
let summaryCollapseTimeout = null;
let summaryTurn = null;
// Remember the user's minimized preference across turns and page refreshes.
const TURN_SUMMARY_COLLAPSED_KEY = 'knightmare-turn-summary-collapsed';
let turnSummaryCollapsed = false;
try {
  turnSummaryCollapsed = typeof localStorage !== 'undefined' &&
    localStorage.getItem(TURN_SUMMARY_COLLAPSED_KEY) === '1';
} catch (_) { /* Private browsing/storage restrictions should not block reports. */ }
function rememberTurnSummaryCollapsed(collapsed) {
  turnSummaryCollapsed = !!collapsed;
  try {
    if (typeof localStorage !== 'undefined')
      localStorage.setItem(TURN_SUMMARY_COLLAPSED_KEY, turnSummaryCollapsed ? '1' : '0');
  } catch (_) { /* In-memory state still applies for this session. */ }
}
let lastNoticeSound = 0;

// Existing toast callers share these categories; callers may specify a category for important events.
function noticeKind(message) {
  const msg = String(message);
  if (/alliance has collapsed|surrender|war declared|f\.l\.e\.i\.j\.a\.|eliminator|warhead|strategic weapon/i.test(msg)) return 'strategic';
  if (/warning|incoming|could not|cannot|failed|blocked|unavailable|no eligible|no reversible|lost|not saved|need \d+ more/i.test(msg)) return 'warning';
  if (/captured|seized|completed|deployed|researched|recruited|takes command|orders executed|upgraded|promoted|assign(ed)?|launch(ed)?/i.test(msg)) return 'success';
  return 'info';
}
function noticeNode(id, className) {
  let el = $(id);
  if (!el) {
    el = document.createElement('div');
    el.id = id;
    el.className = className;
    document.body.appendChild(el);
  }
  return el;
}
function showNextNotice() {
  clearTimeout(noticeTimeout);
  activeNotice = pendingNotices.shift() || null;
  const el = $('toast');
  if (!el) return;
  if (!activeNotice) {
    el.className = '';
    el.textContent = '';
    return;
  }
  const n = activeNotice;
  const now = Date.now();
  if (!aiSide && now - lastNoticeSound > 1200) {
    const cue = n.type === 'success' ? 'ui-success' :
      n.type === 'warning' ? 'ui-warning' :
      n.type === 'strategic' && !/f\.l\.e\.i\.j\.a\.|surrender/i.test(n.text) ? 'ui-strategic' : null;
    if (cue) {
      SFX.play(cue, game.player);
      lastNoticeSound = now;
    }
  }
  el.className = 'show categorized-toast notice-' + n.type;
  el.innerHTML = '<span class="notice-type">' + NOTICE_LABELS[n.type] + '</span>' +
    '<span class="notice-message">' + esc(n.text) + (n.count > 1 ? ' (×' + n.count + ')' : '') + '</span>';
  noticeTimeout = setTimeout(showNextNotice, n.long ? 5500 : 3200);
}
function postNotice(message, options = {}) {
  const text = String(message || '').trim();
  if (!text) return;
  const type = NOTICE_LABELS[options.type] ? options.type : noticeKind(text);
  const last = noticeHistory[noticeHistory.length - 1];
  let record;
  if (last && last.text === text && last.type === type && last.turn === game.turn) {
    last.count++;
    record = last;
  } else {
    record = { turn: game.turn, type, text, count: 1 };
    noticeHistory.push(record);
    if (noticeHistory.length > 80) noticeHistory.shift();
  }
  if (options.silent || (aiSide && type === 'info')) return;
  const next = { text, type, long: !!options.long, count: record.count };
  const important = type === 'strategic' || type === 'warning';
  if (activeNotice && (activeNotice.type === 'strategic' || activeNotice.type === 'warning')) {
    if (important && !pendingNotices.some(n => n.text === text)) {
      pendingNotices.push(next);
      if (pendingNotices.length > 5) pendingNotices.shift();
    }
    return;
  }
  // Routine notifications replace each other; important ones interrupt routine notices.
  pendingNotices.length = 0;
  pendingNotices.push(next);
  showNextNotice();
}
function setAiPhase(side) {
  const el = noticeNode('ai-phase-status', 'ai-phase-status');
  el.hidden = !side;
  if (side) {
    el.textContent = 'TURN ' + game.turn + ' · ' + F(side).name + ' maneuvering';
    el.style.setProperty('--phase-color', typeof factionUIColor === 'function' ? factionUIColor(side) : '#c1c9d5');
  }
}
function announceTurn(silent = false) {
  const el = noticeNode('turn-announcement', 'turn-announcement');
  if (!silent) SFX.play('ui-turn', game.player);
  clearTimeout(turnBannerTimeout);
  el.innerHTML = '<small>' + esc(F(game.player).name) + '</small><strong>TURN ' +
    count(game.turn) + '</strong><span>Your orders await</span>';
  el.classList.remove('visible');
  // Restart the transition reliably, even following repeated renders.
  void el.offsetWidth;
  el.classList.add('visible');
  turnBannerTimeout = setTimeout(() => el.classList.remove('visible'), 900);
}
function dismissTurnSummary() {
  const el = $('turn-summary');
  if (el) el.hidden = true;
}
function dismissPoliticalReport() {
  clearTimeout(politicalTimeout);
  const el = $('political-report');
  if (el) el.hidden = true;
}
function showPoliticalReport(title, description) {
  dismissPoliticalReport();
  postNotice(description, { type: 'strategic', silent: true });
  SFX.play('ui-strategic', game.player);
  const el = noticeNode('political-report', 'political-report');
  el.innerHTML = '<div><small>STRATEGIC COMMUNIQUÉ · TURN ' + count(game.turn) +
    '</small><h3>' + esc(title) + '</h3><p>' + esc(description) +
    '</p></div><button class="small ghost" data-action="political-report-dismiss" aria-label="Dismiss strategic report">×</button>';
  el.setAttribute('role', 'status');
  el.hidden = false;
  politicalTimeout = setTimeout(dismissPoliticalReport, 9500);
}
function resetNotificationUI() {
  clearTimeout(noticeTimeout);
  clearTimeout(turnBannerTimeout);
  clearTimeout(politicalTimeout);
  clearTimeout(summaryCollapseTimeout);
  activeNotice = null;
  pendingNotices.length = 0;
  noticeHistory.length = 0;
  summaryTurn = null;
  const toastEl = $('toast');
  if (toastEl) { toastEl.className = ''; toastEl.textContent = ''; }
  ['ai-phase-status', 'turn-summary', 'political-report'].forEach(id => {
    const el = $(id);
    if (el) el.hidden = true;
  });
  const banner = $('turn-announcement');
  if (banner) banner.classList.remove('visible');
}
