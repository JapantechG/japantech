/* =========================================================
   BATLINGO USER DATABASE
========================================================= */

import {
    ref,
    get,
    set,
    update,
    runTransaction
}
from
"https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";


import {
    auth,db
}
from "./firebase.js";

import {
    calculateSoloExp,
    applyExp
}
from "./progression.js";
/* =========================================================
   USER SCHEMA
========================================================= */

export const USER_SCHEMA_VERSION = 1;


/* =========================================================
   BATLINGO ID

   BLG-0000001
   BLG-0000002
   ...
   BLG-9999999
========================================================= */

function formatBatlingoId(number)
{
    if (!Number.isInteger(number) || number < 1 ||number > 9999999) 
    {
        throw new Error("BATLINGO_ID_OUT_OF_RANGE");
    }

    return ("BLG-" + String(number).padStart(7, "0"));
}

/* =========================================================
   ALLOCATE BATLINGO ID

   system/lastBatlingoId

   0 → 1 → BLG-0000001
   1 → 2 → BLG-0000002
========================================================= */

async function allocateBatlingoId()
{
    const counterRef =ref(db,"system/lastBatlingoId");

    const result = await runTransaction(counterRef,currentValue =>
            {
                const current = Number(currentValue) || 0;

                if (current >= 9999999) 
                {
                    return;
                }

                return current + 1;
            }
        );

    if (!result.committed) 
    {
        throw new Error("BATLINGO_ID_LIMIT_REACHED");
    }

    const number =result.snapshot.val();

    return formatBatlingoId(number);
}


/* =========================================================
   DEFAULT USER DATA
========================================================= */

function createDefaultUserData(user,batlingoId)
{
    const now = Date.now();

    return {

        /* =========================
           PROFILE
        ========================= */

        profile: {

            batlingoId,

            email: user.email || "",

            displayName:
                user.displayName || user.email?.split("@")[0] || "Player",

            photoURL:
                user.photoURL || "",

            provider:
                user.providerData?.[0]?.providerId || "",

            createdAt:
                now,

            lastLoginAt:
                now,

            country: "",

            bio: "",

            spare01: "",
            spare02: "",
            spare03: ""
        },


        /* =========================
           NORMAL LEVEL
        ========================= */

        progress: {

            exp: 0,

            level: 1,

            totalExp: 0,

            streak: 0,

            longestStreak: 0,

            lastStudyAt: 0,

            spare01: 0,
            spare02: 0,
            spare03: 0
        },


        /* =========================
           PVP / RANK
        ========================= */

        rating: {

            elo: 1000,

            peakElo: 1000,

            rank: "UNRANKED",

            seasonId: "",

            spare01: 0,
            spare02: 0,
            spare03: ""
        },


        /* =========================
           CURRENCY
        ========================= */

        wallet: {

            coin: 0,

            gem: 0,

            totalCoinEarned: 0,

            totalGemEarned: 0,

            spare01: 0,
            spare02: 0,
            spare03: 0
        },


        /* =========================
           VIP
        ========================= */

        vip: {

            level: 0,

            exp: 0,

            lifetimeExp: 0,

            highestLevel: 0,

            totalSpent: 0,

            spare01: 0,
            spare02: 0,
            spare03: ""
        },


        /* =========================
           SUBSCRIPTION
        ========================= */

        subscription: {

            plan: "free",

            startedAt: 0,

            expiresAt: 0,

            autoRenew: false,

            spare01: "",
            spare02: "",
            spare03: ""
        },


        /* =========================
           CHARACTER
        ========================= */

        character: {

            characterId:
                "monkey",

            characterName:
                "",

            skinId:
                "default",

            avatarId:
                "default",

            frameId:
                "default",

            titleId:
                "",

            spare01: "",
            spare02: "",
            spare03: ""
        },


        /* =========================
           STATISTICS
        ========================= */

        stats: {

            totalGames: 0,

            soloGames: 0,

            pvpGames: 0,

            wins: 0,

            losses: 0,

            draws: 0,

            totalQuestions: 0,

            correctAnswers: 0,

            wrongAnswers: 0,

            bestCombo: 0,

            bestSoloScore: 0,

            totalPlayTime: 0,

            reviewCount: 0,

            spare01: 0,
            spare02: 0,
            spare03: 0,
            spare04: 0,
            spare05: 0
        },


        /* =========================
           LEARNING
        ========================= */

        learning: {

            targetLanguage:
                "ja",

            jlptLevel:
                "n1",

            wordsSeen: 0,

            wordsLearned: 0,

            wordsMastered: 0,

            reviewCount: 0,

            lastReviewAt: 0,

            spare01: 0,
            spare02: 0,
            spare03: 0
        },


        /* =========================
           INVENTORY
        ========================= */

        inventory: {

            spare01: "",
            spare02: "",
            spare03: ""
        },


        /* =========================
           SETTINGS
        ========================= */

        settings: {

            uiLanguage:
                "vi",

            targetLanguage:
                "ja",

            music: true,

            sound: true,

            musicVolume: 0.35,

            sfxVolume: 1,

            spare01: "",
            spare02: "",
            spare03: ""
        },


        /* =========================
           SYSTEM
        ========================= */

        system: {

            schemaVersion:
                USER_SCHEMA_VERSION,

            accountStatus:
                "active",

            lastUpdatedAt:
                now,

            spare01: "",
            spare02: "",
            spare03: ""
        }
    };
}


