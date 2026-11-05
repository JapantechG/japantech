
/* =========================================================
   BATLINGO - FRIENDS SYSTEM
   Firebase Realtime Database v12.3.0
========================================================= */

import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    set,
    update,
    onValue,
    query,
    orderByChild,
    equalTo
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";


/* =========================================================
   STATE
========================================================= */

const $ = id => document.getElementById(id);

let currentUid = null;

let friends = {};
let incoming = {};
let outgoing = {};

let activeTab = "friends";

let selectedUid = null;

let initialized = false;
let busy = false;

let generation = 0;
let renderVersion = 0;

let unsubscribeList = [];


/* =========================================================
   HELPERS
========================================================= */

function safe(value) {

    return String(value ?? "").replace(
        /[&<>"']/g,
        ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        }[ch])
    );
}

function number(value, fallback = 0) {

    const result = Number(value);

    return Number.isFinite(result)
        ? result
        : fallback;
}

function isCurrentUser() {

    return !!currentUid &&
        auth.currentUser?.uid === currentUid;
}

function showMessage(message, error = false) {

    const element = $("friendsMessage");

    if (!element) return;

    element.textContent = message;

    element.classList.toggle("error", error);
}

function getDisplayName(profile) {

    return profile?.displayName || "PLAYER";
}

function getBatlingoId(profile) {

    return profile?.batlingoId || "—";
}


/* =========================================================
   PUBLIC PROFILE DATA

   Chỉ lưu thông tin công khai.
   KHÔNG lưu email / wallet / review.
========================================================= */

function createPublicProfile(userData) {

    const profile = userData?.profile || {};
    const progress = userData?.progress || {};
    const rating = userData?.rating || {};
    const stats = userData?.stats || {};
    const mascot = userData?.mascot || {};

    return {

        batlingoId:
            String(profile.batlingoId || ""),

        displayName:
            String(profile.displayName || "PLAYER")
                .slice(0, 20),

        bio:
            String(profile.bio || "")
                .slice(0, 100),

        // Chỉ cho phép ảnh HTTPS.
        photoURL:
            typeof profile.photoURL === "string" &&
            /^https:\/\//i.test(profile.photoURL)
                ? profile.photoURL
                : "",

        level:
            Math.max(1, number(progress.level, 1)),

        elo:
            number(rating.elo, 1000),

        battles:
            number(stats.totalGames),

        wins:
            number(stats.wins),

        losses:
            number(stats.losses),

        draws:
            number(stats.draws),

        bestCombo:
            number(stats.bestCombo),

        mascot:
            ["buffalo", "monkey"].includes(mascot.id)
                ? mascot.id
                : "",

        evolution:
            Math.min(
                4,
                Math.max(
                    0,
                    Math.floor(number(mascot.evolution))
                )
            ),

        updatedAt:
            Date.now()
    };
}


/* =========================================================
   SYNC PUBLIC PROFILE

   users/{uid} -> publicProfiles/{uid}
========================================================= */

export async function syncMyPublicProfile(
    userData = window.currentUserData
) {

    const user = auth.currentUser;

    if (!user || !userData?.profile?.batlingoId) {
        return;
    }

    const uid = user.uid;

    const data = createPublicProfile(userData);

    try {

        await set(
            ref(db, `publicProfiles/${uid}`),
            data
        );

        console.log(
            "[FRIENDS] Public profile synchronized"
        );

    } catch (error) {

        console.error(
            "[FRIENDS] Profile sync failed:",
            error
        );
    }
}


/* =========================================================
   READ PUBLIC PROFILE
========================================================= */

async function getPublicProfile(uid) {

    const snapshot = await get(
        ref(db, `publicProfiles/${uid}`)
    );

    return snapshot.exists()
        ? snapshot.val()
        : null;
}


/* =========================================================
   STOP FIREBASE LISTENERS
========================================================= */

function stopListeners() {

    unsubscribeList.forEach(unsubscribe => {

        unsubscribe();

    });

    unsubscribeList = [];

    friends = {};
    incoming = {};
    outgoing = {};
}


/* =========================================================
   REALTIME WATCH
========================================================= */

