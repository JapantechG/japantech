
/* ==========================================
   BATLINGO - JLPT REVIEW DATABASE
========================================== */

import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    runTransaction
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const JLPT_REVIEW_MAX = 50;
export const JLPT_REVIEW_BATCH = 10;
export const JLPT_REVIEW_STREAK = 3;

function getUID() {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error("Login required");
    return uid;
}

function rootRef() {
    return ref(db, `users/${getUID()}/jlptReview`);
}

function itemRef(key) {
    if (!/^n[1-5]_set\d+_(vocabulary|grammar|reading|listening)_m\d+_q\d+$/.test(key)) {
        throw new Error("Invalid review key");
    }

    return ref(
        db,
        `users/${getUID()}/jlptReview/items/${key}`
    );
}

function questionIdentity(q) {
    const level = String(q.level).toLowerCase();
    const setId = String(q.setId).toLowerCase();
    const category = String(q.category).toLowerCase();
    const mondai = Number(q.mondai);
    const questionId = Number(q.id ?? q.questionId);

    if (
        !/^n[1-5]$/.test(level) ||
        !/^set\d+$/.test(setId) ||
        !["vocabulary", "grammar", "reading", "listening"].includes(category) ||
        !Number.isSafeInteger(mondai) || mondai < 1 ||
        !Number.isSafeInteger(questionId) || questionId < 1
    ) {
        throw new Error("Invalid question identity");
    }

    return {
        key: `${level}_${setId}_${category}_m${mondai}_q${questionId}`,
        level: level.toUpperCase(),
        setId,
        category,
        mondai,
        questionId
    };
}

/* Save mistakes from one submitted exam.
   Atomic and idempotent per submission ID. */
export async function saveJLPTExamMistakes(result, submissionId) {
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(submissionId)) {
        throw new Error("Invalid submission ID");
    }

    const mistakes = result.questions
        .filter(q => q.selectedAnswer !== q.correctIndex)
        .map(questionIdentity);

    const now = Date.now();

    const transaction = await runTransaction(
        rootRef(),
        current => {
            const data = current || {};
            const items = { ...(data.items || {}) };
            const submissions = {
                ...(data.submissions || {})
            };

            if (submissions[submissionId]) {
                return; // Already processed
            }

            for (const q of mistakes) {
                const old = items[q.key];

                if (
                    !old &&
                    Object.keys(items).length >= JLPT_REVIEW_MAX
                ) {
                    continue;
                }

                items[q.key] = {
                    level: q.level,
                    setId: q.setId,
                    category: q.category,
                    mondai: q.mondai,
                    questionId: q.questionId,
                    correctStreak: 0,
                    wrongCount: (old?.wrongCount || 0) + 1,
                    addedAt: old?.addedAt || now,
                    lastReviewedAt: old?.lastReviewedAt || null
                };
            }

            submissions[submissionId] = now;

            return {
                ...data,
                items,
                submissions
            };
        },
        { applyLocally: false }
    );

    return transaction.committed;
}

/* Read current wrong-answer list */
export async function getJLPTReviewItems() {
    const snapshot = await get(
        ref(db, `users/${getUID()}/jlptReview/items`)
    );

    if (!snapshot.exists()) return [];

    return Object.entries(snapshot.val()).map(
        ([key, value]) => ({ key, ...value })
    );
}

/* Pick up to 10 review questions */
export async function getJLPTReviewBatch() {
    const items = await getJLPTReviewItems();

    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }

    return items.slice(0, JLPT_REVIEW_BATCH);
}

/* Update one question after a Review attempt */
export async function markJLPTReviewAnswer(key, correct) {
    const now = Date.now();

    const transaction = await runTransaction(
        itemRef(key),
        current => {
            if (!current) return;

            if (correct) {
                const streak =
                    (current.correctStreak || 0) + 1;

                if (streak >= JLPT_REVIEW_STREAK) {
                    return null;
                }

                return {
                    ...current,
                    correctStreak: streak,
                    lastReviewedAt: now
                };
            }

            return {
                ...current,
                correctStreak: 0,
                wrongCount: (current.wrongCount || 0) + 1,
                lastReviewedAt: now
            };
        },
        { applyLocally: false }
    );

    return transaction.committed;
}
