import {
    playSfx
}
from "./audio.js";

import {
    createRoom,
    joinRoom,
    startRoomGame
} from "./firebase.js";


let currentConfig = null;


/* =============================================================
   DOM
   ============================================================= */

const roomSelectPanel =
    document.getElementById(
        "roomSelectPanel"
    );


const waitingRoomPanel =
    document.getElementById(
        "waitingRoomPanel"
    );


const currentRoomCode =
    document.getElementById(
        "currentRoomCode"
    );

const leftPlayerAvatar =
    document.getElementById(
        "leftPlayerAvatar"
    );


const leftPlayerName =
    document.getElementById(
        "leftPlayerName"
    );


const leftPlayerStatus =
    document.getElementById(
        "leftPlayerStatus"
    );


const rightPlayerAvatar =
    document.getElementById(
        "rightPlayerAvatar"
    );


const rightPlayerName =
    document.getElementById(
        "rightPlayerName"
    );


const rightPlayerStatus =
    document.getElementById(
        "rightPlayerStatus"
    );


const waitingMessage =
    document.getElementById(
        "waitingMessage"
    );

const startBattleButton =
    document.getElementById(
        "startBattleButton"
    );
/* =============================================================
   INIT
   ============================================================= */

export function initPvp(
    config
) {

    currentConfig =
        config;


    resetPvpScreen();
}
/* =============================================================
   FIREBASE ROOM UPDATE
   ============================================================= */

window.addEventListener(
    "batlingo-room-update",
    event => {

        const {
            playerRole,
            room
        } = event.detail;


        console.log(
            "[PVP] Room:",
            room
        );


        console.log(
            "[PVP] Role:",
            playerRole
        );


        /* =====================================================
           HOST VIEW
           ===================================================== */

        if (
            playerRole === "host"
        ) {

            // LEFT = YOU

            leftPlayerAvatar.textContent =
                "🐵";

            leftPlayerAvatar.classList.remove(
                "waiting"
            );

            leftPlayerName.textContent =
                "YOU";

            leftPlayerStatus.textContent =
                "READY";

            leftPlayerStatus.classList.add(
                "ready"
            );


            // RIGHT = GUEST

            if (
                room.guest
            ) {

                rightPlayerAvatar.textContent =
                    "🐃";

                rightPlayerAvatar.classList.remove(
                    "waiting"
                );

                rightPlayerName.textContent =
                    room.guest.name;

                rightPlayerStatus.textContent =
                    "READY";

                rightPlayerStatus.classList.add(
                    "ready"
                );


                waitingMessage.textContent =
                    "OPPONENT CONNECTED";

            }
            else {

                rightPlayerAvatar.textContent =
                    "?";

                rightPlayerAvatar.classList.add(
                    "waiting"
                );

                rightPlayerName.textContent =
                    "WAITING...";

                rightPlayerStatus.textContent =
                    "WAITING";

                rightPlayerStatus.classList.remove(
                    "ready"
                );


                waitingMessage.textContent =
                    "WAITING FOR PLAYER...";

            }

        }


        /* =====================================================
           GUEST VIEW
           ===================================================== */

        if (
            playerRole === "guest"
        ) {

            // LEFT = HOST

            leftPlayerAvatar.textContent =
                "🐵";

            leftPlayerAvatar.classList.remove(
                "waiting"
            );

            leftPlayerName.textContent =
                room.host.name;

            leftPlayerStatus.textContent =
                "READY";

            leftPlayerStatus.classList.add(
                "ready"
            );


            // RIGHT = YOU

            rightPlayerAvatar.textContent =
                "🐃";

            rightPlayerAvatar.classList.remove(
                "waiting"
            );

            rightPlayerName.textContent =
                "YOU";

            rightPlayerStatus.textContent =
                "READY";

            rightPlayerStatus.classList.add(
                "ready"
            );


            waitingMessage.textContent =
                "OPPONENT CONNECTED";

        }


        /* =====================================================
           BOTH CONNECTED
           ===================================================== */

        if (
            room.host &&
            room.guest
        ) {

            console.log(
                "[PVP] Both players connected."
            );


            console.log(
                room.host.name,
                "VS",
                room.guest.name
            );

              if (
                    playerRole === "host"
                ) {

                    startBattleButton.classList.remove(
                        "hidden"
                    );


                    waitingMessage.textContent =
                        "OPPONENT READY";

                }
                else {

                    startBattleButton.classList.add(
                        "hidden"
                    );


                    waitingMessage.textContent =
                        "WAITING FOR HOST...";

                    }
        }
        
        if (
            !room.guest
        ) {

            startBattleButton.classList.add(
                "hidden"
            );

        }

          /*
            HOST ĐÃ BẤM START
        */

        if (
            room.status === "playing"
        ) {

            console.log(
                "[PVP] GAME START!"
            );

        }
    }
);