function watch(path, callback) {

    const owner = currentUid;
    const token = generation;

    const unsubscribe = onValue(

        ref(db, path),

        snapshot => {

            if (
                token !== generation ||
                owner !== currentUid
            ) {
                return;
            }

            callback(snapshot.val() || {});

            renderList();
        },

        error => {

            showMessage(
                `Firebase: ${error.message}`,
                true
            );
        }
    );

    unsubscribeList.push(unsubscribe);
}


/* =========================================================
   LISTEN FRIENDS / REQUESTS / SENT
========================================================= */

function startListeners() {

    stopListeners();

    if (!isCurrentUser()) return;

    watch(
        `friends/${currentUid}`,
        data => {
            friends = data;
        }
    );

    watch(
        `friendRequests/${currentUid}`,
        data => {
            incoming = data;
        }
    );

    watch(
        `sentFriendRequests/${currentUid}`,
        data => {
            outgoing = data;
        }
    );
}


/* =========================================================
   MASCOT IMAGE
========================================================= */

function getMascotHTML(profile) {

    const mascot = profile?.mascot;

    if (
        mascot !== "buffalo" &&
        mascot !== "monkey"
    ) {

        return `
            <span class="friends-mascot-fallback">
                👤
            </span>
        `;
    }

    const evolution = Math.min(
        4,
        Math.max(
            0,
            Math.floor(number(profile.evolution))
        )
    );

    const path = evolution === 0
        ? `assets/mascot/${mascot}.png`
        : `assets/mascot/${mascot}-stage-${evolution + 1}.png`;

    return `
        <img
            class="friends-mascot"
            src="${path}"
            alt="${mascot}"
            onerror="this.hidden=true">
    `;
}


/* =========================================================
   PLAYER ROW
========================================================= */

function createPlayerRow(uid, profile, type) {

    let buttons = `
        <button
            type="button"
            data-friend-action="profile"
            data-uid="${safe(uid)}">
            PROFILE
        </button>
    `;

    if (type === "friends") {

        buttons += `
            <button
                type="button"
                data-friend-action="unfriend"
                data-uid="${safe(uid)}">
                REMOVE
            </button>
        `;
    }

    if (type === "requests") {

        buttons += `
            <button
                type="button"
                class="primary"
                data-friend-action="accept"
                data-uid="${safe(uid)}">
                ACCEPT
            </button>

            <button
                type="button"
                data-friend-action="reject"
                data-uid="${safe(uid)}">
                DECLINE
            </button>
        `;
    }

    if (type === "sent") {

        buttons += `
            <button
                type="button"
                data-friend-action="cancel"
                data-uid="${safe(uid)}">
                CANCEL
            </button>
        `;
    }

    return `
        <article class="friends-player-row">

            ${getMascotHTML(profile)}

            <div class="friends-player-text">

                <strong>
                    ${safe(getDisplayName(profile))}
                </strong>

                <small>
                    ${safe(getBatlingoId(profile))}
                    · LV. ${number(profile?.level, 1)}
                </small>

            </div>

            <div class="friends-row-actions">
                ${buttons}
            </div>

        </article>
    `;
}


/* =========================================================
   RENDER LIST
========================================================= */

async function renderList() {

    const screen = $("friendsScreen");
    const list = $("friendsList");

    if (
        !screen ||
        !list ||
        screen.classList.contains("hidden") ||
        !isCurrentUser()
    ) {
        return;
    }

    const token = generation;
    const version = ++renderVersion;
    const tab = activeTab;

    const data = tab === "friends"
        ? friends
        : tab === "requests"
            ? incoming
            : outgoing;

    const ids = Object.keys(data);

    $("friendsCount").textContent =
        Object.keys(friends).length;

    $("friendsRequestCount").textContent =
        Object.keys(incoming).length;

    $("friendsSentCount").textContent =
        Object.keys(outgoing).length;

    document.querySelectorAll(
        "[data-friends-tab]"
    ).forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.friendsTab === tab
        );
    });

    if (ids.length === 0) {

        list.textContent = tab === "friends"
            ? "No friends yet. Search for players to add friends."
            : "No players here.";

        return;
    }

    list.textContent = "Loading players...";

    const profiles = await Promise.all(

        ids.map(uid =>
            getPublicProfile(uid).catch(() => null)
        )

    );

    if (
        token !== generation ||
        version !== renderVersion ||
        tab !== activeTab ||
        !isCurrentUser() ||
        screen.classList.contains("hidden")
    ) {
        return;
    }

    list.innerHTML = ids.map(
        (uid, index) => createPlayerRow(
            uid,
            profiles[index],
            tab
        )
    ).join("");
}


