
import {
    playSfx,
    speakJapanese,
    stopSpeech
} from "./audio.js";

import {
    createRoom,
    joinRoom,
    startRoomGame,
    startRoomRematch,
    submitRoomAnswer,
    nextRoomQuestion,
    finishRoomGame,
    requestRematch,
    leaveRoom,
    recoverInterruptedPvpRoom,
    resetRoomConnection
} from "./firebase.js";

import {
    initPvpSocial,
    enterPvpSocial,
    leavePvpSocial,
    getNewRoomSettings,
    onPvpSocialRoomUpdate,
    clearAcceptedPvpInvite,
    onPvpSocialReset
} from "./pvp-social.js";

import { saveWrongQuestion } from "./user.js";

initPvpSocial();

/* =========================================================
   PVP STATE
========================================================= */

let pvpDisconnectRecoveryTimer = null;
let pvpNextQuestionTimer = null;
let pvpRevealSpeechTimer = null;
let pvpMatchLoadVersion = 0;

let pvpDatabase = [];
let pvpDatabaseKey = "";

let currentConfig = null;
let currentPvpRoom = null;
let currentPlayerRole = null;
let currentMatchId = null;

let displayedQuestionIndex = -1;
let answerLocked = false;
let revealStarted = false;

let rematchStarting = false;
let opponentDisconnected = false;

let pvpTimer = null;
let pvpTimeLeft = 10;

const PVP_QUESTION_TIME = 10;

/* =========================================================
   DOM ELEMENTS
========================================================= */

const roomSelectPanel =
    document.getElementById("roomSelectPanel");

const waitingRoomPanel =
    document.getElementById("waitingRoomPanel");

const currentRoomCode =
    document.getElementById("currentRoomCode");

const leftPlayerAvatar =
    document.getElementById("leftPlayerAvatar");

const leftPlayerName =
    document.getElementById("leftPlayerName");

const leftPlayerStatus =
    document.getElementById("leftPlayerStatus");

const rightPlayerAvatar =
    document.getElementById("rightPlayerAvatar");

const rightPlayerName =
    document.getElementById("rightPlayerName");

const rightPlayerStatus =
    document.getElementById("rightPlayerStatus");

const waitingMessage =
    document.getElementById("waitingMessage");

const startBattleButton =
    document.getElementById("startBattleButton");

const pvpGamePanel =
    document.getElementById("pvpGamePanel");

const pvpQuestionNumber =
    document.getElementById("pvpQuestionNumber");

const pvpQuestion =
    document.getElementById("pvpQuestion");

const pvpReading =
    document.getElementById("pvpReading");

const pvpAnswers =
    document.getElementById("pvpAnswers");

const pvpHostCard =
    document.getElementById("pvpHostCard");

const pvpGuestCard =
    document.getElementById("pvpGuestCard");

const pvpHostState =
    document.getElementById("pvpHostState");

const pvpGuestState =
    document.getElementById("pvpGuestState");

const pvpHostScore =
    document.getElementById("pvpHostScore");

const pvpGuestScore =
    document.getElementById("pvpGuestScore");

const pvpResultPanel =
    document.getElementById("pvpResultPanel");

const pvpFinalHostScore =
    document.getElementById("pvpFinalHostScore");

const pvpFinalGuestScore =
    document.getElementById("pvpFinalGuestScore");

const pvpResultMessage =
    document.getElementById("pvpResultMessage");

const pvpScreen =
    document.getElementById("pvpScreen");

const pvpLevel =
    document.getElementById("pvpLevel");

const pvpRematchButton =
    document.getElementById("pvpRematchButton");

const pvpRematchStatus =
    document.getElementById("pvpRematchStatus");

const pvpTimerText =
    document.getElementById("pvpTimerText");

const pvpTimerBar =
    document.getElementById("pvpTimerBar");

const pvpHostName =
    document.getElementById("pvpHostName");

const pvpGuestName =
    document.getElementById("pvpGuestName");

const pvpFinalHostName =
    document.getElementById("pvpFinalHostName");

const pvpFinalGuestName =
    document.getElementById("pvpFinalGuestName");

/* =========================================================
   LOAD PVP DATABASE
========================================================= */

async function loadPvpDatabase(
    target,
    studyMode = "jlpt"
) {

    const validTarget =
        String(target || "").toLowerCase();

    if (!/^[a-z][a-z0-9_]{0,50}$/.test(validTarget)) {
        throw new Error("INVALID_DATABASE_TARGET");
    }

    const key = `${studyMode}:${validTarget}`;

    if (
        pvpDatabaseKey === key &&
        pvpDatabase.length
    ) {
        return pvpDatabase;
    }

    const file = studyMode === "topic"
        ? `data/topics/${validTarget}.json`
        : `data/${validTarget}.json`;

    const response = await fetch(file);

    if (!response.ok) {
        throw new Error(
            `DATABASE_LOAD_FAILED: ${file}`
        );
    }

    const data = await response.json();

    if (
        !Array.isArray(data) ||
        data.length < 4
    ) {
        throw new Error("INVALID_PVP_DATABASE");
    }

    pvpDatabase = data;
    pvpDatabaseKey = key;

    return pvpDatabase;
}

/* =========================================================
   RANDOM QUESTION IDS
========================================================= */

