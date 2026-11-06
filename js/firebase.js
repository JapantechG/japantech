// ============================================================
// BATLINGO - FIREBASE CONNECTION
// Mục tiêu:
// 1. Host tạo phòng
// 2. Guest nhập room code
// 3. Hai máy nhận trạng thái phòng realtime
// ============================================================

import { initializeApp } from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";

import {
    getAuth
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    getDatabase,
    ref,
    get,
    set,
    update,
    remove,
    onValue,
    onDisconnect,
    runTransaction
} from
    "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";


// ============================================================
// FIREBASE CONFIG
// Thay bằng config thật lấy từ Firebase Console
// ============================================================

const firebaseConfig = {

    apiKey: "AIzaSyCALnGcmi4jv7ppqDt0IUY8rPPp5FndtHs",

    authDomain:
        "batlingo.firebaseapp.com",

    databaseURL:
        "https://batlingo-default-rtdb.asia-southeast1.firebasedatabase.app/",

    projectId:
        "batlingo",

    storageBucket:
        "batlingo.firebasestorage.app",

    messagingSenderId:
        "318561882278",

    appId:
        "1:318561882278:web:635ac2cd239dd1f1e2e467"
};


// ============================================================
// INITIALIZE
// ============================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getDatabase(app);

export {app,auth,db};
// ============================================================
// CURRENT CONNECTION
// ============================================================

let roomCode = null;

let playerRole = null;

let playerId = null;

let unsubscribeRoom = null;

// ============================================================
// CREATE PLAYER ID
// ============================================================

function createPlayerId() 
{
    if (crypto.randomUUID) 
    {
        return crypto.randomUUID();
    }

    return (Date.now().toString(36) + Math.random().toString(36).substring(2));
}

// ============================================================
// CREATE ROOM CODE
//
// Không dùng:
// I O 0 1
//
// để tránh người chơi nhập nhầm
// ============================================================

function generateRoomCode(length = 6) {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    const random = new Uint32Array(length);

    crypto.getRandomValues(random);

    let code = "";

    for (let i = 0; i < length; i++) {

        code += chars[
            random[i] % chars.length
        ];
    }

    return code;
}


/* =========================================================
   GET PVP PLAYER PROFILE
========================================================= */

async function getPvpPlayer() {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("LOGIN_REQUIRED");
    }

    const local = window.currentUserData || {};

    let publicProfile = {};

    try {

        const snapshot = await get(
            ref(db, `publicProfiles/${user.uid}`)
        );

        publicProfile = snapshot.val() || {};

    } catch (error) {

        console.warn(
            "[PVP] Public profile unavailable:",
            error
        );
    }

    const localProfile = local.profile || {};

    const name =
        publicProfile.displayName ||
        localProfile.displayName ||
        user.displayName ||
        user.email?.split("@")[0] ||
        "Player";

    const photoURL =
        publicProfile.photoURL ||
        localProfile.photoURL ||
        user.photoURL ||
        "";

    const batlingoId =
        publicProfile.batlingoId ||
        localProfile.batlingoId ||
        "";

    const level =
        Number(publicProfile.level) ||
        Number(local.progress?.level) ||
        Number(local.level) ||
        1;

    return {

        uid: user.uid,

        id: user.uid,

        name: String(name).slice(0, 20),

        photoURL,

        batlingoId,

        level,

        connected: true
    };
}