/* =============================================================
   GENERATE ROOM CODE
   ============================================================= */

/*##function generateRoomCode() {

    const chars =
        "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";


    let code = "";


    for (
        let i = 0;
        i < 4;
        i++
    ) {

        code +=
            chars[
                Math.floor(
                    Math.random()
                    *
                    chars.length
                )
            ];
    }


    return code;
}*/

/* =============================================================
   CREATE ROOM
   ============================================================= */

document
    .getElementById(
        "createRoomButton"
    )
    .addEventListener(
        "click",
        async () => {

            console.log(
                "[PVP] Create button clicked"
            );


            try {

                const playerName =
                    "Player 1";


                console.log(
                    "[PVP] Creating Firebase room..."
                );


                const roomCode =
                    await createRoom(
                        playerName
                    );


                console.log(
                    "[PVP] Room created:",
                    roomCode
                );


                openWaitingRoom(
                    roomCode
                );

            }
            catch (error) {

                console.error(
                    "[PVP] Create room error:",
                    error
                );


                alert(
                    "Create room error: "
                    + error.message
                );

            }

        }
    );


/* =============================================================
   JOIN ROOM
   ============================================================= */

document
    .getElementById(
        "joinRoomButton"
    )
    .addEventListener(
        "click",
        async () => {

            const input =
                document.getElementById(
                    "roomCodeInput"
                );


            const code =
                input
                    .value
                    .trim()
                    .toUpperCase();


            if (
                code.length !== 4
            ) {

                input.focus();

                return;
            }


            try {

                const playerName =
                    "Player 2";


                console.log(
                    "[PVP] Joining room:",
                    code
                );


                await joinRoom(
                    code,
                    playerName
                );


                openWaitingRoom(
                    code
                );


                console.log(
                    "[PVP] Joined:",
                    code
                );

            }
            catch (error) {

                console.error(
                    "[PVP] Join error:",
                    error
                );


                switch (
                    error.message
                ) {

                    case "ROOM_NOT_FOUND":

                        alert(
                            "Không tìm thấy phòng."
                        );

                        break;


                    case "ROOM_FULL":

                        alert(
                            "Phòng đã đủ người."
                        );

                        break;


                    default:

                        alert(
                            "Không thể vào phòng: "
                            + error.message
                        );

                        break;
                }

            }

        }
    );

/* =============================================================
   OPEN WAITING ROOM
   ============================================================= */

function openWaitingRoom(
    roomCode
) {

    roomSelectPanel.classList.add(
        "hidden"
    );


    waitingRoomPanel.classList.remove(
        "hidden"
    );


    currentRoomCode.textContent =
        roomCode;
}


/* =============================================================
   LEAVE
   ============================================================= */

document
    .getElementById(
        "leaveRoomButton"
    )
    .addEventListener(
        "click",
        () => {

            /*
                Sau này:
                server.leaveRoom()
            */

            resetPvpScreen();

        }
    );


/* =============================================================
   RESET
   ============================================================= */

function resetPvpScreen() {

    waitingRoomPanel.classList.add(
        "hidden"
    );


    roomSelectPanel.classList.remove(
        "hidden"
    );


    currentRoomCode.textContent =
        "----";


    document
        .getElementById(
            "roomCodeInput"
        )
        .value =
            "";
}

startBattleButton
    .addEventListener(
        "click",
        async () => {

            try {

                startBattleButton.disabled =
                    true;


                await startRoomGame();

            }
            catch (error) {

                console.error(
                    "[PVP] Start error:",
                    error
                );


                startBattleButton.disabled =
                    false;

            }

        }
    );

