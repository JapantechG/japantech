
import {
    auth,
    db,
    transferRoomHost,
    updateRoomSettings
} from "./firebase.js";

import {
    ref,
    get,
    set,
    remove,
    update,
    onValue,
    onDisconnect
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

/* =========================================================
   BATLINGO PVP SOCIAL
========================================================= */

const $ = id => document.getElementById(id);

let initialized = false;
let lobbyActive = false;
let listeners = [];
let currentRoom = null;
let selectedProfileUid = null;

const modes = [
    ["kanji_meaning", "Kanji → Meaning"],
    ["kanji_hiragana", "Kanji → Hiragana"],
    ["hiragana_meaning", "Hiragana → Meaning"],
    ["meaning_kanji", "Meaning → Kanji"],
    ["audio_meaning", "Audio → Meaning"],
    ["audio_hiragana", "Audio → Hiragana"],
    ["audio_kanji", "Audio → Kanji"]
];

function escapeHTML(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[char]
    );
}

function currentPlayer() {

    const user = auth.currentUser;
    const data = window.currentUserData || {};

    return {
        uid: user?.uid || "",
        name: data.profile?.displayName ||
              user?.displayName || "Player",
        photoURL: data.profile?.photoURL ||
                  user?.photoURL || "",
        batlingoId: data.profile?.batlingoId || "",
        level: Number(data.progress?.level) || 1
    };
}

function avatarHTML(player) {

    if (!player?.photoURL) {
        return "👤";
    }

    const url = String(player.photoURL);

    if (!/^https:\/\//i.test(url)) {
        return "👤";
    }

    return `<img src="${escapeHTML(url)}"
                 alt=""
                 loading="lazy"
                 referrerpolicy="no-referrer">`;
}

function message(text) {

    if ($("pvpSocialMessage")) {
        $("pvpSocialMessage").textContent = text;
    }
}

function subscribe(path, callback) {

    const unsubscribe = onValue(
        ref(db, path),
        callback,
        error => message(error.message)
    );

    listeners.push(unsubscribe);
}

function clearListeners() {

    listeners.forEach(fn => fn());

    listeners = [];
}

function levelOptions() {

    return ["n5", "n4", "n3", "n2", "n1"]
        .map(level =>
            `<option value="${level}">
                ${level.toUpperCase()}
             </option>`
        ).join("");
}

function modeOptions() {

    return modes.map(([id, name]) =>
        `<option value="${id}">
            ${escapeHTML(name)}
         </option>`
    ).join("");
}

function countOptions() {

    return [10, 20, 30, 50]
        .map(count =>
            `<option value="${count}">
                ${count}
             </option>`
        ).join("");
}

/* =========================================================
   INITIALIZE LOBBY
========================================================= */

