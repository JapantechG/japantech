/* =============================================================
   BATLINGO - FLASHCARD
   ============================================================= */

import {
    isAudioMode,
    getQuestionText,
    getFlashcardBack,
    shuffleQuestions
}
from "./question.js";

import {
    speakJapanese,
    stopSpeech,
    playSfx
}
from "./audio.js";


import {
    getFlashcardDeckId,
    loadFlashcardRatings,
    saveFlashcardRating,
    getFilteredFlashcardCards,
    getFlashcardFilterCounts
} from "./flashcard-rating-data.js";

import {
    startPractice
} from "./solo/solo-practice.js";


/* =============================================================
   STATE
   ============================================================= */

let flashcardDatabase = [];

let flashcardCards = [];

let flashcardConfig = null;

let flashcardIndex = 0;

let flashcardRevealed = false;

let flashcardActive = false;

let flashcardAutoMode = false;

let flashcardAutoTimer = null;

let flashcardAutoEndIndex = 0;

let flashcardAgainCards = [];


/* =========================================
   FLASHCARD FILTER STATE
========================================= */

let flashcardDeckId = "";

let flashcardRatings = {};

let flashcardCurrentFilter = "all";

let flashcardQuizOpen = false;

// Bảo vệ callback async khi đổi deck.
let flashcardLoadToken = 0;

// Bảo vệ audio sau khi chuyển card.
let flashcardCardToken = 0;

// Khóa các lần lưu cùng một card.
let flashcardRatingLocked = false;


let flashcardSwipeStartX = 0;
let flashcardSwipeStartY = 0;
let flashcardSwipeX = 0;
let flashcardSwiping = false;
let flashcardDidSwipe = false;

const FLASHCARD_SWIPE_THRESHOLD = 80;

/* =============================================================
   DOM
   ============================================================= */

const flashcardScreen =document.getElementById("flashcardScreen");

const flashcardLevel =document.getElementById("flashcardLevel");

const flashcardProgress =document.getElementById("flashcardProgress");

const flashcard =document.getElementById("flashcard");

const flashcardFront =document.getElementById("flashcardFront");

const flashcardBack =document.getElementById("flashcardBack");

const flashcardQuestion =document.getElementById("flashcardQuestion");

const flashcardPrimary =document.getElementById("flashcardPrimary");

const flashcardSecondary =document.getElementById("flashcardSecondary");

const flashcardExtra =document.getElementById("flashcardExtra");

const flashcardRating =document.getElementById("flashcardRating");

const flashcardAutoButton =document.getElementById("flashcardAutoButton");

/* =============================================================
   INIT
   ============================================================= */


export async function initFlashcard(config)
{
    const loadToken = ++flashcardLoadToken;

    stopFlashcardAuto();

    flashcardConfig = {...config};

    flashcardIndex = 0;
    flashcardRevealed = false;
    flashcardActive = false;
    flashcardQuizOpen = false;
    flashcardRatingLocked = false;

    flashcardCurrentFilter = "all";
    flashcardDeckId = getFlashcardDeckId(config);
    flashcardRatings = {};
    flashcardCards = [];

    ++flashcardCardToken;

    flashcardScreen?.classList.remove("hidden");

    document.getElementById("flashcardQuizOptions")
        ?.classList.add("hidden");

    try {

        await loadFlashcardDatabase(config);

        if (loadToken !== flashcardLoadToken) {
            return;
        }

        flashcardRatings = await loadFlashcardRatings(
            flashcardDeckId
        );

        if (loadToken !== flashcardLoadToken) {
            return;
        }

        flashcardActive = true;

        if (flashcardLevel) {

            flashcardLevel.textContent =
                `${config.target.toUpperCase()} - ` +
                `${config.category.toUpperCase()}`;
        }

        selectFlashcardFilter("all");

        updateAutoButton();

    } catch (error) {

        if (loadToken !== flashcardLoadToken) {
            return;
        }

        console.error("[FLASHCARD] Init failed:", error);

        flashcardActive = false;

        alert("Cannot load Flashcard database.");

        closeFlashcard();

        window.dispatchEvent(
            new Event("batlingo-flashcard-close")
        );
    }
}



/* =============================================================
   DATABASE
   ============================================================= */

