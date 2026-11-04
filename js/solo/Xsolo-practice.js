
/* =============================================================
   BATLINGO - SOLO PRACTICE
   Fixed question count / No EXP / No lives
============================================================= */

import {
    playSfx,
    speakJapanese,
    stopSpeech
} from "../audio.js";

import {
    loadSoloQuestions,
    generateSoloChoices,
    getSoloQuestionText,
    getRandomGrammarExample,
    isSoloAudioMode,
    createPracticeQuestionPool
} from "./solo-core.js";

import {
    initPracticeReview,
    showPracticeResults,
    openPracticeReview,
    hidePracticeReview
} from "./solo-practice-review.js";

/* =============================================================
   STATE
============================================================= */

let config = null;
let database = [];
let questionPool = [];
let currentIndex = 0;
let currentQuestion = null;
let currentExample = null;
let currentChoices = [];
let correctAnswer = null;

let results = [];
let active = false;
let locked = false;

let duration = 8;
let deadline = 0;

let timerId = null;
let nextId = null;
let speechId = null;

// Every new session or stop invalidates old callbacks.
let sessionToken = 0;
let questionToken = 0;

/* =============================================================
   DOM
============================================================= */

const byId = id => document.getElementById(id);

const gameScreen = byId("gameScreen");
const questionElement = byId("question");
const readingElement = byId("reading");
const answersElement = byId("answers");
const numberElement = byId("questionNumber");
const modeElement = byId("gameModeInfo");
const timerText = byId("timerText");
const timerBar = byId("timerBar");

/* =============================================================
   INITIALIZE BUTTONS
============================================================= */

let initialized = false;

function initPractice() {

    if (initialized) return;
    initialized = true;

    initPracticeReview();

    byId("practiceRetryBtn")?.addEventListener(
        "click",
        () => {
            if (config) {
                startPractice({...config}).catch(
                    console.error
                );
            }
        }
    );

    byId("practiceHomeBtn")?.addEventListener(
        "click",
        () => {
            stopPractice();

            window.dispatchEvent(
                new Event("batlingo-practice-home")
            );
        }
    );

    byId("practiceReviewAllBtn")?.addEventListener(
        "click",
        () => openPracticeReview(results, "all")
    );

    byId("practiceCorrectBtn")?.addEventListener(
        "click",
        () => openPracticeReview(results, "correct")
    );

    byId("practiceWrongBtn")?.addEventListener(
        "click",
        () => openPracticeReview(results, "wrong")
    );

    byId("practiceTimeoutBtn")?.addEventListener(
        "click",
        () => openPracticeReview(results, "timeout")
    );
}

/* =============================================================
   CANCEL PENDING WORK
============================================================= */

function clearPending() {

    clearInterval(timerId);
    clearTimeout(nextId);
    clearTimeout(speechId);

    timerId = null;
    nextId = null;
    speechId = null;

    stopSpeech();
}

function isCurrent(session, question) {
    return (
        active &&
        sessionToken === session &&
        questionToken === question
    );
}

/* =============================================================
   STOP PRACTICE
============================================================= */

export function stopPractice() {

    ++sessionToken;
    ++questionToken;

    active = false;
    locked = true;

    clearPending();

    questionElement.onclick = null;

    gameScreen.classList.add("hidden");
    gameScreen.classList.remove("solo-practice-mode");

    byId("practiceResultScreen")
        ?.classList.add("hidden");

    hidePracticeReview();

    // Last session only, stored in RAM.
    results = [];
    questionPool = [];
    database = [];
    config = null;
}

/* =============================================================
   START PRACTICE
============================================================= */

export async function startPractice(newConfig) {

    initPractice();

    // Stop previous practice without keeping old results.
    stopPractice();

    config = {...newConfig};

    const session = sessionToken;

    const count = Math.max(
        1,
        Math.min(100, Number(config.practiceCount) || 20)
    );

    duration = Math.max(
        1,
        Math.min(20, Number(config.practiceTime) || 8)
    );

    database = await loadSoloQuestions(config);

    // A new start may have replaced this session.
    if (session !== sessionToken) return;

    questionPool = createPracticeQuestionPool(
        database,
        count
    );

    if (questionPool.length === 0) {
        throw new Error("No practice questions available.");
    }

    currentIndex = 0;
    results = [];
    active = true;
    locked = false;

    byId("gameOverScreen")?.classList.add("hidden");
    byId("practiceResultScreen")?.classList.add("hidden");
    hidePracticeReview();

    gameScreen.classList.add("solo-practice-mode");
    gameScreen.classList.remove("hidden");

    showNextQuestion();
}

/* =============================================================
   NEXT QUESTION
============================================================= */