/* =========================================================
   SEARCH PLAYER BY BATLINGO ID
========================================================= */

async function searchPlayer() {

    if (!isCurrentUser()) return;

    const input = $("friendsSearchInput");

    const code = input.value
        .trim()
        .toUpperCase();

    if (!/^BLG-\d{7}$/.test(code)) {

        showMessage(
            "Enter a valid ID, for example BLG-0000001.",
            true
        );

        return;
    }

    const token = generation;

    showMessage("Searching...");

    $("friendsSearchResult").replaceChildren();

    try {

        const playerQuery = query(

            ref(db, "publicProfiles"),

            orderByChild("batlingoId"),

            equalTo(code)
        );

        const snapshot = await get(playerQuery);

        if (
            token !== generation ||
            !isCurrentUser()
        ) {
            return;
        }

        if (!snapshot.exists()) {

            showMessage(
                "Player not found. The player may need to log in again.",
                true
            );

            return;
        }

        const results = Object.entries(
            snapshot.val()
        );

        const [otherUid, profile] = results[0];

        showSearchResult(otherUid, profile);

        showMessage("");

    } catch (error) {

        console.error("[FRIENDS] Search:", error);

        showMessage(
            `Search failed: ${error.message}`,
            true
        );
    }
}


/* =========================================================
   SEARCH RESULT
========================================================= */

function showSearchResult(otherUid, profile) {

    const container = $("friendsSearchResult");

    if (otherUid === currentUid) {

        container.textContent =
            "This is your own account.";

        return;
    }

    let action = "send";
    let label = "ADD FRIEND";

    if (friends[otherUid]) {

        action = "profile";
        label = "VIEW PROFILE";

    } else if (incoming[otherUid]) {

        action = "accept";
        label = "ACCEPT REQUEST";

    } else if (outgoing[otherUid]) {

        action = "profile";
        label = "REQUEST SENT";
    }

    container.innerHTML = `

        ${createPlayerRow(
            otherUid,
            profile,
            "search"
        )}

        <div class="friends-search-buttons">

            <button
                type="button"
                class="primary"
                data-friend-action="${action}"
                data-uid="${safe(otherUid)}">

                ${label}

            </button>

        </div>
    `;
}


/* =========================================================
   FRIEND ACTIONS
========================================================= */

