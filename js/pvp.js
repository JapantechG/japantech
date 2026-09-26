import {
    playSfx
}
from "./audio.js";

import {
    createRoom,
    joinRoom,
    startRoomGame,
    submitRoomAnswer,
    nextRoomQuestion,
    finishRoomGame,
    resetRoomConnection
} from "./firebase.js";

let pvpDatabase = [];

let currentConfig = null;

let currentPvpRoom = null;

let displayedQuestionIndex = -1;

let answerLocked = false;

let revealStarted = false;

let currentPlayerRole = null;

let currentMatchId = null;


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

const pvpHostCard =
    document.getElementById(
        "pvpHostCard"
    );


const pvpGuestCard =
    document.getElementById(
        "pvpGuestCard"
    );


const pvpHostState =
    document.getElementById(
        "pvpHostState"
    );


const pvpGuestState =
    document.getElementById(
        "pvpGuestState"
    );


const pvpHostScore =
    document.getElementById(
        "pvpHostScore"
    );


const pvpGuestScore =
    document.getElementById(
        "pvpGuestScore"
    );

const pvpResultPanel =
    document.getElementById(
        "pvpResultPanel"
    );


const pvpFinalHostScore =
    document.getElementById(
        "pvpFinalHostScore"
    );


const pvpFinalGuestScore =
    document.getElementById(
        "pvpFinalGuestScore"
    );


const pvpResultMessage =
    document.getElementById(
        "pvpResultMessage"
    );

const pvpScreen =
    document.getElementById(
        "pvpScreen"
    );

const pvpLevel =
    document.getElementById(
        "pvpLevel"
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

function showPvpQuestion(match) 
{

        pvpHostCard.classList.remove("locked","correct","wrong");

        pvpGuestCard.classList.remove(
            "locked",
            "correct",
            "wrong"
        );

        pvpHostState.textContent ="THINKING...";

        pvpGuestState.textContent = "THINKING...";

        pvpAnswers.innerHTML ="";

        pvpLevel.textContent = `${match.level.toUpperCase()} - ${match.category.toUpperCase()}`;

        const index = match.currentQuestion || 0;


        const questionId = match.questionIds[index];


         const data = getQuestionById(questionId);


    if (!data) 
        {

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

         /*
            Click answer
        */

        button.addEventListener(
            "click",
            () => {

                selectPvpAnswer(optionId,button);

            }
        );


        pvpAnswers.appendChild(
            button
        );

     }
        );

}

async function selectPvpAnswer(optionId,selectedButton) 
    {

    if (answerLocked || !currentPvpRoom) 
    {
        return;
    }


    const match = currentPvpRoom.match;


    const questionIndex = match.currentQuestion || 0;


    /*
        Khóa local ngay lập tức
    */

    answerLocked =true;

    playSfx("click");


    const buttons = pvpAnswers.querySelectorAll(".answer-button");


    buttons.forEach(button => 
        {
             
            button.disabled =true;

            button.classList.add("locked");

        }
    );


    selectedButton.classList.add("selected");


    /*
        Gửi Firebase
    */

    try {

        await submitRoomAnswer(questionIndex,optionId);

    }
    catch (error) {

        console.error(
            "[PVP] Submit answer error:",
            error
        );


        /*
            Nếu Firebase lỗi
            cho phép chọn lại
        */

        answerLocked = false;


        buttons.forEach(button => 
            {

                button.classList.remove("locked");

            }
        );


        selectedButton.classList.remove("selected");

    }
}

function updatePvpAnswerState(
    room
) {

    const match =
        room.match;


    const questionIndex =
        match.currentQuestion || 0;


    const answers =
        match.answers?.[questionIndex]
        || {};


    const hostAnswer =
        answers.host;


    const guestAnswer =
        answers.guest;


    /*
        PLAYER 1 / HOST
    */

    if (
        hostAnswer
    ) {

        pvpHostState.textContent =
            "LOCKED";

        pvpHostCard.classList.add(
            "locked"
        );

    }
    else {

        pvpHostState.textContent =
            "THINKING...";

    }


    /*
        PLAYER 2 / GUEST
    */

    if (
        guestAnswer
    ) {

        pvpGuestState.textContent =
            "LOCKED";

        pvpGuestCard.classList.add(
            "locked"
        );

    }
    else {

        pvpGuestState.textContent =
            "THINKING...";

    }


    /*
        Chưa đủ 2 người
        => tuyệt đối chưa reveal
    */

    if (
        !hostAnswer ||
        !guestAnswer
    ) {

        return;

    }


    /*
        Cả 2 đã trả lời
    */

    revealPvpAnswers(room,hostAnswer,guestAnswer);
}