function normalizeRoomSettings(options = {}) {

    const levels = ["n5", "n4", "n3", "n2", "n1"];

    const allowedModes = [
        "kanji_meaning",
        "kanji_hiragana",
        "hiragana_meaning",
        "meaning_kanji",
        "audio_meaning",
        "audio_hiragana",
        "audio_kanji"
    ];

    const studyMode =
        options.studyMode === "topic"
            ? "topic"
            : "jlpt";

    const selectedTarget = String(
        options.target ||
        options.level ||
        "n5"
    ).toLowerCase();

    let target;

    if (studyMode === "jlpt") {

        target = levels.includes(selectedTarget)
            ? selectedTarget
            : "n5";

    } else {

        if (!/^[a-z][a-z0-9_]{0,50}$/.test(selectedTarget)) {
            throw new Error("INVALID_TOPIC");
        }

        target = selectedTarget;
    }

    return {

        studyMode,

        target,

        level: studyMode === "jlpt"
            ? target
            : "n5",

        category: "vocabulary",

        mode: allowedModes.includes(options.mode)
            ? options.mode
            : "kanji_meaning",

        count: [10, 20, 30, 50]
            .includes(Number(options.count))
                ? Number(options.count)
                : 20
    };
}

/* =========================================================
   CONNECT TO ROOM
========================================================= */

async function connectPvpRoom(code) {

    const user = auth.currentUser;

    if (!user) {
        throw new Error("LOGIN_REQUIRED");
    }

    const snapshot = await get(
        ref(db, `rooms/${code}`)
    );

    const room = snapshot.val();

    if (!room) {
        throw new Error("ROOM_NOT_FOUND");
    }

    const role =
        room.host?.uid === user.uid
            ? "host"
            : room.guest?.uid === user.uid
                ? "guest"
                : null;

    if (!role) {
        throw new Error("NOT_ROOM_MEMBER");
    }

    roomCode = code;
    playerId = user.uid;
    playerRole = role;

    const presenceRef = ref(
        db,
        `rooms/${code}/${role}/connected`
    );

    await onDisconnect(presenceRef).set(false);

    listenRoom();
}


/* =========================================================
   CREATE ROOM
========================================================= */

export async function createRoom(
    playerName,
    options = {}
) {

    const player = await getPvpPlayer();

    const settings =
        normalizeRoomSettings(options);

    for (let attempt = 0; attempt < 30; attempt++) {

        const code = generateRoomCode(6);

        const roomRef = ref(
            db,
            `rooms/${code}`
        );

        const result = await runTransaction(
            roomRef,
            current => {

                if (current !== null) {
                    return;
                }

                return {

                    status: "waiting",

                    createdAt: Date.now(),

                    visibility:
                        options.visibility === "public"
                            ? "public"
                            : "private",

                    name: String(
                        options.name ||
                        `${player.name}'s Room`
                    ).slice(0, 32),

                    settings,

                    host: player,

                    guest: null
                };
            },
            { applyLocally: false }
        );

        if (result.committed) {

            await connectPvpRoom(code);

            console.log(
                "[PVP] Created room:",
                code
            );

            return code;
        }
    }

    throw new Error("ROOM_CREATE_FAILED");
}


/* =========================================================
   JOIN ROOM
========================================================= */

export async function joinRoom(
    code,
    playerName
) {

    code = String(code || "")
        .trim()
        .toUpperCase();

    if (!/^[A-HJ-NP-Z2-9]{4,6}$/.test(code)) {
        throw new Error("ROOM_CODE_INVALID");
    }

    const player = await getPvpPlayer();

    const roomRef = ref(
        db,
        `rooms/${code}`
    );

    const result = await runTransaction(
        roomRef,
        room => {

            if (!room) {
                return;
            }

            if (
                room.status !== "waiting" &&
                room.status !== "connected"
            ) {
                return;
            }

            if (!room.host?.connected) {
                return;
            }

            if (room.host.uid === player.uid) {
                return;
            }

            if (
                room.guest?.connected &&
                room.guest.uid !== player.uid
            ) {
                return;
            }

            room.guest = player;
            room.status = "connected";

            return room;
        },
        { applyLocally: false }
    );

    if (!result.committed) {

        const snapshot = await get(roomRef);

        throw new Error(
            snapshot.exists()
                ? "ROOM_FULL"
                : "ROOM_NOT_FOUND"
        );
    }

    await connectPvpRoom(code);

    console.log(
        "[PVP] Joined room:",
        code
    );

    return code;
}


