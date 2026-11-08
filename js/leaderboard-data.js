
/* ==========================================
   BATLINGO - LEADERBOARD DATA
========================================== */

import {
    ref,
    get,
    update
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

import { auth, db } from "./firebase.js";
import { RANK_SEASON } from "./rank-config.js";

const LEADERBOARD_LIMIT = 100;

export const LEADERBOARD_TABS = {
    LEVEL: "level",
    PET: "pet",
    RANK: "rank"
};

function safeNumber(value, fallback = 0) {
    if (value === null || value === undefined || value === "") {
        return fallback;
    }

    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
}

/* ==========================================
   SYNC CURRENT USER TO LEADERBOARD
========================================== */


export async function syncLeaderboardProfile(
    data = window.currentUserData
) {
    const uid = auth.currentUser?.uid;

    if (!uid || !data?.profile?.batlingoId) {
        return;
    }

    const p = data.profile;
    const m = data.mascot || {};
    const s = data.stats || {};
    const progress = data.progress || {};
    const rating = data.rating || {};

    const mascotId =
        m.id === "buffalo" || m.id === "monkey"
            ? m.id
            : "";

    const evolution = Math.min(
        4,
        Math.max(0, Number(m.evolution) || 0)
    );

    const petLevel = mascotId
        ? Math.max(1, Number(m.level) || evolution + 1)
        : 0;

    const name = String(
        p.displayName || "Player"
    ).slice(0, 20);

    const createdAt =
        Number(p.createdAt) || Date.now();

    const level = Math.max(
        1,
        Number(progress.level) || 1
    );

    const elo = Number.isFinite(Number(rating.elo))
        ? Number(rating.elo)
        : 1000;

    const wins = Number(s.wins) || 0;
    const losses = Number(s.losses) || 0;
    const draws = Number(s.draws) || 0;
    const battles = Number(s.totalGames) || 0;
    const bestCombo = Number(s.bestCombo) || 0;

    // Public profile matches existing Firebase Rules.
    // Do not put leaderboard-only fields here.
    const publicProfile = {
        batlingoId: p.batlingoId,
        displayName: name,
        bio: String(p.bio || "").slice(0, 100),
        photoURL: p.photoURL || "",
        level,
        elo,
        battles,
        wins,
        losses,
        draws,
        bestCombo,
        mascot: mascotId,
        evolution,
        updatedAt: Date.now()
    };

    // Leaderboard has its own schema.
    const leaderboardPlayer = {
        uid,
        name,
        displayName: name,
        batlingoId: p.batlingoId,
        photoURL: p.photoURL || "",

        createdAt,

        mascot: mascotId,
        mascotLevel: petLevel,
        mascotEvolution: evolution,

        level,
        exp: Number(progress.totalExp) || 0,
        elo,

        wins,
        losses,
        draws,
        battles
    };

    const updates = {
        [`publicProfiles/${uid}`]: publicProfile,

        [`leaderboards/level/${uid}`]:
            leaderboardPlayer,

        [`leaderboards/rank/${RANK_SEASON}/${uid}`]:
            leaderboardPlayer,

        [`leaderboards/pet/${uid}`]:
            mascotId ? leaderboardPlayer : null
    };

    await update(ref(db), updates);

    console.log(
        "[Leaderboard] Synced:",
        uid,
        "Level:", level,
        "ELO:", elo,
        "Pet:", mascotId
    );
}


/* ==========================================
   DATABASE PATH
========================================== */

function getLeaderboardPath(type) {

    switch (type) {

        case "level":
            return "leaderboards/level";

        case "pet":
            return "leaderboards/pet";

        case "rank":
            return `leaderboards/rank/${RANK_SEASON}`;

        default:
            throw new Error("INVALID_LEADERBOARD_TYPE");
    }
}

/* ==========================================
   GET SCORE
========================================== */

function getScore(player, type) {

    if (type === "rank") {
        return player.elo;
    }

    if (type === "pet") {
        return player.mascotLevel;
    }

    return player.level;
}

/* ==========================================
   SORT PLAYERS

   1. Highest score
   2. Oldest account
   3. Lowest BatLingo ID
   4. UID fallback
========================================== */

function sortLeaderboard(players, type) {

    return players.sort((a, b) => {

        const scoreDifference =
            getScore(b, type) - getScore(a, type);

        if (scoreDifference !== 0) {
            return scoreDifference;
        }

        const dateDifference =
            a.createdAt - b.createdAt;

        if (dateDifference !== 0) {
            return dateDifference;
        }

        const idA = Number(
            a.batlingoId.replace(/\D/g, "")
        ) || Number.MAX_SAFE_INTEGER;

        const idB = Number(
            b.batlingoId.replace(/\D/g, "")
        ) || Number.MAX_SAFE_INTEGER;

        if (idA !== idB) {
            return idA - idB;
        }

        return a.uid.localeCompare(b.uid);
    });
}

/* ==========================================
   READ TOP 100
========================================== */

export async function getLeaderboard(
    type = "level",
    limit = LEADERBOARD_LIMIT
) {

    const safeLimit = Math.max(
        1,
        Math.min(100, Math.floor(Number(limit) || 100))
    );

    const snapshot = await get(
        ref(db, getLeaderboardPath(type))
    );

    if (!snapshot.exists()) {
        return [];
    }

    const players = [];

    snapshot.forEach(child => {

        const data = child.val() || {};

        if (type === "pet" && !data.mascot) {
            return;
        }

        players.push({

            uid: child.key,

            name: String(
                data.name || data.displayName || "Player"
            ),

            batlingoId: String(
                data.batlingoId || ""
            ),

            photoURL: data.photoURL || "",

            mascot: data.mascot || "",

            mascotLevel: safeNumber(
                data.mascotLevel,
                data.mascot
                    ? safeNumber(data.mascotEvolution, 0) + 1
                    : 0
            ),

            mascotEvolution: safeNumber(
                data.mascotEvolution
            ),

            level: safeNumber(data.level, 1),

            exp: safeNumber(data.exp),

            elo: safeNumber(data.elo, 1000),

            wins: safeNumber(data.wins),

            losses: safeNumber(data.losses),

            createdAt: safeNumber(
                data.createdAt,
                Number.MAX_SAFE_INTEGER
            )
        });
    });

    sortLeaderboard(players, type);

    return players
        .slice(0, safeLimit)
        .map((player, index) => ({
            ...player,
            position: index + 1
        }));
}