async function loadFlashcardDatabase(config) 
{
    let file = null;

    if (config.studyMode === "jlpt" && config.category === "vocabulary") 
    {
        file = `data/${config.target.toLowerCase()}.json`;
    }
    else if (config.studyMode === "jlpt" && config.category === "grammar") 
    {
        file = `data/grammar/${config.target.toLowerCase()}.json`;
    }
    else if (config.studyMode === "topic" && config.category === "vocabulary") 
    {
        file = `data/topics/${config.target.toLowerCase()}.json`;
    }

    if (!file) 
    {
        throw new Error("FLASHCARD_DATABASE_NOT_FOUND");
    }

    console.log("[FLASHCARD] Loading:", file);

    const response = await fetch(file);

    if (!response.ok) 
    {
        throw new Error(`FLASHCARD_DATABASE_LOAD_FAILED: ${file}`);
    }

    flashcardDatabase = await response.json();

    console.log("[FLASHCARD] Database loaded:",config.studyMode,config.target,config.category,flashcardDatabase.length);
}


/* =========================================================
   FILTER COUNTS
========================================================= */

function updateFlashcardFilterCounts()
{
    const counts = getFlashcardFilterCounts(
        flashcardDatabase,
        flashcardRatings
    );

    const ids = {
        all: "fcCountAll",
        again: "fcCountAgain",
        hard: "fcCountHard",
        good: "fcCountGood",
        easy: "fcCountEasy"
    };

    for (const [filter, id] of Object.entries(ids)) {

        const element = document.getElementById(id);

        if (element) {
            element.textContent = counts[filter] || 0;
        }
    }
}

/* =========================================================
   SELECT FILTER
========================================================= */

function selectFlashcardFilter(filter)
{
    if (!flashcardConfig || !flashcardActive) {
        return;
    }

    const valid = [
        "all",
        "again",
        "hard",
        "good",
        "easy"
    ];

    if (!valid.includes(filter)) {
        return;
    }

    stopFlashcardAuto();

    flashcardCurrentFilter = filter;

    flashcardQuizOpen = false;

    document.getElementById("flashcardQuizOptions")
        ?.classList.add("hidden");

    ++flashcardCardToken;

    const filtered = getFilteredFlashcardCards(
        flashcardDatabase,
        flashcardRatings,
        filter
    );

    flashcardCards = shuffleQuestions([...filtered]);

    flashcardIndex = 0;

    flashcardRevealed = false;
    flashcardRatingLocked = false;

    updateFlashcardFilterCounts();

    document.querySelectorAll(
        "#flashcardFilters [data-fc-filter]"
    ).forEach(button => {

        const active =
            button.dataset.fcFilter === filter;

        button.classList.toggle("active", active);
    });

    const empty = flashcardCards.length === 0;

    document.getElementById("flashcard")
        ?.classList.toggle("hidden", empty);

    document.getElementById("flashcardRating")
        ?.classList.add("hidden");

    document.getElementById("flashcardEmptyMessage")
        ?.classList.toggle("hidden", !empty);

    const quizButton =
        document.getElementById("flashcardCreateQuizBtn");

    if (quizButton) {
        quizButton.disabled = empty;
    }

    if (empty) {

        stopSpeech();

        if (flashcardProgress) {
            flashcardProgress.textContent = "0 / 0";
        }

        return;
    }

    showFlashcard();
}

/* =========================================================
   FILTER BUTTON EVENTS
========================================================= */

document.querySelectorAll(
    "#flashcardFilters [data-fc-filter]"
).forEach(button => {

    button.addEventListener("click", () => {

        if (!flashcardActive) {
            return;
        }

        selectFlashcardFilter(
            button.dataset.fcFilter
        );
    });
});


/* =============================================================
   SHOW CARD
   ============================================================= */


