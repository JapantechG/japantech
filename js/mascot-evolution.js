
/* ==========================================
   BATLINGO - MASCOT EVOLUTION
========================================== */

import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

import { MASCOT_CONFIG } from "./mascot.js";
import { getExpRequired } from "./progression.js";
import { updateHomePlayer, showHome } from "./home.js";

/* ==========================================
   EVOLUTION CONFIG
========================================== */

export const EVOLUTION_STAGES = [
    { evolution: 0, level: 1,  name: "BABY" },
    { evolution: 1, level: 10, name: "JUNIOR" },
    { evolution: 2, level: 25, name: "WARRIOR" },
    { evolution: 3, level: 45, name: "ELITE" },
    { evolution: 4, level: 70, name: "LEGENDARY" }
];

const $ = id => document.getElementById(id);

let initialized = false;
let saving = false;
let activeUid = null;
let loadVersion = 0;

const evoScreen = () => $("mascotEvolutionScreen");

function safeEvolution(value) {
    return Math.min(
        4,
        Math.max(0, Math.floor(Number(value) || 0))
    );
}

function getImagePath(type, evolution) {
    if (evolution === 0) {
        return MASCOT_CONFIG[type].image;
    }

    return `assets/mascot/${type}-stage-${evolution + 1}.png`;
}

/* ==========================================
   IMAGE WITH FALLBACK
========================================== */

function renderImage(type, evolution) {

    const image = $("mascotEvoImage");
    const fallback = $("mascotEvoFallback");

    if (!image) return;

    const config = MASCOT_CONFIG[type];
    const primary = getImagePath(type, evolution);
    const original = config.image;

    let triedOriginal = primary === original;

    image.onload = () => {
        image.hidden = false;
        fallback.hidden = true;
    };

    image.onerror = () => {
        if (!triedOriginal) {
            triedOriginal = true;
            image.src = original;
            return;
        }

        image.hidden = true;
        fallback.hidden = false;
    };

    image.hidden = true;
    fallback.hidden = false;
    fallback.textContent = config.emoji;

    image.src = primary;
}

/* ==========================================
   RENDER EVOLUTION STAGES
========================================== */

function renderStages(evolution, playerLevel) {

    const container = $("mascotEvoStages");
    if (!container) return;

    container.replaceChildren();

    EVOLUTION_STAGES.forEach(stage => {

        const item = document.createElement("div");
        item.className = "mascot-evo-stage";

        const isCurrent =
            stage.evolution === evolution;

        const isComplete =
            stage.evolution < evolution;

        const isLocked =
            stage.evolution > evolution &&
            playerLevel < stage.level;

        if (isCurrent) item.classList.add("current");
        if (isComplete) item.classList.add("complete");
        if (isLocked) item.classList.add("locked");

        const icon = document.createElement("div");
        icon.className = "mascot-evo-stage-icon";
        icon.textContent = isCurrent
            ? "⭐"
            : isComplete
                ? "✅"
                : isLocked
                    ? "🔒"
                    : "✨";

        const name = document.createElement("strong");
        name.textContent = stage.name;

        const level = document.createElement("small");
        level.textContent = `LV. ${stage.level}`;

        item.append(icon, name, level);
        container.appendChild(item);
    });
}

/* ==========================================
   RENDER ALL
========================================== */

export function renderMascotEvolution(userData) {

    const configId = userData?.mascot?.id;
    const config = MASCOT_CONFIG[configId];

    if (!config) {
        $("mascotEvoMessage").textContent =
            "Bạn chưa chọn Mascot.";
        return;
    }

    const progress = userData?.progress || {};

    const level = Math.max(
        1, Number(progress.level) || 1
    );

    const exp = Math.max(
        0, Number(progress.exp) || 0
    );

    const required = getExpRequired(level);
    const percent = Math.min(
        100, exp / required * 100
    );

    const evolution =
        safeEvolution(userData.mascot.evolution);

    const stage = EVOLUTION_STAGES[evolution];
    const next = EVOLUTION_STAGES[evolution + 1];

    $("mascotEvoName").textContent = config.name;
    $("mascotEvoTitle").textContent = config.title;
    $("mascotEvoDescription").textContent =
        config.description;

    $("mascotEvoStageBadge").textContent =
        `STAGE ${evolution + 1} · ${stage.name}`;

    $("mascotEvoLevel").textContent = `LV. ${level}`;

    $("mascotEvoExpText").textContent =
        `${exp} / ${required} EXP`;

    $("mascotEvoExpFill").style.width =
        `${percent}%`;

    $("mascotEvoSkillName").textContent =
        config.skill.name;

    $("mascotEvoSkillDescription").textContent =
        config.skill.description;

    const traits = $("mascotEvoTraits");
    traits.replaceChildren();

    config.traits.forEach(trait => {
        const span = document.createElement("span");
        span.textContent = trait;
        traits.appendChild(span);
    });

    renderImage(config.id, evolution);
    renderStages(evolution, level);

    const button = $("mascotEvoEvolveBtn");

    button.disabled = true;

    if (!next) {
        $("mascotEvoNextName").textContent =
            "MAX EVOLUTION";

        $("mascotEvoRequirement").textContent =
            "Legendary stage reached";

        button.textContent = "MAX LEVEL";
        return;
    }

    $("mascotEvoNextName").textContent = next.name;
    $("mascotEvoRequirement").textContent =
        `Required Player LV. ${next.level}`;

    if (level >= next.level && !saving) {
        button.disabled = false;
        button.textContent = "✨ EVOLVE";
    } else {
        button.textContent = saving
            ? "SAVING..."
            : "🔒 LOCKED";
    }
}