async function handleFriendAction(action, otherUid) {

    if (
        !isCurrentUser() ||
        busy ||
        !otherUid ||
        otherUid === currentUid ||
        !/^[a-zA-Z0-9_-]+$/.test(otherUid)
    ) {
        return;
    }

    const myUid = currentUid;

    busy = true;

    try {

        const changes = {};

        const now = Date.now();

        /* -------------------------
           SEND REQUEST
        ------------------------- */

        if (action === "send") {

            if (
                friends[otherUid] ||
                outgoing[otherUid]
            ) {
                return;
            }

            changes[
                `friendRequests/${otherUid}/${myUid}`
            ] = {
                from: myUid,
                createdAt: now
            };

            changes[
                `sentFriendRequests/${myUid}/${otherUid}`
            ] = {
                to: otherUid,
                createdAt: now
            };
        }

        /* -------------------------
           ACCEPT REQUEST
        ------------------------- */

        else if (action === "accept") {

            if (!incoming[otherUid]) return;

            changes[
                `friends/${myUid}/${otherUid}`
            ] = {
                since: now
            };

            changes[
                `friends/${otherUid}/${myUid}`
            ] = {
                since: now
            };

            changes[
                `friendRequests/${myUid}/${otherUid}`
            ] = null;

            changes[
                `sentFriendRequests/${otherUid}/${myUid}`
            ] = null;
        }

        /* -------------------------
           REJECT / CANCEL
        ------------------------- */

        else if (
            action === "reject" ||
            action === "cancel"
        ) {

            const receiver = action === "reject"
                ? myUid
                : otherUid;

            const sender = action === "reject"
                ? otherUid
                : myUid;

            changes[
                `friendRequests/${receiver}/${sender}`
            ] = null;

            changes[
                `sentFriendRequests/${sender}/${receiver}`
            ] = null;
        }

        /* -------------------------
           REMOVE FRIEND
        ------------------------- */

        else if (action === "unfriend") {

            if (!friends[otherUid]) return;

            if (!window.confirm(
                "Remove this player from your friends?"
            )) {
                return;
            }

            changes[
                `friends/${myUid}/${otherUid}`
            ] = null;

            changes[
                `friends/${otherUid}/${myUid}`
            ] = null;
        }

        else {

            return;
        }

        /* -------------------------
           SAVE TO FIREBASE
        ------------------------- */

        await update(ref(db), changes);

        if (auth.currentUser?.uid === myUid) {

            showMessage("Updated successfully.");

            $("friendsSearchResult")
                ?.replaceChildren();
        }

    } catch (error) {

        console.error(
            "[FRIENDS] Action failed:",
            error
        );

        showMessage(
            `Unable to update: ${error.message}`,
            true
        );

    } finally {

        busy = false;
    }
}


/* =========================================================
   VIEW FRIEND PROFILE
========================================================= */

async function showFriendProfile(otherUid) {

    if (!isCurrentUser()) return;

    selectedUid = otherUid;

    const token = generation;

    const panel = $("friendProfilePanel");

    panel.classList.remove("hidden");

    panel.innerHTML = `
        <p>Loading player profile...</p>
    `;

    try {

        const profile = await getPublicProfile(
            otherUid
        );

        if (
            token !== generation ||
            selectedUid !== otherUid ||
            !isCurrentUser()
        ) {
            return;
        }

        if (!profile) {

            panel.textContent =
                "Profile unavailable.";

            return;
        }

        const battles = number(profile.battles);
        const wins = number(profile.wins);

        const winRate = battles > 0
            ? (wins / battles * 100).toFixed(1) + "%"
            : "--";

        const mascotName =
            profile.mascot === "buffalo"
                ? "🐃 BUFFALO"
                : profile.mascot === "monkey"
                    ? "🐒 MONKEY"
                    : "NO MASCOT";

        const stage = Math.min(
            5,
            Math.max(
                1,
                Math.floor(number(profile.evolution)) + 1
            )
        );

        const stats = [

            ["LEVEL", number(profile.level, 1)],
            ["ELO", number(profile.elo, 1000)],
            ["BATTLES", battles],
            ["WINS", wins],
            ["LOSSES", number(profile.losses)],
            ["WIN RATE", winRate],
            ["DRAWS", number(profile.draws)],
            ["BEST COMBO", number(profile.bestCombo)]

        ];

        panel.innerHTML = `

            <button
                id="friendProfileClose"
                class="friends-profile-close"
                type="button">
                ✕
            </button>

            <div class="friends-profile-head">

                ${getMascotHTML(profile)}

                <div>

                    <h2>
                        ${safe(getDisplayName(profile))}
                    </h2>

                    <p>
                        ${safe(getBatlingoId(profile))}
                    </p>

                </div>

            </div>

            <p class="friends-bio">
                ${safe(profile.bio || "No bio yet.")}
            </p>

            <div class="friends-stats">

                ${stats.map(([label, value]) => `

                    <div>
                        <strong>${safe(value)}</strong>
                        <small>${safe(label)}</small>
                    </div>

                `).join("")}

            </div>

            <p class="friends-profile-pet">

                ${mascotName}

                ${profile.mascot
                    ? ` · STAGE ${stage}`
                    : ""}

            </p>
        `;

        $("friendProfileClose")
            ?.addEventListener(
                "click",
                closeFriendProfile
            );

    } catch (error) {

        panel.textContent =
            `Unable to load profile: ${error.message}`;
    }
}


