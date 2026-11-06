
import { getExpRequired } from "./progression.js";

// ==========================================
// BATLINGO HOME CONTROLLER
// ==========================================

let initialized = false;

const modeNames = {
    solo: "SOLO BATTLE",
    flashcard: "FLASHCARD",
    pvp: "1 VS 1",
    rank: "RANKED BATTLE"
};

export function showHome() {

    document.getElementById("setupScreen")
        ?.classList.remove("hidden");

    document.getElementById("homeScreen")
        ?.classList.remove("hidden");

    document.getElementById("configScreen")
        ?.classList.add("hidden");

    document.getElementById("batHomeLanguageOptions")
        ?.classList.add("hidden");

    document.getElementById("batHomeLanguageBtn")
        ?.setAttribute("aria-expanded", "false");
}

export function showConfiguration(modeId) {

    const title = modeNames[modeId];

    if (!title) return false;

    document.getElementById("homeScreen")
        ?.classList.add("hidden");

    document.getElementById("configScreen")
        ?.classList.remove("hidden");

    const titleElement =
        document.getElementById("batConfigModeTitle");

    if (titleElement) {
        titleElement.textContent = title;
    }

    return true;
}

export function initHome({ onSelectMode } = {}) {

    if (initialized) return;
    initialized = true;

    // Select mode
    document.querySelectorAll("[data-home-mode]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const modeId = button.dataset.homeMode;

                onSelectMode?.(modeId);
            });

        });

    // Back to Home
    document.getElementById("batConfigBackBtn")
        ?.addEventListener("click", showHome);

    // Language dropdown
    const languageButton =
        document.getElementById("batHomeLanguageBtn");

    const languageOptions =
        document.getElementById("batHomeLanguageOptions");

    languageButton?.addEventListener("click", () => {

        if (!languageOptions) return;

        const isOpen =
            !languageOptions.classList.contains("hidden");

        languageOptions.classList.toggle("hidden", isOpen);

        languageButton.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );
    });

    document.addEventListener("click", event => {

        if (!event.target.closest(".bat-home-language")) {

            languageOptions?.classList.add("hidden");

            languageButton?.setAttribute(
                "aria-expanded", "false"
            );
        }
    });

    document.getElementById("homeLeaderboardBtn")
    ?.addEventListener("click", () => {

        openLeaderboard("level");

    });
}


/* ==========================================
   HOME - MASCOT IMAGE + EVOLUTION
========================================== */

function updateHomeMascot(userData = null) {

    const mascotImage =
        document.getElementById("batHomeMascotImage");

    const mascotFallback =
        document.getElementById("batHomeMascotFallback");

    if (!mascotImage || !mascotFallback) return;

    const mascotType = userData?.mascot?.id;

    if (mascotType !== "monkey" &&
        mascotType !== "buffalo") {

        mascotImage.hidden = true;
        mascotImage.removeAttribute("src");

        mascotFallback.textContent = "🐾";
        mascotFallback.classList.remove("hidden");

        return;
    }

    const evolution = Math.min(
        4,
        Math.max(
            0,
            Math.floor(Number(userData.mascot.evolution) || 0)
        )
    );

    const basePath =
        `assets/mascot/${mascotType}.webp`;

    const stagePath = evolution === 0
        ? basePath
        : `assets/mascot/${mascotType}-stage-${evolution + 1}.webp`;

    const emoji = mascotType === "monkey"
        ? "🐒"
        : "🐃";

    const requestId = String(
        (Number(mascotImage.dataset.requestId) || 0) + 1
    );

    mascotImage.dataset.requestId = requestId;

    mascotFallback.textContent = emoji;
    mascotFallback.classList.remove("hidden");
    mascotImage.hidden = true;

    let triedBase = stagePath === basePath;

    mascotImage.onload = () => {

        if (mascotImage.dataset.requestId !== requestId) {
            return;
        }

        mascotImage.hidden = false;
        mascotFallback.classList.add("hidden");
    };

    mascotImage.onerror = () => {

        if (mascotImage.dataset.requestId !== requestId) {
            return;
        }

        if (!triedBase) {
            triedBase = true;
            mascotImage.src = basePath;
            return;
        }

        mascotImage.hidden = true;
        mascotFallback.classList.remove("hidden");
    };

    mascotImage.src = stagePath;
}




/* ==========================================
   HOME PLAYER LEVEL / EXP
========================================== */

export function updateHomePlayer(userData = null) {

    const profile = userData?.profile || {};
    const progress = userData?.progress || {};

    // Player name
    const displayName =
        profile.displayName || "PLAYER";

    // Player level
    const level = Math.max(
        1,
        Number(progress.level) || 1
    );

    // Current level EXP
    const exp = Math.max(
        0,
        Number(progress.exp) || 0
    );

    // Same EXP formula as Profile
    const expRequired = getExpRequired(level);

    const expPercent = Math.min(
        100,
        Math.max(0, (exp / expRequired) * 100)
    );

    // DOM
    const nameElement =
        document.getElementById("batHomePlayerName");

    const levelElement =
        document.getElementById("batHomePlayerLevel");

    const expTextElement =
        document.getElementById("batHomeExpText");

    const expFillElement =
        document.getElementById("batHomeExpFill");

    // Update screen
    if (nameElement) {
        nameElement.textContent = displayName;
    }

    if (levelElement) {
        levelElement.textContent = `LV. ${level}`;
    }

    if (expTextElement) {
        expTextElement.textContent =
            `${exp} / ${expRequired}`;
    }

    if (expFillElement) {
        expFillElement.style.width =
            `${expPercent}%`;
    }

    // Update mascot image
    updateHomeMascot(userData);
}

/* ==========================================
   HOME - REVIEW COUNT
========================================== */

export function updateHomeReviewCount(count = 0) {

    const counter =
        document.getElementById("batHomeReviewCount");

    if (!counter) return;

    const total = Math.max(
        0,
        Number(count) || 0
    );

    counter.textContent = total;

    counter.classList.toggle(
        "hidden",
        total === 0
    );
}
