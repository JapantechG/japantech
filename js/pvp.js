import {
    playSfx
}
from "./audio.js";


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
   GENERATE ROOM CODE
   ============================================================= */

function generateRoomCode() {

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
}


/* =============================================================
   CREATE ROOM
   ============================================================= */

document
    .getElementById(
        "createRoomButton"
    )
    .addEventListener(
        "click",
        () => {

            const roomCode =
                generateRoomCode();


            /*
                Sau này:

                server.createRoom({
                    code: roomCode,
                    config: currentConfig
                })
            */


            openWaitingRoom(
                roomCode
            );

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
        () => {

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


            /*
                Sau này:

                server.joinRoom(code)
            */


            openWaitingRoom(
                code
            );

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