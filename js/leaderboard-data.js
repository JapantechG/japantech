/* ==========================================
   BATLINGO - LEADERBOARD DATA
========================================== */

import {
    ref,
    query,
    orderByChild,
    limitToLast,
    get
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

import { db } from "./firebase.js";
import { RANK_SEASON } from "./rank-config.js";

const LEADERBOARD_LIMIT = 100;

export const LEADERBOARD_TABS = {
    LEVEL: "level",
    PET: "pet",
    RANK: "rank"
};

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
            throw new Error("Invalid leaderboard type");
    }
}

/* ==========================================
   SORT FIELD
========================================== */

function getSortField(type) {

    switch (type) {

        case "level":
        case "pet":
            return "level";

        case "rank":
            return "elo";

        default:
            throw new Error("Invalid leaderboard type");
    }
}

/* ==========================================
   SORT PLAYERS
========================================== */

function sortLeaderboard(players, type) {

    return players.sort((a, b) => {

        if (type === "rank") {

            return (
                b.elo - a.elo ||
                b.wins - a.wins ||
                a.uid.localeCompare(b.uid)
            );
        }

        return (
            b.level - a.level ||
            b.exp - a.exp ||
            a.uid.localeCompare(b.uid)
        );
    });
}

/* ==========================================
   READ LEADERBOARD
========================================== */

export async function getLeaderboard(
    type = "level",
    limit = LEADERBOARD_LIMIT
) {

    const safeLimit = Math.max(
        1,
        Math.min(100, Math.floor(Number(limit) || 100))
    );

    const path = getLeaderboardPath(type);
    const sortField = getSortField(type);

    const leaderboardQuery = query(
        ref(db, path),
        orderByChild(sortField),
        limitToLast(safeLimit)
    );

    const snapshot = await get(leaderboardQuery);

    if (!snapshot.exists()) {
        return [];
    }

    const players = [];

    snapshot.forEach(child => {

        const data = child.val() || {};

        players.push({
            uid: child.key,

            name:
                typeof data.name === "string"
                    ? data.name
                    : "Player",

            mascot: data.mascot || "monkey",

            level: Number(data.level) || 0,
            exp: Number(data.exp) || 0,

            elo: Number(data.elo) || 0,
            wins: Number(data.wins) || 0,
            losses: Number(data.losses) || 0
        });
    });

    sortLeaderboard(players, type);

    return players.map((player, index) => ({
        ...player,
        position: index + 1
    }));
}
