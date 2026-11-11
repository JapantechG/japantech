
import {
    RANK_LEVELS,
    validRankLevel,
    getSelectedRankLevel,
    saveSelectedRankLevel,
    getRankProfile,
    getRankHistory
} from './rank-store.js';

import { auth, db } from './firebase.js';

import {
    ref,
    get
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';

import {
    getRankProgress,
    RANK_INITIAL_ELO,
    RANK_SEASON,
    RANK_RULES
} from './rank-config.js';

import { openLeaderboard } from './leaderboard.js';

import {
    findRankMatch,
    cancelRankSearch,
    isRankSearching,
    acceptRankMatch,
    declineRankMatch
} from './rank-matchmaking.js';

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

let rankProfile = null;
let levelRequest = 0;

let acceptInterval = null;
let acceptDeadline = 0;

/* ==========================================
   MATCH ACCEPT POPUP
========================================== */

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

/* ==========================================
   RANK PROFILE
========================================== */

function readRankProfile() {
    const user = auth.currentUser;
    const data = window.currentUserData || {};
    const p = rankProfile || {};

    const wins = Math.max(0, Number(p.wins) || 0);
    const losses = Math.max(0, Number(p.losses) || 0);

    return {
        name:
            data.profile?.displayName ||
            user?.displayName ||
            'PLAYER',

        elo: Number.isFinite(Number(p.elo))
            ? Number(p.elo)
            : RANK_INITIAL_ELO,

        wins,
        losses
    };
}

function currentLevel() {
    return validRankLevel(
        activeConfig?.target || getSelectedRankLevel()
    );
}

async function refreshSelectedRank() {
    const id = ++levelRequest;
    const level = currentLevel();

    if ($('rankNotice')) {
        $('rankNotice').textContent = 'Loading rating…';
    }

    try {
        const profile = await getRankProfile(level);

        if (id !== levelRequest) return;

        rankProfile = profile;

        if ($('rankNotice')) {
            $('rankNotice').textContent = '';
        }

        renderRank();

    } catch (error) {

        if (id !== levelRequest) return;

        if ($('rankNotice')) {
            $('rankNotice').textContent =
                `Cannot load rating: ${error.message}`;
        }

        renderRank();
    }
}

/* ==========================================
   HISTORY
========================================== */

async function showRankHistory() {
    const target = $('rankHistoryList');

    if (!target) return;

    target.replaceChildren();
    target.textContent = 'Loading history…';

    try {
        const rows = await getRankHistory(currentLevel());

        target.replaceChildren();

        if (!rows.length) {
            target.textContent =
                'Chưa có trận đấu nào ở cấp độ này.';
            return;
        }

        for (const entry of rows) {
            const line = document.createElement('div');
            line.className = 'rank-history-row';

            const avatar = document.createElement('div');
            avatar.className = 'rank-history-avatar';
            avatar.textContent = '👤';

            const info = document.createElement('div');
            info.className = 'rank-history-player';

            const name = document.createElement('strong');
            name.textContent = 'Opponent';

            const date = document.createElement('small');
            date.textContent = new Date(
                entry.date
            ).toLocaleString('vi-VN');

            info.append(name, date);

            const score = document.createElement('div');
            score.className = 'rank-history-score';

            const outcome = document.createElement('strong');

            outcome.textContent =
                `${entry.outcome === 'win' ? '🏆 WIN' : '💔 LOSS'} · ` +
                `${entry.score}-${entry.opponentScore}`;

            const elo = document.createElement('small');

            elo.textContent =
                `${entry.eloChange >= 0 ? '+' : ''}` +
                `${entry.eloChange} ELO`;

            score.append(outcome, elo);

            line.append(avatar, info, score);
            target.append(line);

            // Read opponent public profile.
            if (entry.opponentUid) {
                get(
                    ref(
                        db,
                        `publicProfiles/${entry.opponentUid}`
                    )
                ).then(snapshot => {

                    if (!line.isConnected) return;

                    const profile = snapshot.val() || {};

                    name.textContent =
                        profile.displayName || 'Opponent';

                    if (
                        /^https:\/\//i.test(
                            profile.photoURL || ''
                        )
                    ) {
                        const img = document.createElement('img');

                        img.alt = '';
                        img.loading = 'lazy';
                        img.referrerPolicy = 'no-referrer';
                        img.src = profile.photoURL;
                        img.onerror = () => img.remove();

                        avatar.replaceChildren(img);
                    }

                }).catch(() => {});
            }
        }

    } catch (error) {
        target.textContent =
            `History unavailable: ${error.message}`;
    }
}

