
/* =========================================================
   BATLINGO - FLASHCARD RATING DATA
   Latest rating per card ID
========================================================= */

import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

export const FLASHCARD_FILTERS = [
    "all",
    "again",
    "hard",
    "good",
    "easy"
];

const VALID_RATINGS = new Set([
    "again",
    "hard",
    "good",
    "easy"
]);

/* =========================================================
   DECK ID
========================================================= */

export function getFlashcardDeckId(config) {

    return [
        config.studyMode,
        config.target,
        config.category
    ]
    .map(value => String(value).toLowerCase())
    .join("_")
    .replace(/[^a-z0-9_]/g, "_");
}

/* =========================================================
   USER / STORAGE KEY
========================================================= */

function getUserId() {
    return auth.currentUser?.uid || "guest";
}

function getLocalKey(deckId) {

    return `batlingo_fc_rating_v1_${getUserId()}_${deckId}`;
}

function readLocal(deckId) {

    try {
        const raw = localStorage.getItem(getLocalKey(deckId));
        const data = raw ? JSON.parse(raw) : {};

        if (!data || typeof data !== "object") {
            return {};
        }

        const cleaned = {};

        for (const [id, rating] of Object.entries(data)) {
            if (VALID_RATINGS.has(rating)) {
                cleaned[id] = rating;
            }
        }

        return cleaned;

    } catch (error) {
        console.error("[FC DATA] Local read:", error);
        return {};
    }
}

function writeLocal(deckId, ratings) {

    try {
        localStorage.setItem(
            getLocalKey(deckId),
            JSON.stringify(ratings)
        );
        return true;

    } catch (error) {
        console.error("[FC DATA] Local write:", error);
        return false;
    }
}

/* =========================================================
   FIREBASE PATH
========================================================= */

function getRemotePath(uid, deckId) {

    return `users/${uid}/flashcardRatings/${deckId}`;
}

/* =========================================================
   LOAD RATINGS
========================================================= */

export async function loadFlashcardRatings(deckId) {

    const uid = auth.currentUser?.uid;

    const local = readLocal(deckId);

    if (!uid) {
        return local;
    }

    try {

        const snapshot = await get(
            ref(db, getRemotePath(uid, deckId))
        );

        const remote = snapshot.exists()
            ? snapshot.val()
            : {};

        const cleanRemote = {};

        if (remote && typeof remote === "object") {

            for (const [id, rating] of Object.entries(remote)) {
                if (VALID_RATINGS.has(rating)) {
                    cleanRemote[id] = rating;
                }
            }
        }

        // Remote là dữ liệu chính khi kết nối thành công.
        writeLocal(deckId, cleanRemote);

        return cleanRemote;

    } catch (error) {

        console.warn(
            "[FC DATA] Firebase load failed; using local",
            error
        );

        return local;
    }
}

/* =========================================================
   SAVE LATEST RATING
========================================================= */

export function saveFlashcardRating(
    deckId,
    cardId,
    rating,
    ratings
) {

    if (!VALID_RATINGS.has(rating)) {
        throw new Error("INVALID_FLASHCARD_RATING");
    }

    const uid = auth.currentUser?.uid;
    const id = String(cardId);

    // Chỉ một trạng thái cuối cùng.
    ratings[id] = rating;

    writeLocal(deckId, ratings);

    if (!uid) {
        return Promise.resolve();
    }

    return set(
        ref(db, `${getRemotePath(uid, deckId)}/${id}`),
        rating
    ).catch(error => {

        console.error(
            "[FC DATA] Firebase save failed:",
            error
        );

        throw error;
    });
}

/* =========================================================
   FILTER
========================================================= */

export function getFilteredFlashcardCards(
    database,
    ratings,
    filter
) {

    if (filter === "all") {
        return [...database];
    }

    return database.filter(card => {

        if (card.id === undefined || card.id === null) {
            return false;
        }

        return ratings[String(card.id)] === filter;
    });
}

/* =========================================================
   COUNT
========================================================= */

export function getFlashcardFilterCounts(
    database,
    ratings
) {

    const counts = {
        all: database.length,
        again: 0,
        hard: 0,
        good: 0,
        easy: 0
    };

    database.forEach(card => {

        if (card.id === undefined || card.id === null) {
            return;
        }

        const rating = ratings[String(card.id)];

        if (VALID_RATINGS.has(rating)) {
            counts[rating]++;
        }
    });

    return counts;
}
