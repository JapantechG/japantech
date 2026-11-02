
import {
    getReviewItems,
    markReviewCorrect,
    markReviewWrong
} from "./user.js";

import {
    speakJapanese,
    stopSpeech
} from "./audio.js";

/* =========================================================
   BATLINGO REVIEW
   - Stable layout
   - One answer per row
   - Reserved explanation area
   - Hiragana after answering
   - Correct / wrong sounds
   - Japanese speech
   - Manual next
   - 3 correct answers = MASTERED
========================================================= */

const REVIEW_POOL_SIZE = 10;

let reviewItems = [];
let reviewPool = [];

let sessionTotal = 0;
let masteredCount = 0;
let currentIndex = 0;

let currentReviewItem = null;
let currentQuestion = null;
let currentCorrectAnswer = "";

let answerLocked = true;
let pendingMastered = false;
let answerSaved = false;

let pendingAnswer = null;
let sessionVersion = 0;
let speechTimer = null;

const databaseCache = Object.create(null);

/* =========================================================
   DOM REFERENCES
========================================================= */

const reviewScreen =
    document.getElementById("reviewScreen");

const reviewSessionInfo =
    document.getElementById("reviewSessionInfo");

const reviewQuestionLevel =
    document.getElementById("reviewQuestionLevel");

const reviewStreak =
    document.getElementById("reviewStreak");

const reviewQuestion =
    document.getElementById("reviewQuestion");

const reviewReading =
    document.getElementById("reviewReading");

const reviewAnswers =
    document.getElementById("reviewAnswers");

let reviewFeedback;
let reviewFeedbackStatus;
let reviewFeedbackWord;
let reviewFeedbackReading;
let reviewFeedbackMeaning;

let reviewActions;
let reviewListenButton;
let reviewNextButton;

/* =========================================================
   INITIALIZE EXTRA HTML

   Keep the original index.html structure.
   Create stable feedback/actions areas once.
========================================================= */

function initializeReviewUI() {

    if (!reviewScreen || !reviewAnswers) {
        console.error("[REVIEW] Required HTML missing.");
        return false;
    }

    const card = reviewAnswers.parentElement;

    if (!card) return false;

    // Remove legacy generated areas if present.
    card.querySelector("#reviewFeedback")?.remove();
    card.querySelector("#reviewActions")?.remove();

    reviewFeedback = document.createElement("div");
    reviewFeedback.id = "reviewFeedback";
    reviewFeedback.className = "review-feedback is-concealed";
    reviewFeedback.setAttribute("aria-live", "polite");

    const status = document.createElement("div");
    status.id = "reviewFeedbackStatus";
    status.className = "review-feedback-status";

    const content = document.createElement("div");
    content.className = "review-feedback-content";

    const word = document.createElement("div");
    word.id = "reviewFeedbackWord";
    word.className = "review-feedback-word";

    const reading = document.createElement("div");
    reading.id = "reviewFeedbackReading";
    reading.className = "review-feedback-reading";

    const meaning = document.createElement("div");
    meaning.id = "reviewFeedbackMeaning";
    meaning.className = "review-feedback-meaning";

    content.append(word, reading, meaning);
    reviewFeedback.append(status, content);

    reviewActions = document.createElement("div");
    reviewActions.id = "reviewActions";
    reviewActions.className =
        "review-actions is-concealed";

    reviewListenButton = document.createElement("button");
    reviewListenButton.id = "reviewListenButton";
    reviewListenButton.className = "review-listen-button";
    reviewListenButton.type = "button";
    reviewListenButton.textContent = "🔊 Nghe lại";

    reviewNextButton = document.createElement("button");
    reviewNextButton.id = "reviewNextButton";
    reviewNextButton.className = "review-next-button";
    reviewNextButton.type = "button";
    reviewNextButton.textContent = "Tiếp tục →";

    reviewActions.append(
        reviewListenButton,
        reviewNextButton
    );

    card.append(reviewFeedback, reviewActions);

    reviewFeedbackStatus = status;
    reviewFeedbackWord = word;
    reviewFeedbackReading = reading;
    reviewFeedbackMeaning = meaning;

    reviewListenButton.addEventListener(
        "click",
        () => playJapaneseAnswer()
    );

    reviewNextButton.addEventListener(
        "click",
        handleNextButton
    );

    reviewQuestion.addEventListener(
        "click",
        () => {
            if (currentQuestion) {
                playJapaneseAnswer();
            }
        }
    );

    return true;
}