/* ==========================================
   RENDER RANK
========================================== */

export function renderRank() {
    if (!$('rankScreen')) return;

    const p = readRankProfile();

    const { tier, next, percent } =
        getRankProgress(p.elo);

    const put = (id, value) => {
        if ($(id)) $(id).textContent = String(value);
    };

    put('rankBadge', tier.icon);
    put('rankTier', tier.name);
    put('rankPlayerName', p.name);
    put('rankRating', p.elo.toLocaleString());

    put(
        'rankProgressLabel',
        next
            ? `${p.elo} / ${next.min} ELO`
            : 'MAX TIER'
    );

    if ($('rankProgressFill')) {
        $('rankProgressFill').style.width =
            `${percent}%`;
    }

    put('rankWins', p.wins);
    put('rankLosses', p.losses);

    put(
        'rankWinRate',
        p.wins + p.losses
            ? `${Math.round(
                p.wins / (p.wins + p.losses) * 100
            )}%`
            : '—'
    );

    put('rankSeason', RANK_SEASON);

    put(
        'rankModeInfo',
        `${currentLevel().toUpperCase()} · MIXED QUESTIONS · 20 QUESTIONS`
    );

    document
        .querySelectorAll('[data-rank-level]')
        .forEach(button => {
            button.classList.toggle(
                'active',
                button.dataset.rankLevel === currentLevel()
            );
        });
}

/* ==========================================
   OPEN / CLOSE
========================================== */

export function openRank(config = {}, { back } = {}) {
    if (!auth.currentUser) {
        window.BatLingoAuthUI?.open?.();
        return;
    }

    activeConfig = {
        studyMode: 'jlpt',
        target: getSelectedRankLevel(),
        category: 'vocabulary',
        subMode: 'mixed'
    };

    rankProfile = null;

    backCallback =
        typeof back === 'function' ? back : null;

    $('setupScreen')?.classList.add('hidden');
    $('rankScreen')?.classList.remove('hidden');

    if ($('rankNotice')) {
        $('rankNotice').textContent = '';
    }

    renderRank();
    refreshSelectedRank();
}

export async function closeRank() {
    hideAcceptPopup();

    $('rankScreen')?.classList.add('hidden');

    if (isRankSearching()) {
        try {
            await cancelRankSearch();
        } catch (error) {
            console.error('[RANK] Cancel:', error);
        }
    }

    if (backCallback) {
        backCallback();
    } else {
        $('setupScreen')?.classList.remove('hidden');
        $('homeScreen')?.classList.remove('hidden');
        $('configScreen')?.classList.add('hidden');
    }
}

/* ==========================================
   INITIALIZE
========================================== */