function revealPvpAnswers(room,hostAnswer,guestAnswer) 
{

    if (revealStarted) 
    {
        return;
    }


    revealStarted = true;

    const match = room.match;

    const questionIndex = match.currentQuestion || 0;

    const questionData =match.questions[questionIndex];

    const correctOptionId =questionData.questionId;


    const hostCorrect =String(hostAnswer.optionId)===String(correctOptionId);

    const guestCorrect =String(guestAnswer.optionId)===String(correctOptionId);

    const myCorrect =currentPlayerRole === "host" ? hostCorrect : guestCorrect;

            if (myCorrect) 
            {

                playSfx("correct");

            }
            else {

                playSfx("wrong");

            }


    /*
        Player cards
    */

    pvpHostCard.classList.remove("locked");


    pvpGuestCard.classList.remove("locked");


    pvpHostCard.classList.add(hostCorrect ? "correct" : "wrong");


    pvpGuestCard.classList.add(
        guestCorrect
            ? "correct"
            : "wrong"
    );


    pvpHostState.textContent =
        hostCorrect
            ? "CORRECT"
            : "WRONG";


    pvpGuestState.textContent =
        guestCorrect
            ? "CORRECT"
            : "WRONG";


    /*
        Reveal buttons
    */

    const buttons = pvpAnswers.querySelectorAll(".answer-button");

    const myAnswer = currentPlayerRole === "host" ? hostAnswer : guestAnswer;


    buttons.forEach(button => 
        {

            const optionId = button.dataset.optionId;

            /*
            Bỏ trạng thái vàng
        */

            button.classList.remove("selected");

            /*
                Đáp án đúng -> XANH
            */

            if (String(optionId) === String(correctOptionId)) 
            {

                button.classList.add("correct-answer");

            }


            /*
                Đáp án người hiện tại chọn sai -> ĐỎ
            */

            /*const myAnswer = currentPvpRoom && currentPvpRoom.match
                    ?.answers
                    ?.[questionIndex]
                    ?.[getCurrentPlayerRole()];*/


            if (myAnswer &&
                String(optionId) ===
                String(myAnswer.optionId) &&
                String(optionId) !==
                String(correctOptionId)
            ) {

                button.classList.add("wrong-answer");

            }

        }
    );


    /*
        Host chịu trách nhiệm
        tính score + chuyển câu
    */

    scheduleNextPvpQuestion(
        room,
        hostCorrect,
        guestCorrect
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

window.addEventListener("batlingo-room-update",event => 
    {

        const {
            roomCode,
            playerRole,
            room
        } = event.detail;

        currentPvpRoom = room;

        currentPlayerRole =playerRole;

        console.log(
            "[PVP] Room:",
            room
        );


        console.log(
            "[PVP] Role:",
            playerRole
        );

        if (room.status === "finished") 
            {

                showPvpResult(room);

                return;
            }

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

              startPvpMatch(room);

        }
    }
);

function getCurrentPlayerRole() {

    return currentPlayerRole;
}

function scheduleNextPvpQuestion(
    room,
    hostCorrect,
    guestCorrect
) {

    /*
        CHỈ HOST chuyển câu
    */

    if (
        currentPlayerRole !== "host"
    ) {

        return;

    }


    const match =
        room.match;


    const currentIndex =
        match.currentQuestion || 0;


    let hostScore =
        match.hostScore || 0;


    let guestScore =
        match.guestScore || 0;


    /*
        Tạm thời:
        đúng = +100
    */

    if (
        hostCorrect
    ) {

        hostScore +=
            100;

    }


    if (
        guestCorrect
    ) {

        guestScore +=
            100;

    }


    /*
        Hiển thị score ngay
    */

    pvpHostScore.textContent =
        hostScore;


    pvpGuestScore.textContent =
        guestScore;


    /*
        Chờ 1.5 giây để xem kết quả
    */

    setTimeout(
        async () => {

            const nextIndex =
                currentIndex + 1;


            /*
                Hết 20 câu
            */

            if (
                nextIndex >=
                match.questions.length
            ) {

                console.log(
                    "[PVP] MATCH FINISHED"
                );

            try {

                    await finishRoomGame(
                        hostScore,
                        guestScore
                    );

                }
                catch (error) {

                    console.error(
                        "[PVP] Finish error:",
                        error
                    );

                }

                return;

            }


            try {

                await nextRoomQuestion(
                    nextIndex,
                    hostScore,
                    guestScore
                );

            }
            catch (error) {

                console.error(
                    "[PVP] Next question error:",
                    error
                );

            }

        },
        1500
    );
}

async function startPvpMatch(room) 
{
    pvpScreen.classList.remove("result-mode");

    pvpScreen.classList.add("battle-mode");

    const match = room.match;

    /*Phát hiện trận mới*/

            if (currentMatchId !== match.matchId)
            {

                currentMatchId = match.matchId;

                displayedQuestionIndex =-1;

                answerLocked =false;

                revealStarted =false;

                /*Ẩn result cũ*/

                pvpResultPanel.classList.add("hidden");

                /*Hiện battle*/

                pvpGamePanel.classList.remove("hidden");

            }


    /*
        Load đúng database
    */

    if (pvpDatabase.length === 0) 
    {

        await loadPvpDatabase(match.level);

    }

        /*
        Score
    */

    pvpHostScore.textContent =  match.hostScore || 0;


    pvpGuestScore.textContent = match.guestScore || 0;

      /*
        Hiển thị câu
    */

    const questionIndex = match.currentQuestion || 0;

        if (displayedQuestionIndex !== questionIndex) 
            {

                displayedQuestionIndex = questionIndex;

                answerLocked = false;

                revealStarted = false;

                showPvpQuestion(match);

            }
    
    /* Update trạng thái answer*/

    updatePvpAnswerState(room);


    console.log("[PVP] Match:",match);


    console.log("[PVP] Shared questions:",match.questionIds);


    /*
        Hiển thị câu hiện tại
    */

    /*showPvpQuestion(match);*/
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

document.getElementById("leaveRoomButton").addEventListener("click",() => 
    {

            /*
                Sau này:
                server.leaveRoom()
            */
            resetRoomConnection();

            resetPvpScreen();

        }
    );


/* =============================================================
   RESET
   ============================================================= */

function resetPvpScreen() {

    waitingRoomPanel.classList.add("hidden");


    roomSelectPanel.classList.remove("hidden");

     /* Battle screen */

    pvpGamePanel.classList.add("hidden");

    /*Result screen*/

    pvpResultPanel.classList.add("hidden");

    currentRoomCode.textContent = "----";

     /* Reset PVP state*/
      /*
        Nếu đã tạo biến này
    */

    if (typeof currentMatchId !== "undefined"
    )
    {
        currentMatchId = null;
    }

    displayedQuestionIndex = -1;

    currentPvpRoom = null;

    currentPlayerRole = null;

    answerLocked = false;

    revealStarted = false;

     /*
        Reset database cache
    */

    pvpDatabase = [];

       /*
        Reset score UI
    */

    pvpHostScore.textContent = "0";

    pvpGuestScore.textContent = "0";

      /*
        Reset result
    */

    pvpFinalHostScore.textContent = "0";

    pvpFinalGuestScore.textContent = "0";

    pvpResultMessage.textContent = "---";

       /*
        Reset background
    */

    pvpScreen.classList.remove("battle-mode","result-mode");


    document.getElementById("roomCodeInput").value ="";
}

startBattleButton.addEventListener("click",async () => 
    {

            try {

                    displayedQuestionIndex =-1;

                    answerLocked =false;

                    revealStarted =false;

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

function showPvpResult(room) 
{

    const hostScore = room.match?.hostScore || 0;


    const guestScore = room.match?.guestScore || 0;

    pvpGamePanel.classList.add("hidden");

    pvpResultPanel.classList.remove("hidden");

    /*
        Background result
    */

    pvpScreen.classList.remove("battle-mode");

    pvpScreen.classList.add("result-mode");

    pvpFinalHostScore.textContent =hostScore;

    pvpFinalGuestScore.textContent =guestScore;

        /*
        Player cards
    */

    const playerCards =pvpResultPanel.querySelectorAll(".pvp-result-score > div:not(.room-vs)");

    playerCards.forEach(card => card.classList.remove("winner"));

    if (hostScore > guestScore) 
    {

        pvpResultMessage.textContent = "PLAYER 1 WINS";

        playerCards[0]?.classList.add("winner");

    }
    else if (guestScore > hostScore) 
    {

        pvpResultMessage.textContent = "PLAYER 2 WINS";

        playerCards[1]?.classList.add("winner");

    }
    else 
    {

        pvpResultMessage.textContent = "DRAW";

    }
}