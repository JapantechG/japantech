
/* =========================================================
   BATLINGO LEARNING FIREBASE
   FIX TRANSACTION ABORT / STAR 1
========================================================= */

import {
    auth,
    db
} from "../firebase.js";

import {
    applyExp
} from "../progression.js";


import {
    ref,
    get,
    onValue,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";



/* =========================================================
   USER REFERENCE
========================================================= */

function getUserRef() {

    const uid = auth.currentUser?.uid;

    if (!uid) {
        throw new Error("USER_NOT_LOGGED_IN");
    }

    return ref(db, `users/${uid}`);
}


/* =========================================================
   LOAD USER DATA
========================================================= */

export async function loadLearningProgress() {

    const snapshot = await get(getUserRef());

    if (!snapshot.exists()) {
        throw new Error("USER_PROFILE_NOT_FOUND");
    }

    return snapshot.val();
}


/* =========================================================
   SYNC USER DATA TO UI
========================================================= */

function notifyProgress(userData, gainedExp) {

    window.currentUserData = userData;

    window.dispatchEvent(
        new CustomEvent(
            "batlingo-progress-updated",
            {
                detail: {
                    userData,
                    gainedExp
                }
            }
        )
    );
}


/* =========================================================
   ATOMIC LEARNING TRANSACTION
========================================================= */

async function mutate(kind, id, value) {

  
      const targetRef = getUserRef();
      
      /* ==========================================
         LOAD USER AND PREPARE TRANSACTION CACHE
      ========================================== */
      
      const initialUser =
          await loadTransactionReadyUser(targetRef);
      
      console.log(
          "[LEARNING] Starting transaction:",
          {
              kind,
              id,
              value,
              currentStars:
                  initialUser.learning?.cards?.[id]?.stars || 0
          }
      );


    /* -----------------------------------------
       STEP 2: CHECK REQUEST
    ----------------------------------------- */

    if (kind === "star") {

        const requested = Number(value);

        if (
            !id ||
            !Number.isInteger(requested) ||
            requested < 1 ||
            requested > 5
        ) {
            throw new Error("INVALID_STAR_REQUEST");
        }

        const currentStars = Number(
            initialUser.learning?.cards?.[id]?.stars
        ) || 0;

        if (currentStars >= requested) {

            notifyProgress(initialUser, 0);

            return {
                committed: true,
                alreadyCompleted: true,
                userData: initialUser,
                awardedExp: 0
            };
        }

        if (requested !== currentStars + 1) {
            throw new Error(
                `STAR_SEQUENCE_INVALID: current=${currentStars}, requested=${requested}`
            );
        }
    }

    if (kind === "test") {

        const score = Number(value);

        if (
            !id ||
            !Number.isFinite(score) ||
            score < 70 ||
            score > 100
        ) {
            throw new Error("INVALID_CHAPTER_SCORE");
        }
    }

    /* -----------------------------------------
       STEP 3: RUN TRANSACTION
    ----------------------------------------- */

    let abortReason = "";
    let attemptCount = 0;

    const result = await runTransaction(
        targetRef,

        user => {

            attemptCount++;

            if (user === null) {
            
                abortReason = "TRANSACTION_USER_NULL";
            
                // Không ghi đè toàn bộ user.
                // Không tạo tài khoản mới tại đây.
                // Dừng transaction để bảo vệ dữ liệu.
            
                console.warn(
                    "[LEARNING] Transaction received null user"
                );
            
                return;
            }

            if (!user.progress) {

                abortReason = "TRANSACTION_PROGRESS_MISSING";
                return;
            }

            user.learning ||= {};
            user.learning.cards ||= {};
            user.learning.tests ||= {};

            const now = Date.now();

            let gained = 0;

            /* =====================================
               STAR
            ===================================== */

            if (kind === "star") {

                const oldCard =
                    user.learning.cards[id] || {};

                const previousStars =
                    Number(oldCard.stars) || 0;

                if (previousStars >= value) {

                    abortReason = "STAR_ALREADY_COMPLETED";
                    return;
                }

                if (value !== previousStars + 1) {

                    abortReason =
                        `STAR_SEQUENCE_CHANGED: ${previousStars} -> ${value}`;

                    return;
                }

                user.learning.cards[id] = {
                    ...oldCard,
                    stars: value,
                    collected: true,
                    updatedAt: now
                };

                if (previousStars === 0) {

                    user.learning.wordsSeen =
                        (Number(user.learning.wordsSeen) || 0) + 1;
                }

                gained = 5;
            }

            /* =====================================
               CHAPTER TEST
            ===================================== */

            else if (kind === "test") {

                const oldTest =
                    user.learning.tests[id] || {};

                user.learning.tests[id] = {
                    ...oldTest,
                    passed: true,
                    best: Math.max(
                        Number(oldTest.best) || 0,
                        Number(value)
                    ),
                    at: now
                };

                gained = oldTest.passed ? 0 : 30;

            } else {

                abortReason = "INVALID_MUTATION_KIND";
                return;
            }

            /* =====================================
               APPLY EXP
            ===================================== */

            if (gained > 0) {

                const nextProgress = applyExp(
                    user.progress,
                    gained
                );

                user.progress = {
                    ...user.progress,
                    ...nextProgress,
                    lastStudyAt: now
                };
            }

            user.system = {
                ...(user.system || {}),
                lastUpdatedAt: now
            };

            abortReason = "";

            return user;
        },

        {
            applyLocally: false
        }
    );

    /* -----------------------------------------
       STEP 4: VERIFY RESULT
    ----------------------------------------- */

    if (!result.committed) {

        const latestSnapshot = await get(targetRef);

        const latestUser = latestSnapshot.val();

        console.warn("[LEARNING FIREBASE] Aborted:", {
            kind,
            id,
            value,
            abortReason,
            attemptCount,
            profileExists: latestSnapshot.exists(),
            progressExists: Boolean(latestUser?.progress),
            currentStars:
                latestUser?.learning?.cards?.[id]?.stars ?? 0
        });

        if (
            kind === "star" &&
            Number(
                latestUser?.learning?.cards?.[id]?.stars
            ) >= Number(value)
        ) {

            notifyProgress(latestUser, 0);

            return {
                committed: true,
                alreadyCompleted: true,
                userData: latestUser,
                awardedExp: 0
            };
        }

        throw new Error(
            "LEARNING_TRANSACTION_ABORTED: " +
            (abortReason || "UNKNOWN")
        );
    }

    /* -----------------------------------------
       STEP 5: READ COMMITTED VALUES
    ----------------------------------------- */

    const userData = result.snapshot.val();

    let awardedExp = 0;

    if (kind === "star") {

        const before =
            Number(initialUser.progress.totalExp) || 0;

        const after =
            Number(userData.progress?.totalExp) || 0;

        // EXP thực tế nhận được từ transaction.
        awardedExp = Math.max(0, after - before);

    } else if (kind === "test") {

        awardedExp =
            initialUser.learning?.tests?.[id]?.passed
                ? 0
                : 30;
    }

    notifyProgress(userData, awardedExp);

    console.log("[LEARNING FIREBASE] Success:", {
        kind,
        id,
        value,
        awardedExp,
        stars: userData.learning?.cards?.[id]?.stars
    });

    return {
        committed: true,
        alreadyCompleted: false,
        userData,
        awardedExp
    };
}


/* =========================================================
   PUBLIC API
========================================================= */

export function grantLearningStar(cardId, targetStars) {

    return mutate("star", cardId, targetStars);
}

export function grantLearningChapter(chapterId, score) {

    return mutate("test", chapterId, score);
}

/* =========================================================
   WARM FIREBASE LOCAL CACHE

   runTransaction() có thể nhận NULL nếu dữ liệu
   chưa được đồng bộ vào local cache.

   onValue() nhận snapshot ban đầu sau khi dữ liệu
   tại đường dẫn đã được đồng bộ.
========================================================= */

function loadTransactionReadyUser(userRef) {

    return new Promise((resolve, reject) => {

        onValue(
            userRef,

            snapshot => {

                if (!snapshot.exists()) {
                    reject(
                        new Error("USER_PROFILE_NOT_FOUND")
                    );
                    return;
                }

                const userData = snapshot.val();

                if (!userData?.progress) {
                    reject(
                        new Error("USER_PROGRESS_NOT_FOUND")
                    );
                    return;
                }

                console.log(
                    "[LEARNING] Firebase cache ready:",
                    {
                        hasProgress: true,
                        level: userData.progress.level,
                        exp: userData.progress.exp
                    }
                );

                resolve(userData);
            },

            error => reject(error),

            { onlyOnce: true }
        );
    });
}