/* =========================================================
   ENSURE USER PROFILE

   Đây là function chính.

   Account mới:
       → cấp BLG ID
       → tạo database

   Account cũ:
       → KHÔNG reset
       → update login info
========================================================= */

export async function ensureUserProfile(
    user
)
{
    if (!user?.uid) 
    {
        throw new Error("USER_REQUIRED");
    }

    const userRef =ref(db,`users/${user.uid}`);

    const snapshot =await get(userRef);

    /* =====================================================
       NEW USER
    ===================================================== */

    if (!snapshot.exists()) 
    {
        console.log("[USER] Creating new user...");

        const batlingoId = await allocateBatlingoId();

        const userData = createDefaultUserData(user,batlingoId);

        await set(userRef,userData);

        console.log("[USER] Created:",batlingoId);

        return userData;
    }

    /* =====================================================
       EXISTING USER

       Tuyệt đối KHÔNG set toàn bộ user.
    ===================================================== */

    const userData = snapshot.val();

    const now = Date.now();

    const updates = {

        "profile/lastLoginAt":
            now,

        "system/lastUpdatedAt":
            now
    };

    /*
        Google avatar/name có thể thay đổi.

        Đồng bộ lại từ Firebase Auth.
    */

    if (user.photoURL) 
    {
        updates["profile/photoURL"] = user.photoURL;
    }

    await update(userRef,updates);

    console.log("[USER] Loaded:",userData.profile?.batlingoId);

    /*
        Update object local để dữ liệu
        trả về khớp Firebase vừa update.
    */

    if (userData.profile) 
    {
        userData.profile.lastLoginAt = now;

        if (user.photoURL) 
        {
            userData.profile.photoURL = user.photoURL;
        }
    }

    if (userData.system) 
    {
        userData.system.lastUpdatedAt = now;
    }

    return userData;
}

/* =========================================================
   UPDATE USER PROFILE
========================================================= */

export async function updateUserProfile({displayName,bio})
{
    const user = window.currentUser;

    if (!user?.uid) 
    {
        throw new Error("USER_NOT_LOGGED_IN");
    }


    /* =========================================
       VALIDATE DISPLAY NAME
    ========================================= */

    const cleanName = String(displayName || "").trim();

    if (cleanName.length < 2 || cleanName.length > 20) 
    {
        throw new Error("INVALID_DISPLAY_NAME");
    }

    /* =========================================
       VALIDATE BIO
    ========================================= */

    const cleanBio = String(bio || "").trim();

    if (cleanBio.length > 100) 
    {
        throw new Error("BIO_TOO_LONG");
    }

    const now = Date.now();

    /* =========================================
       UPDATE FIREBASE

       Chỉ update field cho phép.
       Không đụng BLG ID / createdAt...
    ========================================= */

    const userRef =ref(db,`users/${user.uid}`);

    await update(userRef,
        {
            "profile/displayName":
                cleanName,

            "profile/bio":
                cleanBio,

            "system/lastUpdatedAt":
                now
        }
    );


    /* =========================================
       UPDATE LOCAL DATA
    ========================================= */

    if (window.currentUserData?.profile) 
    {
        window.currentUserData.profile.displayName = cleanName;

        window.currentUserData.profile.bio = cleanBio;

        window.currentUserData.system.lastUpdatedAt =now;
    }

    return {
        displayName:
            cleanName,

        bio:
            cleanBio
    };
}

