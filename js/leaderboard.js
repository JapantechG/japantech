/* ==========================================
   BATLINGO - SHARED LEADERBOARD
========================================== */

import { auth } from "./firebase.js";
import { RANK_SEASON } from "./rank-config.js";

import {
    getLeaderboard,
    syncLeaderboardProfile
} from "./leaderboard-data.js";

import {
    openPvpPlayerProfile
} from "./pvp-social.js";

/* ==========================================
   STATE
========================================== */

let currentTab = "level";
let rankLevel = "n5";
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

    if (type === "pet") {
        return `Pet Lv. ${player.mascotLevel}`;
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

     
   /* ==========================================
      PLAYER ACCOUNT AVATAR
      Use Firebase Profile photoURL
      NOT Mascot image
   ========================================== */
   
   const avatar = createElement(
       "div",
       "leaderboard-avatar"
   );
   
   // Fallback: first character of player's name.
   const fallback = createElement(
       "span",
       "leaderboard-avatar-fallback",
       String(player.name || "U")
           .trim()
           .charAt(0)
           .toUpperCase() || "U"
   );
   
   avatar.appendChild(fallback);
   
   // Account avatar from Firebase.
   const photoURL = String(
       player.photoURL || ""
   ).trim();
   
   if (/^https:\/\//i.test(photoURL)) {
   
       const img = document.createElement("img");
   
       img.src = photoURL;
       img.alt = `${player.name} avatar`;
   
       img.loading = "lazy";
       img.decoding = "async";
       img.referrerPolicy = "no-referrer";
   
       img.onload = () => {
           fallback.classList.add("hidden");
       };
   
       img.onerror = () => {
           img.remove();
           fallback.classList.remove("hidden");
       };
   
       avatar.appendChild(img);
   }


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
              ? `Lv.${player.level} · ${player.wins}W / ${player.losses}L`
      
              : type === "pet"
                  ? `Lv.${player.level} · Pet Stage ${player.mascotEvolution + 1}`
      
                  : `EXP ${player.exp.toLocaleString()} · ELO ${player.elo}`
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
      
         /* ==========================================
         CLICK PLAYER -> PUBLIC PROFILE
      ========================================== */
      
      row.classList.add("leaderboard-clickable");
      
      row.setAttribute("role", "button");
      row.setAttribute("tabindex", "0");
      
      row.setAttribute(
          "aria-label",
          `View ${player.name}'s profile`
      );
      
      const openPlayer = () => {
      
          openPvpPlayerProfile(player.uid)
              .catch(error => {
                  console.error(
                      "[Leaderboard] Open profile:",
                      error
                  );
              });
      };
      
      row.addEventListener("click", openPlayer);
      
      row.addEventListener("keydown", event => {
      
          if (
              event.key === "Enter" ||
              event.key === " "
          ) {
              event.preventDefault();
              openPlayer();
          }
      });

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
        ? `SEASON ${RANK_SEASON} · ${rankLevel.toUpperCase()}`
        : "GLOBAL";
}

/* ==========================================
   LOAD DATA
========================================== */

async function loadLeaderboard(type) {

    const thisRequest = ++requestId;

   const cacheKey =
    type === "rank"
        ? `rank:${rankLevel}`
        : type;

    const top = $("leaderboardTop");
    const list = $("leaderboardList");
    const myRank = $("leaderboardMyRank");

    top.replaceChildren();
    list.replaceChildren();
    myRank.replaceChildren();

    list.textContent = "Loading leaderboard...";

    try {

        const cached = cache.get(cacheKey);

        let players;

        if (
            cached &&
            Date.now() - cached.time < CACHE_TTL
        ) {
            players = cached.players;
        } else {

            await syncLeaderboardProfile().catch(error => {
                console.warn(
                    "[Leaderboard] Sync failed:",
                    error
                );
            });
            
            players = await getLeaderboard(
                type,
                100,
                rankLevel
            );

            cache.set(cacheKey, {
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
   SWITCH LEADERBOARD TAB
========================================== */

export function switchLeaderboardTab(type) {

    if (!["level", "pet", "rank"].includes(type)) {
        return;
    }

    currentTab = type;

    // Update LEVEL / PET / RANK tab.
    updateTabUI(type);

    // Show N5-N1 buttons only for RANK.
    const rankLevels = $("leaderboardRankLevels");

    if (rankLevels) {
        rankLevels.classList.toggle(
            "hidden",
            type !== "rank"
        );
    }

    // Update selected JLPT level.
    updateRankLevelButtons();

    // Load corresponding leaderboard data.
    loadLeaderboard(type);
}



function updateRankLevelButtons() {

    document
        .querySelectorAll(
            '#leaderboardRankLevels [data-board-level]'
        )
        .forEach(button => {

            button.classList.toggle(
                'active',
                button.dataset.boardLevel === rankLevel
            );
        });
}


/* ==========================================
   OPEN LEADERBOARD
========================================== */


export function openLeaderboard(
    defaultTab = "level",
    selectedLevel = null
) {

    if (
        selectedLevel &&
        ['n5','n4','n3','n2','n1'].includes(selectedLevel)
    ) {
        rankLevel = selectedLevel;
    }


    const screen = getScreen();
    const setupScreen = document.getElementById("setupScreen");
    const rankScreen = document.getElementById("rankScreen");

    if (!screen) {
        console.error("[Leaderboard] Screen not found");
        return;
    }

          // Xác định màn hình nguồn
          if (rankScreen &&
              !rankScreen.classList.contains("hidden")) {
      
              previousScreen = rankScreen;
              rankScreen.classList.add("hidden");
      
          } else {
      
              // Home nằm bên trong setupScreen
              previousScreen = setupScreen;
      
              if (setupScreen) {
                  setupScreen.classList.add("hidden");
              }
          }
      
          // Hiện Leaderboard
          screen.classList.remove("hidden");
      
         syncLeaderboardProfile().catch(error => {
      
          console.warn(
              "[Leaderboard] Sync:",
              error
          );
      });

    // Chọn tab
    switchLeaderboardTab(
        ["level", "pet", "rank"].includes(defaultTab)
            ? defaultTab
            : "level"
    );

    screen.scrollTop = 0;

    console.log("[Leaderboard] Opened", {
        hidden: screen.classList.contains("hidden"),
        display: getComputedStyle(screen).display,
        parent: screen.parentElement?.id
    });
}

/* ==========================================
   CLOSE LEADERBOARD
========================================== */

export function closeLeaderboard() {

    const screen = getScreen();
    if (!screen) return;

    ++requestId;

    // Ẩn Leaderboard
    screen.classList.add("hidden");

    // Khôi phục màn hình nguồn
    if (previousScreen) {
        previousScreen.classList.remove("hidden");
    }

    previousScreen = null;

    console.log("[Leaderboard] Closed");
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

   
   document
       .querySelectorAll(
           '#leaderboardRankLevels [data-board-level]'
       )
       .forEach(button => {
   
           button.addEventListener('click', () => {
   
               rankLevel = button.dataset.boardLevel;
   
               updateRankLevelButtons();
   
               if (currentTab === 'rank') {
                   updateTabUI('rank');
                   loadLeaderboard('rank');
               }
           });
       });


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
