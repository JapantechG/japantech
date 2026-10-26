/* ==========================================
   BATLINGO - SHARED LEADERBOARD
========================================== */

import { auth } from "./firebase.js";
import { RANK_SEASON } from "./rank-config.js";
import { getLeaderboard } from "./leaderboard-data.js";

/* ==========================================
   STATE
========================================== */

let currentTab = "level";
let previousScreen = null;
let requestId = 0;

const cache = new Map();
const CACHE_TTL = 30000;

/* ==========================================
   ELEMENTS
========================================== */

const $ = id => document.getElementById(id);

function getScreen() {
    return $("leaderboardScreen");
}

/* ==========================================
   HELPERS
========================================== */

function getMascotIcon(mascot) {

    switch (mascot) {
        case "buffalo":
            return "🐃";

        case "monkey":
            return "🐒";

        default:
            return "🐾";
    }
}

function getScore(player, type) {

    if (type === "rank") {
        return `${player.elo} ELO`;
    }

    return `Lv. ${player.level}`;
}

function createElement(tag, className = "", text = "") {

    const el = document.createElement(tag);

    if (className) {
        el.className = className;
    }

    el.textContent = text;

    return el;
}

function getPositionIcon(position) {

    const icons = {
        1: "🥇",
        2: "🥈",
        3: "🥉"
    };

    return icons[position] || `#${position}`;
}

/* ==========================================
   PLAYER CARD
========================================== */

function createPlayerRow(player, type, isTop = false) {

    const currentUid = auth.currentUser?.uid;

    const isMe = currentUid === player.uid;

    const row = createElement(
        "div",
        isTop
            ? "leaderboard-top-card"
            : "leaderboard-player-row"
    );

    if (isMe) {
        row.classList.add("is-me");
    }

    if (isTop) {
        row.classList.add(`top-${player.position}`);
    }

    const position = createElement(
        "div",
        "leaderboard-position",
        getPositionIcon(player.position)
    );

    const avatar = createElement(
        "div",
        "leaderboard-avatar",
        getMascotIcon(player.mascot)
    );

    const info = createElement(
        "div",
        "leaderboard-player-info"
    );

    const name = createElement(
        "div",
        "leaderboard-player-name",
        player.name
    );

    if (isMe) {
        name.append(
            createElement("span", "leaderboard-you", " YOU")
        );
    }

    const description = createElement(
        "div",
        "leaderboard-player-description",
        type === "rank"
            ? `${player.wins}W / ${player.losses}L`
            : `EXP ${player.exp.toLocaleString()}`
    );

    const score = createElement(
        "div",
        "leaderboard-player-score",
        getScore(player, type)
    );

    info.append(name, description);

    row.append(
        position,
        avatar,
        info,
        score
    );

    return row;
}

/* ==========================================
   RENDER TOP 3
========================================== */

function renderTopPlayers(players, type) {

    const container = $("leaderboardTop");

    container.replaceChildren();

    const topPlayers = players.slice(0, 3);

    if (topPlayers.length === 0) {
        return;
    }

    topPlayers.forEach(player => {

        container.append(
            createPlayerRow(player, type, true)
        );

    });
}

/* ==========================================
   RENDER PLAYER LIST
========================================== */

function renderPlayerList(players, type) {

    const container = $("leaderboardList");

    container.replaceChildren();

    const remainingPlayers = players.slice(3);

    if (remainingPlayers.length === 0) {

        container.append(
            createElement(
                "div",
                "leaderboard-empty",
                players.length === 0
                    ? "No players yet."
                    : "No more players."
            )
        );

        return;
    }

    remainingPlayers.forEach(player => {

        container.append(
            createPlayerRow(player, type)
        );

    });
}

/* ==========================================
   RENDER MY POSITION
========================================== */

function renderMyPosition(players, type) {

    const container = $("leaderboardMyRank");

    container.replaceChildren();

    const uid = auth.currentUser?.uid;

    if (!uid) {

        container.textContent = "Login to see your position.";
        return;
    }

    const myPlayer = players.find(
        player => player.uid === uid
    );

    if (!myPlayer) {

        container.textContent =
            "You are not in the displayed Top 100.";

        return;
    }

    const label = createElement(
        "div",
        "leaderboard-my-label",
        "YOUR POSITION"
    );

    container.append(
        label,
        createPlayerRow(myPlayer, type)
    );
}