/* =========================================================
   SAVE SOLO RESULT
========================================================= */

export async function saveSoloResult({score,questions,correct,wrong,bestCombo})
{
    const user = window.currentUser;

    if (!user?.uid) 
    {
        console.log("[SOLO] Guest result not saved.");

        return null;
    }

    /* =====================================================
       CALCULATE EXP
    ===================================================== */

    const gainedExp = calculateSoloExp({correct,wrong});

    const userRef =ref(db,`users/${user.uid}`);

    /* =====================================================
       TRANSACTION

       Stats + Progress cùng transaction.
    ===================================================== */

    const result = await runTransaction(userRef,current => 
       {
                if (!current) 
                {
                    return current;
                }

                const stats = current.stats || {};

                const progress = current.progress || {};

                /* =========================================
                   STATS
                ========================================= */

                current.stats = {
                    ...stats,

                    totalGames:
                        (Number(stats.totalGames) || 0) + 1,

                    soloGames:
                        (Number(stats.soloGames) || 0) + 1,

                    totalQuestions:
                        (Number(stats.totalQuestions) || 0) + questions,

                    correctAnswers:
                        (Number(stats.correctAnswers) || 0 ) + correct,

                    wrongAnswers:
                        (Number(stats.wrongAnswers) || 0) + wrong,

                    bestCombo:
                        Math.max(Number(stats.bestCombo) || 0,bestCombo),

                    bestSoloScore:
                        Math.max(Number(stats.bestSoloScore) || 0,score)
                };

                /* =========================================
                   EXP / LEVEL
                ========================================= */

                const newProgress = applyExp(progress,gainedExp);

                current.progress = {

                    ...progress,

                    level:
                        newProgress.level,

                    exp:
                        newProgress.exp,

                    totalExp:
                        newProgress.totalExp,

                    lastStudyAt:
                        Date.now()
                };

                /* =========================================
                   SYSTEM
                ========================================= */

                current.system = {

                    ...(current.system || {}),

                    lastUpdatedAt:
                        Date.now()

                };

                return current;
            }
        );

    if (!result.committed) 
    {
        throw new Error("SOLO_RESULT_UPDATE_FAILED");
    }

    const newUserData = result.snapshot.val();

    /* =====================================================
       UPDATE LOCAL CACHE
    ===================================================== */

    window.currentUserData = newUserData;

    console.log("[SOLO] Result saved:",
        {
            score,
            questions,
            correct,
            wrong,
            bestCombo,
            gainedExp,
            level:
                newUserData?.progress?.level
        }
    );

    return {
        userData:
            newUserData,

        gainedExp

    };
}


/* =============================================================
   REVIEW - WRONG QUESTIONS
   ============================================================= */

function getReviewGroupKey(config) 
{
    return `${config.studyMode}_${config.target}_${config.category}_${config.subMode}`;
}


/* =============================================================
   SAVE WRONG QUESTION
   ============================================================= */

export async function saveWrongQuestion(questionId, config, source = "solo") 
{
    const user = auth.currentUser;

    if (!user) 
    {
        console.warn("[REVIEW] User not logged in.");
        return;
    }

    if (questionId === undefined || questionId === null) 
    {
        console.warn("[REVIEW] Invalid question ID.");
        return;
    }

    if (!config) 
    {
        console.warn("[REVIEW] Missing config.");
        return;
    }

    const groupKey = getReviewGroupKey(config);

    const configRef = ref(db,`users/${user.uid}/review/${groupKey}/config`);

    const itemRef = ref(db,`users/${user.uid}/review/${groupKey}/items/${questionId}`);

    /* ---------------------------------------------------------
       CREATE GROUP CONFIG
       Chỉ tạo nếu config của group chưa tồn tại
       --------------------------------------------------------- */

    const configSnapshot = await get(configRef);

    if (!configSnapshot.exists()) 
    {
        await set(configRef, 
        {
            studyMode: config.studyMode,
            target: config.target,
            category: config.category,
            subMode: config.subMode
        });
    }

    /* ---------------------------------------------------------
       CREATE / UPDATE WRONG ITEM
       --------------------------------------------------------- */
      let isNewItem = false;
         
      await runTransaction(itemRef, current => 
      {
          if (!current) {
              isNewItem = true;
      
              return {
                  wrongCount: 1,
                  wrongSolo: source === "solo" ? 1 : 0,
                  wrongPvp: source === "pvp" ? 1 : 0,
                  correctStreak: 0,
                  lastWrongAt: Date.now()
              };
          }
      
          return {
              ...current,
              wrongCount: (current.wrongCount || 0) + 1,
              wrongSolo: (current.wrongSolo || 0) + (source === "solo" ? 1 : 0),
              wrongPvp: (current.wrongPvp || 0) + (source === "pvp" ? 1 : 0),
              correctStreak: 0,
              lastWrongAt: Date.now()
          };
      });

      if (isNewItem) 
      {
          const countRef = ref(db, `users/${user.uid}/stats/reviewCount`);
      
          await runTransaction(countRef, current => {
              return (current || 0) + 1;
          });
      }

    /* ---------------------------------------------------------
       NOTIFY UI
       Sau này dùng để update REVIEW badge
       --------------------------------------------------------- */

    window.dispatchEvent(new CustomEvent("batlingo-review-changed"));

    console.log("[REVIEW] Wrong question saved:",groupKey,questionId);
}