/* =========================================================
   UPDATE ROOM SETTINGS
========================================================= */

export async function updateRoomSettings(
    options = {}
) {

    if (!roomCode || playerRole !== "host") {
        throw new Error("HOST_ONLY");
    }

    const settings =
        normalizeRoomSettings(options);

    const result = await runTransaction(
        ref(db, `rooms/${roomCode}`),
        room => {

            if (!room) {
                return;
            }

            if (
                room.host?.uid !==
                auth.currentUser?.uid
            ) {
                return;
            }

            if (
                room.status !== "waiting" &&
                room.status !== "connected"
            ) {
                return;
            }

            room.name = String(
                options.name || "JLPT BATTLE"
            ).slice(0, 32);

            room.visibility =
                options.visibility === "public"
                    ? "public"
                    : "private";

            room.settings = settings;

            return room;
        },
        { applyLocally: false }
    );

    if (!result.committed) {
        throw new Error("ROOM_SETTINGS_FAILED");
    }
}


/* =========================================================
   TRANSFER HOST
========================================================= */

export async function transferRoomHost() {

    if (!roomCode || playerRole !== "host") {
        throw new Error("HOST_ONLY");
    }

    const result = await runTransaction(
        ref(db, `rooms/${roomCode}`),
        room => {

            if (!room) {
                return;
            }

            if (
                room.host?.uid !==
                auth.currentUser?.uid
            ) {
                return;
            }

            if (!room.guest?.connected) {
                return;
            }

            if (
                room.status !== "waiting" &&
                room.status !== "connected"
            ) {
                return;
            }

            const oldHost = room.host;

            room.host = room.guest;
            room.guest = oldHost;

            room.rematch = null;

            return room;
        },
        { applyLocally: false }
    );

    if (!result.committed) {
        throw new Error("HOST_TRANSFER_FAILED");
    }
}
// ============================================================
// LISTEN ROOM
//
// Firebase thay đổi:
//      ↓
// callback chạy trên cả hai máy
// ============================================================

function listenRoom() 
{

    if (!roomCode) 
    {
        return;
    }

    // Nếu đã có listener cũ
    if (unsubscribeRoom) 
    {
        unsubscribeRoom();

        unsubscribeRoom = null;
    }


    const roomRef = ref(db,`rooms/${roomCode}`);


    unsubscribeRoom = onValue(roomRef,snapshot => 
        {
                // Room bị xóa
                if (!snapshot.exists()) 
                {
                    console.log("[BatLingo] Room deleted.");
                    
                    window.dispatchEvent(new CustomEvent("batlingo-room-deleted", 
                        {
                            detail: 
                            {
                                roomCode,
                                playerRole
                            }
                        }));
                    
                    return;
                }

                const room = snapshot.val();

                const uid = auth.currentUser?.uid;

                const newRole =
                    room.host?.uid === uid
                        ? "host"
                        : room.guest?.uid === uid
                            ? "guest"
                            : null;
                
                if (!newRole) {
                
                    resetRoomConnection();
                
                    return;
                }
                
                if (playerRole !== newRole) {
                
                    const oldRole = playerRole;
                
                    if (oldRole) {
                
                        onDisconnect(
                            ref(
                                db,
                                `rooms/${roomCode}/${oldRole}/connected`
                            )
                        ).cancel().catch(console.error);
                    }
                
                    playerRole = newRole;
                
                    onDisconnect(
                        ref(
                            db,
                            `rooms/${roomCode}/${newRole}/connected`
                        )
                    ).set(false).catch(console.error);
                }

                console.log("[BatLingo] Room update:",room);

                // --------------------------------
                // Phát event cho pvp.js
                // --------------------------------

                window.dispatchEvent(new CustomEvent("batlingo-room-update",
                        {
                            detail: 
                            {
                                roomCode,
                                playerRole,
                                room
                            }
                        }
                    )
                );
            }
        );
}