const reviewUIReady = initializeReviewUI();

/* =========================================================
   START REVIEW
========================================================= */

export async function startReview() {

    if (!reviewUIReady) return false;

    const version = ++sessionVersion;

    cancelReviewSpeech();

    try {

        const items = await getReviewItems();

        if (version !== sessionVersion) {
            return false;
        }

        if (!Array.isArray(items) || items.length === 0) {
            console.log("[REVIEW] No review items.");
            return false;
        }

        reviewItems = [...items];

        shuffleArray(reviewItems);

        reviewPool = reviewItems.slice(
            0,
            REVIEW_POOL_SIZE
        );

        sessionTotal = reviewPool.length;
        masteredCount = 0;
        currentIndex = 0;

        currentReviewItem = null;
        currentQuestion = null;
        currentCorrectAnswer = "";

        answerLocked = true;
        answerSaved = false;
        pendingMastered = false;
        pendingAnswer = null;

        reviewScreen.classList.remove(
            "hidden",
            "review-complete"
        );

        updateSessionInfo();

        await showReviewQuestion();

        return true;

    } catch (error) {

        console.error("[REVIEW] Start error:", error);
        return false;
    }
}

/* =========================================================
   DATA FILE
========================================================= */

function getDataFile(config) {

    if (
        config.studyMode === "jlpt" &&
        config.category === "vocabulary"
    ) {
        return `data/${config.target}.json`;
    }

    if (
        config.studyMode === "jlpt" &&
        config.category === "grammar"
    ) {
        return `data/grammar/${config.target}.json`;
    }

    if (
        config.studyMode === "topic" &&
        config.category === "vocabulary"
    ) {
        return `data/topics/${config.target}.json`;
    }

    return null;
}

