import { auth } from "./firebase.js";
import { getRankProgress, RANK_INITIAL_ELO, RANK_SEASON, RANK_RULES } from "./rank-config.js";

import { openLeaderboard } from "./leaderboard.js";

import {
    findRankMatch,
    cancelRankSearch,
    isRankSearching,
    acceptRankMatch,
    declineRankMatch
} from "./rank-matchmaking.js";

import {
    connectRankedMatch
} from './ranked-match.js';

import {
    openRankedGame
} from './ranked-game.js';

const $ = id => document.getElementById(id);
let activeConfig = null;
let backCallback = null;
let initialized = false;


let acceptInterval = null;
let acceptDeadline = 0;

function hideAcceptPopup() {
    clearInterval(acceptInterval);
    acceptInterval = null;

    $('rankAcceptOverlay')?.classList.add('hidden');
}

function showAcceptPopup(deadline) {
    hideAcceptPopup();

    acceptDeadline = deadline;

    $('rankAcceptOverlay')?.classList.remove('hidden');

    $('rankAcceptButton').disabled = false;
    $('rankDeclineButton').disabled = false;

    $('rankAcceptStatus').textContent =
        'Waiting for your decision...';

    const updateTimer = () => {
        const remaining = Math.max(
            0,
            Math.ceil((acceptDeadline - Date.now()) / 1000)
        );

        $('rankAcceptTimer').textContent = remaining;

        if (Date.now() >= acceptDeadline) {
            hideAcceptPopup();

            declineRankMatch().catch(error => {
                console.error('[RANK] Accept timeout:', error);
            });
        }
    };

    updateTimer();

    if (!$('rankAcceptOverlay').classList.contains('hidden')) {
        acceptInterval = setInterval(updateTimer, 100);
    }
}


function readRankProfile() {
  const user = auth.currentUser;
  const data = window.currentUserData || {};
  const rating = data.rating || {};
  const eloValue = Number(rating.elo ?? RANK_INITIAL_ELO);
  const wins = Math.max(0, Number(rating.rankedWins) || 0);
  const losses = Math.max(0, Number(rating.rankedLosses) || 0);
  return {
    name: data.profile?.displayName || user?.displayName || "PLAYER",
    elo: Number.isFinite(eloValue) ? Math.max(0, eloValue) : RANK_INITIAL_ELO,
    wins, losses
  };
}

export function renderRank() {
  if (!$('rankScreen')) return;
  const p = readRankProfile();
  const { tier, next, percent } = getRankProgress(p.elo);
  const put = (id, value) => { if ($(id)) $(id).textContent = String(value); };
  put('rankBadge', tier.icon);
  put('rankTier', tier.name);
  put('rankPlayerName', p.name);
  put('rankRating', p.elo.toLocaleString());
  put('rankProgressLabel', next ? `${p.elo} / ${next.min} ELO` : 'MAX TIER');
  if ($('rankProgressFill')) $('rankProgressFill').style.width = `${percent}%`;
  put('rankWins', p.wins);
  put('rankLosses', p.losses);
  put('rankWinRate', p.wins + p.losses ? `${Math.round(p.wins / (p.wins + p.losses) * 100)}%` : '—');
  put('rankSeason', RANK_SEASON);
  put('rankModeInfo', activeConfig ? `${String(activeConfig.target || 'N1').toUpperCase()} · ${String(activeConfig.category || 'vocabulary').toUpperCase()} · ${String(activeConfig.subMode || 'kanji_meaning').replaceAll('_',' ').toUpperCase()}` : 'JLPT');
}

export function openRank(config = {}, { back } = {}) {
  if (!auth.currentUser) {
    window.BatLingoAuthUI?.open?.();
    return;
  }
  activeConfig = { ...config };
  backCallback = typeof back === 'function' ? back : null;

  $('setupScreen')?.classList.add('hidden');
  $('rankScreen')?.classList.remove('hidden');
  
  if ($('rankNotice')) $('rankNotice').textContent = '';
  renderRank();
}