export function initPvpSocial() {

    if (initialized) return;

    const select = $("roomSelectPanel");
    const waiting = $("waitingRoomPanel");

    if (!select || !waiting) return;

    initialized = true;

    select.innerHTML = `
        <div class="pvp-social-head">
            <h2>⚔ 1V1 LOBBY</h2>
            <span id="pvpOnlineCount">0 ONLINE</span>
        </div>

        <div class="pvp-social-actions">
            <button id="pvpOpenCreate" type="button">
                ＋ CREATE ROOM
            </button>

            <div class="pvp-code-join">
                <input id="roomCodeInput"
                       maxlength="6"
                       placeholder="ROOM CODE"
                       autocomplete="off">

                <button id="joinRoomButton"
                        type="button">
                    JOIN
                </button>
            </div>
        </div>

        <div id="pvpCreateDialog"
             class="pvp-social-panel hidden">

            <h3>CREATE ROOM</h3>

            <label>
                ROOM NAME
                <input id="pvpRoomName"
                       maxlength="32"
                       placeholder="My JLPT Battle">
            </label>

            <label>
                VISIBILITY
                <select id="pvpVisibility">
                    <option value="public">
                        🌐 PUBLIC
                    </option>
                    <option value="private">
                        🔒 PRIVATE
                    </option>
                </select>
            </label>

            <label>
                JLPT LEVEL
                <select id="pvpCreateLevel">
                    ${levelOptions()}
                </select>
            </label>

            <label>
                QUESTION MODE
                <select id="pvpCreateMode">
                    ${modeOptions()}
                </select>
            </label>

            <label>
                QUESTIONS
                <select id="pvpQuestionCount">
                    ${countOptions()}
                </select>
            </label>

            <div class="pvp-social-actions">
                <button id="createRoomButton"
                        type="button">
                    CREATE
                </button>

                <button id="pvpCancelCreate"
                        class="pvp-subtle"
                        type="button">
                    CANCEL
                </button>
            </div>
        </div>

        <div class="pvp-social-tabs">
            <button class="selected"
                    data-pvp-tab="rooms">
                🌐 PUBLIC ROOMS
            </button>

            <button data-pvp-tab="players">
                👥 ONLINE
            </button>

            <button data-pvp-tab="friends">
                🤝 FRIENDS
            </button>
        </div>

        <div id="pvpPublicRooms"
             class="pvp-social-list"></div>

        <div id="pvpOnlinePlayers"
             class="pvp-social-list hidden"></div>

        <div id="pvpIncomingRequests"
             class="pvp-social-list hidden"></div>

        <div id="pvpFriendList"
             class="pvp-social-list hidden"></div>

        <p id="pvpSocialMessage"
           aria-live="polite"></p>
    `;

    waiting.insertAdjacentHTML(
        "afterbegin",
        `
        <div class="pvp-room-controls">
            <strong id="pvpWaitingTitle">
                ROOM
            </strong>

            <span id="pvpWaitingVisibility">
                PUBLIC
            </span>

            <button id="pvpCopyCode" type="button">
                ⧉ COPY CODE
            </button>
        </div>

        <div class="pvp-room-settings-actions">
            <button id="pvpToggleSettings"
                    type="button">
                ⚙ ROOM SETTINGS
            </button>
        </div>

        <div id="pvpSettingsPanel"
             class="pvp-social-panel hidden">

            <h3>⚙ ROOM SETTINGS</h3>

            <label>
                ROOM NAME
                <input id="pvpEditName" maxlength="32">
            </label>

            <label>
                VISIBILITY
                <select id="pvpEditVisibility">
                    <option value="public">PUBLIC</option>
                    <option value="private">PRIVATE</option>
                </select>
            </label>

            <label>
                JLPT LEVEL
                <select id="pvpEditLevel">
                    ${levelOptions()}
                </select>
            </label>

            <label>
                QUESTION MODE
                <select id="pvpEditMode">
                    ${modeOptions()}
                </select>
            </label>

            <label>
                QUESTIONS
                <select id="pvpEditCount">
                    ${countOptions()}
                </select>
            </label>

            <button id="pvpSaveSettings"
                    type="button">
                SAVE SETTINGS
            </button>

            <button id="pvpTransferHost"
                    type="button"
                    class="pvp-subtle">
                ⇄ TRANSFER HOST
            </button>
        </div>
        `
    );

    const modal = document.createElement("div");

    modal.id = "pvpProfileModal";
    modal.className = "pvp-profile-modal hidden";

    modal.innerHTML = `
        <div class="pvp-profile-card"
             role="dialog"
             aria-modal="true"
             aria-label="Player profile">

            <button id="pvpCloseProfile"
                    class="pvp-profile-close">
                ✕
            </button>

            <div id="pvpProfileContent"></div>

            <button id="pvpFriendAction">
                ＋ ADD FRIEND
            </button>

            <p id="pvpFriendFeedback"></p>
        </div>
    `;

    document.body.appendChild(modal);

    bindSocialEvents();
}

/* =========================================================
   BUTTON EVENTS
========================================================= */

