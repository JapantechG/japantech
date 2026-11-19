
import { getExpRequired } from "./progression.js";
import { t } from "./i18n.js";

/* =========================================================
   BATLINGO - HOME CONTROLLER

   - Home navigation
   - Configuration
   - Vietnamese fallback
   - Mascot / Evolution
   - Player Level / EXP
   - Review Count
   - Interface language change

   Default learning language: Japanese
========================================================= */

let initialized = false;
let currentModeId = null;


/* =========================================================
   MODE NAMES

   Keep i18n keys.
   Use Vietnamese when a translation is unavailable.
========================================================= */

const modeNames = {

    solo: {
        key: "battleMode.solo",
        fallback: "CHƠI ĐƠN"
    },

    flashcard: {
        key: "studyMode.flashcard",
        fallback: "THẺ GHI NHỚ"
    },

    pvp: {
        key: "battleMode.pvp",
        fallback: "ĐẤU 1V1"
    },

    rank: {
        key: "home.ranked",
        fallback: "ĐẤU XẾP HẠNG"
    }

};


/* =========================================================
   HELPERS
========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   GET TRANSLATED MODE TITLE
========================================================= */

function getModeTitle(modeId) {

    const mode = modeNames[modeId];

    if (!mode) return "";

    try {

        const translated = t(mode.key);

        if (
            typeof translated === "string" &&
            translated.trim() &&
            translated !== mode.key
        ) {
            return translated;
        }

    } catch (error) {

        console.warn(
            "[HOME] Translation unavailable:",
            mode.key,
            error
        );

    }

    return mode.fallback;
}


/* =========================================================
   SHOW HOME
========================================================= */

export function showHome() {

    currentModeId = null;

    $("setupScreen")
        ?.classList.remove("hidden");

    $("homeScreen")
        ?.classList.remove("hidden");

    $("configScreen")
        ?.classList.add("hidden");

}


/* =========================================================
   SHOW CONFIGURATION

   Used by Solo / Flashcard / Ranked
========================================================= */

export function showConfiguration(modeId) {

    const title = getModeTitle(modeId);

    if (!title) {
        console.warn(
            "[HOME] Invalid mode:",
            modeId
        );

        return false;
    }

    currentModeId = modeId;

    $("homeScreen")
        ?.classList.add("hidden");

    $("configScreen")
        ?.classList.remove("hidden");

    const titleElement =
        $("batConfigModeTitle");

    if (titleElement) {
        titleElement.textContent = title;
    }

    return true;
}


/* =========================================================
   UPDATE CONFIGURATION TITLE
   WHEN INTERFACE LANGUAGE CHANGES
========================================================= */

function updateConfigurationTitle() {

    if (!currentModeId) return;

    const titleElement =
        $("batConfigModeTitle");

    if (!titleElement) return;

    titleElement.textContent =
        getModeTitle(currentModeId);

}


/* =========================================================
   INITIALIZE HOME

   onSelectMode is handled by main.js
========================================================= */

export function initHome({ onSelectMode } = {}) {

    if (initialized) return;

    initialized = true;

    /* ==========================================
       SELECT HOME MODE
    ========================================== */

    document.querySelectorAll("[data-home-mode]")
        .forEach(button => {

            button.addEventListener(
                "click",
                () => {

                    const modeId =
                        button.dataset.homeMode;

                    if (!modeId) return;

                    onSelectMode?.(modeId);

                }
            );

        });


    /* ==========================================
       BACK TO HOME
    ========================================== */

    $("batConfigBackBtn")
        ?.addEventListener(
            "click",
            showHome
        );


    /* ==========================================
       LANGUAGE CHANGE

       Only interface language changes.
       Learning language remains Japanese.
    ========================================== */

    window.addEventListener(
        "batlingo-language-change",
        updateConfigurationTitle
    );

}


/* =========================================================
   HOME - MASCOT IMAGE + EVOLUTION
========================================================= */