/* =========================================================
   LOAD DATABASE
========================================================= */

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
        throw new Error(`Failed to load: ${file}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error(`Invalid database: ${file}`);
    }

    databaseCache[file] = data;

    return data;
}

/* =========================================================
   SHOW QUESTION
========================================================= */

async function showReviewQuestion() {

    if (reviewPool.length === 0) {
        showReviewComplete();
        return;
    }

    const version = ++sessionVersion;

    cancelReviewSpeech();

    answerLocked = true;
    answerSaved = false;
    pendingMastered = false;
    pendingAnswer = null;

    currentReviewItem = reviewPool[currentIndex];

    currentQuestion = null;
    currentCorrectAnswer = "";

    resetReviewUI();

    try {

        const database = await loadDatabase(
            currentReviewItem.config
        );

        if (version !== sessionVersion) return;

        currentQuestion = database.find(item =>
            String(item.id) ===
            String(currentReviewItem.questionId)
        );

        if (!currentQuestion) {
            throw new Error(
                "Question not found: " +
                currentReviewItem.questionId
            );
        }

        renderQuestion(database);

        answerLocked = false;

    } catch (error) {

        if (version !== sessionVersion) return;

        console.error("[REVIEW] Load question:", error);

        reviewQuestion.textContent = "⚠";
        reviewAnswers.innerHTML = "";

        showSystemMessage(
            "Không tải được câu hỏi. Bấm Tiếp tục để bỏ qua."
        );
    }
}

/* =========================================================
   RESET UI WITHOUT LAYOUT SHIFT
========================================================= */

function resetReviewUI() {

    reviewScreen.classList.remove("review-complete");

    reviewQuestionLevel.textContent = "";

    reviewStreak.className = "review-streak";

    reviewStreak.textContent =
        `${currentReviewItem?.correctStreak || 0} / 3`;

    reviewQuestion.textContent = "";

    reviewReading.textContent = "";
    reviewReading.classList.add("is-concealed");

    reviewAnswers.innerHTML = "";

    reviewFeedback.className =
        "review-feedback is-concealed";

    reviewFeedbackStatus.textContent = "";
    reviewFeedbackWord.textContent = "";
    reviewFeedbackReading.textContent = "";
    reviewFeedbackMeaning.textContent = "";

    reviewFeedbackMeaning.scrollTop = 0;

    reviewActions.className =
        "review-actions is-concealed";

    reviewListenButton.disabled = false;
    reviewListenButton.classList.remove("is-hidden");

    reviewNextButton.disabled = false;
    reviewNextButton.textContent = "Tiếp tục →";
}

/* =========================================================
   RENDER QUESTION
========================================================= */

function renderQuestion(database) {

    const config = currentReviewItem.config;
    const subMode = config.subMode;

    reviewQuestionLevel.textContent =
        `${String(config.target).toUpperCase()} · ` +
        `${String(config.category).toUpperCase()}`;

    let text = "";

    switch (subMode) {

        case "grammar_meaning":
        case "grammar_sentence":
            text = currentQuestion.grammar;
            break;

        case "kanji_hiragana":
            text = currentQuestion.word;
            break;

        case "hiragana_meaning":
            text = currentQuestion.reading;
            break;

        case "meaning_kanji":
            text = currentQuestion.meaning;
            break;

        case "audio_hiragana":
        case "audio_meaning":
        case "audio_kanji":
            text = "🔊";
            break;

        default:
            text = currentQuestion.word;
            break;
    }

    reviewQuestion.textContent = text || "QUESTION";

    const choices = generateChoices(database);

    renderChoices(choices);

    // Audio questions speak when shown.
    if (isAudioMode(subMode)) {
        scheduleJapaneseSpeech(200);
    }
}

/* =========================================================
   GENERATE CHOICES
========================================================= */

function generateChoices(database) {

    const subMode = currentReviewItem.config.subMode;

    if (subMode === "grammar_sentence") {
        return generateGrammarSentenceChoices(database);
    }

    const field = getAnswerField(subMode);

    const answer = currentQuestion[field];

    if (answer === undefined || answer === null) {
        throw new Error("Correct answer missing.");
    }

    currentCorrectAnswer = String(answer);

    const wrongAnswers = database
        .filter(item =>
            String(item.id) !==
            String(currentQuestion.id)
        )
        .map(item => item[field])
        .filter(value =>
            value !== undefined &&
            value !== null &&
            String(value).trim() !== ""
        )
        .map(String)
        .filter(value =>
            value !== currentCorrectAnswer
        );

    const uniqueWrong = [...new Set(wrongAnswers)];

    shuffleArray(uniqueWrong);

    const choices = [
        currentCorrectAnswer,
        ...uniqueWrong.slice(0, 3)
    ];

    shuffleArray(choices);

    return choices;
}

/* =========================================================
   GRAMMAR SENTENCE CHOICES
========================================================= */

function generateGrammarSentenceChoices(database) {

    const examples = currentQuestion.examples ?? [];

    const sentences = examples
        .map(example => example?.sentence)
        .filter(Boolean);

    if (sentences.length === 0) {
        throw new Error("Grammar examples missing.");
    }

    currentCorrectAnswer = String(
        sentences[Math.floor(Math.random() * sentences.length)]
    );

    const wrongAnswers = database
        .filter(item =>
            String(item.id) !==
            String(currentQuestion.id)
        )
        .flatMap(item => item.examples ?? [])
        .map(example => example?.sentence)
        .filter(Boolean)
        .map(String)
        .filter(value =>
            value !== currentCorrectAnswer
        );

    const uniqueWrong = [...new Set(wrongAnswers)];

    shuffleArray(uniqueWrong);

    const choices = [
        currentCorrectAnswer,
        ...uniqueWrong.slice(0, 3)
    ];

    shuffleArray(choices);

    return choices;
}

/* =========================================================
   ANSWER FIELD
========================================================= */

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

/* =========================================================
   RENDER CHOICES
   ONE ANSWER PER ROW
========================================================= */

function renderChoices(choices) {

    reviewAnswers.innerHTML = "";

    choices.forEach((choice, index) => {

        const button = document.createElement("button");

        button.type = "button";
        button.className = "review-answer-button";
        button.dataset.answer = String(choice);

        const number = document.createElement("span");
        number.className = "review-answer-number";
        number.textContent = String(index + 1);

        const answerText = document.createElement("span");
        answerText.className = "review-answer-text";
        answerText.textContent = String(choice);

        button.append(number, answerText);

        button.addEventListener("click", () => {
            testAnswer(String(choice), button);
        });

        reviewAnswers.appendChild(button);
    });
}

/* =========================================================
   SELECT ANSWER
========================================================= */

async function testAnswer(answer, selectedButton) {

    if (answerLocked) return;

    answerLocked = true;
    answerSaved = false;

    const correct = answer === currentCorrectAnswer;

    pendingAnswer = {
        correct,
        groupKey: currentReviewItem.groupKey,
        questionId: currentReviewItem.questionId
    };

    disableAnswers();

    if (correct) {
        selectedButton.classList.add("correct");
    } else {
        selectedButton.classList.add("wrong");
        highlightCorrectAnswer();
    }

    showAnswerFeedback(correct);

    // Sound effect followed by Japanese pronunciation.
    cancelReviewSpeech();
    playResultSound(correct);
    scheduleJapaneseSpeech(340);

    reviewNextButton.disabled = true;
    reviewNextButton.textContent = "Đang lưu...";

    await saveReviewAnswer();
}

/* =========================================================
   SAVE ANSWER
   Retain original Firebase functions
========================================================= */

async function saveReviewAnswer() {

    if (!pendingAnswer) return;

    const version = sessionVersion;
    const data = pendingAnswer;

    reviewNextButton.disabled = true;
    reviewNextButton.textContent = "Đang lưu...";

    try {

        if (data.correct) {

            const result = await markReviewCorrect(
                data.groupKey,
                data.questionId
            );

            if (version !== sessionVersion) return;

            const streak = Number(result?.streak) || 0;

            currentReviewItem.correctStreak = streak;

            pendingMastered = Boolean(result?.mastered);

            if (pendingMastered) {

                reviewStreak.textContent = "✓ MASTERED";
                reviewStreak.className =
                    "review-streak mastered";

                reviewFeedbackStatus.textContent =
                    "🎉 MASTERED! Đã ghi nhớ thành công.";

            } else {

                reviewStreak.textContent =
                    `✓ ${streak} / 3`;

                reviewStreak.className =
                    "review-streak correct";
            }

        } else {

            await markReviewWrong(
                data.groupKey,
                data.questionId
            );

            if (version !== sessionVersion) return;

            currentReviewItem.correctStreak = 0;

            reviewStreak.textContent = "✕ 0 / 3";
            reviewStreak.className = "review-streak wrong";
        }

        answerSaved = true;

        reviewNextButton.disabled = false;
        reviewNextButton.textContent = "Tiếp tục →";

        window.dispatchEvent(
            new CustomEvent("batlingo-review-changed")
        );

    } catch (error) {

        if (version !== sessionVersion) return;

        console.error("[REVIEW] Save failed:", error);

        answerSaved = false;

        reviewFeedbackStatus.textContent =
            "⚠ Không lưu được. Hãy thử lại.";

        reviewNextButton.disabled = false;
        reviewNextButton.textContent = "Thử lưu lại";
    }
}

/* =========================================================
   DISABLE ANSWERS
========================================================= */

function disableAnswers() {

    reviewAnswers
        .querySelectorAll(".review-answer-button")
        .forEach(button => {
            button.disabled = true;
        });
}

/* =========================================================
   HIGHLIGHT CORRECT ANSWER
========================================================= */

function highlightCorrectAnswer() {

    reviewAnswers
        .querySelectorAll(".review-answer-button")
        .forEach(button => {

            if (
                button.dataset.answer ===
                currentCorrectAnswer
            ) {
                button.classList.add("correct");
            }
        });
}

/* =========================================================
   FEEDBACK
========================================================= */

function showAnswerFeedback(correct) {

    const question = currentQuestion;
    const config = currentReviewItem.config;

    const isGrammar = config.category === "grammar";

    const word = isGrammar
        ? question.grammar
        : question.word;

    const reading = question.reading || "";
    const meaning = question.meaning || "";

    reviewFeedback.className =
        "review-feedback " +
        (correct ? "correct" : "wrong");

    reviewFeedbackStatus.textContent = correct
        ? "✓ Chính xác!"
        : "✕ Chưa chính xác!";

    reviewFeedbackWord.textContent = word || "";
    reviewFeedbackReading.textContent = reading;

    reviewFeedbackMeaning.textContent = meaning;

    // For grammar sentence mode, show the sentence too.
    if (config.subMode === "grammar_sentence") {

        const sentence = currentCorrectAnswer;

        reviewFeedbackMeaning.textContent = meaning
            ? `${meaning}\n${sentence}`
            : sentence;
    }

    // Reveal the reading only after answering.
    reviewReading.textContent = reading;
    reviewReading.classList.toggle(
        "is-concealed",
        !reading
    );

    // Only reveal controls; never change their layout space.
    reviewActions.classList.remove("is-concealed");

    reviewListenButton.disabled = false;
    reviewNextButton.disabled = true;
}

/* =========================================================
   DISPLAY SYSTEM ERROR
========================================================= */

function showSystemMessage(message) {

    reviewFeedback.className = "review-feedback wrong";

    reviewFeedbackStatus.textContent = "⚠ REVIEW";
    reviewFeedbackWord.textContent = "";
    reviewFeedbackReading.textContent = "";
    reviewFeedbackMeaning.textContent = message;

    reviewActions.classList.remove("is-concealed");

    reviewListenButton.classList.add("is-hidden");

    reviewNextButton.disabled = false;
    reviewNextButton.textContent = "Tiếp tục →";

    answerLocked = true;
    answerSaved = false;
    pendingAnswer = null;
}

/* =========================================================
   NEXT BUTTON
========================================================= */

function handleNextButton() {

    if (reviewNextButton.disabled) return;

    // Retry saving rather than losing the result.
    if (pendingAnswer && !answerSaved) {
        saveReviewAnswer();
        return;
    }

    cancelReviewSpeech();

    if (pendingMastered) {

        handleMastered();

    } else {

        nextQuestion();
    }
}

/* =========================================================
   MASTERED
========================================================= */

function handleMastered() {

    if (!pendingMastered) return;

    reviewPool.splice(currentIndex, 1);

    masteredCount++;

    pendingMastered = false;
    pendingAnswer = null;

    updateSessionInfo();

    if (reviewPool.length === 0) {
        showReviewComplete();
        return;
    }

    if (currentIndex >= reviewPool.length) {
        currentIndex = 0;
    }

    showReviewQuestion();
}

/* =========================================================
   NEXT QUESTION
========================================================= */

function nextQuestion() {

    if (reviewPool.length === 0) {
        showReviewComplete();
        return;
    }

    currentIndex++;

    if (currentIndex >= reviewPool.length) {
        currentIndex = 0;
    }

    showReviewQuestion();
}

/* =========================================================
   SESSION INFO
========================================================= */

function updateSessionInfo() {

    reviewSessionInfo.textContent =
        `${masteredCount} / ${sessionTotal} MASTERED`;
}

/* =========================================================
   COMPLETE
========================================================= */

function showReviewComplete() {

    ++sessionVersion;

    cancelReviewSpeech();

    answerLocked = true;
    answerSaved = false;
    pendingMastered = false;
    pendingAnswer = null;

    currentQuestion = null;
    currentReviewItem = null;

    reviewScreen.classList.add("review-complete");

    reviewQuestionLevel.textContent =
        "REVIEW COMPLETE";

    reviewStreak.textContent = "";

    reviewQuestion.textContent = "🏆";

    reviewReading.textContent =
        `Bạn đã thuộc ${sessionTotal} câu!`;

    reviewReading.classList.remove("is-concealed");

    reviewAnswers.innerHTML = "";

    reviewFeedback.className =
        "review-feedback is-concealed";

    reviewActions.className =
        "review-actions is-concealed";

    reviewSessionInfo.textContent =
        `${sessionTotal} / ${sessionTotal} MASTERED`;

    window.dispatchEvent(
        new CustomEvent("batlingo-review-changed")
    );
}

/* =========================================================
   JAPANESE PRONUNCIATION
========================================================= */

function getJapaneseSpeechText() {

    if (!currentQuestion || !currentReviewItem) {
        return "";
    }

    const config = currentReviewItem.config;
    const question = currentQuestion;

    if (config.category === "grammar") {

        if (config.subMode === "grammar_sentence") {
            return currentCorrectAnswer || "";
        }

        return (
            question.reading ||
            question.grammar ||
            ""
        );
    }

    return (
        question.reading ||
        question.word ||
        ""
    );
}

function playJapaneseAnswer() {

    const text = getJapaneseSpeechText();

    if (!text) return;

    if (speechTimer !== null) {
        clearTimeout(speechTimer);
        speechTimer = null;
    }

    try {

        stopSpeech();
        speakJapanese(text);

    } catch (error) {

        console.warn("[REVIEW] Speech error:", error);
    }
}

function scheduleJapaneseSpeech(delay) {

    if (speechTimer !== null) {
        clearTimeout(speechTimer);
    }

    const version = sessionVersion;

    speechTimer = setTimeout(() => {

        speechTimer = null;

        if (version !== sessionVersion) return;

        if (!reviewScreen.classList.contains("hidden")) {
            playJapaneseAnswer();
        }

    }, delay);
}

function cancelReviewSpeech() {

    if (speechTimer !== null) {
        clearTimeout(speechTimer);
        speechTimer = null;
    }

    stopSpeech();
}

/* =========================================================
   CORRECT / WRONG SOUND EFFECTS
========================================================= */

let reviewAudioContext = null;

function playResultSound(correct) {

    try {

        const Context =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!Context) return;

        if (!reviewAudioContext) {
            reviewAudioContext = new Context();
        }

        const context = reviewAudioContext;

        if (context.state === "suspended") {
            context.resume().catch(() => {});
        }

        const now = context.currentTime;

        if (correct) {

            playTone(context, 660, now, 0.10);
            playTone(context, 880, now + 0.12, 0.16);

        } else {

            playTone(context, 330, now, 0.13);
            playTone(context, 220, now + 0.15, 0.19);
        }

    } catch (error) {
        console.warn("[REVIEW] Sound error:", error);
    }
}

function playTone(context, frequency, start, duration) {

    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = "sine";
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(0.0001, start);

    gain.gain.exponentialRampToValueAtTime(
        0.075,
        start + 0.015
    );

    gain.gain.exponentialRampToValueAtTime(
        0.0001,
        start + duration
    );

    oscillator.connect(gain);
    gain.connect(context.destination);

    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
}

/* =========================================================
   AUDIO MODE
========================================================= */

function isAudioMode(subMode) {

    return (
        subMode === "audio_hiragana" ||
        subMode === "audio_meaning" ||
        subMode === "audio_kanji"
    );
}

/* =========================================================
   SHUFFLE
========================================================= */

function shuffleArray(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [array[i], array[j]] =
            [array[j], array[i]];
    }
}