function bindSocialEvents() {

    $("pvpOpenCreate").onclick = () => {
        $("pvpCreateDialog").classList.remove("hidden");
    };

    $("pvpCancelCreate").onclick = () => {
        $("pvpCreateDialog").classList.add("hidden");
    };

    $("pvpCloseProfile").onclick = () => {
        $("pvpProfileModal").classList.add("hidden");
    };

    $("pvpProfileModal").onclick = event => {

        if (event.target.id === "pvpProfileModal") {
            $("pvpProfileModal").classList.add("hidden");
        }
    };

    document.querySelectorAll("[data-pvp-tab]")
        .forEach(button => {

            button.onclick = () => {

                const selected = button.dataset.pvpTab;

                document.querySelectorAll("[data-pvp-tab]")
                    .forEach(item =>
                        item.classList.toggle(
                            "selected",
                            item === button
                        )
                    );

                $("pvpPublicRooms").classList.toggle(
                    "hidden", selected !== "rooms"
                );

                $("pvpOnlinePlayers").classList.toggle(
                    "hidden", selected !== "players"
                );

                $("pvpFriendList").classList.toggle(
                    "hidden", selected !== "friends"
                );

                $("pvpIncomingRequests").classList.toggle(
                    "hidden", selected !== "friends"
                );
            };
        });

    $("pvpToggleSettings").onclick = () => {
        $("pvpSettingsPanel").classList.toggle("hidden");
    };

    $("pvpCopyCode").onclick = async () => {

        const code = $("currentRoomCode").textContent;

        try {
            await navigator.clipboard.writeText(code);
            $("pvpCopyCode").textContent = "✓ COPIED";
        } catch {
            alert("ROOM CODE: " + code);
        }
    };

    $("pvpSaveSettings").onclick = async () => {

        try {

            await updateRoomSettings({

                name: $("pvpEditName").value.trim(),
                visibility: $("pvpEditVisibility").value,
                level: $("pvpEditLevel").value,
                mode: $("pvpEditMode").value,
                count: Number($("pvpEditCount").value)
            });

            $("pvpSettingsPanel").classList.add("hidden");

        } catch (error) {
            alert(error.message);
        }
    };

    $("pvpTransferHost").onclick = async () => {

        if (!confirm("Transfer host to opponent?")) {
            return;
        }

        try {
            await transferRoomHost();
        } catch (error) {
            alert(error.message);
        }
    };

    $("pvpFriendAction").onclick = friendAction;

    ["leftPlayerAvatar", "rightPlayerAvatar"]
        .forEach(id => {

            const element = $(id);

            element.setAttribute("role", "button");
            element.setAttribute("tabindex", "0");

            const open = () => {

                const side = id === "leftPlayerAvatar"
                    ? "left"
                    : "right";

                const info = currentRoom;

                if (!info) return;

                const myUid = auth.currentUser?.uid;

                const myRole =
                    info.host?.uid === myUid
                        ? "host"
                        : "guest";

                const player = side === "left"
                    ? info.host
                    : info.guest;

                if (player?.uid) {
                    openPvpPlayerProfile(player.uid);
                }
            };

            element.onclick = open;

            element.onkeydown = event => {

                if (
                    event.key === "Enter" ||
                    event.key === " "
                ) {
                    event.preventDefault();
                    open();
                }
            };
        });
}

/* =========================================================
   ENTER / LEAVE SOCIAL LOBBY
========================================================= */

export async function enterPvpSocial() {

    initPvpSocial();

    if (lobbyActive) return;

    const me = currentPlayer();

    if (!me.uid) {
        throw new Error("LOGIN_REQUIRED");
    }

    lobbyActive = true;

    try {

        const presenceRef = ref(
            db,
            `pvpPresence/${me.uid}`
        );

        await onDisconnect(presenceRef).remove();

        await set(presenceRef, {
            ...me,
            online: true,
            since: Date.now()
        });

        await set(
            ref(db, `publicProfiles/${me.uid}`),
            {
                ...me,
                elo: Number(
                    window.currentUserData?.rating?.elo
                ) || 1000,
                pvpGames: Number(
                    window.currentUserData?.stats?.pvpGames
                ) || 0,
                wins: Number(
                    window.currentUserData?.stats?.wins
                ) || 0
            }
        );

        subscribe("rooms", renderPublicRooms);
        subscribe("pvpPresence", renderOnlinePlayers);

        subscribe(
            `friendships/${me.uid}`,
            renderFriends
        );

        subscribe(
            `friendRequests/${me.uid}`,
            renderRequests
        );

    } catch (error) {

        clearListeners();
        lobbyActive = false;

        throw error;
    }
}

