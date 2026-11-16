
import { auth, db } from "../firebase.js";
import { applyExp } from "../progression.js";

import {
    ref,
    get,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

function getUserRef() {

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error(
            "Bạn cần đăng nhập để lưu thẻ và EXP."
        );
    }

    return ref(db, `users/${uid}`);
}

export async function loadLearningProgress() {

    const snapshot = await get(getUserRef());

    if (!snapshot.exists()) {
        throw new Error(
            "Không tìm thấy hồ sơ người chơi trên Firebase."
        );
    }

    return snapshot.val();
}

/* ==========================================
   ATOMIC STAR + EXP TRANSACTION
========================================== */

async function mutate(kind, id, value) {

    let awarded = 0;

    const result = await runTransaction(
        getUserRef(),

        user => {

            if (!user?.progress) return;

            // Firebase có thể chạy lại callback.
            awarded = 0;

            user.learning ||= {};
            user.learning.cards ||= {};
            user.learning.tests ||= {};

            const now = Date.now();

            if (kind === "star") {

                const oldCard =
                    user.learning.cards[id] || {};

                const previousStars =
                    Number(oldCard.stars) || 0;

                // Chỉ nâng từng sao một.
                if (
                    !Number.isInteger(value) ||
                    value !== previousStars + 1 ||
                    value < 1 ||
                    value > 5
                ) {
                    return;
                }

                user.learning.cards[id] = {
                    ...oldCard,
                    stars: value,
                    collected: true,
                    updatedAt: now
                };

                awarded = 5;

                if (previousStars === 0) {
                    user.learning.wordsSeen =
                        (Number(user.learning.wordsSeen) || 0)
                        + 1;
                }

            } else if (kind === "test") {

                const score = Number(value);

                if (
                    !Number.isFinite(score) ||
                    score < 70 ||
                    score > 100
                ) {
                    return;
                }

                const oldTest =
                    user.learning.tests[id] || {};

                user.learning.tests[id] = {
                    ...oldTest,
                    passed: true,
                    best: Math.max(
                        score,
                        Number(oldTest.best) || 0
                    ),
                    at: now
                };

                // Test chương chỉ nhận thưởng lần đầu.
                awarded = oldTest.passed ? 0 : 30;

            } else {

                return;

            }

            if (awarded > 0) {

                const newProgress = applyExp(
                    user.progress,
                    awarded
                );

                user.progress = {
                    ...user.progress,
                    ...newProgress,
                    lastStudyAt: now
                };
            }

            user.system = {
                ...(user.system || {}),
                lastUpdatedAt: now
            };

            return user;
        },

        {
            applyLocally: false
        }
    );

    if (!result.committed) {

        const snapshot = await get(getUserRef());

        return {
            userData: snapshot.val(),
            awardedExp: 0,
            committed: false
        };
    }

    const userData = result.snapshot.val();

    window.currentUserData = userData;

    window.dispatchEvent(
        new CustomEvent(
            "batlingo-progress-updated",
            {
                detail: {
                    userData,
                    gainedExp: awarded
                }
            }
        )
    );

    return {
        userData,
        awardedExp: awarded,
        committed: true
    };
}

export function grantLearningStar(cardId, targetStars) {

    return mutate("star", cardId, targetStars);

}

export function grantLearningChapter(chapterId, score) {

    return mutate("test", chapterId, score);

}