function createQuestionIds(
    database,
    count = 20
) {

    const ids = database.map(item => item.id);

    for (let i = ids.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    return ids.slice(
        0,
        Math.min(count, ids.length)
    );
}

/* =========================================================
   PVP QUESTION MODE
========================================================= */

function isPvpAudioMode(mode) {

    return (
        mode === "audio_hiragana" ||
        mode === "audio_meaning" ||
        mode === "audio_kanji"
    );
}

function getPvpAnswerField(mode) {

    switch (mode) {

        case "kanji_hiragana":
        case "audio_hiragana":
            return "reading";

        case "meaning_kanji":
        case "audio_kanji":
            return "word";

        default:
            return "meaning";
    }
}

/* =========================================================
   DISPLAY QUESTION CONTENT
========================================================= */

function showPvpQuestionContent(data, mode) {

    pvpQuestion.onclick = null;

    switch (mode) {

        case "kanji_hiragana":

            pvpQuestion.textContent = data.word;
            break;

        case "hiragana_meaning":

            pvpQuestion.textContent = data.reading;
            break;

        case "meaning_kanji":

            pvpQuestion.textContent = data.meaning;
            break;

        case "audio_hiragana":
        case "audio_meaning":
        case "audio_kanji":

            pvpQuestion.textContent = "🔊";

            pvpQuestion.onclick = () => {

                if (answerLocked) return;

                speakJapanese(data.reading);
            };

            setTimeout(() => {

                if (
                    !answerLocked &&
                    currentPvpRoom?.status === "playing" &&
                    !pvpGamePanel.classList.contains("hidden")
                ) {
                    speakJapanese(data.reading);
                }

            }, 200);

            break;

        default:

            pvpQuestion.textContent = data.word;
            break;
    }
}

/* =========================================================
   SHOW PVP QUESTION
========================================================= */

function showPvpQuestion(match) {

    stopSpeech();

    pvpHostCard.classList.remove(
        "locked",
        "correct",
        "wrong"
    );

    pvpGuestCard.classList.remove(
        "locked",
        "correct",
        "wrong"
    );

    pvpHostState.textContent = "THINKING...";
    pvpGuestState.textContent = "THINKING...";

    pvpAnswers.innerHTML = "";

    const target =
        match.target || match.level || "n5";

    pvpLevel.textContent =
        `${String(target).toUpperCase()} - ` +
        `${String(match.category || "vocabulary").toUpperCase()}`;

    const index = match.currentQuestion || 0;
    const questionId = match.questionIds[index];

    const data = getQuestionById(questionId);

    if (!data) {
        console.error(
            "[PVP] Question not found:",
            questionId
        );
        return;
    }

    showPvpPanel("battle");

    pvpQuestionNumber.textContent =
        `QUESTION ${index + 1}`;

    const mode = match.mode;

    // Do not reveal hiragana before both answers.
    pvpReadingShownFor = null;

    pvpReading.textContent = "";
    pvpReading.classList.remove("show");

    showPvpQuestionContent(data, mode);

    const questionData = match.questions[index];

    if (!questionData) {
        console.error(
            "[PVP] Question data not found:",
            index
        );
        return;
    }

    pvpAnswers.innerHTML = "";

    const answerField = getPvpAnswerField(mode);

    questionData.optionIds.forEach(
        (optionId, optionIndex) => {

            const option = getQuestionById(optionId);

            if (!option) return;

            const button =
                document.createElement("button");

            button.className = "answer-button";
            button.type = "button";

            button.dataset.optionId = optionId;

            button.dataset.answerLabel =
                ["1", "2", "3", "4"][optionIndex];

            button.textContent =
                option[answerField] || "";

            button.addEventListener(
                "click",
                () => {
                    selectPvpAnswer(
                        optionId,
                        button
                    );
                }
            );

            pvpAnswers.appendChild(button);
        }
    );

    startPvpTimer();
}


/* =========================================================
   PVP - READING AND PRONUNCIATION
========================================================= */

let pvpReadingShownFor = null;

function showPvpAnswerReading() {

    const match = currentPvpRoom?.match;

    if (!match) return;

    const index = Number(
        match.currentQuestion || 0
    );

    const questionId =
        match.questionIds?.[index];

    const question = getQuestionById(
        questionId
    );

    if (!question) return;

    const reading = String(
        question.reading || ""
    ).trim();

    const key =
        `${match.matchId}:${index}`;

    // Only reveal once per question.
    if (pvpReadingShownFor === key) {
        return;
    }

    pvpReadingShownFor = key;

    /* =====================================
       DISPLAY HIRAGANA
    ===================================== */

    pvpReading.textContent = reading;

    if (reading) {
        pvpReading.classList.add("show");
    }

    /* =====================================
       PRONOUNCE AFTER BOTH ANSWERED
    ===================================== */

    if (!reading) return;

    stopSpeech();

    speakJapanese(reading);
}


/* =========================================================
   PVP - PLAYER SELECTS ANSWER
========================================================= */

async function selectPvpAnswer(
    optionId,
    selectedButton
) {

    if (
        answerLocked ||
        revealStarted ||
        !currentPvpRoom ||
        currentPvpRoom.status !== "playing"
    ) {
        return;
    }

    const match = currentPvpRoom.match;

    if (!match) return;

    const questionIndex =
        match.currentQuestion || 0;

    const matchId = match.matchId;

    /* =====================================
       LOCK ANSWER LOCALLY
    ===================================== */

    answerLocked = true;

    stopPvpTimer();

    playSfx("click");

    const buttons =
        pvpAnswers.querySelectorAll(
            ".answer-button"
        );

    buttons.forEach(button => {

        button.disabled = true;

        button.classList.add("locked");
    });

    // Only show selected state.
    // No reading or correct/wrong yet.
    selectedButton.classList.add("selected");

    /* =====================================
       SUBMIT TO FIREBASE
    ===================================== */

    try {

        await submitRoomAnswer(
            questionIndex,
            optionId
        );

        console.log(
            "[PVP] Answer submitted:",
            {
                role: currentPlayerRole,
                questionIndex,
                optionId
            }
        );

        // Do not call showPvpAnswerReading().
        // Firebase room update will reveal only
        // when BOTH players have answered.

    } catch (error) {

        console.error(
            "[PVP] Submit answer failed:",
            error
        );

        // Do not unlock an obsolete question.
        if (
            currentPvpRoom?.status !== "playing" ||
            currentPvpRoom.match?.matchId !== matchId ||
            Number(
                currentPvpRoom.match?.currentQuestion || 0
            ) !== questionIndex
        ) {
            return;
        }

        answerLocked = false;

        buttons.forEach(button => {

            button.disabled = false;

            button.classList.remove("locked");
        });

        selectedButton.classList.remove(
            "selected"
        );

        startPvpTimer();
    }
}


/* =========================================================
   PVP - UPDATE BOTH PLAYERS' ANSWER STATES
========================================================= */

function updatePvpAnswerState(room) {

    if (
        !room ||
        room.status !== "playing" ||
        !room.match
    ) {
        return;
    }

    const match = room.match;

    const questionIndex =
        match.currentQuestion || 0;

    const answers =
        match.answers?.[questionIndex] || {};

    const hostAnswer = answers.host;
    const guestAnswer = answers.guest;

    /* =====================================
       HOST STATUS
    ===================================== */

    if (hostAnswer) {

        pvpHostState.textContent = "LOCKED";

        pvpHostCard.classList.add("locked");

    } else if (room.host?.connected !== true) {

        pvpHostState.textContent =
            "DISCONNECTED";

        pvpHostCard.classList.remove(
            "locked"
        );

    } else {

        pvpHostState.textContent =
            "THINKING...";

        pvpHostCard.classList.remove(
            "locked"
        );
    }

    /* =====================================
       GUEST STATUS
    ===================================== */

    if (guestAnswer) {

        pvpGuestState.textContent = "LOCKED";

        pvpGuestCard.classList.add("locked");

    } else if (room.guest?.connected !== true) {

        pvpGuestState.textContent =
            "DISCONNECTED";

        pvpGuestCard.classList.remove(
            "locked"
        );

    } else {

        pvpGuestState.textContent =
            "THINKING...";

        pvpGuestCard.classList.remove(
            "locked"
        );
    }

    /* =====================================
       RESTORE MY ANSWER LOCK
       Useful after reconnecting.
    ===================================== */

    const myAnswer =
        currentPlayerRole === "host"
            ? hostAnswer
            : guestAnswer;

    if (myAnswer) {

        answerLocked = true;

        stopPvpTimer();

        pvpAnswers
            .querySelectorAll(".answer-button")
            .forEach(button => {

                button.disabled = true;
                button.classList.add("locked");

                if (
                    String(button.dataset.optionId) ===
                    String(myAnswer.optionId)
                ) {
                    button.classList.add(
                        "selected"
                    );
                }
            });
    }

    /* =====================================
       WAIT FOR BOTH PLAYERS
    ===================================== */

    if (!hostAnswer || !guestAnswer) {

        // Absolutely no answer reveal here.
        // No hiragana.
        // No correct/wrong sound.
        // No pronunciation.

        return;
    }

    /* =====================================
       BOTH PLAYERS HAVE ANSWERED
    ===================================== */

    revealPvpAnswers(
        room,
        hostAnswer,
        guestAnswer
    );
}


/* =========================================================
   PVP - SAVE WRONG QUESTION
========================================================= */

function savePvpWrongQuestion(
    match,
    questionIndex
) {

    const questionId =
        match.questionIds?.[questionIndex];

    if (
        questionId === undefined ||
        questionId === null
    ) {
        return;
    }

    const config = {

        studyMode:
            match.studyMode ||
            currentConfig?.studyMode ||
            "jlpt",

        target:
            match.target ||
            match.level ||
            "n5",

        category:
            match.category ||
            "vocabulary",

        subMode:
            match.mode ||
            "kanji_meaning"
    };

    saveWrongQuestion(
        questionId,
        config,
        "pvp"
    ).catch(error => {

        console.error(
            "[PVP REVIEW] Save wrong failed:",
            error
        );
    });
}


/* =========================================================
   PVP - REVEAL ANSWERS
   ONLY AFTER BOTH PLAYERS ANSWERED
========================================================= */

function revealPvpAnswers(
    room,
    hostAnswer,
    guestAnswer
) {

    if (revealStarted) return;

    if (
        !hostAnswer ||
        !guestAnswer ||
        !room?.match ||
        room.status !== "playing"
    ) {
        return;
    }

    revealStarted = true;

    answerLocked = true;

    stopPvpTimer();

    const match = room.match;

    const questionIndex =
        match.currentQuestion || 0;

    const questionData =
        match.questions?.[questionIndex];

    if (!questionData) {

        console.error(
            "[PVP] Missing question data"
        );

        return;
    }

    const correctOptionId =
        questionData.questionId;

    /* =====================================
       CALCULATE CORRECT / WRONG
    ===================================== */

    const hostCorrect =
        String(hostAnswer.optionId) ===
        String(correctOptionId);

    const guestCorrect =
        String(guestAnswer.optionId) ===
        String(correctOptionId);

    const myCorrect =
        currentPlayerRole === "host"
            ? hostCorrect
            : guestCorrect;

    const myAnswer =
        currentPlayerRole === "host"
            ? hostAnswer
            : guestAnswer;

    /* =====================================
       DISPLAY CORRECT / WRONG STATES
    ===================================== */

    pvpHostCard.classList.remove(
        "locked",
        "correct",
        "wrong"
    );

    pvpGuestCard.classList.remove(
        "locked",
        "correct",
        "wrong"
    );

    pvpHostCard.classList.add(
        hostCorrect ? "correct" : "wrong"
    );

    pvpGuestCard.classList.add(
        guestCorrect ? "correct" : "wrong"
    );

    pvpHostState.textContent =
        hostCorrect ? "CORRECT" : "WRONG";

    pvpGuestState.textContent =
        guestCorrect ? "CORRECT" : "WRONG";

    /* =====================================
       REVEAL ANSWER BUTTONS
    ===================================== */

    const buttons =
        pvpAnswers.querySelectorAll(
            ".answer-button"
        );

    buttons.forEach(button => {

        button.disabled = true;

        button.classList.remove(
            "selected",
            "locked"
        );

        const optionId =
            button.dataset.optionId;

        const isCorrectAnswer =
            String(optionId) ===
            String(correctOptionId);

        const isMyWrongAnswer =
            myAnswer &&
            String(optionId) ===
                String(myAnswer.optionId) &&
            !isCorrectAnswer;

        if (isCorrectAnswer) {

            button.classList.add(
                "correct-answer"
            );
        }

        if (isMyWrongAnswer) {

            button.classList.add(
                "wrong-answer"
            );
        }
    });

    /* =====================================
       PLAY CORRECT / WRONG SOUND
    ===================================== */

    playSfx(
        myCorrect ? "correct" : "wrong"
    );

    /* =====================================
       SAVE WRONG ANSWER
       Only once, after reveal.
    ===================================== */

    if (!myCorrect) {

        savePvpWrongQuestion(
            match,
            questionIndex
        );
    }

    /* =====================================
       REVEAL HIRAGANA AND PRONUNCIATION
    ===================================== */

    if (pvpRevealSpeechTimer) {

        clearTimeout(pvpRevealSpeechTimer);
    }

    const revealedMatchId = match.matchId;
    const revealedIndex = questionIndex;

    pvpRevealSpeechTimer = setTimeout(() => {

        pvpRevealSpeechTimer = null;

        // Do not speak if the match was closed
        // or has advanced to another question.
        if (
            currentPvpRoom?.status !== "playing" ||
            currentPvpRoom.match?.matchId !==
                revealedMatchId ||
            Number(
                currentPvpRoom.match?.currentQuestion || 0
            ) !== revealedIndex ||
            !revealStarted
        ) {
            return;
        }

        showPvpAnswerReading();

    }, 350);

    /* =====================================
       HOST ADVANCES TO NEXT QUESTION
    ===================================== */

    if (currentPlayerRole === "host") {

        scheduleNextPvpQuestion(
            room,
            hostCorrect,
            guestCorrect
        );
    }
}


/* =========================================================
   PVP - CREATE SHARED QUESTIONS
========================================================= */

function createPvpQuestions(database, questionIds) {

    return questionIds.map(questionId => {

        const question = database.find(item =>
            String(item.id) === String(questionId)
        );

        if (!question) {
            return null;
        }

        /* Select three wrong answers */

        const wrongAnswers = database
            .filter(item =>
                String(item.id) !== String(questionId)
            )
            .sort(() => Math.random() - 0.5)
            .slice(0, 3);

        const options = [
            question,
            ...wrongAnswers
        ];

        /* Shuffle answers */

        for (let i = options.length - 1; i > 0; i--) {

            const j = Math.floor(
                Math.random() * (i + 1)
            );

            [options[i], options[j]] =
                [options[j], options[i]];
        }

        return {
            questionId: question.id,
            optionIds: options.map(item => item.id)
        };

    }).filter(Boolean);
}


/* =========================================================
   PVP - INITIALIZE
========================================================= */

export function initPvp(config) {

    console.log("[PVP] INIT START");

    currentConfig = config;

    initPvpSocial();

    resetPvpScreen();

    enterPvpSocial()
        .then(() => {

            console.log(
                "[PVP] SOCIAL LOBBY CONNECTED"
            );

        })
        .catch(error => {

            console.error(
                "[PVP] SOCIAL LOBBY ERROR:",
                error
            );

            alert(
                "Unable to connect to 1V1 Lobby: " +
                error.message
            );
        });
}


/* =========================================================
   PVP - CANCEL ALL PENDING TIMERS
========================================================= */

function cancelPvpPendingTimers() {

    if (pvpDisconnectRecoveryTimer !== null) {

        clearTimeout(pvpDisconnectRecoveryTimer);

        pvpDisconnectRecoveryTimer = null;
    }

    if (pvpNextQuestionTimer !== null) {

        clearTimeout(pvpNextQuestionTimer);

        pvpNextQuestionTimer = null;
    }

    if (pvpRevealSpeechTimer !== null) {

        clearTimeout(pvpRevealSpeechTimer);

        pvpRevealSpeechTimer = null;
    }

    stopPvpTimer();

    stopSpeech();
}


/* =========================================================
   PVP - HANDLE OPPONENT DISCONNECTION
========================================================= */

function handlePvpOpponentDisconnected(
    roomCode,
    playerRole,
    room
) {

    const opponentConnected =
        playerRole === "host"
            ? room.guest?.connected === true
            : room.host?.connected === true;

    /* Cancel previous recovery timer */

    if (pvpDisconnectRecoveryTimer !== null) {

        clearTimeout(pvpDisconnectRecoveryTimer);

        pvpDisconnectRecoveryTimer = null;
    }

    if (
        room.status !== "playing" ||
        !room.match
    ) {
        opponentDisconnected = false;
        return;
    }

    opponentDisconnected = !opponentConnected;

    if (opponentConnected) return;

    console.warn(
        "[PVP] Opponent disconnected:",
        roomCode
    );

    /* Stop answering while opponent is absent */

    stopPvpTimer();
    stopSpeech();

    answerLocked = true;

    pvpAnswers
        .querySelectorAll(".answer-button")
        .forEach(button => {
            button.disabled = true;
        });

    const opponentState =
        playerRole === "host"
            ? pvpGuestState
            : pvpHostState;

    opponentState.textContent = "DISCONNECTED";

    /*
       Wait 3 seconds for reconnect.

       If reconnect fails, Firebase recovery
       returns the room to waiting status.
    */

    const expectedMatchId = room.match.matchId;

    pvpDisconnectRecoveryTimer = setTimeout(
        async () => {

            pvpDisconnectRecoveryTimer = null;

            const latestRoom = currentPvpRoom;

            if (
                !latestRoom ||
                latestRoom.status !== "playing" ||
                latestRoom.match?.matchId !==
                    expectedMatchId
            ) {
                return;
            }

            const stillDisconnected =
                currentPlayerRole === "host"
                    ? latestRoom.guest?.connected !== true
                    : latestRoom.host?.connected !== true;

            if (!stillDisconnected) return;

            try {

                console.log(
                    "[PVP] Recovering interrupted room..."
                );

                await recoverInterruptedPvpRoom();

            } catch (error) {

                console.error(
                    "[PVP] Room recovery failed:",
                    error
                );
            }

        },
        3000
    );
}


/* =========================================================
   PVP - UPDATE WAITING ROOM PLAYERS
========================================================= */

function updatePvpWaitingPlayers(room, role) {

    const host = room.host || null;
    const guest = room.guest || null;

    /* HOST: LEFT */

    leftPlayerName.textContent =
        host?.name || "HOST";

    leftPlayerStatus.textContent =
        host?.connected === true
            ? "READY"
            : "OFFLINE";

    leftPlayerStatus.classList.toggle(
        "ready",
        host?.connected === true
    );

    leftPlayerAvatar.classList.toggle(
        "waiting",
        host?.connected !== true
    );

    /* GUEST: RIGHT */

    rightPlayerName.textContent =
        guest?.name || "WAITING...";

    rightPlayerStatus.textContent =
        guest?.connected === true
            ? "READY"
            : "WAITING";

    rightPlayerStatus.classList.toggle(
        "ready",
        guest?.connected === true
    );

    rightPlayerAvatar.classList.toggle(
        "waiting",
        guest?.connected !== true
    );

    /* WAITING STATUS */

    const bothConnected =
        host?.connected === true &&
        guest?.connected === true;

    if (bothConnected) {

        waitingMessage.textContent =
            role === "host"
                ? "OPPONENT READY"
                : "WAITING FOR HOST...";

    } else if (
        role === "guest" &&
        host?.connected !== true
    ) {

        waitingMessage.textContent =
            "HOST DISCONNECTED";

    } else {

        waitingMessage.textContent =
            "WAITING FOR PLAYER...";
    }
}


/* =========================================================
   PVP - FIREBASE ROOM REALTIME LISTENER
========================================================= */

window.addEventListener(
    "batlingo-room-update",
    event => {

        const {
            roomCode,
            playerRole,
            room
        } = event.detail || {};

        if (!room || !roomCode || !playerRole) {
            return;
        }

        /*
           Ignore room updates after leaving PvP.
           Firebase room listener should be stopped
           by leaveRoom/resetRoomConnection.
        */

        if (pvpScreen.classList.contains("hidden")) {
            return;
        }

        console.log("[PVP] ROOM UPDATE:", {
            roomCode,
            playerRole,
            status: room.status,
            hostConnected: room.host?.connected,
            guestConnected: room.guest?.connected
        });

        const previousRoom = currentPvpRoom;

        const wasPlaying =
            previousRoom?.status === "playing" ||
            pvpScreen.classList.contains(
                "battle-mode"
            ) ||
            currentMatchId !== null;

        /* =====================================
           UPDATE LOCAL ROOM STATE
        ===================================== */

        currentPvpRoom = room;
        currentPlayerRole = playerRole;

        const hostName =
            room.host?.name || "HOST";

        const guestName =
            room.guest?.name || "GUEST";

        if (pvpHostName) {
            pvpHostName.textContent = hostName;
        }

        if (pvpGuestName) {
            pvpGuestName.textContent = guestName;
        }

        if (pvpFinalHostName) {
            pvpFinalHostName.textContent = hostName;
        }

        if (pvpFinalGuestName) {
            pvpFinalGuestName.textContent = guestName;
        }

        /* =====================================
           SOCIAL + AVATAR UPDATE
        ===================================== */

        onPvpSocialRoomUpdate(
            room,
            playerRole
        );

        updatePvpWaitingPlayers(
            room,
            playerRole
        );

        updateStartBattleButton();

        /* =====================================
           WAITING OR CONNECTED
        ===================================== */

        if (
            room.status === "waiting" ||
            room.status === "connected"
        ) {

            /*
               Stop old battle rendering.

               Increment loading version to invalidate
               any pending async database load.
            */

            pvpMatchLoadVersion++;

            if (wasPlaying) {

                clearPvpBattleState();

            } else {

                cancelPvpPendingTimers();
            }

            showPvpPanel("waiting");

            currentRoomCode.textContent =
                roomCode;

            window.scrollTo({
                top: 0,
                behavior: "instant"
            });

            return;
        }

        /* =====================================
           PLAYING
        ===================================== */

        if (
            room.status === "playing" &&
            room.match
        ) {

            /*
               Detect opponent disconnection.
            */

            handlePvpOpponentDisconnected(
                roomCode,
                playerRole,
                room
            );

            if (opponentDisconnected) {

                /*
                   Keep current game screen while
                   reconnection is being checked.

                   Do not process additional answers.
                */

                return;
            }

            /*
               Firebase match data is authoritative.
               Both clients display the same match.
            */

            startPvpMatch(room)
                .catch(error => {

                    console.error(
                        "[PVP] Match start error:",
                        error
                    );

                    pvpRematchStatus.textContent =
                        "MATCH ERROR: " +
                        error.message;
                });

            return;
        }

        /* =====================================
           FINISHED
        ===================================== */

        if (room.status === "finished") {

            cancelPvpPendingTimers();

            pvpMatchLoadVersion++;

            showPvpResult(room);

            updateRematchState(room);

            return;
        }

        console.warn(
            "[PVP] Unknown room status:",
            room.status
        );
    }
);


/* =========================================================
   PVP - ROOM DELETED
========================================================= */

window.addEventListener(
    "batlingo-room-deleted",
    event => {

        const { roomCode } =
            event.detail || {};

        console.warn(
            "[PVP] Room deleted:",
            roomCode
        );

        cancelPvpPendingTimers();

        pvpMatchLoadVersion++;

        resetRoomConnection();

        resetPvpScreen();

        // Return to lobby without old battle UI.
        showPvpPanel("lobby");

        window.scrollTo({
            top: 0,
            behavior: "instant"
        });
    }
);


/* =========================================================
   PVP - GET CURRENT PLAYER ROLE
========================================================= */

function getCurrentPlayerRole() {

    return currentPlayerRole;
}


/* =========================================================
   PVP - SCHEDULE NEXT QUESTION
   ONLY HOST CAN ADVANCE
========================================================= */

function scheduleNextPvpQuestion(
    room,
    hostCorrect,
    guestCorrect
) {

    if (currentPlayerRole !== "host") {
        return;
    }

    if (
        !room?.match ||
        room.status !== "playing"
    ) {
        return;
    }

    // Prevent scheduling the same question twice.
    if (pvpNextQuestionTimer !== null) {
        return;
    }

    const match = room.match;

    const matchId = match.matchId;

    const currentIndex = Number(
        match.currentQuestion || 0
    );

    const hostScore =
        Number(match.hostScore || 0) +
        (hostCorrect ? 100 : 0);

    const guestScore =
        Number(match.guestScore || 0) +
        (guestCorrect ? 100 : 0);

    /* =====================================
       DISPLAY UPDATED SCORES
    ===================================== */

    pvpHostScore.textContent =
        String(hostScore);

    pvpGuestScore.textContent =
        String(guestScore);

    /* =====================================
       SHOW ANSWER RESULT FOR 1.5 SECONDS
    ===================================== */

    pvpNextQuestionTimer = setTimeout(
        async () => {

            pvpNextQuestionTimer = null;

            const latestRoom = currentPvpRoom;

            // Do not advance an obsolete match.
            if (
                !latestRoom ||
                latestRoom.status !== "playing" ||
                latestRoom.match?.matchId !== matchId ||
                Number(
                    latestRoom.match?.currentQuestion || 0
                ) !== currentIndex ||
                currentPlayerRole !== "host" ||
                latestRoom.host?.connected !== true ||
                latestRoom.guest?.connected !== true
            ) {
                return;
            }

            const nextIndex = currentIndex + 1;

            try {

                if (
                    nextIndex >=
                    match.questions.length
                ) {

                    console.log(
                        "[PVP] MATCH FINISHED"
                    );

                    await finishRoomGame(
                        hostScore,
                        guestScore
                    );

                    return;
                }

                await nextRoomQuestion(
                    nextIndex,
                    hostScore,
                    guestScore
                );

                console.log(
                    "[PVP] NEXT QUESTION:",
                    nextIndex + 1
                );

            } catch (error) {

                console.error(
                    "[PVP] Advance question failed:",
                    error
                );
            }

        },
        1500
    );
}


/* =========================================================
   PVP - LOAD AND START MATCH
========================================================= */

async function startPvpMatch(room) {

    if (
        !room?.match ||
        room.status !== "playing"
    ) {
        return;
    }

    const match = room.match;

    const matchId = match.matchId;

    const loadVersion =
        ++pvpMatchLoadVersion;

    const isNewMatch =
        currentMatchId !== matchId;

    /* =====================================
       INITIALIZE NEW MATCH
    ===================================== */

    if (isNewMatch) {

        cancelPvpPendingTimers();

        currentMatchId = matchId;

        displayedQuestionIndex = -1;

        answerLocked = false;

        revealStarted = false;

        rematchStarting = false;

        opponentDisconnected = false;

        pvpReadingShownFor = null;

        pvpReading.textContent = "";

        pvpReading.classList.remove("show");

        pvpRematchButton.disabled = false;

        pvpRematchStatus.textContent = "";

        pvpAnswers.innerHTML = "";
    }

    /* =====================================
       LOAD CORRECT DATABASE
    ===================================== */

    await loadPvpDatabase(
        match.target || match.level,
        match.studyMode || "jlpt"
    );

    /* =====================================
       PREVENT STALE ASYNC RENDERING
    ===================================== */

    if (
        loadVersion !== pvpMatchLoadVersion ||
        currentPvpRoom?.status !== "playing" ||
        currentPvpRoom.match?.matchId !== matchId ||
        opponentDisconnected
    ) {

        console.log(
            "[PVP] Ignoring obsolete match load"
        );

        return;
    }

    /* =====================================
       SHOW BATTLE SCREEN
    ===================================== */

    showPvpPanel("battle");

    /* =====================================
       UPDATE SCORES
    ===================================== */

    pvpHostScore.textContent =
        String(match.hostScore || 0);

    pvpGuestScore.textContent =
        String(match.guestScore || 0);

    /* =====================================
       QUESTION INDEX
    ===================================== */

    const questionIndex = Number(
        match.currentQuestion || 0
    );

    if (
        displayedQuestionIndex !== questionIndex
    ) {

        // Stop timers and speech from old question.
        if (pvpNextQuestionTimer !== null) {

            clearTimeout(pvpNextQuestionTimer);
            pvpNextQuestionTimer = null;
        }

        if (pvpRevealSpeechTimer !== null) {

            clearTimeout(pvpRevealSpeechTimer);
            pvpRevealSpeechTimer = null;
        }

        stopPvpTimer();
        stopSpeech();

        displayedQuestionIndex = questionIndex;

        answerLocked = false;

        revealStarted = false;

        showPvpQuestion(match);
    }

    /* =====================================
       UPDATE HOST/GUEST ANSWERS
       Reveal only after BOTH answered
    ===================================== */

    updatePvpAnswerState(room);
}


/* =========================================================
   PVP - FIND QUESTION BY ID
========================================================= */

function getQuestionById(id) {

    return pvpDatabase.find(
        item =>
            String(item.id) === String(id)
    );
}


/* =========================================================
   PVP - CREATE ROOM BUTTON
========================================================= */

document.getElementById("createRoomButton")
    .addEventListener("click", async () => {

        const button =
            document.getElementById(
                "createRoomButton"
            );

        if (button.disabled) return;

        button.disabled = true;

        try {

            const playerName =
                window.currentUserData?.profile
                    ?.displayName ||
                "Player";

            const settings =
                getNewRoomSettings();

            console.log(
                "[PVP] Creating room:",
                settings
            );

            const code = await createRoom(
                playerName,
                settings
            );

            console.log(
                "[PVP] Room created:",
                code
            );

            openWaitingRoom(code);

            document.getElementById(
                "pvpCreateDialog"
            )?.classList.add("hidden");

        } catch (error) {

            console.error(
                "[PVP] Create room failed:",
                error
            );

            alert(
                "Create room error: " +
                error.message
            );

        } finally {

            button.disabled = false;
        }
    });


/* =========================================================
   PVP - JOIN ROOM BUTTON
========================================================= */

document.getElementById("joinRoomButton")
    .addEventListener("click", async () => {

        const input =
            document.getElementById(
                "roomCodeInput"
            );

        const button =
            document.getElementById(
                "joinRoomButton"
            );

        if (button.disabled) return;

        const code = String(
            input.value || ""
        )
            .trim()
            .toUpperCase();

        if (
            !/^[A-HJ-NP-Z2-9]{4,6}$/.test(code)
        ) {

            alert("Invalid Room Code.");

            input.focus();

            return;
        }

        button.disabled = true;

        try {

            const playerName =
                window.currentUserData?.profile
                    ?.displayName ||
                "Player";

            console.log(
                "[PVP] Joining room:",
                code
            );

            await joinRoom(
                code,
                playerName
            );

            // Clear accepted invitation if any.
            await clearAcceptedPvpInvite(code);

            openWaitingRoom(code);

            console.log(
                "[PVP] Joined room:",
                code
            );

        } catch (error) {

            console.error(
                "[PVP] Join room failed:",
                error
            );

            switch (error.message) {

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

                case "LOGIN_REQUIRED":

                    alert(
                        "Vui lòng đăng nhập."
                    );
                    break;

                default:

                    alert(
                        "Không thể vào phòng: " +
                        error.message
                    );
                    break;
            }

        } finally {

            button.disabled = false;
        }
    });


/* =========================================================
   PVP - UPDATE START BUTTON
========================================================= */

function updateStartBattleButton() {

    const room = currentPvpRoom;

    const canStart =
        currentPlayerRole === "host" &&
        (
            room?.status === "waiting" ||
            room?.status === "connected"
        ) &&
        room.host?.connected === true &&
        room.guest?.connected === true;

    startBattleButton.disabled = !canStart;

    startBattleButton.classList.toggle(
        "hidden",
        !canStart
    );
}


/* =========================================================
   PVP - OPEN WAITING ROOM
========================================================= */

function openWaitingRoom(roomCode) {

    showPvpPanel("waiting");

    currentRoomCode.textContent =
        roomCode;

    updateStartBattleButton();

    /*
       Return to top.
       Avoid seeing old scroll position.
    */

    pvpScreen.scrollTop = 0;
}


/* =========================================================
   PVP - LEAVE ROOM BUTTON
========================================================= */

document.getElementById("leaveRoomButton")
    .addEventListener("click", async () => {

        const button =
            document.getElementById(
                "leaveRoomButton"
            );

        if (button.disabled) return;

        button.disabled = true;

        try {

            // Cancel all previous battle tasks.
            cancelPvpPendingTimers();

            pvpMatchLoadVersion++;

            await leaveRoom();

            console.log(
                "[PVP] Left room successfully"
            );

        } catch (error) {

            console.error(
                "[PVP] Leave room failed:",
                error
            );

            resetRoomConnection();

        } finally {

            resetPvpScreen();

            button.disabled = false;
        }
    });


/* =========================================================
   PVP - SCREEN PANEL MANAGER
========================================================= */

function showPvpPanel(panel) {

    /* Hide all main panels */

    roomSelectPanel.classList.add("hidden");

    waitingRoomPanel.classList.add("hidden");

    pvpGamePanel.classList.add("hidden");

    pvpResultPanel.classList.add("hidden");

    /* Remove old background modes */

    pvpScreen.classList.remove(
        "battle-mode",
        "result-mode"
    );

    /* Display selected panel */

    switch (panel) {

        case "lobby":

            roomSelectPanel.classList.remove(
                "hidden"
            );
            break;

        case "waiting":

            waitingRoomPanel.classList.remove(
                "hidden"
            );
            break;

        case "battle":

            pvpGamePanel.classList.remove(
                "hidden"
            );

            pvpScreen.classList.add(
                "battle-mode"
            );
            break;

        case "result":

            pvpResultPanel.classList.remove(
                "hidden"
            );

            pvpScreen.classList.add(
                "result-mode"
            );
            break;
    }
}


/* =========================================================
   PVP - CLEAR OLD BATTLE
   WITHOUT LEAVING ROOM
========================================================= */

function clearPvpBattleState() {

    cancelPvpPendingTimers();

    pvpMatchLoadVersion++;

    answerLocked = false;

    revealStarted = false;

    displayedQuestionIndex = -1;

    currentMatchId = null;

    rematchStarting = false;

    opponentDisconnected = false;

    pvpReadingShownFor = null;

    /* =====================================
       CLEAR QUESTION
    ===================================== */

    pvpQuestion.textContent = "---";

    pvpQuestion.onclick = null;

    pvpReading.textContent = "";

    pvpReading.classList.remove("show");

    pvpAnswers.innerHTML = "";

    /* =====================================
       RESET PLAYER STATES
    ===================================== */

    pvpHostCard.classList.remove(
        "locked",
        "correct",
        "wrong"
    );

    pvpGuestCard.classList.remove(
        "locked",
        "correct",
        "wrong"
    );

    pvpHostState.textContent = "THINKING...";

    pvpGuestState.textContent = "THINKING...";

    /* =====================================
       RESET SCORES
    ===================================== */

    pvpHostScore.textContent = "0";

    pvpGuestScore.textContent = "0";

    /* =====================================
       RESET TIMER
    ===================================== */

    pvpTimeLeft = PVP_QUESTION_TIME;

    updatePvpTimer();

    /* =====================================
       HIDE OLD BATTLE PANELS
    ===================================== */

    pvpGamePanel.classList.add("hidden");

    pvpResultPanel.classList.add("hidden");

    pvpScreen.classList.remove(
        "battle-mode",
        "result-mode"
    );
}


/* =========================================================
   PVP - RESET EVERYTHING TO LOBBY
========================================================= */

function resetPvpScreen() {

    clearPvpBattleState();

    currentPvpRoom = null;

    currentPlayerRole = null;

    currentMatchId = null;

    currentConfig = currentConfig || null;

    pvpDatabase = [];

    pvpDatabaseKey = "";

    /* =====================================
       RESET RESULT
    ===================================== */

    pvpFinalHostScore.textContent = "0";

    pvpFinalGuestScore.textContent = "0";

    pvpResultMessage.textContent = "---";

    pvpRematchButton.disabled = false;

    pvpRematchStatus.textContent = "";

    /* =====================================
       RESET ROOM CODE
    ===================================== */

    currentRoomCode.textContent = "----";

    const roomCodeInput =
        document.getElementById(
            "roomCodeInput"
        );

    if (roomCodeInput) {
        roomCodeInput.value = "";
    }

    /* =====================================
       RESET SOCIAL UI
    ===================================== */

    onPvpSocialReset();

    startBattleButton.disabled = true;

    startBattleButton.classList.add(
        "hidden"
    );

    /* =====================================
       SHOW LOBBY ONLY
    ===================================== */

    showPvpPanel("lobby");

    pvpScreen.scrollTop = 0;
}


/* =========================================================
   PVP - START BATTLE BUTTON
========================================================= */

startBattleButton.addEventListener(
    "click",
    async () => {

        if (startBattleButton.disabled) {
            return;
        }

        const room = currentPvpRoom;

        if (
            !room ||
            currentPlayerRole !== "host"
        ) {
            return;
        }

        if (
            !["waiting", "connected"].includes(
                room.status
            )
        ) {
            return;
        }

        if (
            room.host?.connected !== true ||
            room.guest?.connected !== true
        ) {

            waitingMessage.textContent =
                "OPPONENT NOT CONNECTED";

            updateStartBattleButton();

            return;
        }

        startBattleButton.disabled = true;

        waitingMessage.textContent =
            "PREPARING BATTLE...";

        try {

            const settings =
                room.settings || {};

            const studyMode =
                settings.studyMode || "jlpt";

            const target =
                settings.target ||
                settings.level ||
                "n5";

            const category =
                settings.category ||
                "vocabulary";

            const mode =
                settings.mode ||
                "kanji_meaning";

            const count = Math.max(
                1,
                Math.min(
                    100,
                    Number(settings.count) || 20
                )
            );

            /* =====================================
               LOAD DATABASE
            ===================================== */

            const database =
                await loadPvpDatabase(
                    target,
                    studyMode
                );

            /* =====================================
               CREATE SHARED QUESTIONS
            ===================================== */

            const questionIds =
                createQuestionIds(
                    database,
                    count
                );

            const questions =
                createPvpQuestions(
                    database,
                    questionIds
                );

            if (
                questionIds.length === 0 ||
                questions.length !==
                    questionIds.length
            ) {

                throw new Error(
                    "PVP_QUESTIONS_INVALID"
                );
            }

            /* =====================================
               VERIFY ROOM STILL READY
            ===================================== */

            const latestRoom =
                currentPvpRoom;

            if (
                !latestRoom ||
                !["waiting", "connected"].includes(
                    latestRoom.status
                ) ||
                latestRoom.host?.connected !== true ||
                latestRoom.guest?.connected !== true
            ) {

                throw new Error(
                    "ROOM_NOT_READY"
                );
            }

            /* =====================================
               START MATCH VIA FIREBASE
            ===================================== */

            await startRoomGame({

                studyMode,

                target,

                level: target,

                category,

                mode,

                questionIds,

                questions
            });

            console.log(
                "[PVP] Battle created successfully"
            );

            /*
               Do not call startPvpMatch() here.

               Firebase room listener starts the
               same match for both players.
            */

        } catch (error) {

            console.error(
                "[PVP] Start Battle failed:",
                error
            );

            waitingMessage.textContent =
                "START ERROR: " +
                error.message;

            updateStartBattleButton();
        }
    }
);


/* =========================================================
   PVP - SHOW FINAL RESULT
========================================================= */

function showPvpResult(room) {

    cancelPvpPendingTimers();

    if (!room?.match) {
        return;
    }

    const match = room.match;

    const hostScore =
        Number(match.hostScore) || 0;

    const guestScore =
        Number(match.guestScore) || 0;

    const hostName =
        room.host?.name || "HOST";

    const guestName =
        room.guest?.name || "GUEST";

    /* =====================================
       SWITCH TO RESULT SCREEN
    ===================================== */

    showPvpPanel("result");

    /* =====================================
       PLAYER NAMES AND SCORES
    ===================================== */

    if (pvpFinalHostName) {
        pvpFinalHostName.textContent =
            hostName;
    }

    if (pvpFinalGuestName) {
        pvpFinalGuestName.textContent =
            guestName;
    }

    pvpFinalHostScore.textContent =
        String(hostScore);

    pvpFinalGuestScore.textContent =
        String(guestScore);

    /* =====================================
       RESET WINNER EFFECT
    ===================================== */

    const playerCards =
        pvpResultPanel.querySelectorAll(
            ".pvp-result-score > div:not(.room-vs)"
        );

    playerCards.forEach(card => {

        card.classList.remove("winner");
    });

    /* =====================================
       DETERMINE WINNER
    ===================================== */

    if (hostScore > guestScore) {

        pvpResultMessage.textContent =
            `${hostName} WIN`;

        playerCards[0]?.classList.add(
            "winner"
        );

    } else if (guestScore > hostScore) {

        pvpResultMessage.textContent =
            `${guestName} WIN`;

        playerCards[1]?.classList.add(
            "winner"
        );

    } else {

        pvpResultMessage.textContent =
            "DRAW";
    }

    console.log(
        "[PVP] MATCH RESULT:",
        {
            hostScore,
            guestScore
        }
    );
}


/* =========================================================
   PVP - REMATCH BUTTON
========================================================= */

pvpRematchButton.addEventListener(
    "click",
    async () => {

        if (
            pvpRematchButton.disabled ||
            !currentPvpRoom ||
            currentPvpRoom.status !== "finished"
        ) {
            return;
        }

        pvpRematchButton.disabled = true;

        pvpRematchStatus.textContent =
            "WAITING FOR OPPONENT...";

        try {

            await requestRematch();

            console.log(
                "[PVP] Rematch requested"
            );

        } catch (error) {

            console.error(
                "[PVP] Rematch request failed:",
                error
            );

            pvpRematchButton.disabled = false;

            pvpRematchStatus.textContent =
                "REMATCH ERROR: " +
                error.message;
        }
    }
);


/* =========================================================
   PVP - UPDATE REMATCH STATE
========================================================= */

function updateRematchState(room) {

    if (
        !room ||
        room.status !== "finished"
    ) {
        return;
    }

    const hostAccepted =
        room.rematch?.host === true;

    const guestAccepted =
        room.rematch?.guest === true;

    /* =====================================
       BOTH PLAYERS ACCEPTED
    ===================================== */

    if (hostAccepted && guestAccepted) {

        pvpRematchButton.disabled = true;

        if (
            currentPlayerRole === "host" &&
            !rematchStarting
        ) {

            rematchStarting = true;

            pvpRematchStatus.textContent =
                "STARTING NEW MATCH...";

            startPvpRematch();

        } else {

            pvpRematchStatus.textContent =
                "BOTH PLAYERS READY";
        }

        return;
    }

    /* =====================================
       HOST STATE
    ===================================== */

    if (currentPlayerRole === "host") {

        if (hostAccepted) {

            pvpRematchButton.disabled = true;

            pvpRematchStatus.textContent =
                "WAITING FOR OPPONENT...";

        } else {

            pvpRematchButton.disabled = false;

            pvpRematchStatus.textContent =
                guestAccepted
                    ? "OPPONENT WANTS A REMATCH"
                    : "";
        }

        return;
    }

    /* =====================================
       GUEST STATE
    ===================================== */

    if (currentPlayerRole === "guest") {

        if (guestAccepted) {

            pvpRematchButton.disabled = true;

            pvpRematchStatus.textContent =
                "WAITING FOR OPPONENT...";

        } else {

            pvpRematchButton.disabled = false;

            pvpRematchStatus.textContent =
                hostAccepted
                    ? "OPPONENT WANTS A REMATCH"
                    : "";
        }
    }
}


/* =========================================================
   PVP - START REMATCH
========================================================= */

async function startPvpRematch() {

    try {

        const room = currentPvpRoom;

        if (!room) {
            throw new Error("ROOM_NOT_FOUND");
        }

        if (currentPlayerRole !== "host") {
            throw new Error("HOST_ONLY");
        }

        if (room.status !== "finished") {
            throw new Error("MATCH_NOT_FINISHED");
        }

        if (
            room.host?.connected !== true ||
            room.guest?.connected !== true
        ) {
            throw new Error("OPPONENT_DISCONNECTED");
        }

        if (
            room.rematch?.host !== true ||
            room.rematch?.guest !== true
        ) {
            throw new Error("PLAYERS_NOT_READY");
        }

        const oldMatch = room.match;

        if (!oldMatch) {
            throw new Error("MATCH_NOT_FOUND");
        }

        /* =====================================
           KEEP PREVIOUS MATCH CONFIG
        ===================================== */

        const studyMode =
            oldMatch.studyMode ||
            room.settings?.studyMode ||
            "jlpt";

        const target =
            oldMatch.target ||
            room.settings?.target ||
            oldMatch.level ||
            "n5";

        const category =
            oldMatch.category ||
            "vocabulary";

        const mode =
            oldMatch.mode ||
            "kanji_meaning";

        const count =
            oldMatch.questionIds?.length ||
            room.settings?.count ||
            20;

        /* =====================================
           GENERATE NEW QUESTIONS
        ===================================== */

        const database =
            await loadPvpDatabase(
                target,
                studyMode
            );

        const questionIds =
            createQuestionIds(
                database,
                count
            );

        const questions =
            createPvpQuestions(
                database,
                questionIds
            );

        if (
            questionIds.length === 0 ||
            questions.length !==
                questionIds.length
        ) {
            throw new Error(
                "REMATCH_QUESTIONS_INVALID"
            );
        }

        /* =====================================
           FIREBASE ATOMIC REMATCH
        ===================================== */

        await startRoomRematch({

            studyMode,

            target,

            level: target,

            category,

            mode,

            questionIds,

            questions
        });

        console.log(
            "[PVP] Rematch started successfully"
        );

        /*
           Firebase listener will switch both
           players into the new battle.
        */

    } catch (error) {

        console.error(
            "[PVP] Start Rematch failed:",
            error
        );

        rematchStarting = false;

        pvpRematchStatus.textContent =
            "REMATCH ERROR: " +
            error.message;
    }
}


/* =========================================================
   PVP - START QUESTION TIMER
========================================================= */

function startPvpTimer() {

    stopPvpTimer();

    pvpTimeLeft = PVP_QUESTION_TIME;

    updatePvpTimer();

    const expectedMatchId =
        currentPvpRoom?.match?.matchId;

    const expectedQuestion =
        Number(
            currentPvpRoom?.match
                ?.currentQuestion || 0
        );

    pvpTimer = setInterval(() => {

        /* =====================================
           STOP OBSOLETE TIMER
        ===================================== */

        if (
            !currentPvpRoom ||
            currentPvpRoom.status !== "playing" ||
            currentPvpRoom.match?.matchId !==
                expectedMatchId ||
            Number(
                currentPvpRoom.match
                    ?.currentQuestion || 0
            ) !== expectedQuestion ||
            answerLocked ||
            revealStarted ||
            opponentDisconnected
        ) {

            stopPvpTimer();

            return;
        }

        /* =====================================
           COUNT DOWN
        ===================================== */

        pvpTimeLeft = Math.max(
            0,
            pvpTimeLeft - 0.1
        );

        updatePvpTimer();

        if (pvpTimeLeft <= 0) {

            stopPvpTimer();

            handlePvpTimeout();
        }

    }, 100);
}


/* =========================================================
   PVP - STOP TIMER
========================================================= */

function stopPvpTimer() {

    if (pvpTimer !== null) {

        clearInterval(pvpTimer);

        pvpTimer = null;
    }
}


/* =========================================================
   PVP - UPDATE TIMER UI
========================================================= */

function updatePvpTimer() {

    if (pvpTimerText) {

        pvpTimerText.textContent =
            pvpTimeLeft.toFixed(1);
    }

    if (pvpTimerBar) {

        const percent = Math.max(
            0,
            Math.min(
                100,
                pvpTimeLeft /
                    PVP_QUESTION_TIME * 100
            )
        );

        pvpTimerBar.style.width =
            `${percent}%`;
    }
}


/* =========================================================
   PVP - HANDLE QUESTION TIMEOUT
========================================================= */

async function handlePvpTimeout() {

    if (
        answerLocked ||
        revealStarted ||
        opponentDisconnected ||
        currentPvpRoom?.status !== "playing" ||
        !currentPvpRoom?.match
    ) {
        return;
    }

    const match = currentPvpRoom.match;

    const matchId = match.matchId;

    const questionIndex =
        Number(
            match.currentQuestion || 0
        );

    /* =====================================
       LOCK ANSWER
    ===================================== */

    answerLocked = true;

    stopPvpTimer();

    stopSpeech();

    pvpAnswers
        .querySelectorAll(".answer-button")
        .forEach(button => {

            button.disabled = true;

            button.classList.add("locked");
        });

    const ownState =
        currentPlayerRole === "host"
            ? pvpHostState
            : pvpGuestState;

    ownState.textContent = "TIMEOUT";

    console.log(
        "[PVP] Answer timeout:",
        questionIndex
    );

    /* =====================================
       SEND TIMEOUT TO FIREBASE

       Do not reveal correct answer here.
       Wait until both players have submitted.
    ===================================== */

    try {

        await submitRoomAnswer(
            questionIndex,
            "TIMEOUT"
        );

        console.log(
            "[PVP] Timeout submitted"
        );

    } catch (error) {

        console.error(
            "[PVP] Timeout submit failed:",
            error
        );

        /*
           Do not re-enable old answers if
           match has changed or room was closed.
        */

        if (
            currentPvpRoom?.status !== "playing" ||
            currentPvpRoom.match?.matchId !==
                matchId ||
            Number(
                currentPvpRoom.match
                    ?.currentQuestion || 0
            ) !== questionIndex
        ) {
            return;
        }

        /*
           Keep answer locked.
           A production version can add
           Firebase submission retry.
        */
    }
}


/* =========================================================
   PVP - CLOSE SOCIAL LOBBY
========================================================= */

export async function closePvpSocial() {

    /* =====================================
       STOP ALL PVP TASKS
    ===================================== */

    cancelPvpPendingTimers();

    pvpMatchLoadVersion++;

    /* =====================================
       LEAVE FIREBASE ROOM
    ===================================== */

    try {

        await leaveRoom();

    } catch (error) {

        console.warn(
            "[PVP] Leave room failed:",
            error
        );

        resetRoomConnection();
    }

    /* =====================================
       REMOVE PVP PRESENCE
    ===================================== */

    try {

        await leavePvpSocial();

    } catch (error) {

        console.warn(
            "[PVP] Leave social lobby failed:",
            error
        );
    }

    /* =====================================
       RESET SCREEN
    ===================================== */

    resetPvpScreen();

    console.log(
        "[PVP] Social lobby closed"
    );
}



