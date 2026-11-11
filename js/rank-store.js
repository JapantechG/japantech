
/* BATLINGO - Ranked level-specific rating, client prototype */
import { auth, db } from './firebase.js';
import { ref, get, runTransaction, update } from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';
import { RANK_SEASON, RANK_INITIAL_ELO } from './rank-config.js';
import { calculateEloChange } from './ranked-elo.js';

export const RANK_LEVELS = ['n5','n4','n3','n2','n1'];

export const validRankLevel = level =>
    RANK_LEVELS.includes(String(level).toLowerCase())
        ? String(level).toLowerCase()
        : 'n5';

export const rankDefault = () => ({
    elo: RANK_INITIAL_ELO,
    wins: 0,
    losses: 0,
    games: 0
});

const localKey = () =>
    `batlingo_rank_level_${auth.currentUser?.uid || 'guest'}`;

export function getSelectedRankLevel() {
    try {
        return validRankLevel(
            localStorage.getItem(localKey()) || 'n5'
        );
    } catch {
        return 'n5';
    }
}

export function saveSelectedRankLevel(level) {
    try {
        localStorage.setItem(localKey(), validRankLevel(level));
    } catch {}
}

export async function getRankProfile(level) {
    const uid = auth.currentUser?.uid;

    if (!uid) return rankDefault();

    const shot = await get(ref(
        db,
        `rankProfiles/${RANK_SEASON}/${uid}/${validRankLevel(level)}`
    ));

    return {
        ...rankDefault(),
        ...(shot.val() || {})
    };
}

function publicPlayer(uid, profile, level) {
    const data = window.currentUserData || {};

    return {
        uid,
        name: String(
            data.profile?.displayName ||
            auth.currentUser?.displayName ||
            'Player'
        ).slice(0,20),

        displayName: String(
            data.profile?.displayName ||
            auth.currentUser?.displayName ||
            'Player'
        ).slice(0,20),

        batlingoId: data.profile?.batlingoId || '',
        photoURL: data.profile?.photoURL ||
                  auth.currentUser?.photoURL || '',

        mascot: data.mascot?.id || '',
        mascotEvolution: Number(data.mascot?.evolution) || 0,

        level: Number(data.progress?.level) || 1,
        elo: Number(profile.elo) || 0,

        wins: Number(profile.wins) || 0,
        losses: Number(profile.losses) || 0,

        createdAt: Number(data.profile?.createdAt) || Date.now(),
        rankLevel: level,
        updatedAt: Date.now()
    };
}

export async function settleMyRankMatch(match) {
    const uid = auth.currentUser?.uid;

    if (
        !uid ||
        match.status !== 'finished' ||
        !match.result ||
        !match.matchId
    ) return null;

    const role =
        uid === match.hostUid ? 'host' :
        uid === match.guestUid ? 'guest' :
        null;

    if (
        !role ||
        !['host','guest'].includes(match.result.winnerRole)
    ) return null;

    const level = validRankLevel(match.config?.target);
    const won = match.result.winnerRole === role;

    const opponentRole = role === 'host' ? 'guest' : 'host';
    const otherUid = match[`${opponentRole}Uid`];

    const profileRef = ref(
        db,
        `rankProfiles/${RANK_SEASON}/${uid}/${level}`
    );

    const matchKey = String(match.matchId);

    // Prevent duplicate Elo settlement.
    const tx = await runTransaction(profileRef, previous => {
        const value = previous || rankDefault();

        if (value.processedMatches?.[matchKey]) return;

        const myElo = Number(
            value.elo ?? RANK_INITIAL_ELO
        );

        const otherElo = Number(
            match.initialElo?.[opponentRole]
        );

        if (
            !Number.isFinite(otherElo) ||
            !Number.isFinite(myElo)
        ) return;

        const elo = calculateEloChange(
            myElo,
            otherElo,
            won
        );

        return {
            ...value,
            elo: elo.after,

            wins: (Number(value.wins) || 0) + (won ? 1 : 0),
            losses: (Number(value.losses) || 0) + (won ? 0 : 1),
            games: (Number(value.games) || 0) + 1,

            processedMatches: {
                ...(value.processedMatches || {}),
                [matchKey]: true
            },

            lastMatchId: matchKey,
            updatedAt: Date.now()
        };
    }, { applyLocally: false });

    const profile = tx.snapshot.val();

    if (!profile?.processedMatches?.[matchKey]) {
        throw new Error('RANK_SETTLEMENT_NOT_SAVED');
    }

    const historyRef = ref(
        db,
        `rankHistory/${RANK_SEASON}/${uid}/${matchKey}`
    );

    const oldHistory = await get(historyRef);

    if (!oldHistory.exists()) {
        const myResult = match.result[role] || {};
        const otherResult = match.result[opponentRole] || {};
        const computedElo =
            match.result.eloPreview?.[role] || {};

        await update(ref(db), {
            [`rankHistory/${RANK_SEASON}/${uid}/${matchKey}`]: {
                matchId: matchKey,
                level,
                date: Number(match.completedAt) || Date.now(),

                opponentUid: otherUid || '',
                outcome: won ? 'win' : 'loss',

                score: Number(myResult.score) || 0,
                opponentScore: Number(otherResult.score) || 0,

                correct: Number(myResult.correct) || 0,
                wrong: Number(myResult.wrong) || 0,
                missed: Number(myResult.missed) || 0,
                maxCombo: Number(myResult.maxCombo) || 0,
                timeMs: Number(myResult.totalTimeMs) || 0,

                eloBefore:
                    Number(computedElo.before) || RANK_INITIAL_ELO,

                eloChange:
                    Number(computedElo.change) || 0,

                eloAfter:
                    Number(computedElo.after) || RANK_INITIAL_ELO,

                reason: match.result.reason || 'score'
            }
        });
    }

    await update(ref(db), {
        [`leaderboards/rank/${RANK_SEASON}/${level}/${uid}`]:
            publicPlayer(uid, profile, level)
    });

    window.dispatchEvent(
        new CustomEvent('batlingo-rank-profile-updated', {
            detail: { level, profile }
        })
    );

    return profile;
}

export async function getRankHistory(level, max = 40) {
    const uid = auth.currentUser?.uid;

    if (!uid) return [];

    const snapshot = await get(
        ref(db, `rankHistory/${RANK_SEASON}/${uid}`)
    );

    const rows = Object.values(snapshot.val() || {})
        .filter(x => x.level === validRankLevel(level));

    rows.sort((a, b) =>
        (Number(b.date) || 0) -
        (Number(a.date) || 0)
    );

    return rows.slice(0, max);
}
