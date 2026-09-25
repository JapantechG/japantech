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
    getDatabase,
    ref,
    get,
    set,
    update,
    onValue,
    onDisconnect
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

const db = getDatabase(app);


// ============================================================
// CURRENT CONNECTION
// ============================================================

let roomCode = null;

let playerRole = null;
// "host"
// "guest"

let playerId = null;

let unsubscribeRoom = null;


// ============================================================
// CREATE PLAYER ID
// ============================================================

function createPlayerId() {

    if (crypto.randomUUID) {
        return crypto.randomUUID();
    }

    return (
        Date.now().toString(36) +
        Math.random().toString(36).substring(2)
    );
}


// ============================================================
// CREATE ROOM CODE
//
// Không dùng:
// I O 0 1
//
// để tránh người chơi nhập nhầm
// ============================================================

function generateRoomCode(length = 4) {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    let code = "";

    for (let i = 0; i < length; i++) {

        const index =
            Math.floor(
                Math.random() * chars.length
            );

        code += chars[index];
    }

    return code;
}


// ============================================================
// CREATE ROOM
// ============================================================

export async function createRoom(playerName) {

    playerName = playerName.trim();

    if (!playerName) {
        throw new Error("PLAYER_NAME_EMPTY");
    }


    playerId = createPlayerId();


    // ----------------------------------------
    // Tạo room code chưa tồn tại
    // ----------------------------------------

    let code;
    let roomRef;


    while (true) {

        code = generateRoomCode();

        roomRef =
            ref(
                db,
                `rooms/${code}`
            );

        const snapshot =
            await get(roomRef);


        if (!snapshot.exists()) {
            break;
        }
    }


    // ----------------------------------------
    // Tạo room trên Firebase
    // ----------------------------------------

    await set(
        roomRef,
        {
            status: "waiting",

            createdAt: Date.now(),

            host: {
                id: playerId,
                name: playerName,
                connected: true
            },

            guest: null
        }
    );


    roomCode = code;

    playerRole = "host";


    // ----------------------------------------
    // Nếu host mất kết nối
    // ----------------------------------------

    const connectedRef =
        ref(
            db,
            `rooms/${roomCode}/host/connected`
        );


    await onDisconnect(
        connectedRef
    ).set(false);


    // ----------------------------------------
    // Bắt đầu theo dõi room
    // ----------------------------------------

    listenRoom();


    console.log(
        "[BatLingo] Room created:",
        roomCode
    );


    return roomCode;
}


// ============================================================
// JOIN ROOM
// ============================================================

export async function joinRoom(
    code,
    playerName
) {

    code =
        code
            .trim()
            .toUpperCase();


    playerName =
        playerName.trim();


    if (!code) {
        throw new Error("ROOM_CODE_EMPTY");
    }


    if (!playerName) {
        throw new Error("PLAYER_NAME_EMPTY");
    }


    const roomRef =
        ref(
            db,
            `rooms/${code}`
        );


    // ----------------------------------------
    // Đọc room
    // ----------------------------------------

    const snapshot =
        await get(roomRef);


    // Room không tồn tại
    if (!snapshot.exists()) {

        throw new Error(
            "ROOM_NOT_FOUND"
        );
    }


    const room =
        snapshot.val();


    // Room đã có người thứ 2
    if (room.guest) {

        throw new Error(
            "ROOM_FULL"
        );
    }


    // ----------------------------------------
    // Tạo player
    // ----------------------------------------

    playerId =
        createPlayerId();


    // ----------------------------------------
    // Add guest
    // ----------------------------------------

    await update(
        roomRef,
        {
            guest: {
                id: playerId,
                name: playerName,
                connected: true
            },

            status: "connected"
        }
    );


    roomCode = code;

    playerRole = "guest";


    // ----------------------------------------
    // Nếu guest mất kết nối
    // ----------------------------------------

    const connectedRef =
        ref(
            db,
            `rooms/${roomCode}/guest/connected`
        );


    await onDisconnect(
        connectedRef
    ).set(false);


    // ----------------------------------------
    // Listen room
    // ----------------------------------------

    listenRoom();


    console.log(
        "[BatLingo] Joined room:",
        roomCode
    );


    return roomCode;
}


// ============================================================
// LISTEN ROOM
//
// Firebase thay đổi:
//      ↓
// callback chạy trên cả hai máy
// ============================================================

function listenRoom() {

    if (!roomCode) {
        return;
    }


    // Nếu đã có listener cũ
    if (unsubscribeRoom) {

        unsubscribeRoom();

        unsubscribeRoom = null;
    }


    const roomRef =
        ref(
            db,
            `rooms/${roomCode}`
        );


    unsubscribeRoom =
        onValue(
            roomRef,

            snapshot => {

                // Room bị xóa
                if (!snapshot.exists()) {

                    console.log(
                        "[BatLingo] Room deleted."
                    );

                    return;
                }


                const room =
                    snapshot.val();


                console.log(
                    "[BatLingo] Room update:",
                    room
                );


                // --------------------------------
                // Phát event cho pvp.js
                // --------------------------------

                window.dispatchEvent(
                    new CustomEvent(
                        "batlingo-room-update",
                        {
                            detail: {
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

export async function startRoomGame() {

    if (
        !roomCode ||
        playerRole !== "host"
    ) {

        return;
    }


    await update(
        ref(
            db,
            `rooms/${roomCode}`
        ),
        {
            status: "playing",
            startedAt: Date.now()
        }
    );
}