export async function leavePvpSocial() {

    clearListeners();
    lobbyActive = false;

    const uid = auth.currentUser?.uid;

    if (!uid) return;

    const presenceRef = ref(
        db,
        `pvpPresence/${uid}`
    );

    try {

        await onDisconnect(presenceRef).cancel();

        await remove(presenceRef);

    } catch (error) {
        console.warn("[PVP] Presence:", error);
    }
}

/* =========================================================
   PUBLIC ROOM LIST
========================================================= */

function renderPublicRooms(snapshot) {

    const rooms = Object.entries(
        snapshot.val() || {}
    )
    .filter(([code, room]) => {

        return (
            room.visibility === "public" &&
            room.host?.connected === true &&
            !room.guest?.connected &&
            ["waiting", "connected"].includes(room.status)
        );
    })
    .sort((a, b) =>
        (b[1].createdAt || 0) -
        (a[1].createdAt || 0)
    )
    .slice(0, 100);

    const container = $("pvpPublicRooms");

    container.innerHTML = rooms.length
        ? rooms.map(([code, room]) => `
            <div class="pvp-list-item">

                <span class="pvp-mini-avatar">
                    ${avatarHTML(room.host)}
                </span>

                <div class="pvp-list-info">
                    <strong>
                        ${escapeHTML(room.name || "JLPT BATTLE")}
                    </strong>

                    <small>
                        ${escapeHTML(room.host?.name)}
                        · ${(room.settings?.level || "n5").toUpperCase()}
                        · ${escapeHTML(code)}
                        · 1/2
                    </small>
                </div>

                <button data-join-room="${escapeHTML(code)}"
                        type="button">
                    JOIN
                </button>
            </div>
        `).join("")
        : `<p class="pvp-empty">
                No public rooms. Create one!
           </p>`;

    container.querySelectorAll("[data-join-room]")
        .forEach(button => {

            button.onclick = () => {

                $("roomCodeInput").value =
                    button.dataset.joinRoom;

                $("joinRoomButton").click();
            };
        });
}

/* =========================================================
   ONLINE PLAYERS
========================================================= */

function renderOnlinePlayers(snapshot) {

    const myUid = auth.currentUser?.uid;

    const players = Object.values(
        snapshot.val() || {}
    ).filter(player =>
        player.online === true &&
        player.uid !== myUid
    );

    $("pvpOnlineCount").textContent =
        `${players.length + 1} ONLINE`;

    const container = $("pvpOnlinePlayers");

    container.innerHTML = players.length
        ? players.slice(0, 100).map(player => `
            <button class="pvp-list-item pvp-player-row"
                    data-profile="${escapeHTML(player.uid)}"
                    type="button">

                <span class="pvp-mini-avatar">
                    ${avatarHTML(player)}
                </span>

                <div class="pvp-list-info">
                    <strong>${escapeHTML(player.name)}</strong>

                    <small>
                        LV. ${Number(player.level) || 1}
                        · ${escapeHTML(player.batlingoId)}
                    </small>
                </div>

                <span class="pvp-online-dot">●</span>
            </button>
        `).join("")
        : `<p class="pvp-empty">
                No other players online.
           </p>`;

    container.querySelectorAll("[data-profile]")
        .forEach(button => {

            button.onclick = () => {
                openPvpPlayerProfile(
                    button.dataset.profile
                );
            };
        });
}

/* =========================================================
   FRIEND LIST
========================================================= */