function updateHomeMascot(userData = null) {

    const mascotImage =
        $("batHomeMascotImage");

    const mascotFallback =
        $("batHomeMascotFallback");

    if (
        !mascotImage ||
        !mascotFallback
    ) {
        return;
    }

    const mascotType =
        userData?.mascot?.id;


    /* ==========================================
       NO VALID MASCOT
    ========================================== */

    if (
        mascotType !== "monkey" &&
        mascotType !== "buffalo"
    ) {

        mascotImage.hidden = true;

        mascotImage.removeAttribute("src");

        mascotFallback.textContent = "🐾";

        mascotFallback.classList.remove(
            "hidden"
        );

        return;
    }


    /* ==========================================
       EVOLUTION STAGE

       evolution 0 -> Stage 1
       evolution 1 -> Stage 2
       evolution 2 -> Stage 3
       evolution 3 -> Stage 4
       evolution 4 -> Stage 5
    ========================================== */

    const evolution = Math.min(
        4,
        Math.max(
            0,
            Math.floor(
                Number(
                    userData.mascot.evolution
                ) || 0
            )
        )
    );


    /* ==========================================
       IMAGE PATHS
    ========================================== */

    const basePath =
        `assets/mascot/${mascotType}.webp`;

    const stagePath = evolution === 0
        ? basePath
        : `assets/mascot/${mascotType}-stage-${evolution + 1}.webp`;


    /* ==========================================
       FALLBACK EMOJI
    ========================================== */

    const emoji =
        mascotType === "monkey"
            ? "🐒"
            : "🐃";


    /* ==========================================
       REQUEST VERSION

       Prevent stale image callbacks.
    ========================================== */

    const requestId = String(
        (
            Number(
                mascotImage.dataset.requestId
            ) || 0
        ) + 1
    );

    mascotImage.dataset.requestId =
        requestId;

    mascotFallback.textContent = emoji;

    mascotFallback.classList.remove(
        "hidden"
    );

    mascotImage.hidden = true;


    /* ==========================================
       FALLBACK TO BASE IMAGE
    ========================================== */

    let triedBase =
        stagePath === basePath;


    /* ==========================================
       IMAGE LOADED
    ========================================== */

    mascotImage.onload = () => {

        if (
            mascotImage.dataset.requestId !==
            requestId
        ) {
            return;
        }

        mascotImage.hidden = false;

        mascotFallback.classList.add(
            "hidden"
        );

    };


    /* ==========================================
       IMAGE LOAD ERROR
    ========================================== */

    mascotImage.onerror = () => {

        if (
            mascotImage.dataset.requestId !==
            requestId
        ) {
            return;
        }

        if (!triedBase) {

            triedBase = true;

            mascotImage.src = basePath;

            return;
        }

        mascotImage.hidden = true;

        mascotFallback.classList.remove(
            "hidden"
        );

    };


    /* ==========================================
       START LOADING IMAGE
    ========================================== */

    mascotImage.src = stagePath;

}


/* =========================================================
   HOME - PLAYER LEVEL / EXP
========================================================= */

export function updateHomePlayer(userData = null) {

    const profile =
        userData?.profile || {};

    const progress =
        userData?.progress || {};


    /* ==========================================
       PLAYER NAME
    ========================================== */

    const displayName =
        profile.displayName ||
        "NGƯỜI CHƠI";


    /* ==========================================
       PLAYER LEVEL
    ========================================== */

    const level = Math.max(
        1,
        Number(progress.level) || 1
    );


    /* ==========================================
       CURRENT LEVEL EXP
    ========================================== */

    const exp = Math.max(
        0,
        Number(progress.exp) || 0
    );


    /* ==========================================
       EXP REQUIRED
    ========================================== */

    const expRequired =
        getExpRequired(level);


    /* ==========================================
       EXP PERCENT
    ========================================== */

    const expPercent = Math.min(
        100,
        Math.max(
            0,
            (exp / expRequired) * 100
        )
    );


    /* ==========================================
       DOM ELEMENTS
    ========================================== */

    const nameElement =
        $("batHomePlayerName");

    const levelElement =
        $("batHomePlayerLevel");

    const expTextElement =
        $("batHomeExpText");

    const expFillElement =
        $("batHomeExpFill");


    /* ==========================================
       UPDATE NAME
    ========================================== */

    if (nameElement) {

        nameElement.textContent =
            displayName;

    }


    /* ==========================================
       UPDATE LEVEL
    ========================================== */

    if (levelElement) {

        levelElement.textContent =
            `CẤP ${level}`;

    }


    /* ==========================================
       UPDATE EXP TEXT
    ========================================== */

    if (expTextElement) {

        expTextElement.textContent =
            `${exp} / ${expRequired}`;

    }


    /* ==========================================
       UPDATE EXP BAR
    ========================================== */

    if (expFillElement) {

        expFillElement.style.width =
            `${expPercent}%`;

    }


    /* ==========================================
       UPDATE MASCOT
    ========================================== */

    updateHomeMascot(userData);

}


/* =========================================================
   HOME - REVIEW COUNT
========================================================= */

export function updateHomeReviewCount(count = 0) {

    const counter =
        $("batHomeReviewCount");

    if (!counter) return;


    /* ==========================================
       VALIDATE COUNT
    ========================================== */

    const total = Math.max(
        0,
        Number(count) || 0
    );


    /* ==========================================
       UPDATE COUNT
    ========================================== */

    counter.textContent = total;


    /* ==========================================
       HIDE WHEN ZERO
    ========================================== */

    counter.classList.toggle(
        "hidden",
        total === 0
    );

}
