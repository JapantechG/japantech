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
    db
}
from "./firebase.js";


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
    if (
        !Number.isInteger(number) ||
        number < 1 ||
        number > 9999999
    ) {
        throw new Error(
            "BATLINGO_ID_OUT_OF_RANGE"
        );
    }


    return (
        "BLG-" +
        String(number).padStart(7, "0")
    );
}


/* =========================================================
   ALLOCATE BATLINGO ID

   system/lastBatlingoId

   0 → 1 → BLG-0000001
   1 → 2 → BLG-0000002
========================================================= */

async function allocateBatlingoId()
{
    const counterRef =
        ref(
            db,
            "system/lastBatlingoId"
        );


    const result =
        await runTransaction(
            counterRef,
            currentValue =>
            {
                const current =
                    Number(currentValue) || 0;


                if (
                    current >= 9999999
                ) {
                    return;
                }


                return current + 1;
            }
        );


    if (!result.committed) {

        throw new Error(
            "BATLINGO_ID_LIMIT_REACHED"
        );
    }


    const number =
        result.snapshot.val();


    return formatBatlingoId(
        number
    );
}


/* =========================================================
   DEFAULT USER DATA
========================================================= */

function createDefaultUserData(
    user,
    batlingoId
)
{
    const now =
        Date.now();


    return {

        /* =========================
           PROFILE
        ========================= */

        profile: {

            batlingoId,

            displayName:
                user.displayName ||
                user.email?.split("@")[0] ||
                "Player",

            photoURL:
                user.photoURL || "",

            provider:
                user.providerData?.[0]
                    ?.providerId || "",

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
    if (!user?.uid) {

        throw new Error(
            "USER_REQUIRED"
        );
    }


    const userRef =
        ref(
            db,
            `users/${user.uid}`
        );


    const snapshot =
        await get(
            userRef
        );


    /* =====================================================
       NEW USER
    ===================================================== */

    if (!snapshot.exists()) {

        console.log(
            "[USER] Creating new user..."
        );


        const batlingoId =
            await allocateBatlingoId();


        const userData =
            createDefaultUserData(
                user,
                batlingoId
            );


        await set(
            userRef,
            userData
        );


        console.log(
            "[USER] Created:",
            batlingoId
        );


        return userData;
    }


    /* =====================================================
       EXISTING USER

       Tuyệt đối KHÔNG set toàn bộ user.
    ===================================================== */

    const userData =
        snapshot.val();


    const now =
        Date.now();


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

    /*if (user.displayName) {

        updates[
            "profile/displayName"
        ] =
            user.displayName;
    }*/


    if (user.photoURL) {

        updates[
            "profile/photoURL"
        ] =
            user.photoURL;
    }


    await update(
        userRef,
        updates
    );


    console.log(
        "[USER] Loaded:",
        userData.profile?.batlingoId
    );


    /*
        Update object local để dữ liệu
        trả về khớp Firebase vừa update.
    */

    if (userData.profile) {

        userData.profile.lastLoginAt =
            now;


        if (user.displayName) {

            userData.profile.displayName =
                user.displayName;
        }


        if (user.photoURL) {

            userData.profile.photoURL =
                user.photoURL;
        }
    }


    if (userData.system) {

        userData.system.lastUpdatedAt =
            now;
    }


    return userData;
}