export function initRank() {
    if (initialized) return;

    initialized = true;

    // JLPT level buttons.
    document
        .querySelectorAll('[data-rank-level]')
        .forEach(button => {
            button.addEventListener('click', async () => {

                if (isRankSearching()) {
                    if ($('rankNotice')) {
                        $('rankNotice').textContent =
                            'Cancel matchmaking before changing level.';
                    }
                    return;
                }

                activeConfig = {
                    studyMode: 'jlpt',
                    target: validRankLevel(
                        button.dataset.rankLevel
                    ),
                    category: 'vocabulary',
                    subMode: 'mixed'
                };

                rankProfile = null;

                saveSelectedRankLevel(activeConfig.target);

                renderRank();
                await refreshSelectedRank();

                if (
                    !$('rankHistoryList')?.classList.contains('hidden')
                ) {
                    showRankHistory();
                }
            });
        });

    // History button.
    $('rankHistoryButton')?.addEventListener('click', () => {
        const list = $('rankHistoryList');

        if (!list) return;

        list.classList.toggle('hidden');

        if (!list.classList.contains('hidden')) {
            showRankHistory();
        }
    });

    window.addEventListener(
        'batlingo-rank-profile-updated',
        ({ detail }) => {
            if (detail.level === currentLevel()) {
                refreshSelectedRank();
            }
        }
    );

    $('rankBackButton')?.addEventListener('click', closeRank);

    const findButton = $('rankFindMatchButton');

    findButton?.addEventListener('click', async () => {
        findButton.disabled = true;

        try {
            if (isRankSearching()) {
                await cancelRankSearch();

            } else {
                const profile =
                    await getRankProfile(currentLevel());

                rankProfile = profile;

                const rating =
                    Number(profile.elo) || RANK_INITIAL_ELO;

                await findRankMatch(
                    activeConfig || {},
                    rating
                );
            }

        } catch (error) {
            console.error('[RANK] Matchmaking:', error);

            if ($('rankNotice')) {
                $('rankNotice').textContent =
                    `Lỗi: ${error.message}`;
            }

        } finally {
            findButton.disabled = false;
        }
    });

    /* ==========================================
       MATCHMAKING EVENTS
    ========================================== */

    window.addEventListener(
        'batlingo-rank-matchmaking',
        ({ detail }) => {
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

            } else if (detail.type === 'ready') {
                hideAcceptPopup();

                findButton.textContent = '⚔ FIND MATCH';

                if ($('rankNotice')) {
                    $('rankNotice').textContent =
                        'BOTH ACCEPTED! CONNECTING...';
                }

                openRankedGame(detail);

                connectRankedMatch({
                    ...detail,
                    config: { ...activeConfig }
                }).catch(error => {
                    console.error(
                        '[RANK] Create match:',
                        error
                    );

                    $('rankedGameStatus').textContent =
                        'CONNECTION FAILED';

                    $('rankedGameContent').textContent =
                        error.message;
                });

            } else if (detail.type === 'searching') {
                findButton.textContent = 'CANCEL SEARCH';

                if ($('rankNotice')) {
                    $('rankNotice').textContent =
                        'Đang tìm đối thủ cùng cấu hình, chênh lệch Elo tối đa ±200...';
                }

            } else if (
                detail.type === 'cancelled' ||
                detail.type === 'expired'
            ) {
                hideAcceptPopup();

                findButton.textContent = '⚔ FIND MATCH';

                if ($('rankNotice')) {
                    $('rankNotice').textContent =
                        detail.type === 'expired'
                            ? 'Hàng chờ đã hết hạn.'
                            : 'Đã hủy tìm trận.';
                }

            } else if (detail.type === 'error') {
                hideAcceptPopup();

                findButton.textContent = '⚔ FIND MATCH';

                if ($('rankNotice')) {
                    $('rankNotice').textContent =
                        `Matchmaking error: ${detail.message}`;
                }
            }
        }
    );

    /* ==========================================
       ACCEPT / DECLINE
    ========================================== */

    $('rankAcceptButton')?.addEventListener(
        'click',
        async () => {
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
        }
    );

    $('rankDeclineButton')?.addEventListener(
        'click',
        async () => {
            $('rankDeclineButton').disabled = true;

            hideAcceptPopup();

            try {
                await declineRankMatch();

            } catch (error) {
                console.error('[RANK] Decline:', error);
            }
        }
    );

    $('rankLeaderboardButton')?.addEventListener(
        'click',
        () => openLeaderboard('rank', currentLevel())
    );

    for (const eventName of [
        'batlingo-auth-state',
        'batlingo-profile-updated'
    ]) {
        window.addEventListener(eventName, () => {
            if (
                !$('rankScreen')?.classList.contains('hidden')
            ) {
                renderRank();
            }
        });
    }
}
