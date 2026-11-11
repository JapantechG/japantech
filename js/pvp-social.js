
import {
    auth,
    db,
    transferRoomHost,
    getConnectionInfo,
    joinRoom,
    updateRoomSettings
} from "./firebase.js";

import { topics } from "./lobby.js";

import {
    ref,
    get,
    set,
    remove,
    update,
    onValue,
    onDisconnect,
    runTransaction
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

/* =========================================================
   BATLINGO PVP SOCIAL
========================================================= */

const $ = id => document.getElementById(id);


/* =========================================================
   REMOVE ACCEPTED PVP INVITATION
========================================================= */

export async function clearAcceptedPvpInvite(code) {

    const uid = auth.currentUser?.uid;

    if (!uid || !code) return;

    try {

        await remove(
            ref(
                db,
                `pvpInvites/${uid}/${code}`
            )
        );

        console.log(
            "[PVP] Invitation removed:",
            code
        );

    } catch (error) {

        console.warn(
            "[PVP] Invitation cleanup failed:",
            error
        );
    }
}


let initialized = false;
let lobbyActive = false;
let activePvpTab = "rooms";
let listeners = [];
let currentRoom = null;
let selectedProfileUid = null;

let publicRoomsSnapshot = null;
let onlinePresenceSnapshot = null;

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
                STUDY MODE
            
                <select id="pvpCreateStudyMode">
                    <option value="jlpt">🎓 JLPT</option>
                    <option value="topic">📚 CHỦ ĐỀ</option>
                </select>
            </label>
            
            <label>
                <span id="pvpCreateTargetLabel">JLPT LEVEL</span>
            
                <select id="pvpCreateTarget">
                    <option value="n5">N5</option>
                    <option value="n4">N4</option>
                    <option value="n3">N3</option>
                    <option value="n2">N2</option>
                    <option value="n1">N1</option>
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
        
            <div class="pvp-room-toolbar-left">
        
                <button
                    id="pvpEmojiButton"
                    class="pvp-toolbar-icon"
                    type="button"
                    title="Send emoji">
                    😊
                </button>
        
                <div id="pvpEmojiPicker"
                     class="pvp-emoji-picker hidden"></div>
        
            </div>
        
            <div class="pvp-room-toolbar-right">
        
                <span id="pvpWaitingVisibility"></span>
        
                <button
                    id="pvpCopyCode"
                    class="pvp-toolbar-small"
                    type="button">
                    <span>⧉</span> COPY CODE
                </button>
        
                <button
                    id="pvpToggleSettings"
                    class="pvp-toolbar-icon"
                    type="button"
                    title="Room Settings">
                    ⚙
                </button>
        
            </div>
        
        </div>
        
        <div id="pvpWaitingTitle" class="pvp-room-title">
            ROOM
        </div>

        
        <div id="pvpWaitingConfig"
             class="pvp-waiting-config">
        
            <div class="pvp-config-heading">
                <span>⚔ BATTLE SETTINGS</span>
                <span id="pvpConfigVisibility">PUBLIC</span>
            </div>
        
            <div class="pvp-config-grid">
        
                <div class="pvp-config-item">
                    <small>STUDY MODE</small>
                    <strong id="pvpConfigStudy">JLPT</strong>
                </div>
        
                <div class="pvp-config-item">
                    <small>LEVEL / TOPIC</small>
                    <strong id="pvpConfigTarget">N5</strong>
                </div>
        
                <div class="pvp-config-item">
                    <small>QUESTION MODE</small>
                    <strong id="pvpConfigMode">Kanji → Meaning</strong>
                </div>
        
                <div class="pvp-config-item">
                    <small>QUESTIONS</small>
                    <strong id="pvpConfigCount">20</strong>
                </div>
        
            </div>
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
                STUDY MODE
            
                <select id="pvpEditStudyMode">
                    <option value="jlpt">🎓 JLPT</option>
                    <option value="topic">📚 CHỦ ĐỀ</option>
                </select>
            </label>
            
            <label>
                <span id="pvpEditTargetLabel">JLPT LEVEL</span>
            
                <select id="pvpEditTarget"></select>
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

    const inviteSection = `
    <div id="pvpInviteSection"
         class="pvp-invite-section hidden">

        <button id="pvpInviteToggle"
                type="button"
                class="pvp-invite-main-btn">
            👥 INVITE PLAYERS
        </button>

        <div id="pvpInvitePanel"
             class="pvp-social-panel hidden">

            <h3>INVITE PLAYERS</h3>

            <div class="pvp-invite-tabs">
                <button id="pvpInviteOnlineTab"
                        class="active"
                        type="button">
                    🟢 ONLINE
                </button>

                <button id="pvpInviteFriendsTab"
                        type="button">
                    🤝 FRIENDS
                </button>
            </div>

            <div id="pvpInviteList"></div>

            <p id="pvpInviteMessage"></p>

        </div>
    </div>
`;

document.getElementById("waitingMessage")
    .insertAdjacentHTML(
        "beforebegin",
        inviteSection
    );

    document.getElementById("roomSelectPanel")
    .insertAdjacentHTML(
        "afterbegin",
        `
        <div id="pvpIncomingInvites"
             class="pvp-incoming-invites hidden">
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
    initPvpEmoji();
    initPvpInviteEvents();
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

        document.getElementById("pvpCreateStudyMode")
        .addEventListener("change", () => {
            updatePvpStudyTarget("pvpCreate");
        });
    
    document.getElementById("pvpEditStudyMode")
        .addEventListener("change", () => {
            updatePvpStudyTarget("pvpEdit");
        });
    
    updatePvpStudyTarget("pvpCreate");
    updatePvpStudyTarget("pvpEdit");

    document.querySelectorAll("[data-pvp-tab]")
        .forEach(button => {

            button.onclick = () => {

                const selected = button.dataset.pvpTab;
                activePvpTab = selected;

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

    name: document.getElementById(
        "pvpEditName"
    ).value.trim(),

    visibility: document.getElementById(
        "pvpEditVisibility"
    ).value,

    studyMode: document.getElementById(
        "pvpEditStudyMode"
    ).value,

    target: document.getElementById(
        "pvpEditTarget"
    ).value,

    level:
        document.getElementById("pvpEditStudyMode").value === "jlpt"
            ? document.getElementById("pvpEditTarget").value
            : "n5",

    category: "vocabulary",

    mode: document.getElementById(
        "pvpEditMode"
    ).value,

    count: Number(
        document.getElementById(
            "pvpEditCount"
        ).value
    )
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

        // Không ghi đè publicProfiles.
        // Profile được quản lý bởi hệ thống
        // user / friends hiện tại.
        
        
        subscribe("rooms", snapshot => {
        
            publicRoomsSnapshot = snapshot;
        
            renderPublicRooms(snapshot);
        });
        
        subscribe("pvpPresence", snapshot => {
        
            onlinePresenceSnapshot = snapshot;
        
            renderOnlinePlayers(snapshot);
        
            // Recheck rooms whenever a player goes offline.
            if (publicRoomsSnapshot) {
                renderPublicRooms(publicRoomsSnapshot);
            }
        });


        subscribe(
            `friends/${me.uid}`,
            renderFriends
        );

        subscribe(
            `friendRequests/${me.uid}`,
            renderRequests
        );

        const inviteUnsubscribe = onValue(
            ref(
                db,
                `pvpInvites/${me.uid}`
            ),
            renderPvpIncomingInvites
        );
        
        listeners.push(inviteUnsubscribe);    

    } catch (error) {

        clearListeners();
        lobbyActive = false;

        throw error;
    }
}

export async function leavePvpSocial() {

    clearListeners();
    lobbyActive = false;

    publicRoomsSnapshot = null;
    onlinePresenceSnapshot = null;

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
   PVP - CLEAN UP ABANDONED ROOMS
========================================================= */

const pendingRoomCleanup = new Set();

async function cleanupAbandonedRoom(code) {

    if (pendingRoomCleanup.has(code)) return;

    pendingRoomCleanup.add(code);

    try {

        await runTransaction(
            ref(db, `rooms/${code}`),
            room => {

                if (!room) return;

                // Host is still connected.
                if (room.host?.connected !== false) {
                    return;
                }

                // Never remove an active guest.
                if (room.guest?.connected === true) {
                    return;
                }

                // Never remove an active match here.
                if (!["waiting", "connected"].includes(
                    room.status
                )) {
                    return;
                }

                // No active players: delete room.
                return null;
            },
            { applyLocally: false }
        );

    } catch (error) {

        console.warn(
            "[PVP] Room cleanup failed:",
            code,
            error
        );

    } finally {

        pendingRoomCleanup.delete(code);
    }
}



/* =========================================================
   PUBLIC ROOM LIST
   Hide abandoned / offline rooms
========================================================= */

function renderPublicRooms(snapshot) {

    const container = $("pvpPublicRooms");

    if (!container) return;

    // Wait until presence data is available.
    if (!onlinePresenceSnapshot) {

        container.innerHTML = `
            <p class="pvp-empty">
                Loading rooms...
            </p>
        `;

        return;
    }

    const presence =
        onlinePresenceSnapshot.val() || {};

    const allRooms = Object.entries(
        snapshot.val() || {}
    );

    /* ==========================================
       CLEAN ABANDONED ROOMS
    ========================================== */

    for (const [code, room] of allRooms) {

        const hostOffline =
            room.host?.connected === false;

        const noActiveGuest =
            room.guest?.connected !== true;

        const waitingRoom =
            ["waiting", "connected"].includes(
                room.status
            );

        // Only clean when room data explicitly
        // confirms the host has disconnected.
        if (
            hostOffline &&
            noActiveGuest &&
            waitingRoom
        ) {
            cleanupAbandonedRoom(code);
        }
    }

    /* ==========================================
       FILTER VALID PUBLIC ROOMS
    ========================================== */

    const rooms = allRooms
        .filter(([code, room]) => {

            const hostUid = room.host?.uid;

            if (!hostUid) return false;

            const hostPresence = presence[hostUid];

            const hostOnline =
                room.host?.connected === true &&
                hostPresence?.online === true &&
                hostPresence?.uid === hostUid;

            const roomAvailable =
                ["waiting", "connected"].includes(
                    room.status
                );

            const noGuest =
                !room.guest?.connected;

            return (
                room.visibility === "public" &&
                hostOnline &&
                noGuest &&
                roomAvailable
            );
        })
        .sort((a, b) =>
            (Number(b[1].createdAt) || 0) -
            (Number(a[1].createdAt) || 0)
        )
        .slice(0, 100);

    /* ==========================================
       RENDER
    ========================================== */

    container.innerHTML = rooms.length
        ? rooms.map(([code, room]) => `
            <div class="pvp-list-item">

                <span class="pvp-mini-avatar">
                    ${avatarHTML(room.host)}
                </span>

                <div class="pvp-list-info">

                    <strong>
                        ${escapeHTML(
                            room.name || "JLPT BATTLE"
                        )}
                    </strong>

                    <small>
                        ${escapeHTML(
                            room.host?.name || "Player"
                        )}
                        · ${escapeHTML(
                            String(
                                room.settings?.level || "n5"
                            ).toUpperCase()
                        )}
                        · ${escapeHTML(code)}
                        · 1/2
                    </small>

                </div>

                <button
                    data-join-room="${escapeHTML(code)}"
                    type="button">
                    JOIN
                </button>

            </div>
        `).join("")
        : `
            <p class="pvp-empty">
                No public rooms. Create one!
            </p>
        `;

    /* ==========================================
       JOIN ROOM EVENTS
    ========================================== */

    container
        .querySelectorAll("[data-join-room]")
        .forEach(button => {

            button.onclick = () => {

                const code =
                    button.dataset.joinRoom;

                const input =
                    $("roomCodeInput");

                const joinButton =
                    $("joinRoomButton");

                if (!input || !joinButton) return;

                input.value = code;

                joinButton.click();
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
        .filter(id => friends[id] != null);

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
                       ${escapeHTML(
                            player.displayName ||
                            player.name ||
                            "Player"
                        )}
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

    // Reset scroll to the first friend
    container.scrollTop = 0;

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
    
        container.replaceChildren();
    
        container.classList.add("hidden");
    
        return;
    }
    
    // Only show when the Friends tab is selected.
    container.classList.toggle(
        "hidden",
        activePvpTab !== "friends"
    );


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
                        ${escapeHTML(
                            player.displayName ||
                            player.name ||
                            "Player"
                        )}
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

    const studyMode =
        document.getElementById(
            "pvpCreateStudyMode"
        ).value;

    const target =
        document.getElementById(
            "pvpCreateTarget"
        ).value;

    return {

        name:
            document.getElementById("pvpRoomName")
                .value.trim() || "JLPT BATTLE",

        visibility:
            document.getElementById("pvpVisibility")
                .value,

        studyMode,

        target,

        // Keep level for compatibility.
        level: studyMode === "jlpt" ? target : "n5",

        category: "vocabulary",

        mode:
            document.getElementById("pvpCreateMode")
                .value,

        count:
            Number(
                document.getElementById(
                    "pvpQuestionCount"
                ).value
            )
    };
}


/* =========================================================
   PVP WAITING ROOM - REALTIME UPDATE
========================================================= */

export function onPvpSocialRoomUpdate(room, role) {

    if (!room) return;

    currentRoom = room;

    const settings = room.settings || {};

    
    /* ==========================================
       WAITING ROOM - CONFIG INFORMATION
    ========================================== */
    
    const studyMode = settings.studyMode || "jlpt";
    
    const target =
        settings.target ||
        settings.level ||
        "n5";
    
    const mode = settings.mode || "kanji_meaning";
    
    const modeName =
        modes.find(item => item[0] === mode)?.[1] ||
        mode;
    
    const setConfigText = (id, value) => {
    
        const element = document.getElementById(id);
    
        if (element) {
            element.textContent = value;
        }
    };
    
    setConfigText(
        "pvpConfigStudy",
        studyMode === "topic" ? "TOPIC" : "JLPT"
    );
    
    setConfigText(
        "pvpConfigTarget",
        studyMode === "topic"
            ? topics.find(item => item.id === target)?.name || target
            : String(target).toUpperCase()
    );
    
    setConfigText("pvpConfigMode", modeName);
    
    setConfigText(
        "pvpConfigCount",
        String(settings.count || 20)
    );
    
    setConfigText(
        "pvpConfigVisibility",
        room.visibility === "private"
            ? "🔒 PRIVATE"
            : "🌐 PUBLIC"
    );


    const $ = id => document.getElementById(id);

    /* =====================================
       ROOM INFORMATION
    ===================================== */

    if ($("pvpWaitingTitle")) {
        $("pvpWaitingTitle").textContent =
            room.name || "1V1 BATTLE";
    }

    if ($("pvpWaitingVisibility")) {
        $("pvpWaitingVisibility").textContent =
            room.visibility === "private"
                ? "🔒 PRIVATE"
                : "🌐 PUBLIC";
    }

    /* =====================================
       HOST PERMISSIONS
    ===================================== */

    const isHost = role === "host";

    const canEdit =
        isHost &&
        ["waiting", "connected"].includes(room.status);

    const settingsButton = $("pvpToggleSettings");
    const settingsPanel = $("pvpSettingsPanel");

    if (settingsButton) {
        settingsButton.classList.toggle(
            "hidden",
            !canEdit
        );
    }

    if (!canEdit) {
        settingsPanel?.classList.add("hidden");
    }

    /* =====================================
       UPDATE SETTINGS
       Do not overwrite while editing
    ===================================== */

    if (
        settingsPanel &&
        settingsPanel.classList.contains("hidden")
    ) {

        const studyMode =
            settings.studyMode || "jlpt";

        const target =
            settings.target ||
            settings.level ||
            "n5";

        if ($("pvpEditName")) {
            $("pvpEditName").value =
                room.name || "";
        }

        if ($("pvpEditVisibility")) {
            $("pvpEditVisibility").value =
                room.visibility || "private";
        }

        const studySelect = $("pvpEditStudyMode");

        if (studySelect) {
            studySelect.value = studyMode;

            updatePvpStudyTarget("pvpEdit");
        }

        const targetSelect = $("pvpEditTarget");

        if (targetSelect) {
            targetSelect.value = target;
        }

        if ($("pvpEditMode")) {
            $("pvpEditMode").value =
                settings.mode || "kanji_meaning";
        }

        if ($("pvpEditCount")) {
            $("pvpEditCount").value =
                String(settings.count || 20);
        }
    }

    /* =====================================
       TRANSFER HOST
    ===================================== */

    if ($("pvpTransferHost")) {

        $("pvpTransferHost").disabled =
            !isHost ||
            !room.guest?.connected ||
            !canEdit;
    }

    /* =====================================
       INVITE PLAYERS
    ===================================== */

    const inviteSection = $("pvpInviteSection");

    const canInvite =
        isHost &&
        room.host?.connected === true &&
        !room.guest?.connected &&
        ["waiting", "connected"].includes(room.status);

    if (inviteSection) {

        inviteSection.classList.toggle(
            "hidden",
            !canInvite
        );
    }

    if (!canInvite) {
        $("pvpInvitePanel")?.classList.add("hidden");
    }

    /* =====================================
       PLAYER AVATARS
    ===================================== */

    const players = [
        ["leftPlayerAvatar", room.host],
        ["rightPlayerAvatar", room.guest]
    ];

    players.forEach(([elementId, player]) => {

        const element = $(elementId);

        if (!element) return;

        if (player?.uid) {

            element.innerHTML = avatarHTML(player);

            element.title =
                player.name ||
                player.displayName ||
                "Player";

            element.classList.toggle(
                "waiting",
                player.connected !== true
            );

        } else {

            element.textContent = "?";

            element.title = "Waiting for player";

            element.classList.add("waiting");
        }
    });

    /* =====================================
       REACTIONS
    ===================================== */

    const reactions = room.reactions || {};

    const hostEmoji =
        reactions[room.host?.uid]?.emoji || "";

    const guestEmoji =
        reactions[room.guest?.uid]?.emoji || "";

    if ($("pvpReactionDisplay")) {

        $("pvpReactionDisplay").textContent =
            [hostEmoji, guestEmoji]
                .filter(Boolean)
                .join("  ");
    }
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

            <h3>${escapeHTML(player.displayName || player.name || "Player")}</h3>

            <p>${escapeHTML(player.batlingoId)}</p>

            <p>
                LV. ${Number(player.level) || 1}
                · ELO ${Number(player.elo) || 1000}
            </p>

            <p>
                Battles ${Number(player.battles) || 0}
                · Wins ${Number(player.wins) || 0}
            </p>
        `;

        const mine = auth.currentUser?.uid;

        if (!mine || mine === uid) {
            return;
        }

        
/* =========================================================
   CHECK FRIEND STATUS
========================================================= */

        const [friendSnap, requestSnap, sentSnap] =
            await Promise.all([
        
                // Bạn bè hiện tại
                get(ref(
                    db,
                    `friends/${mine}/${uid}`
                )),
        
                // Lời mời nhận được
                get(ref(
                    db,
                    `friendRequests/${mine}/${uid}`
                )),
        
                // Lời mời đã gửi
                get(ref(
                    db,
                    `sentFriendRequests/${mine}/${uid}`
                ))
            ]);
        
        const isFriend = friendSnap.exists();
        
        const hasReceivedRequest = requestSnap.exists();
        
        const hasSentRequest = sentSnap.exists();
        
        /* FRIENDS TAB OR ALREADY FRIEND */
        
        if (isFriend) {
        
            button.classList.add("hidden");
        
            button.dataset.action = "friend";
        
            button.disabled = true;
        
        }
        
        /* INCOMING REQUEST */
        
        else if (hasReceivedRequest) {
        
            button.classList.remove("hidden");
        
            button.textContent = "✓ ACCEPT FRIEND";
        
            button.dataset.action = "accept";
        
            button.disabled = false;
        
        }
        
        /* REQUEST ALREADY SENT */
        
        else if (hasSentRequest) {
        
            button.classList.remove("hidden");
        
            button.textContent = "✓ REQUEST SENT";
        
            button.dataset.action = "sent";
        
            button.disabled = true;
        
        }
        
        /* NOT FRIENDS */
        
        else {
        
            button.classList.remove("hidden");
        
            button.textContent = "＋ ADD FRIEND";
        
            button.dataset.action = "request";
        
            button.disabled = false;
        
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

    if (button.disabled) {
        return;
    }
    
    if (
        action === "friend" ||
        action === "sent"
    ) {
        return;
    }

    if (action === "friend" || action === "sent") {
        return;
    }

    button.disabled = true;

    try {

        if (action === "accept") {

            
            const now = Date.now();
            
            await update(ref(db), {
            
                [`friends/${mine}/${to}`]: {
                    since: now
                },
            
                [`friends/${to}/${mine}`]: {
                    since: now
                },
            
                [`friendRequests/${mine}/${to}`]: null,
                [`friendRequests/${to}/${mine}`]: null,
            
                [`sentFriendRequests/${mine}/${to}`]: null,
                [`sentFriendRequests/${to}/${mine}`]: null
            });


            button.textContent = "✓ FRIEND";
            button.dataset.action = "friend";

        } else {

            const existingRequest = await get(
                ref(
                    db,
                    `sentFriendRequests/${mine}/${to}`
                )
            );
            
            if (existingRequest.exists()) {
            
                button.textContent = "✓ REQUEST SENT";
            
                button.dataset.action = "sent";
            
                return;
            }

            
            const now = Date.now();
            
            await update(ref(db), {
            
                [`friendRequests/${to}/${mine}`]: {
                    from: mine,
                    createdAt: now
                },
            
                [`sentFriendRequests/${mine}/${to}`]: {
                    to,
                    createdAt: now
                }
            });


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

/* ==========================================
   PVP STUDY MODE SELECTOR
========================================== */

function createStudyModeOptions() {
    return `
        <option value="jlpt">🎓 JLPT</option>
        <option value="topic">📚 CHỦ ĐỀ</option>
    `;
}

function createTargetOptions(studyMode) {

    if (studyMode === "topic") {

        return topics.map(topic => `
            <option value="${topic.id}">
                ${escapeHTML(topic.name)}
            </option>
        `).join("");
    }

    return ["n5", "n4", "n3", "n2", "n1"]
        .map(level => `
            <option value="${level}">
                ${level.toUpperCase()}
            </option>
        `).join("");
}

function updatePvpStudyTarget(prefix) {

    const studyMode = document.getElementById(
        `${prefix}StudyMode`
    );

    const target = document.getElementById(
        `${prefix}Target`
    );

    const label = document.getElementById(
        `${prefix}TargetLabel`
    );

    if (!studyMode || !target) return;

    const type = studyMode.value;

    target.innerHTML = createTargetOptions(type);

    if (label) {

        label.textContent =
            type === "jlpt"
                ? "JLPT LEVEL"
                : "TOPIC";
    }
}

/* ==========================================
   PVP ROOM EMOJI REACTIONS
========================================== */

const PVP_EMOJIS = [
    "😀", "😂", "😍", "😎",
    "😢", "😡", "🔥", "👍",
    "👏", "💪", "❤️", "🎉"
];

function initPvpEmoji() {

    const button = document.getElementById(
        "pvpEmojiButton"
    );

    const picker = document.getElementById(
        "pvpEmojiPicker"
    );

    if (!button || !picker) return;

    picker.innerHTML = PVP_EMOJIS.map(emoji => `
        <button type="button"
                class="pvp-emoji-option"
                data-pvp-emoji="${emoji}">
            ${emoji}
        </button>
    `).join("");

    button.onclick = () => {
        picker.classList.toggle("hidden");
    };

    picker.querySelectorAll("[data-pvp-emoji]")
        .forEach(item => {

            item.onclick = async () => {

                const emoji = item.dataset.pvpEmoji;

                if (!PVP_EMOJIS.includes(emoji)) return;

                const code = getConnectionInfo().roomCode;
                const uid = auth.currentUser?.uid;

                if (!code || !uid) return;

                try {

                    await set(
                        ref(
                            db,
                            `rooms/${code}/reactions/${uid}`
                        ),
                        {
                            emoji,
                            at: Date.now()
                        }
                    );

                    picker.classList.add("hidden");

                } catch (error) {

                    console.error(
                        "[PVP] Emoji error:",
                        error
                    );
                }
            };
        });
}


/* ==========================================
   1V1 ROOM INVITATIONS
========================================== */

function pvpInviteCode() {

    return getConnectionInfo().roomCode;
}

function pvpInviteNotice(message) {

    const el = document.getElementById(
        "pvpInviteMessage"
    );

    if (el) el.textContent = message;
}

async function loadPvpInvitePlayers(type = "online") {

    const container =
        document.getElementById("pvpInviteList");

    const myUid = auth.currentUser?.uid;

    const code = pvpInviteCode();

    const room = currentRoom;

    if (!container) return;

    /* Reset scroll when switching invite tabs */
    container.scrollTop = 0;

    if (!myUid || !code || !room) {

        container.textContent =
            "Room is not ready.";

        return;
    }

    container.textContent = "Loading players...";

    // Giữ nguyên phần try/catch
    // và logic lấy danh sách phía dưới.

    try {

        let playerIds = [];

        if (type === "online") {

            const snap = await get(
                ref(db, "pvpPresence")
            );

            const players = Object.values(
                snap.val() || {}
            );

            playerIds = players
                .filter(p =>
                    p.online === true &&
                    p.uid !== myUid &&
                    p.uid !== room.guest?.uid
                )
                .map(p => p.uid);

        } else {

            // Use BatLingo's existing Friends database.
            const snap = await get(
                ref(db, `friends/${myUid}`)
            );

            playerIds = Object.keys(
                snap.val() || {}
            ).filter(uid => uid !== myUid);
        }

        playerIds = [...new Set(playerIds)]
            .slice(0, 50);

        const profiles = await Promise.all(
            playerIds.map(async uid => {

                const [profileSnap, presenceSnap] =
                    await Promise.all([

                        get(ref(
                            db,
                            `publicProfiles/${uid}`
                        )),

                        get(ref(
                            db,
                            `pvpPresence/${uid}`
                        ))
                    ]);

                const profile = profileSnap.val() || {};
                const presence = presenceSnap.val() || {};

                return {

                    uid,

                    name:
                        profile.displayName ||
                        presence.name ||
                        "Player",

                    level:
                        Number(profile.level) ||
                        Number(presence.level) ||
                        1,

                    online: presence.online === true
                };
            })
        );

        container.innerHTML = profiles.length
            ? profiles.map(player => `
                <div class="pvp-list-item">

                    <div class="pvp-list-info">

                        <strong>
                            ${escapeHTML(player.name)}
                        </strong>

                        <small>
                            LV. ${player.level}
                            · ${player.online
                                ? "🟢 ONLINE"
                                : "OFFLINE"}
                        </small>

                    </div>

                    <button type="button"
                            data-pvp-invite="${escapeHTML(player.uid)}">
                        INVITE
                    </button>

                </div>
            `).join("")
            : `<p class="pvp-empty">
                No players available.
               </p>`;
        
        // Always display first player at top
        container.scrollTop = 0;

        container
            .querySelectorAll("[data-pvp-invite]")
            .forEach(button => {

                button.onclick = async () => {

                    const uid =
                        button.dataset.pvpInvite;

                    button.disabled = true;

                    try {

                        await sendPvpInvite(uid);

                        button.textContent = "✓ SENT";

                    } catch (error) {

                        button.disabled = false;

                        pvpInviteNotice(error.message);
                    }
                };
            });

    } catch (error) {

        container.textContent = error.message;
    }
}

async function sendPvpInvite(receiverUid) {

    const senderUid = auth.currentUser?.uid;

    const code = pvpInviteCode();

    const room = currentRoom;

    if (!senderUid || !receiverUid || !code) {
        throw new Error("INVALID_INVITE");
    }

    if (
        !room ||
        room.host?.uid !== senderUid ||
        room.guest?.connected
    ) {
        throw new Error("ROOM_NOT_AVAILABLE");
    }

    const inviteRef = ref(
        db,
        `pvpInvites/${receiverUid}/${code}`
    );

    const existing = await get(inviteRef);

    if (existing.exists()) {
        throw new Error("INVITE_ALREADY_SENT");
    }

    await set(inviteRef, {

        roomCode: code,

        fromUid: senderUid,

        fromName:
            window.currentUserData?.profile?.displayName ||
            auth.currentUser?.displayName ||
            "Player",

        roomName: room.name || "1V1 BATTLE",

        createdAt: Date.now()
    });
}



/* =========================================================
   PVP INVITATIONS - ACCEPT / DECLINE / CLEANUP
========================================================= */

let pvpInviteRenderId = 0;
let pvpAcceptBusy = false;

async function renderPvpIncomingInvites(snapshot) {

    const container = $("pvpIncomingInvites");
    const uid = auth.currentUser?.uid;

    if (!container || !uid) return;

    const renderId = ++pvpInviteRenderId;

    const entries = Object.entries(
        snapshot.val() || {}
    );

    const validInvites = [];

    // Validate invitations against current room state.
    for (const [code, invite] of entries.slice(0, 50)) {

        if (!invite) continue;

        if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
            continue;
        }

        try {

            const roomSnap = await get(
                ref(db, `rooms/${code}`)
            );

            const room = roomSnap.val();

            const alreadyJoined =
                room?.host?.uid === uid ||
                room?.guest?.uid === uid;

            const expired =
                Date.now() -
                Number(invite.createdAt || 0) >
                10 * 60 * 1000;

            const available =
                room &&
                room.host?.uid === invite.fromUid &&
                room.host?.connected === true &&
                !room.guest?.connected &&
                ["waiting", "connected"].includes(
                    room.status
                );

            if (
                alreadyJoined ||
                expired ||
                !available
            ) {

                await remove(
                    ref(
                        db,
                        `pvpInvites/${uid}/${code}`
                    )
                );

                continue;
            }

            validInvites.push({
                code,
                invite
            });

        } catch (error) {

            console.warn(
                "[PVP] Invite validation failed:",
                code,
                error
            );
        }
    }

    // Avoid an older async callback overwriting newer UI.
    if (renderId !== pvpInviteRenderId) {
        return;
    }

    container.classList.toggle(
        "hidden",
        validInvites.length === 0
    );

    container.innerHTML = validInvites.map(
        ({code, invite}) => `

        <div class="pvp-invite-notification">

            <strong>⚔ 1V1 INVITATION</strong>

            <p>
                ${escapeHTML(invite.fromName || "Player")}
                invited you to
                ${escapeHTML(invite.roomName || "1V1 BATTLE")}
            </p>

            <div class="pvp-invite-actions">

                <button
                    type="button"
                    data-invite-decline="${escapeHTML(code)}">
                    DECLINE
                </button>

                <button
                    type="button"
                    data-invite-accept="${escapeHTML(code)}">
                    ✓ ACCEPT
                </button>

            </div>

        </div>
    `).join("");

    /* =====================================
       DECLINE
    ===================================== */

    container
        .querySelectorAll("[data-invite-decline]")
        .forEach(button => {

            button.onclick = async () => {

                if (button.disabled) return;

                button.disabled = true;

                const code =
                    button.dataset.inviteDecline;

                try {

                    await remove(
                        ref(
                            db,
                            `pvpInvites/${uid}/${code}`
                        )
                    );

                } catch (error) {

                    console.error(
                        "[PVP] Decline failed:",
                        error
                    );

                    button.disabled = false;
                }
            };
        });

    /* =====================================
       ACCEPT
    ===================================== */

    container
        .querySelectorAll("[data-invite-accept]")
        .forEach(button => {

            button.onclick = async () => {

                if (button.disabled || pvpAcceptBusy) {
                    return;
                }

                const code =
                    button.dataset.inviteAccept;

                pvpAcceptBusy = true;

                button.disabled = true;
                button.textContent = "JOINING...";

                let joined = false;

                try {

                    // Join Firebase room directly.
                    await joinRoom(code);

                    joined = true;

                    console.log(
                        "[PVP] Invitation accepted:",
                        code
                    );

                    // Remove invitation AFTER successful join.
                    await remove(
                        ref(
                            db,
                            `pvpInvites/${uid}/${code}`
                        )
                    );

                } catch (error) {

                    console.error(
                        "[PVP] Accept failed:",
                        error
                    );

                    if (!joined) {

                        button.disabled = false;
                        button.textContent = "✓ ACCEPT";

                        alert(
                            "Cannot join room: " +
                            error.message
                        );

                        return;

                    } else {

                        // Joined successfully, but cleanup failed.
                        // Do not attempt to join a second time.
                        console.warn(
                            "[PVP] Joined, invite cleanup pending:",
                            error
                        );
                    }

                } finally {

                    pvpAcceptBusy = false;
                }

                // Show waiting room on successful join.
                $("roomSelectPanel")
                    ?.classList.add("hidden");

                $("waitingRoomPanel")
                    ?.classList.remove("hidden");

                if ($("currentRoomCode")) {
                    $("currentRoomCode").textContent =
                        code;
                }

                // Hide old invite UI immediately.
                container.classList.add("hidden");
                container.innerHTML = "";
            };
        });
}

    

/* =========================================================
   PVP INVITE - TAB SELECTION FIX
========================================================= */

function initPvpInviteEvents() {

    const toggle = document.getElementById(
        "pvpInviteToggle"
    );

    const panel = document.getElementById(
        "pvpInvitePanel"
    );

    const onlineTab = document.getElementById(
        "pvpInviteOnlineTab"
    );

    const friendsTab = document.getElementById(
        "pvpInviteFriendsTab"
    );

    function selectInviteTab(type) {

        const isOnline = type === "online";

        onlineTab.classList.toggle("active", isOnline);
        friendsTab.classList.toggle("active", !isOnline);

        onlineTab.setAttribute(
            "aria-selected",
            String(isOnline)
        );

        friendsTab.setAttribute(
            "aria-selected",
            String(!isOnline)
        );

        loadPvpInvitePlayers(type);
    }

    toggle.onclick = () => {

        const isOpening =
            panel.classList.contains("hidden");

        panel.classList.toggle("hidden");

        if (isOpening) {
            selectInviteTab("online");
        }
    };

    onlineTab.onclick = () => {
        selectInviteTab("online");
    };

    friendsTab.onclick = () => {
        selectInviteTab("friends");
    };
}