function showNextQuestion() {

    if (!active) return;

    clearPending();

    if (currentIndex >= questionPool.length) {
        completePractice();
        return;
    }

    ++questionToken;

    const session = sessionToken;
    const question = questionToken;

    locked = false;

    currentQuestion = questionPool[currentIndex];

    currentExample =
        config.subMode === "grammar_sentence"
            ? getRandomGrammarExample(currentQuestion)
            : null;

    const generated = generateSoloChoices(
        currentQuestion,
        database,
        config
    );

    currentChoices = [...generated.choices];
    correctAnswer = generated.correctAnswer;

    const displayText = getSoloQuestionText(
        currentQuestion,
        config,
        currentExample
    );

    questionElement.textContent = displayText;
    questionElement.onclick = null;

    readingElement.textContent =
        currentQuestion.reading ?? "";

    readingElement.classList.remove("show");

    const target = config.studyMode === "jlpt"
        ? `JLPT ${config.target.toUpperCase()}`
        : config.target.toUpperCase();

    modeElement.textContent =
        `${target} · ${config.category.toUpperCase()} · PRACTICE`;

    numberElement.textContent =
        `QUESTION ${currentIndex + 1} / ${questionPool.length}`;

    renderAnswers(session, question);

    if (isSoloAudioMode(config.subMode)) {

        questionElement.onclick = () => {
            if (!isCurrent(session, question) || locked) {
                return;
            }

            speakJapanese(currentQuestion.reading ?? "");
        };

        speechId = setTimeout(() => {

            if (!isCurrent(session, question) || locked) {
                return;
            }

            speakJapanese(currentQuestion.reading ?? "");

        }, 200);
    }

    startQuestionTimer(session, question);
}

/* =============================================================
   RENDER ANSWERS
============================================================= */

function renderAnswers(session, question) {

    answersElement.replaceChildren();

    currentChoices.forEach((choice, index) => {

        const button = document.createElement("button");
        button.type = "button";
        button.className = "answer-button";
        button.dataset.answerIndex = String(index);

        const number = document.createElement("span");
        number.className = "answer-number";
        number.textContent = index + 1;

        const text = document.createElement("span");
        text.className = "answer-text";
        text.textContent = String(choice);

        button.append(number, text);

        button.addEventListener("click", () => {

            if (!isCurrent(session, question) || locked) {
                return;
            }

            submitAnswer(index);
        });

        answersElement.appendChild(button);
    });
}

/* =============================================================
   TIMER
============================================================= */

function startQuestionTimer(session, question) {

    deadline = performance.now() + duration * 1000;

    updateTimer(duration);

    timerId = setInterval(() => {

        if (!isCurrent(session, question) || locked) {
            return;
        }

        const remaining = Math.max(
            0,
            (deadline - performance.now()) / 1000
        );

        updateTimer(remaining);

        if (remaining <= 0) {
            submitAnswer(null);
        }

    }, 50);
}

function updateTimer(remaining) {

    timerText.textContent = remaining.toFixed(1);

    timerBar.style.width =
        `${Math.max(0, remaining / duration * 100)}%`;
}

/* =============================================================
   ANSWER / TIMEOUT
============================================================= */

function submitAnswer(selectedIndex) {

    if (!active || locked) return;

    locked = true;

    clearPending();

    const correctIndex =
        currentChoices.findIndex(
            choice => choice === correctAnswer
        );

    const timedOut = selectedIndex === null;

    const correct =
        !timedOut && selectedIndex === correctIndex;

    const status = timedOut
        ? "timeout"
        : correct ? "correct" : "wrong";

    const remaining = Math.max(
        0,
        (deadline - performance.now()) / 1000
    );

    // Save the complete state shown to the player.
    results.push({
        number: currentIndex + 1,
        question: {...currentQuestion},
        grammarExample: currentExample
            ? {...currentExample}
            : null,
        questionText: getSoloQuestionText(
            currentQuestion,
            config,
            currentExample
        ),
        choices: [...currentChoices],
        correctIndex,
        selectedIndex,
        status,
        timeUsed: Math.max(0, duration - remaining),
        config: {...config}
    });

    const buttons = answersElement.querySelectorAll(
        ".answer-button"
    );

    buttons.forEach((button, index) => {

        button.disabled = true;

        if (index === correctIndex) {
            button.classList.add("correct");
        }

        if (
            index === selectedIndex &&
            !correct
        ) {
            button.classList.add("wrong");
        }
    });

    readingElement.classList.add("show");

    playSfx(correct ? "correct" : "wrong");


        /* =============================================================
        READ JAPANESE AFTER ANSWER
        ============================================================= */

        const session = sessionToken;
        const question = questionToken;

        const continuePractice = () => {

            if (!isCurrent(session, question)) {
                return;
            }

            currentIndex++;

            showNextQuestion();
        };

        /* Audio questions do not need to repeat speech */

        if (isSoloAudioMode(config.subMode)) {

            nextId = setTimeout(
                continuePractice,
                500
            );

            return;
        }

        /* Read the Japanese word before moving on */

        const reading =
            currentQuestion.reading ??
            currentQuestion.word ??
            "";

        /* No text available: move to next question */

        if (!reading) {

            nextId = setTimeout(
                continuePractice,
                500
            );

            return;
        }

        /* Move to next question when speech completes */

        speakJapanese(
            reading,
            continuePractice
        );

}

/* =============================================================
   KEYBOARD
============================================================= */

// Installed once, only active during Practice.
document.addEventListener("keydown", event => {

    if (!active || locked) return;

    const element = document.activeElement;

    if (
        element &&
        (["INPUT", "TEXTAREA", "SELECT"].includes(
            element.tagName
        ) || element.isContentEditable)
    ) {
        return;
    }

    const index = Number(event.key) - 1;

    if (
        !Number.isInteger(index) ||
        index < 0 ||
        index > 3
    ) {
        return;
    }

    const button = answersElement.querySelectorAll(
        ".answer-button"
    )[index];

    button?.click();
});

/* =============================================================
   COMPLETE PRACTICE
============================================================= */

function completePractice() {

    if (!active) return;

    active = false;
    locked = true;

    clearPending();

    questionElement.onclick = null;

    gameScreen.classList.add("hidden");

    showPracticeResults(results, questionPool.length);
}