/* =========================================================
   CLOSE FRIEND PROFILE
========================================================= */

function closeFriendProfile() {

    selectedUid = null;

    $("friendProfilePanel")
        ?.classList.add("hidden");
}


/* =========================================================
   OPEN FRIENDS
========================================================= */

export function openFriends() {

    if (
        !auth.currentUser ||
        (
            !auth.currentUser.emailVerified &&
            !auth.currentUser.providerData.some(
                p => p.providerId === "google.com"
            )
        )
    ) {

        window.BatLingoAuthUI?.open();

        return;
    }

    if (!window.currentUserData?.profile) {

        showMessage("User profile is not ready.");

        return;
    }

    currentUid = auth.currentUser.uid;

    ++generation;

    $("setupScreen")
        ?.classList.add("hidden");

    $("friendsScreen")
        ?.classList.remove("hidden");

    closeFriendProfile();

    $("friendsSearchResult")
        ?.replaceChildren();

    showMessage("");

    activeTab = "friends";

    startListeners();

    renderList();
}


/* =========================================================
   CLOSE FRIENDS
========================================================= */

export function closeFriends() {

    ++generation;
    ++renderVersion;

    closeFriendProfile();

    stopListeners();

    currentUid = null;

    $("friendsScreen")
        ?.classList.add("hidden");

    $("setupScreen")
        ?.classList.remove("hidden");
}


/* =========================================================
   INITIALIZATION
========================================================= */

export function initFriends() {

    if (initialized) return;

    initialized = true;

    /* BACK */

    $("friendsBackBtn")
        ?.addEventListener(
            "click",
            closeFriends
        );

    /* SEARCH */

    $("friendsSearchBtn")
        ?.addEventListener(
            "click",
            searchPlayer
        );

    $("friendsSearchInput")
        ?.addEventListener(
            "keydown",
            event => {

                if (event.key === "Enter") {
                    searchPlayer();
                }
            }
        );

    /* TABS + PLAYER ACTIONS */

    $("friendsScreen")
        ?.addEventListener(
            "click",
            event => {

                const tab = event.target.closest(
                    "[data-friends-tab]"
                );

                if (tab) {

                    activeTab =
                        tab.dataset.friendsTab;

                    renderList();

                    return;
                }

                const button = event.target.closest(
                    "[data-friend-action]"
                );

                if (!button) return;

                const action =
                    button.dataset.friendAction;

                const otherUid =
                    button.dataset.uid;

                if (action === "profile") {

                    showFriendProfile(otherUid);

                } else {

                    handleFriendAction(
                        action,
                        otherUid
                    );
                }
            }
        );

    /* AUTH READY */

    window.addEventListener(
        "batlingo-auth-state",
        event => {

            if (
                event.detail?.loggedIn &&
                event.detail.userData
            ) {

                syncMyPublicProfile(
                    event.detail.userData
                );

            } else if (
                !event.detail?.loggedIn
            ) {

                if (
                    !$("friendsScreen")
                        ?.classList.contains("hidden")
                ) {
                    closeFriends();
                }

                currentUid = null;
            }
        }
    );

    /* EXP / LEVEL UPDATED */

    window.addEventListener(
        "batlingo-progress-updated",
        event => {

            syncMyPublicProfile(
                event.detail?.userData
            );
        }
    );

    /* PROFILE EDITED */

    window.addEventListener(
        "batlingo-profile-updated",
        async () => {

            const user = auth.currentUser;

            if (!user) return;

            try {

                const snapshot = await get(
                    ref(db, `users/${user.uid}`)
                );

                if (
                    snapshot.exists() &&
                    auth.currentUser?.uid === user.uid
                ) {

                    await syncMyPublicProfile(
                        snapshot.val()
                    );
                }

            } catch (error) {

                console.error(
                    "[FRIENDS] Profile refresh:",
                    error
                );
            }
        }
    );

    /* MASCOT SELECTED */

    document.addEventListener(
        "batlingo:mascot-ready",
        () => {

            syncMyPublicProfile();
        }
    );

    console.log(
        "[BATLINGO] Friends initialized"
    );
}
