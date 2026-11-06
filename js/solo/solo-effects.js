
/* =====================================================
   BATLINGO - SOLO MASCOT & COMBO EFFECTS
===================================================== */

const $ = id => document.getElementById(id);

const MILESTONES = new Map([
    [5,   ["COMBO x5", "NICE STREAK!"]],
    [10,  ["COMBO x10", "ON FIRE!"]],
    [20,  ["COMBO x20", "UNSTOPPABLE!"]],
    [30,  ["COMBO x30", "DOMINATING!"]],
    [50,  ["COMBO x50", "LEGENDARY!"]],
    [80,  ["COMBO x80", "MYTHIC!"]],
    [100, ["COMBO x100", "GODLIKE!"]]
]);

let overlayTimer = null;
const SOLO_FX_DURATION = {
    perfect: 1650,
    comboSmall: 1650,
    comboLarge: 1650,
    comboLegend: 1650,
    skill: 2000
};

// Prevent low-priority effects from replacing combos
let activeEffectPriority = 0;

let lastImageRequest = 0;

let enabled = false;
let root = null;
let mode = "survival";
let mascot = null;
let lastCombo = 0;

/* =====================================================
   CREATE UI
===================================================== */

function ensureUI() {

    const container = $("gameScreen")
        ?.querySelector(".game-container");

    if (!container) return false;

    if (!$("soloFxMascot")) {

        const hero = document.createElement("div");

        hero.id = "soloFxMascot";
        hero.className = "solo-fx-mascot";

        hero.innerHTML = `
            <div class="solo-fx-mascot-portrait">
                <img id="soloFxMascotImage"
                     alt="Mascot" hidden>

                <span id="soloFxMascotFallback">
                    🐾
                </span>
            </div>

            <div class="solo-fx-mascot-info">

                <strong id="soloFxMascotName">
                    MASCOT
                </strong>

                <span id="soloFxMascotSkill">
                    READY TO PLAY
                </span>

                <div class="solo-fx-skill-track">
                    <div id="soloFxSkillFill"></div>
                </div>

            </div>
        `;

        const header = container.querySelector(
            ".game-header"
        );

        if (header) {
            header.insertAdjacentElement(
                "afterend", hero
            );
        } else {
            container.prepend(hero);
        }
    }

    if (!$("soloFxOverlay")) {

        const overlay = document.createElement("div");

        overlay.id = "soloFxOverlay";
        overlay.className = "solo-fx-overlay";

        overlay.setAttribute(
            "aria-live", "polite"
        );

        overlay.innerHTML = `
            <div class="solo-fx-burst"></div>

            <div class="solo-fx-card">

                <div id="soloFxKicker"
                     class="solo-fx-kicker">
                </div>

                <div id="soloFxTitle"
                     class="solo-fx-title">
                </div>

                <div id="soloFxSubtitle"
                     class="solo-fx-subtitle">
                </div>

            </div>
        `;

        container.append(overlay);
    }

    root = $("soloFxMascot");

    return true;
}

/* =====================================================
   GET PLAYER MASCOT
===================================================== */

function getMascot() {

    const selected =
        window.currentUserData?.mascot;

    if (
        selected?.id === "monkey" ||
        selected?.id === "buffalo"
    ) {
        return selected;
    }

    return null;
}

/* =====================================================
   MASCOT IMAGE / EVOLUTION
===================================================== */

function showImage() {

    const image = $("soloFxMascotImage");
    const fallback = $("soloFxMascotFallback");

    if (!image || !fallback) return;

    const requestId = ++lastImageRequest;

    const kind = mascot?.id;

    if (!kind) {

        image.hidden = true;
        fallback.hidden = false;
        fallback.textContent = "🐾";

        return;
    }

    fallback.textContent =
        kind === "monkey" ? "🐒" : "🐃";

    fallback.hidden = false;
    image.hidden = true;

    const evolution = Math.max(
        0,
        Math.min(
            4,
            Math.floor(Number(mascot.evolution) || 0)
        )
    );

    const base =
        `assets/mascot/${kind}.webp`;

    const evolved = evolution
        ? `assets/mascot/${kind}-stage-${evolution + 1}.webp`
        : base;

    let triedBase = evolved === base;

    image.onload = () => {

        if (requestId !== lastImageRequest) {
            return;
        }

        image.hidden = false;
        fallback.hidden = true;
    };

    image.onerror = () => {

        if (requestId !== lastImageRequest) {
            return;
        }

        if (!triedBase) {

            triedBase = true;
            image.src = base;

        } else {

            image.hidden = true;
            fallback.hidden = false;
        }
    };

    image.src = evolved;
}