function showFlashcard()
{
    if (!flashcardActive || flashcardCards.length === 0)
    {
        return;
    }

    ++flashcardCardToken;

    const cardToken = flashcardCardToken;

    flashcardRatingLocked = false;

    stopSpeech();


    /*
        Nếu hết deck
        quay về đầu.

        Sau này có thể thay bằng
        Flashcard Result.
    */

    if (flashcardIndex >= flashcardCards.length)
    {
        flashcardIndex = 0;

        flashcardCards =shuffleQuestions(flashcardCards);
    }

    const data = flashcardCards[flashcardIndex];

    flashcardRevealed = false;

    /*
        Progress
    */

    if (flashcardProgress)
    {
        flashcardProgress.textContent = `${flashcardIndex + 1} / ${flashcardCards.length}`;
    }

    /*
        FRONT
    */
    const question = getQuestionText(data,flashcardConfig.subMode,flashcardConfig.category);

    if (flashcardQuestion)
    {
        flashcardQuestion.textContent = question;
    }

    /*
        BACK
    */

   const back = getFlashcardBack(data,flashcardConfig.subMode,flashcardConfig.category);

    if (flashcardPrimary)
    {
        flashcardPrimary.textContent = back.primary;
    }

    if (flashcardSecondary)
    {
        flashcardSecondary.textContent = back.secondary;
    }

    if (flashcardExtra)
    {
        flashcardExtra.textContent = back.extra;
    }

    /*
        Hiện Front
    */

    flashcardFront?.classList.remove("hidden");

    flashcardBack?.classList.add("hidden");

    flashcardRating?.classList.add("hidden");

    /*
        Audio mode:
        tự đọc 1 lần
    */

    if (isAudioMode(flashcardConfig.subMode))
    {
        setTimeout(() =>
            {
                if (
                         flashcardActive &&
                         !flashcardRevealed &&
                         cardToken === flashcardCardToken
                     )
                {
                    speakJapanese(data.reading);
                }
            },
            200
        );
    }
}


/* =============================================================
   REVEAL
   ============================================================= */

function toggleFlashcard()
{
    if (!flashcardActive)
    {
        return;
    }

    const data = flashcardCards[flashcardIndex];

    if (!data)
    {
        return;
    }

    /* =====================================================
       FRONT → BACK
       ===================================================== */

    if (!flashcardRevealed)
    {
        flashcardRevealed = true;

        /*
            Ẩn FRONT
        */

        flashcardFront?.classList.add("hidden");

        /*
            Hiện BACK
        */

        flashcardBack?.classList.remove("hidden");

        /*
            Hiện rating
        */

        flashcardRating?.classList.remove("hidden");

        /*
            Dừng audio cũ trước
        */

        stopSpeech();

        /*
            Lật sang BACK
            → tự đọc đúng 1 lần
        */

        setTimeout(() =>
            {
                if (flashcardActive && flashcardRevealed && data.reading)
                {
                    speakJapanese(data.reading);
                }
            },
            150
        );


        return;
    }


    /* =====================================================
       BACK → FRONT
       ===================================================== */

    flashcardRevealed = false;

    stopSpeech();

    /*
        Ẩn BACK
    */

    flashcardBack?.classList.add("hidden");

    /*
        Hiện FRONT
    */

    flashcardFront?.classList.remove("hidden");

    /*
        Ẩn rating
    */

    flashcardRating?.classList.add("hidden");
}
/* =============================================================
   NEXT CARD
   ============================================================= */


function nextFlashcard(rating)
{
    if (
        !flashcardActive ||
        !flashcardRevealed ||
        flashcardAutoMode ||
        flashcardRatingLocked
    ) {
        return;
    }

    const currentCard =
        flashcardCards[flashcardIndex];

    if (!currentCard) {
        return;
    }

    if (
        currentCard.id === undefined ||
        currentCard.id === null
    ) {
        console.warn(
            "[FLASHCARD] Card has no ID:",
            currentCard
        );
        return;
    }

    flashcardRatingLocked = true;

    const cardId = String(currentCard.id);

    // Lưu trạng thái cuối cùng.
    saveFlashcardRating(
        flashcardDeckId,
        cardId,
        rating,
        flashcardRatings
    ).catch(error => {

        console.error(
            "[FLASHCARD] Rating sync failed:",
            error
        );
    });

    // Cập nhật số lượng ngay lập tức.
    updateFlashcardFilterCounts();

    console.log(
        "[FLASHCARD] Latest rating:",
        cardId,
        rating
    );

    // Giữ hành vi AGAIN của Flashcard cũ:
    // từ xuất hiện lại cuối phiên học.
    if (
        rating === "again" &&
        flashcardCurrentFilter === "all"
    ) {
        flashcardCards.push(currentCard);
    }

    // Trong Filter cụ thể, không thêm bản sao.
    flashcardIndex++;

    showFlashcard();
}



/* =============================================================
   AUDIO REPLAY
   ============================================================= */

function replayFlashcardAudio()
{
    if (!flashcardActive || !flashcardConfig)
    {
        return;
    }

    const data =flashcardCards[flashcardIndex];

    if (!data)
    {
        return;
    }

    speakJapanese(data.reading);
}


/* =============================================================
   CLOSE
   ============================================================= */


