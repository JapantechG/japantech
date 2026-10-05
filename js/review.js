import {
    getReviewItems,
    markReviewCorrect,
    markReviewWrong
} from "./user.js";

import { speakJapanese, stopSpeech } from "./audio.js";

const REVIEW_POOL_SIZE = 10;

let reviewItems = [];
let reviewPool = [];

let sessionTotal = 0;
let masteredCount = 0;

let currentIndex = 0;
let currentReviewItem = null;
let currentQuestion = null;
let currentCorrectAnswer = null;

let answerLocked = false;

const databaseCache = {};

const reviewScreen = document.getElementById("reviewScreen");
const reviewSessionInfo = document.getElementById("reviewSessionInfo");
const reviewQuestionLevel = document.getElementById("reviewQuestionLevel");
const reviewStreak = document.getElementById("reviewStreak");
const reviewQuestion = document.getElementById("reviewQuestion");
const reviewReading = document.getElementById("reviewReading");
const reviewAnswers = document.getElementById("reviewAnswers");


/* =============================================================
   START
   ============================================================= */

export async function startReview() 
{
    stopSpeech();

    reviewItems = await getReviewItems();

    if (reviewItems.length === 0) {
        console.log("[REVIEW] No questions.");
        return false;
    }

    shuffleArray(reviewItems);

    reviewPool = reviewItems.slice(0, REVIEW_POOL_SIZE);

    sessionTotal = reviewPool.length;
    masteredCount = 0;
    currentIndex = 0;

    reviewScreen.classList.remove("hidden");

    reviewSessionInfo.textContent = `0 / ${sessionTotal} MASTERED`;

    await showReviewQuestion();

    return true;
}


/* =============================================================
   DATA FILE
   ============================================================= */

function getDataFile(config) {
    if (config.studyMode === "jlpt" && config.category === "vocabulary") {
        return `data/${config.target}.json`;
    }

    if (config.studyMode === "jlpt" && config.category === "grammar") {
        return `data/grammar/${config.target}.json`;
    }

    if (config.studyMode === "topic" && config.category === "vocabulary") {
        return `data/topics/${config.target}.json`;
    }

    return null;
}


/* =============================================================
   LOAD DATABASE
   ============================================================= */

async function loadDatabase(config) {
    const file = getDataFile(config);

    if (!file) {
        throw new Error("Review data file not found.");
    }

    if (databaseCache[file]) {
        return databaseCache[file];
    }

    const response = await fetch(file);

    if (!response.ok) {
        throw new Error(`Failed to load ${file}`);
    }

    const data = await response.json();

    databaseCache[file] = data;

    return data;
}


/* =============================================================
   SHOW QUESTION
   ============================================================= */

async function showReviewQuestion() 
{
    if (reviewPool.length === 0) return;

    answerLocked = false;

    currentReviewItem = reviewPool[currentIndex];

    const database = await loadDatabase(currentReviewItem.config);

    currentQuestion = database.find(item => {
        return String(item.id) === String(currentReviewItem.questionId);
    });

    if (!currentQuestion) {
        console.error(
            "[REVIEW] Question ID not found:",
            currentReviewItem.questionId
        );

        return;
    }

    renderQuestion(database);
}


/* =============================================================
   RENDER QUESTION
   ============================================================= */

function renderQuestion(database) {
    const config = currentReviewItem.config;
    const subMode = config.subMode;

    reviewQuestionLevel.textContent =
        `${config.target.toUpperCase()} · ${config.category.toUpperCase()}`;

    reviewStreak.textContent =
        `${currentReviewItem.correctStreak || 0} / 3`;

    reviewReading.textContent = "";

    if (subMode === "grammar_meaning" || subMode === "grammar_sentence") {
        reviewQuestion.textContent = currentQuestion.grammar;
    }
    else if (subMode === "kanji_hiragana") {
        reviewQuestion.textContent = currentQuestion.word;
    }
    else if (subMode === "hiragana_meaning") {
        reviewQuestion.textContent = currentQuestion.reading;
    }
    else if (subMode === "meaning_kanji") {
        reviewQuestion.textContent = currentQuestion.meaning;
    }
    else if (isAudioMode(subMode)) {
        reviewQuestion.textContent = "🔊";
        speakJapanese(currentQuestion.reading);
    }
    else {
        reviewQuestion.textContent = currentQuestion.word;
    }

    const choices = generateChoices(database);

    renderChoices(choices);
}


/* =============================================================
   GENERATE CHOICES
   ============================================================= */

function generateChoices(database) {
    if (currentReviewItem.config.subMode === "grammar_sentence") {
        return generateGrammarSentenceChoices(database);
    }

    const field = getAnswerField(currentReviewItem.config.subMode);

    currentCorrectAnswer = currentQuestion[field];

    const wrongAnswers = database
        .filter(item => String(item.id) !== String(currentQuestion.id))
        .map(item => item[field])
        .filter(Boolean);

    const uniqueWrong = [...new Set(wrongAnswers)];

    shuffleArray(uniqueWrong);

    const choices = [
        currentCorrectAnswer,
        ...uniqueWrong.slice(0, 3)
    ];

    shuffleArray(choices);

    return choices;
}


