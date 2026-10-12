import { auth } from './firebase.js';

const $ = id => document.getElementById(id);
let previousScreen = 'rankScreen';
let initialized = false;

function render() {
  const data = window.currentUserData || {};
  const rating = Number(data.rating?.elo ?? 1000);
  $('leaderboardMyElo').textContent = `${Number.isFinite(rating) ? rating : 1000} ELO`;
  $('leaderboardMyPosition').textContent = '—';
  $('leaderboardList').replaceChildren();
  $('leaderboardStatus').textContent = auth.currentUser
    ? 'Bảng xếp hạng online chưa được kích hoạt. Điểm Elo của bạn được hiển thị ở trên.'
    : 'Đăng nhập để xem Elo cá nhân.';
}

export function openLeaderboard(from = 'rankScreen') {
  previousScreen = from;
  $(from)?.classList.add('hidden');
  $('leaderboardScreen')?.classList.remove('hidden');
  render();
}

export function closeLeaderboard() {
  $('leaderboardScreen')?.classList.add('hidden');
  $(previousScreen)?.classList.remove('hidden');
}

export function initLeaderboard() {
  if (initialized) return;
  initialized = true;
  $('leaderboardBackButton')?.addEventListener('click', closeLeaderboard);
  window.addEventListener('batlingo-auth-state', () => {
    if (!$('leaderboardScreen')?.classList.contains('hidden')) render();
  });
}