/* ==========================================
   RENDER TAB STATE
========================================== */

function updateTabUI(type) {

    document.querySelectorAll(
        "#leaderboardScreen .leaderboard-tab"
    ).forEach(button => {

        const active = button.dataset.tab === type;

        button.classList.toggle("active", active);

        button.setAttribute(
            "aria-selected",
            String(active)
        );
    });

    const scoreLabels = {
        level: "LEVEL",
        pet: "PET LEVEL",
        rank: "ELO"
    };

    $("leaderboardScoreLabel").textContent =
        scoreLabels[type] || "SCORE";

    $("leaderboardSeason").textContent =
        type === "rank"
            ? `SEASON ${RANK_SEASON}`
            : "GLOBAL";
}

/* ==========================================
   LOAD DATA
========================================== */

async function loadLeaderboard(type) {

    const thisRequest = ++requestId;

    const top = $("leaderboardTop");
    const list = $("leaderboardList");
    const myRank = $("leaderboardMyRank");

    top.replaceChildren();
    list.replaceChildren();
    myRank.replaceChildren();

    list.textContent = "Loading leaderboard...";

    try {

        const cached = cache.get(type);

        let players;

        if (
            cached &&
            Date.now() - cached.time < CACHE_TTL
        ) {
            players = cached.players;
        } else {

            players = await getLeaderboard(type, 100);

            cache.set(type, {
                players,
                time: Date.now()
            });
        }

        // Bỏ qua phản hồi cũ khi chuyển tab quá nhanh.
        if (thisRequest !== requestId) {
            return;
        }

        renderTopPlayers(players, type);
        renderPlayerList(players, type);
        renderMyPosition(players, type);

    } catch (error) {

        if (thisRequest !== requestId) {
            return;
        }

        console.error(
            "[Leaderboard] Load failed:",
            error
        );

        list.textContent =
            "Unable to load leaderboard. Please try again.";
    }
}

/* ==========================================
   SWITCH TAB
========================================== */

export function switchLeaderboardTab(type) {

    if (!["level", "pet", "rank"].includes(type)) {
        return;
    }

    currentTab = type;

    updateTabUI(type);
    loadLeaderboard(type);
}

/* ==========================================
   OPEN LEADERBOARD
========================================== */

export function openLeaderboard(
    defaultTab = "level"
) {

    const screen = getScreen();

    if (!screen) {
        console.error("Leaderboard screen not found");
        return;
    }

    if (screen.classList.contains("hidden")) {

        // Ghi lại màn hình đang hiển thị.
        previousScreen = document.querySelector(
            ".rank-screen:not(.hidden), " +
            ".lobby-screen:not(.hidden), " +
            ".home-screen:not(.hidden), " +
            ".bat-home:not(.hidden)"
        );

        if (previousScreen) {
            previousScreen.classList.add("hidden");
        }
    }

    screen.classList.remove("hidden");

    switchLeaderboardTab(
        ["level", "pet", "rank"].includes(defaultTab)
            ? defaultTab
            : "level"
    );

    window.scrollTo(0, 0);
}

/* ==========================================
   CLOSE LEADERBOARD
========================================== */

export function closeLeaderboard() {

    const screen = getScreen();

    if (!screen) {
        return;
    }

    ++requestId;

    screen.classList.add("hidden");

    if (previousScreen) {
        previousScreen.classList.remove("hidden");
    }

    previousScreen = null;
}

/* ==========================================
   INITIALIZE
========================================== */

export function initLeaderboard() {

    const screen = getScreen();

    if (!screen) {
        return;
    }

    if (screen.dataset.initialized === "true") {
        return;
    }

    screen.dataset.initialized = "true";

    document.querySelectorAll(
        "#leaderboardScreen .leaderboard-tab"
    ).forEach(button => {

        button.addEventListener("click", () => {

            switchLeaderboardTab(
                button.dataset.tab
            );
        });
    });

    $("leaderboardBackBtn")?.addEventListener(
        "click",
        closeLeaderboard
    );
}