function generateGrammarSentenceChoices(database) {
    const examples = currentQuestion.examples ?? [];

    if (examples.length === 0) return [];

    const example =
        examples[Math.floor(Math.random() * examples.length)];

    currentCorrectAnswer = example.sentence;

    const wrongAnswers = database
        .filter(item => String(item.id) !== String(currentQuestion.id))
        .flatMap(item => item.examples ?? [])
        .map(example => example.sentence)
        .filter(Boolean);

    const uniqueWrong = [...new Set(wrongAnswers)];

    shuffleArray(uniqueWrong);

    const choices = [
        currentCorrectAnswer,
        ...uniqueWrong.slice(0, 3)
    ];

    shuffleArray(choices);

    return choices;
}


/* =============================================================
   ANSWER FIELD
   ============================================================= */

function getAnswerField(subMode) {
    if (
        subMode === "kanji_hiragana" ||
        subMode === "audio_hiragana"
    ) {
        return "reading";
    }

    if (
        subMode === "meaning_kanji" ||
        subMode === "audio_kanji"
    ) {
        return "word";
    }

    return "meaning";
}


/* =============================================================
   RENDER CHOICES
   ============================================================= */

function renderChoices(choices) {
    reviewAnswers.innerHTML = "";

    choices.forEach((choice, index) => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "review-answer-button";
        button.textContent = `${index + 1}. ${choice}`;

        button.addEventListener("click", () => {
            testAnswer(choice);
        });

        reviewAnswers.appendChild(button);
    });
}


/* =============================================================
   TEMP ANSWER TEST
   ============================================================= */

async function testAnswer(answer) {
    if (answerLocked) return;

    answerLocked = true;

    if (answer === currentCorrectAnswer) {
        await handleCorrectAnswer();
    } else {
        await handleWrongAnswer();
    }
}


/* =============================================================
   CORRECT
   ============================================================= */

async function handleCorrectAnswer() 
{
    try {
        const result = await markReviewCorrect(
            currentReviewItem.groupKey,
            currentReviewItem.questionId
        );

        console.log(
            "[REVIEW] CORRECT:",
            currentReviewItem.questionId,
            `${result.streak}/3`
        );

        if (result.mastered) {
            handleMastered();
            return;
        }

        currentReviewItem.correctStreak = result.streak;

        setTimeout(() => {nextQuestion();}, 500);
    }
    catch (error) {
        console.error("[REVIEW] Correct update failed:", error);
        answerLocked = false;
    }
}


/* =============================================================
   WRONG
   ============================================================= */

async function handleWrongAnswer() {
    try {
        await markReviewWrong(
            currentReviewItem.groupKey,
            currentReviewItem.questionId
        );

        console.log(
            "[REVIEW] WRONG:",
            currentReviewItem.questionId
        );

        currentReviewItem.correctStreak = 0;

        setTimeout(() => {
            nextQuestion();
        }, 700);
    }
    catch (error) {
        console.error("[REVIEW] Wrong update failed:", error);
        answerLocked = false;
    }
}


/* =============================================================
   MASTERED
   ============================================================= */

function handleMastered() {
    console.log("[REVIEW] MASTERED:",currentReviewItem.questionId);

    reviewPool.splice(currentIndex, 1);
    masteredCount++;

    reviewSessionInfo.textContent = `${masteredCount} / ${sessionTotal} MASTERED`;

    if (reviewPool.length === 0) 
    {
        showReviewComplete();
        return;
    }

    if (currentIndex >= reviewPool.length) 
    {
        currentIndex = 0;
    }

    setTimeout(() => {showReviewQuestion();}, 700);
}

/* =============================================================
   NEXT
   ============================================================= */

function nextQuestion() {
    if (reviewPool.length === 0) 
    {
        showReviewComplete();
        return;
    }

    currentIndex++;

    if (currentIndex >= reviewPool.length) 
    {
        currentIndex = 0;
    }

    showReviewQuestion();
}

/* =============================================================
   REVIEW COMPLETE
   ============================================================= */

function showReviewComplete() 
{
    stopSpeech();

    reviewQuestionLevel.textContent = "REVIEW COMPLETE";
    reviewStreak.textContent = "";
    reviewQuestion.textContent = "✓";
    reviewReading.textContent = `Bạn đã thuộc ${sessionTotal} từ!`;
    reviewAnswers.innerHTML = "";

    reviewSessionInfo.textContent =
        `${sessionTotal} / ${sessionTotal} MASTERED`;

    window.dispatchEvent(
        new CustomEvent("batlingo-review-changed")
    );
}

/* =============================================================
   AUDIO
   ============================================================= */

reviewQuestion?.addEventListener("click", () => {
    if (!currentQuestion || !currentReviewItem) return;

    if (isAudioMode(currentReviewItem.config.subMode)) {
        speakJapanese(currentQuestion.reading);
    }
});


function isAudioMode(subMode) {
    return (
        subMode === "audio_hiragana" ||
        subMode === "audio_meaning" ||
        subMode === "audio_kanji"
    );
}


/* =============================================================
   UTILITY
   ============================================================= */

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}