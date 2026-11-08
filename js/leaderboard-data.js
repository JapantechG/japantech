
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
    userData = window.currentUserData
) {
    const uid = auth.currentUser?.uid;

    if (!uid || !userData?.profile?.batlingoId) {
        return;
    }

    const profile = userData.profile;
    const progress = userData.progress || {};
    const rating = userData.rating || {};
    const mascot = userData.mascot || {};
    const stats = userData.stats || {};

    const mascotId = ["buffalo", "monkey"].includes(
        mascot.id
    ) ? mascot.id : "";

    const evolution = Math.max(
        0,
        safeNumber(mascot.evolution, 0)
    );

    const mascotLevel = mascotId
        ? Math.max(
            1,
            safeNumber(mascot.level, evolution + 1)
        )
        : 0;

    const player = {
        uid,

        name: String(
            profile.displayName || "Player"
        ).slice(0, 20),

        displayName: String(
            profile.displayName || "Player"
        ).slice(0, 20),

        batlingoId: profile.batlingoId,

        photoURL: profile.photoURL || "",

        bio: String(
            profile.bio || ""
        ).slice(0, 100),

        createdAt: safeNumber(
            profile.createdAt,
            Number.MAX_SAFE_INTEGER
        ),

        mascot: mascotId,
        mascotLevel,
        mascotEvolution: evolution,

        level: Math.max(
            1,
            safeNumber(progress.level, 1)
        ),

        exp: safeNumber(progress.totalExp, 0),

        elo: safeNumber(rating.elo, 1000),

        wins: safeNumber(stats.wins),
        losses: safeNumber(stats.losses),
        battles: safeNumber(stats.totalGames)
    };

    const updates = {
        [`publicProfiles/${uid}`]: player,

        [`leaderboards/level/${uid}`]: player,

        [`leaderboards/rank/${RANK_SEASON}/${uid}`]: player,

        [`leaderboards/pet/${uid}`]:
            mascotId ? player : null
    };

    await update(ref(db), updates);
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