async function renderFriends(snapshot) {

    const uid = auth.currentUser?.uid;

    if (!uid) return;

    const friends = snapshot.val() || {};

    const ids = Object.keys(friends)
        .filter(id => friends[id] === true);

    const profiles = await Promise.all(
        ids.map(async id => {

            const snap = await get(
                ref(db, `publicProfiles/${id}`)
            );

            return {
                uid: id,
                ...(snap.val() || {})
            };
        })
    );

    const container = $("pvpFriendList");

    container.innerHTML = profiles.length
        ? profiles.map(player => `
            <button class="pvp-list-item pvp-player-row"
                    data-friend="${escapeHTML(player.uid)}">

                <span class="pvp-mini-avatar">
                    ${avatarHTML(player)}
                </span>

                <div class="pvp-list-info">
                    <strong>
                        ${escapeHTML(player.name || "Player")}
                    </strong>

                    <small>
                        LV. ${Number(player.level) || 1}
                    </small>
                </div>
            </button>
        `).join("")
        : `<p class="pvp-empty">
                No friends yet.
           </p>`;

    container.querySelectorAll("[data-friend]")
        .forEach(button => {

            button.onclick = () => {
                openPvpPlayerProfile(button.dataset.friend);
            };
        });
}

/* =========================================================
   FRIEND REQUESTS
========================================================= */

async function renderRequests(snapshot) {

    const requests = snapshot.val() || {};
    const ids = Object.keys(requests);

    const container = $("pvpIncomingRequests");

    if (!ids.length) {
        container.innerHTML = "";
        return;
    }

    const players = await Promise.all(
        ids.map(async uid => {

            const snap = await get(
                ref(db, `publicProfiles/${uid}`)
            );

            return {
                uid,
                ...(snap.val() || {})
            };
        })
    );

    container.innerHTML = `
        <h3>📨 FRIEND REQUESTS</h3>

        ${players.map(player => `
            <button class="pvp-list-item pvp-player-row"
                    data-request="${escapeHTML(player.uid)}">

                <span class="pvp-mini-avatar">
                    ${avatarHTML(player)}
                </span>

                <div class="pvp-list-info">
                    <strong>
                        ${escapeHTML(player.name || "Player")}
                    </strong>

                    <small>ACCEPT FRIEND REQUEST</small>
                </div>
            </button>
        `).join("")}
    `;

    container.querySelectorAll("[data-request]")
        .forEach(button => {

            button.onclick = () => {
                openPvpPlayerProfile(button.dataset.request);
            };
        });
}

/* =========================================================
   ROOM SETTINGS
========================================================= */

export function getNewRoomSettings() {

    return {

        name:
            $("pvpRoomName")?.value.trim() ||
            `${currentPlayer().name}'s Room`,

        visibility:
            $("pvpVisibility")?.value || "public",

        level:
            $("pvpCreateLevel")?.value || "n5",

        category: "vocabulary",

        mode:
            $("pvpCreateMode")?.value || "kanji_meaning",

        count:
            Number($("pvpQuestionCount")?.value) || 20
    };
}

export function onPvpSocialRoomUpdate(
    room,
    role
) {

    currentRoom = room;

    const settings = room?.settings || {};

    $("pvpWaitingTitle").textContent =
        room?.name || "ROOM";

    $("pvpWaitingVisibility").textContent =
        room?.visibility === "private"
            ? "🔒 PRIVATE"
            : "🌐 PUBLIC";

    const isHost = role === "host";
    const canEdit = isHost &&
        ["waiting", "connected"].includes(room.status);

    $("pvpToggleSettings").classList.toggle(
        "hidden",
        !canEdit
    );

    if (!canEdit) {
        $("pvpSettingsPanel").classList.add("hidden");
    }

    // Avoid overwriting fields while host is editing.
    if ($("pvpSettingsPanel").classList.contains("hidden")) {

        $("pvpEditName").value = room?.name || "";

        $("pvpEditVisibility").value =
            room?.visibility || "private";

        $("pvpEditLevel").value =
            settings.level || "n5";

        $("pvpEditMode").value =
            settings.mode || "kanji_meaning";

        $("pvpEditCount").value =
            String(settings.count || 20);
    }

    $("pvpTransferHost").disabled =
        !room?.guest?.connected;

    const avatars = [
        ["leftPlayerAvatar", room?.host],
        ["rightPlayerAvatar", room?.guest]
    ];

    avatars.forEach(([id, player]) => {

        const element = $(id);

        if (player?.connected) {

            element.innerHTML = avatarHTML(player);

            element.title =
                `View ${player.name}'s profile`;

        } else {

            element.textContent = "?";

            element.title = "Waiting for player";
        }
    });
}