/* ==========================================
   SYNC LOCAL DATA
========================================== */

export function syncMascotEvolution(userData) {

    if (!userData) return;

    window.currentUserData = userData;

    if (
        evoScreen() &&
        !evoScreen().classList.contains("hidden")
    ) {
        renderMascotEvolution(userData);
    }
}

/* ==========================================
   OPEN SCREEN
========================================== */

export async function openMascotEvolution() {

    const user = auth.currentUser;

    if (!user) {
        window.BatLingoAuthUI?.open();
        return;
    }

    if (saving) return;

    const uid = user.uid;
    const version = ++loadVersion;
    activeUid = uid;

    const message = $("mascotEvoMessage");
    message.textContent = "";

    // Hide Home/Setup while pet screen is open.
    $("setupScreen")?.classList.add("hidden");
    evoScreen()?.classList.remove("hidden");

    document.body.style.overflow = "hidden";

    const data = window.currentUserData;

    if (data?.mascot?.id) {
        renderMascotEvolution(data);
    } else {
        message.textContent = "Loading Mascot...";
    }

    try {
        // Read current Firebase state before displaying
        // evolution availability.
        const snapshot = await get(
            ref(db, `users/${uid}`)
        );

        if (
            version !== loadVersion ||
            auth.currentUser?.uid !== uid ||
            activeUid !== uid
        ) return;

        if (!snapshot.exists()) {
            throw new Error("PLAYER_NOT_FOUND");
        }

        const fresh = snapshot.val();

        window.currentUserData = fresh;
        updateHomePlayer(fresh);
        renderMascotEvolution(fresh);

        if (!fresh?.mascot?.id) {
            message.textContent =
                "Vui lòng chọn Mascot lần đầu.";
        }

    } catch (error) {
        console.error("[MASCOT EVO] Load failed:", error);

        if (version === loadVersion) {
            message.textContent =
                "Không thể tải dữ liệu Mascot từ Firebase.";
            $("mascotEvoEvolveBtn").disabled = true;
        }
    }
}

/* ==========================================
   CLOSE SCREEN
========================================== */

export function closeMascotEvolution() {

    if (saving) return;

    ++loadVersion;
    activeUid = null;

    evoScreen()?.classList.add("hidden");

    document.body.style.overflow = "";

    showHome();
}


/* ==========================================
   EVOLVE MASCOT - FIREBASE
========================================== */