export function closeFlashcard()
{
    ++flashcardLoadToken;
    ++flashcardCardToken;

    stopFlashcardAuto();

    flashcardActive = false;
    flashcardRevealed = false;
    flashcardRatingLocked = false;

    flashcardQuizOpen = false;

    stopSpeech();

    flashcardScreen?.classList.add("hidden");

    document.getElementById("flashcardQuizOptions")
        ?.classList.add("hidden");
}


/* =============================================================
   MOBILE SWIPE
   ============================================================= */

flashcard?.addEventListener("pointerdown", event => {
    if (!flashcardActive || flashcardAutoMode) return;
    if (event.pointerType === "mouse") return;

    flashcardSwipeStartX = event.clientX;
    flashcardSwipeStartY = event.clientY;
    flashcardSwipeX = event.clientX;
    flashcardSwiping = true;
    flashcardDidSwipe = false;

    flashcard.setPointerCapture(event.pointerId);
});

flashcard?.addEventListener("pointermove", event => {
    if (!flashcardSwiping) return;

    const deltaX = event.clientX - flashcardSwipeStartX;
    const deltaY = event.clientY - flashcardSwipeStartY;

    if (Math.abs(deltaY) > Math.abs(deltaX)) return;

    flashcardSwipeX = event.clientX;

    const rotate = Math.max(-10, Math.min(10, deltaX / 20));
    flashcard.style.transition = "none";
    flashcard.style.transform = `translateX(${deltaX}px) rotate(${rotate}deg)`;
});

flashcard?.addEventListener("pointerup", event => {
    if (!flashcardSwiping) return;

    flashcardSwiping = false;

    const deltaX = event.clientX - flashcardSwipeStartX;
    const deltaY = event.clientY - flashcardSwipeStartY;

    if (Math.abs(deltaX) <= Math.abs(deltaY)) {
        resetFlashcardSwipe();
        return;
    }

    if (deltaX >= FLASHCARD_SWIPE_THRESHOLD) {
        finishFlashcardSwipe("right");
        return;
    }

    if (deltaX <= -FLASHCARD_SWIPE_THRESHOLD) {
        finishFlashcardSwipe("left");
        return;
    }

    resetFlashcardSwipe();
});

flashcard?.addEventListener("pointercancel", () => {
    if (!flashcardSwiping) return;

    flashcardSwiping = false;
    resetFlashcardSwipe();
});

/* =============================================================
   EVENTS
   ============================================================= */

flashcard?.addEventListener("click",event =>
    {
        /*
            Bấm nút 🔊
            → chỉ đọc lại
            → không flip card
        */

        if (event.target.closest("[data-flashcard-audio]"))
        {
            event.stopPropagation();

            replayFlashcardAudio();

            return;
        }


        /*
            Click card
            → flip qua / lại
        */

       if (flashcardDidSwipe) 
       {
             flashcardDidSwipe = false;
             return;
         }

        toggleFlashcard();
    }
);


/*
    AGAIN
*/

document.getElementById("flashcardAgain")?.addEventListener("click",event =>
        {
            event.stopPropagation();
           
            nextFlashcard("again");
        }
    );


/*
    HARD
*/

document.getElementById("flashcardHard")?.addEventListener("click",event =>
        {
            event.stopPropagation();

            nextFlashcard("hard");
        }
    );


/*
    GOOD
*/

document.getElementById("flashcardGood")?.addEventListener("click",event =>
        {
            event.stopPropagation();

            nextFlashcard("good");
        }
    );


/*
    EASY
*/

document.getElementById("flashcardEasy")?.addEventListener("click",event =>
        {
            event.stopPropagation();

            nextFlashcard("easy");
        }
    );

document.getElementById("flashcardBackButton")?.addEventListener("click",event =>
        {
            event.stopPropagation();

            closeFlashcard();

            window.dispatchEvent(new CustomEvent("batlingo-flashcard-close"));
        }
    );

function startFlashcardAuto()
{
    if (!flashcardActive || flashcardCards.length === 0 || flashcardAutoMode)
    {
        return;
    }

    flashcardAutoMode = true;


    /*
        Ghi lại số card ban đầu.

        AUTO chỉ chạy đến card cuối
        của deck hiện tại.
    */

    flashcardAutoEndIndex = flashcardCards.length;

    console.log("[FLASHCARD] AUTO START:",flashcardAutoEndIndex);

    runFlashcardAuto();
}