export function onPvpSocialReset() {

    currentRoom = null;

    $("pvpCreateDialog")?.classList.add("hidden");
    $("pvpSettingsPanel")?.classList.add("hidden");
}

/* =========================================================
   PLAYER PROFILE
========================================================= */

export async function openPvpPlayerProfile(uid) {

    if (!uid) return;

    selectedProfileUid = uid;

    $("pvpProfileModal").classList.remove("hidden");
    $("pvpProfileContent").textContent = "Loading...";
    $("pvpFriendFeedback").textContent = "";

    const button = $("pvpFriendAction");

    button.classList.add("hidden");

    try {

        const snapshot = await get(
            ref(db, `publicProfiles/${uid}`)
        );

        const player = snapshot.val();

        if (!player) {

            $("pvpProfileContent").textContent =
                "Player not found.";

            return;
        }

        $("pvpProfileContent").innerHTML = `
            <div class="pvp-profile-avatar">
                ${avatarHTML(player)}
            </div>

            <h3>${escapeHTML(player.name)}</h3>

            <p>${escapeHTML(player.batlingoId)}</p>

            <p>
                LV. ${Number(player.level) || 1}
                · ELO ${Number(player.elo) || 1000}
            </p>

            <p>
                Battles ${Number(player.pvpGames) || 0}
                · Wins ${Number(player.wins) || 0}
            </p>
        `;

        const mine = auth.currentUser?.uid;

        if (!mine || mine === uid) {
            return;
        }

        const [friendSnap, requestSnap, sentSnap] =
            await Promise.all([

                get(ref(
                    db,
                    `friendships/${mine}/${uid}`
                )),

                get(ref(
                    db,
                    `friendRequests/${mine}/${uid}`
                )),

                get(ref(
                    db,
                    `friendRequests/${uid}/${mine}`
                ))
            ]);

        button.classList.remove("hidden");

        if (friendSnap.val() === true) {

            button.textContent = "✓ FRIEND";
            button.dataset.action = "friend";

        } else if (requestSnap.exists()) {

            button.textContent = "✓ ACCEPT FRIEND";
            button.dataset.action = "accept";

        } else if (sentSnap.exists()) {

            button.textContent = "REQUEST SENT";
            button.dataset.action = "sent";

        } else {

            button.textContent = "＋ ADD FRIEND";
            button.dataset.action = "request";
        }

    } catch (error) {

        $("pvpProfileContent").textContent =
            error.message;
    }
}

/* =========================================================
   FRIEND ACTION
========================================================= */

async function friendAction() {

    const mine = auth.currentUser?.uid;
    const to = selectedProfileUid;

    if (!mine || !to || mine === to) {
        return;
    }

    const button = $("pvpFriendAction");
    const action = button.dataset.action;

    if (action === "friend" || action === "sent") {
        return;
    }

    button.disabled = true;

    try {

        if (action === "accept") {

            await update(ref(db), {

                [`friendships/${mine}/${to}`]: true,

                [`friendships/${to}/${mine}`]: true,

                [`friendRequests/${mine}/${to}`]: null,

                [`friendRequests/${to}/${mine}`]: null
            });

            button.textContent = "✓ FRIEND";
            button.dataset.action = "friend";

        } else {

            await set(
                ref(
                    db,
                    `friendRequests/${to}/${mine}`
                ),
                {
                    from: mine,
                    createdAt: Date.now()
                }
            );

            button.textContent = "REQUEST SENT";
            button.dataset.action = "sent";
        }

        $("pvpFriendFeedback").textContent =
            "Updated successfully.";

    } catch (error) {

        $("pvpFriendFeedback").textContent =
            error.message;

    } finally {

        button.disabled = false;
    }
}