/* =============================================================
   GET REVIEW COUNT
   ============================================================= */

export async function getReviewCount() 
{
    const user = auth.currentUser;
    if (!user) return 0;

    return await ensureReviewCount();
}

/* =============================================================
   GET REVIEW ITEMS
   ============================================================= */

export async function getReviewItems() {
    const user = auth.currentUser;
    if (!user) return [];

    const reviewRef = ref(db, `users/${user.uid}/review`);
    const snapshot = await get(reviewRef);

    if (!snapshot.exists()) return [];

    const reviewData = snapshot.val();
    const result = [];

    Object.entries(reviewData).forEach(([groupKey, group]) => {
        if (!group.config || !group.items) return;

        Object.entries(group.items).forEach(([questionId, item]) => {
            result.push({
                groupKey,
                questionId,
                config: group.config,
                ...item
            });
        });
    });

    return result;
}

/* =============================================================
   REVIEW CORRECT
   ============================================================= */

export async function markReviewCorrect(groupKey, questionId) {
    const user = auth.currentUser;
    if (!user) return { mastered: false, streak: 0 };

    const itemRef = ref(
        db,
        `users/${user.uid}/review/${groupKey}/items/${questionId}`
    );

    let newStreak = 0;
    let mastered = false;

    await runTransaction(itemRef, current => {
        if (!current) return current;

        newStreak = (current.correctStreak || 0) + 1;

        if (newStreak >= 3) {
            mastered = true;
            return null;
        }

        return {
            ...current,
            correctStreak: newStreak,
            lastReviewAt: Date.now()
        };
    });

   if (mastered) 
   {
       const countRef = ref(db, `users/${user.uid}/stats/reviewCount`);
   
       await runTransaction(countRef, current => {
           return Math.max(0, (current || 0) - 1);
       });
   }

    window.dispatchEvent(new CustomEvent("batlingo-review-changed"));

    return {
        mastered,
        streak: newStreak
    };
}

/* =============================================================
   REVIEW WRONG
   ============================================================= */

export async function markReviewWrong(groupKey, questionId) {
    const user = auth.currentUser;
    if (!user) return;

    const itemRef = ref(
        db,
        `users/${user.uid}/review/${groupKey}/items/${questionId}`
    );

    await runTransaction(itemRef, current => {
        if (!current) return current;

        return {
            ...current,
            correctStreak: 0,
            reviewWrongCount: (current.reviewWrongCount || 0) + 1,
            lastReviewAt: Date.now()
        };
    });
}

export async function ensureReviewCount() {
    const user = auth.currentUser;
    if (!user) return 0;

    const countRef = ref(db, `users/${user.uid}/stats/reviewCount`);
    const countSnapshot = await get(countRef);

    if (countSnapshot.exists()) {
        return countSnapshot.val() || 0;
    }

    const reviewRef = ref(db, `users/${user.uid}/review`);
    const reviewSnapshot = await get(reviewRef);

    let count = 0;

    if (reviewSnapshot.exists()) {
        const reviewData = reviewSnapshot.val();

        Object.values(reviewData).forEach(group => {
            if (!group.items) return;
            count += Object.keys(group.items).length;
        });
    }

    await set(countRef, count);

    console.log("[REVIEW] reviewCount initialized:", count);

    return count;
}