function runFlashcardAuto()
{
    if (!flashcardActive || !flashcardAutoMode)
    {
        return;
    }


    /*
        Đã đi qua card cuối
        → STOP
    */

    if (flashcardIndex >= flashcardAutoEndIndex)
    {
        finishFlashcardAuto();

        return;
    }


    /*
        FRONT đang hiện.

        Cho người dùng nhìn từ
        trong 1.5 giây.
    */

    flashcardAutoTimer = setTimeout(() =>
            {
                if (!flashcardAutoMode)
                {
                    return;
                }

                /*
                    FRONT → BACK

                    toggleFlashcard()
                    đồng thời tự đọc.
                */

                toggleFlashcard();

                /*
                    Cho xem BACK 3 giây
                    rồi chuyển card.
                */

                flashcardAutoTimer =setTimeout(() =>
                        {
                            autoNextFlashcard();
                        },
                        3000
                    );
            },
            3000
        );
}

function autoNextFlashcard() {
    if (!flashcardAutoMode || !flashcardActive) return;

    flashcard.style.transition = "transform 0.2s ease";
    flashcard.style.transform = `translateX(-${window.innerWidth}px) rotate(-15deg)`;

    setTimeout(() => {
        flashcardIndex++;

        flashcard.style.transition = "none";
        flashcard.style.transform = "";

        if (flashcardIndex >= flashcardAutoEndIndex) 
        {
            finishFlashcardAuto();
            return;
        }

        showFlashcard();

        requestAnimationFrame(() => {flashcard.style.transition = "";});

        runFlashcardAuto();
    }, 200);
}


function finishFlashcardAuto()
{
    clearTimeout(flashcardAutoTimer);

    flashcardAutoTimer = null;

    flashcardAutoMode = false;

    stopSpeech();

    ++flashcardCardToken;

    console.log("[FLASHCARD] AUTO FINISHED");

    // Không sửa Rating.
    // Không chuyển deck sang AGAIN.

    flashcardIndex = 0;

    if (
        flashcardActive &&
        flashcardCards.length > 0
    ) {
        showFlashcard();
    }

    updateAutoButton();
}


flashcardAutoButton?.addEventListener("click",event =>
        {
            event.stopPropagation();

            if (flashcardAutoMode)
            {
                stopFlashcardAuto();

                return;
            }

            startFlashcardAuto();

            updateAutoButton();
        }
    );

function stopFlashcardAuto()
{
    flashcardAutoMode = false;

    clearTimeout(flashcardAutoTimer);

    flashcardAutoTimer = null;

    stopSpeech();

    updateAutoButton();
}

function updateAutoButton()
{
    if (!flashcardAutoButton)
    {
        return;
    }

    const icon = document.getElementById("flashcardAutoIcon");

    const text = document.getElementById("flashcardAutoText");

      if (flashcardAutoMode)
    {
        flashcardAutoButton.classList.add("running");

        if (icon)
        {
            icon.textContent = "■";
        }

        if (text)
        {
            text.textContent = "STOP";
        }
    }
    else
    {
        flashcardAutoButton.classList.remove("running");

        if (icon)
        {
            icon.textContent = "▶";
        }

        if (text)
        {
            text.textContent = "AUTO";
        }
    }
}

/* =============================================================
   SWIPE NAVIGATION
   ============================================================= */

function swipeNextFlashcard() {
    if (!flashcardActive || flashcardCards.length === 0) return;

    flashcardIndex++;

    if (flashcardIndex >= flashcardCards.length) {
        flashcardIndex = 0;
    }

    showFlashcard();
}

function swipePreviousFlashcard() {
    if (!flashcardActive || flashcardCards.length === 0) return;

    flashcardIndex--;

    if (flashcardIndex < 0) {
        flashcardIndex = flashcardCards.length - 1;
    }

    showFlashcard();
}

function resetFlashcardSwipe() {
    flashcard.style.transition = "transform 0.2s ease";
    flashcard.style.transform = "";

    setTimeout(() => {flashcard.style.transition = "";}, 200);
}

function finishFlashcardSwipe(direction) 
{
    flashcardDidSwipe = true;

    const targetX = direction === "right" ? window.innerWidth : -window.innerWidth;
    const rotate = direction === "right" ? 15 : -15;

    flashcard.style.transition = "transform 0.2s ease";
    flashcard.style.transform = `translateX(${targetX}px) rotate(${rotate}deg)`;

    setTimeout(() => 
    {
        flashcard.style.transition = "none";
        flashcard.style.transform = "";

        if (direction === "right") 
        {
            swipePreviousFlashcard();
        } 
        else 
        {
            swipeNextFlashcard();
        }

        requestAnimationFrame(() => {flashcard.style.transition = "";});
    }, 200);
}

