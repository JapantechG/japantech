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
    flashcardConfig = config;

    flashcardIndex = 0;

    flashcardRevealed = false;

    flashcardActive = true;

    flashcardAutoMode = false;

    flashcardAutoEndIndex = 0;

    flashcardAgainCards = [];

    clearTimeout(flashcardAutoTimer);

    /*
        Load database
    */

    await loadFlashcardDatabase(config.target);

    /*
        Random toàn bộ deck
    */

    flashcardCards = shuffleQuestions(flashcardDatabase);

    /*
        Hiện screen
    */

    flashcardScreen ?.classList.remove("hidden");

    /*
        Level header
    */

    if (flashcardLevel)
    {
        flashcardLevel.textContent = `${config.target.toUpperCase()} - ${config.category.toUpperCase()}`;
    }

    showFlashcard();
}


/* =============================================================
   DATABASE
   ============================================================= */

async function loadFlashcardDatabase(level)
{
    /*
        Giữ cùng đường dẫn database hiện tại.
    */

    const file = `data/${level.toLowerCase()}.json`;

    const response = await fetch(file);

    if (!response.ok)
    {
        throw new Error("FLASHCARD_DATABASE_LOAD_FAILED");
    }

    flashcardDatabase = await response.json();

    console.log("[FLASHCARD] Database loaded:",level,flashcardDatabase.length);
}


/* =============================================================
   SHOW CARD
   ============================================================= */

function showFlashcard()
{
    if (!flashcardActive || flashcardCards.length === 0)
    {
        return;
    }

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
    const question =getQuestionText(data,flashcardConfig.subMode);

    if (flashcardQuestion)
    {
        flashcardQuestion.textContent = question;
    }

    /*
        BACK
    */

    const back = getFlashcardBack(data,flashcardConfig.subMode);

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
                if (flashcardActive && !flashcardRevealed)
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
    if (!flashcardActive || !flashcardRevealed)
    {
        return;
    }

    const currentCard =flashcardCards[flashcardIndex];

    console.log("[FLASHCARD] Rating:",rating,currentCard?.id);

    /*
        AGAIN:
        đưa card này xuống cuối deck
        để lát gặp lại.
    */

    if (rating === "again" && currentCard)
    {
        flashcardCards.push(currentCard);
    }

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
    flashcardActive = false;

    flashcardRevealed = false;

    stopSpeech();

    flashcardScreen?.classList.add("hidden");
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

function autoNextFlashcard()
{
    if (!flashcardActive || !flashcardAutoMode)
    {
        return;
    }

    const currentCard = flashcardCards[flashcardIndex];

    /*
        AUTO = chưa xác nhận nhớ

        → đưa vào AGAIN
    */

    if (currentCard)
    {
        flashcardAgainCards.push(currentCard);
    }

    flashcardIndex++;

    /*
        Card cuối
    */

    if (flashcardIndex >= flashcardAutoEndIndex)
    {
        finishFlashcardAuto();

        return;
    }

    showFlashcard();

    runFlashcardAuto();
}

function finishFlashcardAuto()
{
    clearTimeout(flashcardAutoTimer);

    flashcardAutoTimer = null;

    flashcardAutoMode = false;

    stopSpeech();

    console.log("[FLASHCARD] AUTO FINISHED");

    console.log("[FLASHCARD] AGAIN:",flashcardAgainCards.length);

    /*
        Sau AUTO:
        deck tiếp theo chỉ gồm
        những card được đưa vào AGAIN.
    */

    flashcardCards = [...flashcardAgainCards];

    flashcardIndex = 0;

    /*
        Không tự chạy lại.

        Chỉ chuẩn bị deck AGAIN.
    */

    if (flashcardCards.length > 0)
    {
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

    setTimeout(() => {
        flashcard.style.transition = "";
    }, 200);
}

function finishFlashcardSwipe(direction) {
    flashcardDidSwipe = true;

    const targetX = direction === "right" ? window.innerWidth : -window.innerWidth;
    const rotate = direction === "right" ? 15 : -15;

    flashcard.style.transition = "transform 0.2s ease";
    flashcard.style.transform = `translateX(${targetX}px) rotate(${rotate}deg)`;

    setTimeout(() => {
        flashcard.style.transition = "none";
        flashcard.style.transform = "";

        if (direction === "right") {
            swipePreviousFlashcard();
        } else {
            swipeNextFlashcard();
        }

        requestAnimationFrame(() => {
            flashcard.style.transition = "";
        });
    }, 200);
}