async function evolveMascot() {

    if (saving) return;

    const user = auth.currentUser;

    if (!user || user.uid !== activeUid) return;

    const uid = user.uid;

    const data = window.currentUserData;

    const expectedEvolution = safeEvolution(
        data?.mascot?.evolution
    );

    const expectedMascotId = data?.mascot?.id;

    const next = EVOLUTION_STAGES[
        expectedEvolution + 1
    ];

    if (!next) return;

    const confirmed = window.confirm(
        `Tiến hóa Mascot lên ${next.name}?`
    );

    if (!confirmed) return;

    saving = true;

    const button = $("mascotEvoEvolveBtn");
    const message = $("mascotEvoMessage");

    button.disabled = true;
    button.textContent = "SAVING...";
    message.textContent = "";

    try {

        // =====================================
        // 1. READ LATEST USER DATA
        // =====================================

        const userRef = ref(
            db,
            `users/${uid}`
        );

        const snapshot = await get(userRef);

        if (!snapshot.exists()) {
            throw new Error("USER_NOT_FOUND");
        }

        if (
            auth.currentUser?.uid !== uid ||
            activeUid !== uid
        ) {
            return;
        }

        const latest = snapshot.val();

        const mascot = latest.mascot;

        if (!mascot || !MASCOT_CONFIG[mascot.id]) {
            throw new Error("MASCOT_NOT_FOUND");
        }

        if (mascot.id !== expectedMascotId) {
            throw new Error("MASCOT_CHANGED");
        }

        const playerLevel = Math.max(
            1,
            Number(latest.progress?.level) || 1
        );

        const currentEvolution = safeEvolution(
            mascot.evolution
        );

        console.log("[EVOLVE CHECK]", {
            playerLevel,
            mascotId: mascot.id,
            currentEvolution,
            nextEvolution: next.evolution
        });

        // =====================================
        // 2. VERIFY CURRENT STAGE
        // =====================================

        if (currentEvolution !== expectedEvolution) {
            throw new Error("EVOLUTION_CHANGED");
        }

        if (playerLevel < next.level) {
            throw new Error("LEVEL_NOT_ENOUGH");
        }

        // =====================================
        // 3. TRANSACTION ONLY EVOLUTION
        // =====================================

        const evolutionRef = ref(
            db,
            `users/${uid}/mascot/evolution`
        );

        const result = await runTransaction(
            evolutionRef,
            current => {

                // Firebase can initially provide null
                // before server data is available.
                //
                // We already checked that the mascot
                // and evolution exist using get().
                // Server retry will compare the real
                // stage if a newer value exists.

                if (current === null) {
                    return next.evolution;
                }

                const value = Number(current);

                if (
                    !Number.isInteger(value) ||
                    value !== expectedEvolution
                ) {
                    return;
                }

                return next.evolution;
            },
            { applyLocally: false }
        );

        if (
            auth.currentUser?.uid !== uid ||
            activeUid !== uid
        ) {
            return;
        }

        if (!result.committed) {
            throw new Error("EVOLUTION_CHANGED");
        }

        const savedEvolution =
            Number(result.snapshot.val());

        if (savedEvolution !== next.evolution) {
            throw new Error("EVOLUTION_SAVE_MISMATCH");
        }

        // =====================================
        // 4. RELOAD FULL USER DATA
        // =====================================

        const updatedSnapshot = await get(userRef);

        if (!updatedSnapshot.exists()) {
            throw new Error("USER_NOT_FOUND");
        }

        if (
            auth.currentUser?.uid !== uid ||
            activeUid !== uid
        ) {
            return;
        }

        const updatedUser = updatedSnapshot.val();

        window.currentUserData = updatedUser;

        updateHomePlayer(updatedUser);

        // =====================================
        // 5. UPDATE MASCOT SCREEN
        // =====================================

        message.textContent =
            `✨ Tiến hóa ${next.name} thành công!`;

        console.log("[MASCOT EVOLVED]", {
            mascot: updatedUser.mascot?.id,
            evolution: updatedUser.mascot?.evolution,
            playerLevel: updatedUser.progress?.level
        });

        window.dispatchEvent(
            new CustomEvent("batlingo-mascot-evolved", {
                detail: {
                    uid,
                    mascot: updatedUser.mascot,
                    userData: updatedUser
                }
            })
        );

    } catch (error) {

        console.error(
            "[MASCOT EVO] Save failed:",
            error
        );

        if (activeUid === uid) {

            switch (error.message) {

                case "LEVEL_NOT_ENOUGH":
                    message.textContent =
                        "Chưa đủ Level để tiến hóa.";
                    break;

                case "EVOLUTION_CHANGED":
                    message.textContent =
                        "Trạng thái Mascot đã thay đổi. Hãy mở lại màn hình.";
                    break;

                default:
                    message.textContent =
                        "Không thể tiến hóa. Vui lòng thử lại.";
                    break;
            }

            // Refresh data on failed transaction.
            try {
                const fresh = await get(
                    ref(db, `users/${uid}`)
                );

                if (
                    fresh.exists() &&
                    auth.currentUser?.uid === uid &&
                    activeUid === uid
                ) {
                    window.currentUserData = fresh.val();
                    updateHomePlayer(fresh.val());
                }

            } catch (refreshError) {
                console.warn(
                    "[MASCOT EVO] Refresh failed:",
                    refreshError
                );
            }
        }

    } finally {

        saving = false;

        if (
            auth.currentUser?.uid === uid &&
            activeUid === uid
        ) {
            renderMascotEvolution(
                window.currentUserData
            );
        }
    }
}


/* ==========================================
   INITIALIZATION
========================================== */

export function initMascotEvolution() {

    if (initialized) return;

    if (!evoScreen()) {
        console.warn("[MASCOT EVO] Screen missing.");
        return;
    }

    initialized = true;

    $("mascotEvoBackBtn")
        ?.addEventListener("click", closeMascotEvolution);

    $("mascotEvoEvolveBtn")
        ?.addEventListener("click", evolveMascot);
}