document.getElementById("flashcardPrevButton")?.addEventListener("click", event => {
    event.stopPropagation();
    if (flashcardAutoMode) return;
    swipePreviousFlashcard();
});

document.getElementById("flashcardNextButton")?.addEventListener("click", event => {
    event.stopPropagation();
    if (flashcardAutoMode) return;
    swipeNextFlashcard();
});

document.addEventListener("keydown", event => {
    if (!flashcardActive || flashcardAutoMode) return;

    if (event.key === "ArrowLeft") {
        event.preventDefault();
        swipePreviousFlashcard();
    }

    if (event.key === "ArrowRight") {
        event.preventDefault();
        swipeNextFlashcard();
    }

    if (event.code === "Space") {
        event.preventDefault();
        toggleFlashcard();
    }
});


/* =========================================================
   FLASHCARD FILTER QUIZ
========================================================= */

function getCurrentFilterCards()
{
    return getFilteredFlashcardCards(
        flashcardDatabase,
        flashcardRatings,
        flashcardCurrentFilter
    ).filter(card =>
        card.id !== null &&
        card.id !== undefined
    );
}

/* =========================================================
   OPEN QUIZ OPTIONS
========================================================= */

document.getElementById("flashcardCreateQuizBtn")
    ?.addEventListener("click", () => {

        if (!flashcardActive) return;

        stopFlashcardAuto();

        const cards = getCurrentFilterCards();

        if (cards.length === 0) {
            alert("No cards available.");
            return;
        }

        document.getElementById("flashcardQuizAvailable")
            .textContent =
                `${cards.length} cards available`;

        document.getElementById("flashcardQuizOptions")
            ?.classList.remove("hidden");
    });

/* =========================================================
   CANCEL QUIZ
========================================================= */

document.getElementById("flashcardQuizCancelBtn")
    ?.addEventListener("click", () => {

        document.getElementById("flashcardQuizOptions")
            ?.classList.add("hidden");
    });

/* =========================================================
   START FILTER QUIZ
========================================================= */

document.getElementById("flashcardQuizStartBtn")
    ?.addEventListener("click", async () => {

        if (
            !flashcardActive ||
            !flashcardConfig ||
            flashcardQuizOpen
        ) {
            return;
        }

        const cards = getCurrentFilterCards();

        if (cards.length === 0) {
            alert("This filter has no cards.");
            return;
        }

        // Không cho lặp ID.
        const ids = [
            ...new Set(
                cards.map(card => String(card.id))
            )
        ];

        const countSelect =
            document.getElementById("flashcardQuizCount");

        const timeSelect =
            document.getElementById("flashcardQuizTime");

        const requestedCount =
            countSelect.value === "all"
                ? ids.length
                : Number(countSelect.value);

        const count = Math.min(
            requestedCount,
            ids.length,
            100
        );

        const time = Number(timeSelect.value) || 10;

        // Snapshot ID tại thời điểm tạo Quiz.
        const selectedIds = shuffleQuestions([...ids])
            .slice(0, count);

        const quizConfig = {
            ...flashcardConfig,

            source: "flashcard",

            soloType: "practice",

            flashcardQuiz: true,

            flashcardFilter: flashcardCurrentFilter,

            flashcardQuizIds: selectedIds,

            practiceCount: selectedIds.length,

            practiceTime: time
        };

        stopFlashcardAuto();

        stopSpeech();

        flashcardQuizOpen = true;
        flashcardActive = false;

        ++flashcardCardToken;

        flashcardScreen?.classList.add("hidden");

        try {

            await startPractice(quizConfig);

        } catch (error) {

            console.error(
                "[FLASHCARD QUIZ] Start failed:",
                error
            );

            flashcardQuizOpen = false;
            flashcardActive = true;

            flashcardScreen?.classList.remove("hidden");

            alert(error.message || "Cannot start quiz.");
        }
    });

/* =========================================================
   RETURN FROM QUIZ
========================================================= */

export function resumeFlashcardFromQuiz()
{
    if (!flashcardConfig) {
        return false;
    }

    flashcardQuizOpen = false;
    flashcardActive = true;

    flashcardScreen?.classList.remove("hidden");

    document.getElementById("flashcardQuizOptions")
        ?.classList.add("hidden");

    if (flashcardCards.length > 0) {
        showFlashcard();
    }

    updateFlashcardFilterCounts();
    updateAutoButton();

    return true;
}