// ============================================================
// GET CURRENT CONNECTION INFO
// ============================================================

export function getConnectionInfo() {

    return {
        roomCode,
        playerRole,
        playerId
    };
}

export async function startRoomGame(matchData) 
{
    if (!roomCode || playerRole !== "host") 
    {
        return;
    }

        
    const roomRef = ref(db,`rooms/${roomCode}`);

      /*
        Tạo MATCH MỚI hoàn toàn.
        Dùng set cho match để dữ liệu trận cũ
        như answers không còn tồn tại.
    */

    await set(ref(db,`rooms/${roomCode}/match`),
        {   
            matchId: Date.now(),

            level: matchData.level,

            category: matchData.category,

            mode: matchData.mode,

            questionIds: matchData.questionIds,

            questions: matchData.questions,

            currentQuestion:0,

            hostScore: 0,

            guestScore: 0
        }
    );

      /*
        Chuyển room sang playing
    */

    await update(roomRef,
        {
            status: "playing",

            startedAt: Date.now(),

            finishedAt: null,

            rematch: null
        }
    );

    console.log("[Firebase] Match started:",matchData
    );
}

export async function submitRoomAnswer(questionIndex,optionId) 
{

    if (!roomCode || !playerRole) 
    {
        return;
    }

    const answerRef =ref(db,`rooms/${roomCode}/match/answers/${questionIndex}/${playerRole}`);

    await set(answerRef,
        {
            optionId:
                optionId,

            answeredAt:
                Date.now()
        }
    );
}

export async function nextRoomQuestion(nextIndex,hostScore,guestScore) 
{

    if (!roomCode || playerRole !== "host") 
    {
        return;
    }

    await update(ref(db,`rooms/${roomCode}/match`),
        {
            currentQuestion:
                nextIndex,

            hostScore:
                hostScore,

            guestScore:
                guestScore
        }
    );
}

export async function finishRoomGame(hostScore,guestScore) 
{

    if (!roomCode || playerRole !== "host") 
    {
        return;
    }


    await update(ref(db,`rooms/${roomCode}`),
        {
            status:
                "finished",

            finishedAt:
                Date.now(),

            "match/hostScore":
                hostScore,

            "match/guestScore":
                guestScore
        }
    );
}

export async function leaveRoom() {

    if (!roomCode || !playerRole) {
        return;
    }

    const code = roomCode;
    const role = playerRole;
    const uid = auth.currentUser?.uid;

    const presenceRef = ref(
        db,
        `rooms/${code}/${role}/connected`
    );

    await onDisconnect(presenceRef).cancel();

    try {

        await runTransaction(
            ref(db, `rooms/${code}`),
            room => {

                if (!room) {
                    return;
                }

                if (
                    role === "host" &&
                    room.host?.uid === uid
                ) {

                    if (room.guest?.connected) {

                        room.host = room.guest;
                        room.guest = null;

                        room.status = "waiting";
                        room.match = null;
                        room.rematch = null;

                        return room;
                    }

                    return null;
                }

                if (
                    role === "guest" &&
                    room.guest?.uid === uid
                ) {

                    room.guest = null;
                    room.status = "waiting";

                    room.match = null;
                    room.rematch = null;

                    return room;
                }

                return;
            },
            { applyLocally: false }
        );

    } finally {

        resetRoomConnection();
    }
}
export function resetRoomConnection()
{

    /*
        Ngừng listener room cũ
    */

    if (unsubscribeRoom)
    {
        unsubscribeRoom();
        unsubscribeRoom = null;
    }


    /*
        Reset local Firebase state
    */

    roomCode = null;

    playerRole = null;

    playerId = null;

}

export async function requestRematch()
{
    if (!roomCode || !playerRole) 
    {
        return;
    }

    const rematchRef = ref(db,`rooms/${roomCode}/rematch/${playerRole}`);

    await set(rematchRef,true);

    console.log("[Firebase] Rematch accepted:",playerRole);
}