/* =====================================================
   START EFFECT SYSTEM
===================================================== */

export function startSoloEffects(
    type = "survival"
) {

    if (!ensureUI()) return;

    clearTimeout(overlayTimer);
   activeEffectPriority = 0;

    enabled = true;
    mode = type;
    lastCombo = 0;

    mascot = getMascot();

    $("soloFxOverlay")?.classList.remove(
        "visible",
        "combo",
        "perfect",
        "skill",
        "hurt"
    );

    root.classList.remove(
        "cheer",
        "ouch",
        "skill-active"
    );

    root.classList.toggle(
        "solo-fx-practice",
        mode === "practice"
    );

    $("soloFxMascotName").textContent =
        mascot
            ? mascot.id.toUpperCase()
            : "MASCOT";

    showImage();

    updateSoloSkill(0, false);
}

/* =====================================================
   STOP EFFECT SYSTEM
===================================================== */

export function stopSoloEffects() {

    enabled = false;

    clearTimeout(overlayTimer);
   activeEffectPriority = 0;

    $("soloFxOverlay")?.classList.remove(
        "visible",
        "combo",
        "perfect",
        "skill",
        "hurt"
    );

    root?.classList.remove(
        "cheer",
        "ouch",
        "skill-active"
    );
}

/* =====================================================
   MASCOT ID
===================================================== */

export function getSoloMascotId() {

    return mascot?.id ?? null;
}

/* =====================================================
   UPDATE MASCOT SKILL PROGRESS
===================================================== */

export function updateSoloSkill(
    completedRounds,
    shieldReady = false
) {

    if (!enabled || !root) return;

    const text = $("soloFxMascotSkill");
    const bar = $("soloFxSkillFill");

    if (!mascot) {

        text.textContent = "CHOOSE A MASCOT";
        bar.style.width = "0%";

        return;
    }

    if (mode === "practice") {

        text.textContent =
            "PRACTICE · NO SKILLS";

        bar.style.width = "0%";

        return;
    }

    const interval =
        mascot.id === "monkey" ? 20 : 30;

    const ready =
        mascot.id === "monkey" &&
        shieldReady;

    const progress = ready
        ? interval
        : Math.max(
            0,
            completedRounds % interval
        );

    if (ready) {

        text.textContent =
            "🛡 SHIELD READY";

    } else if (mascot.id === "monkey") {

        text.textContent =
            `🛡 SHIELD ${progress}/${interval}`;

    } else {

        text.textContent =
            `❤️ HEAL ${progress}/${interval}`;
    }

    bar.style.width =
        `${Math.min(
            100,
            progress / interval * 100
        )}%`;
}

/* =====================================================
   MASCOT ANIMATION
===================================================== */

function animateMascot(className) {

    if (!enabled || !root) return;

    root.classList.remove(
        "cheer",
        "ouch",
        "skill-active"
    );

    // Restart CSS animation
    void root.offsetWidth;

    root.classList.add(className);
}

/* =====================================================
   ANIMATED BANNER
===================================================== */


function banner(
    title,
    subtitle,
    variant,
    kicker = "BATLINGO",
    duration = 2200,
    priority = 1
) {

    if (!enabled || !ensureUI()) return;

    const overlay = $("soloFxOverlay");

    if (!overlay) return;

    // Do not overwrite a more important effect
    if (
        overlay.classList.contains("visible") &&
        priority < activeEffectPriority
    ) {
        return;
    }

    clearTimeout(overlayTimer);

    activeEffectPriority = priority;

    overlay.classList.remove(
        "visible",
        "combo",
        "perfect",
        "skill",
        "hurt"
    );

    $("soloFxTitle").textContent = title;
    $("soloFxSubtitle").textContent = subtitle;
    $("soloFxKicker").textContent = kicker;

    // CSS animation follows display duration
    overlay.style.setProperty(
        "--solo-fx-duration",
        `${duration}ms`
    );

    void overlay.offsetWidth;

    overlay.classList.add(
        variant,
        "visible"
    );

    overlayTimer = setTimeout(() => {

        overlay.classList.remove("visible");

        activeEffectPriority = 0;
        overlayTimer = null;

    }, duration);
}


/* =====================================================
   CORRECT ANSWER EFFECT
===================================================== */


