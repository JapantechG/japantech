/* =========================================================
   BATLINGO LEARNING V5 - FIREBASE RTDB
   Atomic per-user save: card stars + EXP + Learning stats.
   Do not run set()/update() on users/{uid} while this transaction
   is pending; those operations can cancel or conflict with it.
========================================================= */
import { auth, db } from "../firebase.js";
import { applyExp } from "../progression.js";
import {
    ref,
    get,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

const LEVEL_IDS = ["b0", "n5", "n4", "n3", "n2", "n1"];

function userRef() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw Error("Bạn cần đăng nhập để lưu Learning.");
    return ref(db, `users/${uid}`);
}

function levelFromCardId(id) {
    const found = /^(b0|n[1-5])-/i.exec(String(id));
    return found ? found[1].toLowerCase() : null;
}

function clampStars(value) {
    const n = Number(value) || 0;
    return Math.max(0, Math.min(5, Number.isFinite(n) ? n : 0));
}

// Derived, never accumulated by counting button clicks.
export function calculateLearningStats(cards = {}) {
    const levels = Object.fromEntries(LEVEL_IDS.map(id => [id, { totalStars: 0, cards: 0, masters: 0 }]));
    let totalStars = 0;
    let collectedCards = 0;
    let masterCards = 0;
    for (const [cardId, card] of Object.entries(cards || {})) {
        const levelId = levelFromCardId(cardId);
        if (!levelId) continue;
        const stars = clampStars(card?.stars);
        levels[levelId].totalStars += stars;
        totalStars += stars;
        if (stars > 0) {
            levels[levelId].cards++;
            collectedCards++;
        }
        if (stars === 5) {
            levels[levelId].masters++;
            masterCards++;
        }
    }
    return { levels, totalStars, collectedCards, masterCards };
}

function notify(userData, gainedExp = 0) {
    window.currentUserData = userData;
    window.dispatchEvent(new CustomEvent("batlingo-progress-updated", {
        detail: { userData, gainedExp }
    }));
}

export async function loadLearningProgress() {
    const snap = await get(userRef());
    if (!snap.exists()) throw Error("Không tìm thấy hồ sơ Firebase users/{uid}.");
    const user = snap.val();
    if (!user?.progress) throw Error("Hồ sơ chưa có progress.");
    return user;
}

async function mutate(kind, id, value, chapterId = null) {
    const targetRef = userRef();
    const requested = Number(value);
    if (!id || typeof id !== "string" || !/^[a-z0-9-]+$/i.test(id)) {
        throw Error("INVALID_LEARNING_ID");
    }
    if (kind === "star") {
        if (!levelFromCardId(id) || !Number.isInteger(requested) || requested < 1 || requested > 5) {
            throw Error("INVALID_STAR_REQUEST");
        }
        if (requested === 5 && (!chapterId || !/^[a-z0-9-]+$/i.test(chapterId))) {
            throw Error("CHAPTER_ID_REQUIRED_FOR_5_STARS");
        }
    } else if (kind === "chapter") {
        if (!Number.isFinite(requested) || requested < 70 || requested > 100) {
            throw Error("INVALID_CHAPTER_SCORE");
        }
    } else {
        throw Error("INVALID_LEARNING_MUTATION");
    }

    // Server read: checks an existing profile before any transaction proposal.
    const snapshot = await get(targetRef);
    if (!snapshot.exists()) throw Error("USER_PROFILE_NOT_FOUND");
    const initialUser = snapshot.val();
    if (!initialUser?.progress) throw Error("USER_PROGRESS_MISSING");

    // A duplicate star award is idempotent.
    if (kind === "star" && clampStars(initialUser.learning?.cards?.[id]?.stars) >= requested) {
        notify(initialUser, 0);
        return { committed: true, alreadyCompleted: true, userData: initialUser, awardedExp: 0, addedStars: 0 };
    }

    let lastAbort = "";
    let gainedExp = 0;
    let addedStars = 0;
    let attempts = 0;
    const transaction = await runTransaction(targetRef, current => {
        attempts++;
        lastAbort = "";
        gainedExp = 0;
        addedStars = 0;

        // RTDB SDK may initially pass null although the record exists.
        // This is a *proposal*: RTDB checks it against the server and reruns
        // with the latest server data if a conflict exists.
        if (current === null) current = structuredClone(initialUser);
        if (!current?.progress) {
            lastAbort = "PROGRESS_MISSING";
            return; // Abort. Never create an empty user.
        }
        current.learning ||= {};
        current.learning.cards ||= {};
        current.learning.tests ||= {};
        const now = Date.now();

        if (kind === "star") {
            const old = current.learning.cards[id] || {};
            const previous = clampStars(old.stars);
            if (previous >= requested) {
                lastAbort = "STAR_ALREADY_COMPLETED";
                return;
            }
            if (previous + 1 !== requested) {
                lastAbort = `STAR_OUT_OF_SEQUENCE_${previous}_TO_${requested}`;
                return;
            }
            if (requested === 5 && !current.learning.tests?.[chapterId]?.passed) {
                lastAbort = "CHAPTER_NOT_PASSED";
                return;
            }
            current.learning.cards[id] = {
                ...old,
                stars: requested,
                collected: true,
                updatedAt: now
            };
            gainedExp = 5;
            addedStars = 1;
        } else {
            const old = current.learning.tests[id] || {};
            const previousBest = Number(old.best) || 0;
            current.learning.tests[id] = {
                ...old,
                passed: true,
                best: Math.max(previousBest, requested),
                at: now
            };
            gainedExp = old.passed ? 0 : 30;
        }

        // All B0 Kana and JLPT stars share the same atomic transaction and counters.
        // Rebuild counters from the exact committed card state each time.
        current.learning.stats = calculateLearningStats(current.learning.cards);
        current.learning.stats.updatedAt = now;
        current.learning.wordsSeen = current.learning.stats.collectedCards;
        if (gainedExp > 0) {
            current.progress = {
                ...current.progress,
                ...applyExp(current.progress, gainedExp),
                lastStudyAt: now
            };
        }
        current.system = { ...(current.system || {}), lastUpdatedAt: now };
        return current;
    }, { applyLocally: false });

    if (!transaction.committed) {
        const freshSnap = await get(targetRef);
        const fresh = freshSnap.val();
        if (kind === "star" && clampStars(fresh?.learning?.cards?.[id]?.stars) >= requested) {
            notify(fresh, 0);
            return { committed: true, alreadyCompleted: true, userData: fresh, awardedExp: 0, addedStars: 0 };
        }
        console.error("[LEARNING] Transaction aborted", { kind, id, requested, chapterId, lastAbort, attempts });
        throw Error(`LEARNING_TRANSACTION_ABORTED: ${lastAbort || "UNKNOWN"}`);
    }

    const userData = transaction.snapshot.val();
    notify(userData, gainedExp);
    return {
        committed: true,
        alreadyCompleted: false,
        userData,
        awardedExp: gainedExp,
        addedStars
    };
}

export function grantLearningStar(cardId, targetStars, chapterId = null) {
    return mutate("star", cardId, targetStars, chapterId);
}

export function grantLearningChapter(chapterId, score) {
    return mutate("chapter", chapterId, score);
}