export async function closeRank() {

    hideAcceptPopup();

    // Hide Ranked immediately
    $("rankScreen")?.classList.add("hidden");

    // Cancel active matchmaking
    if (isRankSearching()) {
        try {
            await cancelRankSearch();
        } catch (error) {
            console.error("[RANK] Cancel:", error);
        }
    }

    // Return to Home via main.js
    if (backCallback) {

        backCallback();

    } else {

        $("setupScreen")?.classList.remove("hidden");

        $("homeScreen")?.classList.remove("hidden");

        $("configScreen")?.classList.add("hidden");
    }
}


export function initRank() {
  if (initialized) return;
  initialized = true;
  $('rankBackButton')?.addEventListener('click', closeRank);
  const findButton = $('rankFindMatchButton');
  findButton?.addEventListener('click', async () => {
    findButton.disabled = true;
    try {
      if (isRankSearching()) {
        await cancelRankSearch();
      } else {
        const rating = readRankProfile().elo;
        await findRankMatch(activeConfig || {}, rating);
      }
    } catch (error) {
      console.error('[RANK] Matchmaking:', error);
      if ($('rankNotice')) $('rankNotice').textContent = `Lỗi: ${error.message}`;
    } finally {
      findButton.disabled = false;
    }
  });
  window.addEventListener('batlingo-rank-matchmaking', ({ detail }) => {
    if (!findButton) return;


if (detail.type === 'accept_required') {
    findButton.textContent = 'MATCH FOUND';
    showAcceptPopup(detail.deadline);

} else if (detail.type === 'accept_state') {
    if (detail.myAccepted) {
        $('rankAcceptButton').disabled = true;

        $('rankAcceptStatus').textContent =
            detail.opponentAccepted
                ? 'Both players accepted!'
                : 'Waiting for opponent...';
    }

} else if (detail.type === 'ready') 
  {
    hideAcceptPopup();

    findButton.textContent = '⚔ FIND MATCH';

    if ($('rankNotice')) {
    $('rankNotice').textContent =
        'BOTH ACCEPTED! CONNECTING...';
    }

    openRankedGame(detail);

    connectRankedMatch({...detail,config: { ...activeConfig }}).catch(error => {
        console.error('[RANK] Create match:', error);

        $('rankedGameStatus').textContent =
            'CONNECTION FAILED';

        $('rankedGameContent').textContent =
            error.message;
    });

    // Stage 3: openRankedGame(detail)
  } 
  
else if (detail.type === "searching") {

    findButton.textContent = "CANCEL SEARCH";

    if ($("rankNotice")) {
        $("rankNotice").textContent =
            "Đang tìm đối thủ cùng cấu hình, chênh lệch Elo tối đa ±200...";
    }

} else if (
    detail.type === "cancelled" ||
    detail.type === "expired"
) {

    hideAcceptPopup();

    findButton.textContent = "⚔ FIND MATCH";

    if ($("rankNotice")) {
        $("rankNotice").textContent =
            detail.type === "expired"
                ? "Hàng chờ đã hết hạn."
                : "Đã hủy tìm trận.";
    }

} else if (detail.type === "error") {

    hideAcceptPopup();

    findButton.textContent = "⚔ FIND MATCH";

    if ($("rankNotice")) {
        $("rankNotice").textContent =
            `Matchmaking error: ${detail.message}`;
    }
  }
  });

  
$('rankAcceptButton')?.addEventListener('click', async () => {
    const button = $('rankAcceptButton');

    button.disabled = true;
    $('rankAcceptStatus').textContent =
        'Waiting for opponent...';

    try {
        await acceptRankMatch();
    } catch (error) {
        console.error('[RANK] Accept:', error);
        hideAcceptPopup();
        await declineRankMatch();
    }
});

$('rankDeclineButton')?.addEventListener('click', async () => {
    $('rankDeclineButton').disabled = true;

    hideAcceptPopup();

    try {
        await declineRankMatch();
    } catch (error) {
        console.error('[RANK] Decline:', error);
    }
});


  $('rankLeaderboardButton')?.addEventListener('click', () => openLeaderboard('rank'));
  for (const eventName of ['batlingo-auth-state', 'batlingo-profile-updated']) {
    window.addEventListener(eventName, () => {
      if (!$('rankScreen')?.classList.contains('hidden')) renderRank();
    });
  }
}