export function soloCorrectEffect({
    combo = 0,
    perfect = false
} = {}) {

    if (!enabled) return;

    animateMascot("cheer");

    if (combo > lastCombo) {

        lastCombo = combo;

        const milestone =
            MILESTONES.get(combo) ||
            (
                combo > 100 &&
                combo % 50 === 0
                    ? [
                        `COMBO x${combo}`,
                        "BEYOND LEGEND!"
                    ]
                    : null
            );

        if (milestone) {

            let duration =
                SOLO_FX_DURATION.comboSmall;

            if (combo >= 100) {

                duration =
                    SOLO_FX_DURATION.comboLegend;

            } else if (combo >= 30) {

                duration =
                    SOLO_FX_DURATION.comboLarge;
            }

            banner(
                milestone[0],
                milestone[1],
                "combo",
                "🔥 STREAK MILESTONE",
                duration,
                3
            );

            return;
        }
    }

    if (perfect) {

        banner(
            "PERFECT!",
            "LIGHTNING FAST",
            "perfect",
            "✨ GREAT ANSWER",
            SOLO_FX_DURATION.perfect,
            1
        );
    }
}


/* =====================================================
   WRONG ANSWER EFFECT
===================================================== */

export function soloWrongEffect({
    protectedByMascot = false
} = {}) {

    if (!enabled) return;

    lastCombo = 0;

    if (protectedByMascot) {

        animateMascot("skill-active");

   banner(
       "SHIELD SAVED!",
       "NO HP LOST",
       "skill",
       "🐒 MONKEY SKILL",
       SOLO_FX_DURATION.skill,
       2
   );
   
       } else {
   
           animateMascot("ouch");
       }
   }

/* =====================================================
   SKILL ACTIVATION EFFECT
===================================================== */

export function soloSkillEffect(kind) {

    if (!enabled) return;

    animateMascot("skill-active");

   if (kind === "heal") {
   
       banner(
           "+1 HP",
           "IRON WILL ACTIVATED",
           "skill",
           "🐃 BUFFALO SKILL",
           SOLO_FX_DURATION.skill,
           2
       );
   }
   
   if (kind === "shield") {
   
       banner(
           "SHIELD READY",
           "NEXT WRONG ANSWER IS BLOCKED",
           "skill",
           "🐒 MONKEY SKILL",
           SOLO_FX_DURATION.skill,
           2
       );
   }
}


/* =====================================================
   GAME OVER - SAD MASCOT
===================================================== */

export function showSoloGameOverMascot() {

    const gameOver =
        document.getElementById("gameOverScreen");

    const card =
        gameOver?.querySelector(".game-over-card");

    if (!card) return;

    const playerMascot =
        getMascot();

    let container =
        document.getElementById(
            "soloGameOverMascot"
        );

    if (!container) {

        container = document.createElement("div");

        container.id = "soloGameOverMascot";
        container.className =
            "solo-gameover-mascot";

        container.innerHTML = `
            <div class="solo-gameover-mascot-image">
                <img id="soloGameOverMascotImg"
                     alt="Sad Mascot" hidden>

                <span id="soloGameOverMascotEmoji">
                    🐾
                </span>
            </div>

            <div class="solo-gameover-mascot-message">
                <strong>
                    DON'T GIVE UP!
                </strong>

                <span>
                    Your Mascot is waiting
                    for another battle.
                </span>
            </div>
        `;

        const title =
            card.querySelector(".game-over-title");

        if (title) {

            title.insertAdjacentElement(
                "afterend",
                container
            );

        } else {

            card.prepend(container);
        }
    }

    const image =
        document.getElementById(
            "soloGameOverMascotImg"
        );

    const emoji =
        document.getElementById(
            "soloGameOverMascotEmoji"
        );

    const kind = playerMascot?.id;

    // Reset previous animation
    container.classList.remove("sad-active");

    if (kind === "monkey" ||
        kind === "buffalo") {

        emoji.textContent =
            kind === "monkey" ? "🐒" : "🐃";

        emoji.hidden = false;
        image.hidden = true;

        const evolution = Math.max(
            0,
            Math.min(
                4,
                Math.floor(
                    Number(playerMascot.evolution) || 0
                )
            )
        );

        const base =
            `assets/mascot/${kind}.webp`;

        const stage = evolution
            ? `assets/mascot/${kind}-stage-${evolution + 1}.webp`
            : base;

        let triedBase = stage === base;

         image.onload = () => {
             image.hidden = false;
             emoji.hidden = true;
         };

        image.onerror = () => {

            if (!triedBase) {

                triedBase = true;
                image.src = base;

            } else {

                image.hidden = true;
                emoji.hidden = false;
            }
        };

        image.src = stage;

    } else {

        image.hidden = true;
        image.removeAttribute("src");

        emoji.textContent = "🐾";
        emoji.hidden = false;
    }

    // Force animation restart
    void container.offsetWidth;

    container.classList.add("sad-active");
}

