import {
    playSfx
}
from "./audio.js";

import {
    createRoom,
    joinRoom,
    startRoomGame
} from "./firebase.js";

let pvpDatabase = [];

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

const pvpGamePanel =
    document.getElementById(
        "pvpGamePanel"
    );


const pvpQuestionNumber =
    document.getElementById(
        "pvpQuestionNumber"
    );


const pvpQuestion =
    document.getElementById(
        "pvpQuestion"
    );


const pvpReading =
    document.getElementById(
        "pvpReading"
    );


const pvpAnswers =
    document.getElementById(
        "pvpAnswers"
    );

async function loadPvpDatabase(
    level
) {

    const file =
        `data/${level.toLowerCase()}.json`;


    const response =
        await fetch(
            file
        );


    if (
        !response.ok
    ) {

        throw new Error(
            "DATABASE_LOAD_FAILED"
        );

    }


    pvpDatabase =
        await response.json();


    console.log(
        "[PVP] Database loaded:",
        level,
        pvpDatabase.length
    );


    return pvpDatabase;
}

function createQuestionIds(
    database,
    count = 20
) {

    const ids =
        database.map(
            item => item.id
        );


    /*
        Fisher-Yates shuffle
    */

    for (
        let i = ids.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random()
                *
                (i + 1)
            );


        [
            ids[i],
            ids[j]
        ] =
        [
            ids[j],
            ids[i]
        ];

    }


    return ids.slice(
        0,
        Math.min(
            count,
            ids.length
        )
    );
}

function showPvpQuestion(
    match
) {

    const index =
        match.currentQuestion || 0;


    const questionId =
        match.questionIds[index];


    const data =
        getQuestionById(
            questionId
        );


    if (
        !data
    ) {

        console.error(
            "[PVP] Question not found:",
            questionId
        );

        return;

    }


    /*
        Chuyển Waiting Room
        → Game
    */

    waitingRoomPanel.classList.add(
        "hidden"
    );


    pvpGamePanel.classList.remove(
        "hidden"
    );


    /*
        Question number
    */

    pvpQuestionNumber.textContent =
        `QUESTION ${index + 1}`;


    /*
        Question
    */

    pvpQuestion.textContent =
        data.word;


    /*
        Reading
    */

    pvpReading.textContent =
        data.reading || "";

    console.log(
        "[PVP] Showing question:",
        data
    );

   /*
    Lấy thông tin 4 đáp án
*/

const questionData =
    match.questions[index];


if (
    !questionData
) {

    console.error(
        "[PVP] Question data not found:",
        index
    );

    return;

}


/*
    Clear đáp án cũ
*/

pvpAnswers.innerHTML =
    "";


/*
    Render 4 đáp án
*/

questionData.optionIds.forEach(
    (
        optionId,
        optionIndex
    ) => {

        const option =
            getQuestionById(
                optionId
            );


        if (!option) {
            return;
        }


        const button =
            document.createElement(
                "button"
            );


        button.className =
            "answer-button";


        button.type =
            "button";


        button.dataset.optionId =
            optionId;


        button.textContent =
            option.meaning;


        pvpAnswers.appendChild(
            button
        );

     }
        );

}

function createPvpQuestions(
    database,
    questionIds
) {

    return questionIds.map(
        questionId => {

            const question =
                database.find(
                    item =>
                        String(item.id) ===
                        String(questionId)
                );


            if (!question) {
                return null;
            }


            /*
                Lấy 3 đáp án sai
            */

            const wrongAnswers =
                database
                    .filter(
                        item =>
                            String(item.id) !==
                            String(questionId)
                    )
                    .sort(
                        () =>
                            Math.random() - 0.5
                    )
                    .slice(
                        0,
                        3
                    );


            /*
                Đáp án đúng + 3 sai
            */

            const options =
                [
                    question,
                    ...wrongAnswers
                ];


            /*
                Shuffle 4 đáp án
            */

            for (
                let i = options.length - 1;
                i > 0;
                i--
            ) {

                const j =
                    Math.floor(
                        Math.random()
                        *
                        (i + 1)
                    );


                [
                    options[i],
                    options[j]
                ] =
                [
                    options[j],
                    options[i]
                ];

            }


            return {

                questionId:
                    question.id,

                optionIds:
                    options.map(
                        item =>
                            item.id
                    )
            };

        }
    )
    .filter(Boolean);
}
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
            room.status === "playing" && room.match
        ) {

            console.log(
                "[PVP] GAME START!"
            );

              startPvpMatch(
                room
                );

        }
    }
);

async function startPvpMatch(
    room
) {

    const match =
        room.match;


    /*
        Load đúng database
    */

    if (
        pvpDatabase.length === 0
    ) {

        await loadPvpDatabase(
            match.level
        );

    }


    console.log(
        "[PVP] Match:",
        match
    );


    console.log(
        "[PVP] Shared questions:",
        match.questionIds
    );


    /*
        Hiển thị câu hiện tại
    */

    showPvpQuestion(
        match
    );
}

function getQuestionById(
    id
) {

    return pvpDatabase.find(
        item =>
            String(item.id)
            ===
            String(id)
    );

}

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

startBattleButton.addEventListener("click",async () => 
    {

            try {

                startBattleButton.disabled = true;

                /*
                    Lấy config đã chọn từ Lobby
                */

                if (
                    !currentConfig
                ) {

                    throw new Error(
                        "PVP_CONFIG_NOT_FOUND"
                    );

                }
            console.log(
                "[PVP] FULL currentConfig:",
                currentConfig
                );

            const level = currentConfig.target;
            const category = currentConfig.category;  
            const mode = currentConfig.subMode;

                 console.log(
                    "[PVP] Config:",
                    {
                        level,
                        category,
                        mode
                    }
                );
            /*
                Load database
            */

            const database = await loadPvpDatabase(level);


            /*
                HOST random 20 câu hỏi
            */

            const questionIds =
                createQuestionIds(
                    database,
                    20
                );


            console.log(
                "[PVP] Question IDs:",
                questionIds
            );

            const questions =
                createPvpQuestions(
                    database,
                    questionIds
                );


            console.log(
                "[PVP] Questions:",
                questions
            );


            /*
                Gửi match lên Firebase
            */

            await startRoomGame(
                {
                    level:
                        level,

                    category:
                        category,

                    mode:
                        mode,

                    questionIds:
                        questionIds,
                    questions:
                        questions
                }
            );

                /*await startRoomGame();*/

            }
            catch (error) {

                console.error(
                    "[PVP] Start error:",
                    error
                );


                startBattleButton.disabled = false;

            }

        }
    );

