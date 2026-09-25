import {
    playSfx,
    speakJapanese,
    stopSpeech
}
from "./audio.js";


/* =============================================================
   STATE
   ============================================================= */

let questions = [];

let currentQuestion = null;

let currentChoices = [];

let currentConfig = null;


let lives = 3;

let score = 0;

let combo = 0;

let maxCombo = 0;

let questionCount = 0;


let answerLocked = false;

let gameActive = false;


let timer = null;

let timeLeft = 0;

let questionTime = 10;


/* =============================================================
   DOM
   ============================================================= */

const gameScreen =
    document.getElementById(
        "gameScreen"
    );

const lifeElement =
    document.getElementById(
        "life"
    );

const scoreElement =
    document.getElementById(
        "score"
    );

const bestScoreElement =
    document.getElementById(
        "bestScore"
    );

const questionNumberElement =
    document.getElementById(
        "questionNumber"
    );

const questionElement =
    document.getElementById(
        "question"
    );

const readingElement =
    document.getElementById(
        "reading"
    );

const answersElement =
    document.getElementById(
        "answers"
    );

const timerTextElement =
    document.getElementById(
        "timerText"
    );

const timerBarElement =
    document.getElementById(
        "timerBar"
    );

const comboElement =
    document.getElementById(
        "combo"
    );

const gameModeInfoElement =
    document.getElementById(
        "gameModeInfo"
    );

/* =============================================================
   GAME MODE INFORMATION
   ============================================================= */

function updateGameModeInfo() {

    if (
        currentConfig.studyMode ===
        "jlpt"
    ) {

        const level =
            currentConfig.target
                .toUpperCase();


        let categoryName =
            "";


        switch (
            currentConfig.category
        ) {

            case "vocabulary":

                categoryName =
                    "VOCABULARY";

                break;


            case "grammar":

                categoryName =
                    "GRAMMAR";

                break;


            case "listening":

                categoryName =
                    "LISTENING";

                break;


            case "reading":

                categoryName =
                    "READING";

                break;

        }


        gameModeInfoElement.textContent =
            `JLPT ${level} · ${categoryName}`;


        return;
    }


    /*
        Sau này xử lý TOPIC...
    */

    gameModeInfoElement.textContent =
        "";
}
/*--xxxxxxx--*/       
/* =============================================================
   GET DATA FILE
   ============================================================= */

function getDataFile(config) {

    /*
        JLPT → TỪ VỰNG
    */
    if (
        config.studyMode === "jlpt"
        &&
        config.category === "vocabulary"
    ) {

        const files = {

            n5: "data/n5.json",
            n4: "data/n4.json",
            n3: "data/n3.json",
            n2: "data/n2.json",
            n1: "data/n1.json"

        };


        return files[
            config.target
        ] ?? null;
    }

    if (
    config.studyMode === "topic"
    &&
    config.category === "vocabulary"
) {

    const files = {

        animals:
            "data/topics/animals.json",

        food:
            "data/topics/food.json",

        colors:
            "data/topics/colors.json"

    };


    return files[
        config.target
    ] ?? null;
}

    /*
        Sau này thêm:

        CHỦ ĐỀ
        NGỮ PHÁP
        NGHE
        ĐỌC HIỂU

        ở đây.
    */


    return null;
}
/*--xxxxxxx--*/

/* =============================================================
   START GAME
   ============================================================= */

export async function startGame(
    config
) {

    currentConfig =config;

    updateGameModeInfo();

    stopSpeech();

    stopTimer();


    lives = 3;

    score = 0;

    combo = 0;

    maxCombo = 0;

    questionCount = 0;


    answerLocked = false;

    gameActive = true;


    /*
        Hiện tại database mới có N1.

        Sau này:
        data/${config.target}.json
    */

    /*const response =
        await fetch(
            "data/n1.json"
        );*/
 

    /*if (!response.ok) {

        alert(
            "Không thể load data"
        );

        return;
    }


    questions =
        await response.json();*/
    /* =========================================================
   LOAD DATABASE
   ========================================================= */

const dataFile =
    getDataFile(config);


/*
    Mode chưa có database
*/
if (!dataFile) {

    alert(
        "Mode này hiện chưa có database."
    );

    gameActive = false;

    return;
}


/*
    Load đúng JSON đã được mapping
*/
const response =
    await fetch(
        dataFile
    );


if (!response.ok) {

    alert(
        `Không thể load ${dataFile}`
    );

    gameActive = false;

    return;
}


questions =
    await response.json();    
/*xxxxxxxxxx*\ */

    if (
        questions.length < 4
    ) {

        alert(
            "Database cần ít nhất 4 từ."
        );

        return;
    }


    updateHUD();


    gameScreen.classList.remove(
        "hidden"
    );


    nextQuestion();
}


/* =============================================================
   QUESTION TIME
   ============================================================= */

function getQuestionTime(
    number
) {

    if (number <= 10) {
        return 10;
    }

    if (number <= 20) {
        return 8;
    }

    if (number <= 30) {
        return 6;
    }

    if (number <= 50) {
        return 5;
    }

    if (number <= 75) {
        return 4;
    }

    if (number <= 100) {
        return 3;
    }


    return 2.5;
}


/* =============================================================
   NEXT QUESTION
   ============================================================= */

function nextQuestion() {

    if (!gameActive) {
        return;
    }


    stopTimer();


    answerLocked =
        false;


    questionCount++;


    currentQuestion =
        questions[
            Math.floor(
                Math.random()
                *
                questions.length
            )
        ];


    currentChoices =
        generateChoices(
            currentQuestion
        );


    readingElement.textContent =
        currentQuestion.reading;


    readingElement.classList.remove(
        "show"
    );


    showQuestion();


    renderAnswers(
        currentChoices
    );


    questionTime =
        getQuestionTime(
            questionCount
        );


    startTimer(
        questionTime
    );


    updateHUD();
}


/* =============================================================
   SHOW QUESTION
   ============================================================= */

function showQuestion() {

    /*
        Minimal database:

        word
        reading
        meaning
    */

    switch (
        currentConfig.subMode
    ) {

        case "kanji_hiragana":

            questionElement.textContent =
                currentQuestion.word;

            break;


        case "hiragana_meaning":

            questionElement.textContent =
                currentQuestion.reading;

            break;


        case "meaning_kanji":

            questionElement.textContent =
                currentQuestion.meaning;

            break;
            
        case "audio_hiragana": /*###*/
        case "audio_meaning":
        case "audio_kanji":
            questionElement.textContent = "🔊";
            setTimeout(
                () => {
                speakJapanese(
                currentQuestion.reading
                );
                },
                200
            );
            break;
            
        default:

            questionElement.textContent =
                currentQuestion.word;

            break;
    }
}


/* =============================================================
   GET ANSWER FIELD
   ============================================================= */

function getAnswerField() {

    switch (
        currentConfig.subMode
    ) {

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


/* =============================================================
   GENERATE CHOICES

   Database KHÔNG chứa choices.
   Choices được random từ database.
   ============================================================= */

function generateChoices(
    question
) {

    const field =
        getAnswerField();


    const correct =
        question[field];


    const wrongAnswers =
        questions
            .filter(
                item =>
                    item[field]
                    !== correct
            )
            .map(
                item =>
                    item[field]
            );


    const uniqueWrong =
        [
            ...new Set(
                wrongAnswers
            )
        ];


    shuffleArray(
        uniqueWrong
    );


    const choices = [

        correct,

        ...uniqueWrong.slice(
            0,
            3
        )

    ];


    shuffleArray(
        choices
    );


    return choices;
}


/* =============================================================
   SHUFFLE
   ============================================================= */

function shuffleArray(
    array
) {

    for (
        let i =
            array.length - 1;

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
            array[i],
            array[j]
        ]
        =
        [
            array[j],
            array[i]
        ];
    }


    return array;
}


/* =============================================================
   RENDER ANSWERS
   ============================================================= */

function renderAnswers(
    choices
) {

    answersElement.innerHTML =
        "";


    choices.forEach(
        (choice, index) => {

            const button =
                document.createElement(
                    "button"
                );


            button.type =
                "button";


            button.className =
                "answer-button";


            button.dataset.answerIndex =
                index;


            const number =
                document.createElement(
                    "span"
                );


            number.className =
                "answer-number";


            number.textContent =
                index + 1;


            const text =
                document.createElement(
                    "span"
                );


            text.className =
                "answer-text";


            text.textContent =
                choice;


            button.appendChild(
                number
            );


            button.appendChild(
                text
            );


            button.addEventListener(
                "click",
                () => {

                    selectAnswer(
                        button,
                        choice
                    );

                }
            );


            answersElement.appendChild(
                button
            );

        }
    );
}


/* =============================================================
   SELECT ANSWER
   ============================================================= */
/*AUDIOMODE ADDIN ##*/
function isAudioMode() {

    return (
        currentConfig.subMode === "audio_hiragana"
        ||
        currentConfig.subMode === "audio_meaning"
        ||
        currentConfig.subMode === "audio_kanji"
    );
}

function selectAnswer(
    button,
    selectedAnswer
) {

    if (
        !gameActive
        ||
        answerLocked
    ) {

        return;
    }


    answerLocked =
        true;


    stopTimer();


    disableAnswers();


    const field =
        getAnswerField();


    const correctAnswer =
        currentQuestion[field];


    /* =========================================================
       CORRECT
       ========================================================= */

    if (
        selectedAnswer ===
        correctAnswer
    ) {

        button.classList.add(
            "correct"
        );


        playSfx(
            "correct"
        );


        combo++;


        if (
            combo > maxCombo
        ) {

            maxCombo =
                combo;
        }


        score +=
            calculateScore();


        showReading();


        updateHUD();


        /*##speakJapanese(
            currentQuestion.reading,
            nextQuestion
        );*/
        if (isAudioMode()) {

                setTimeout(
                    nextQuestion,
                    500
                );
            
            }
            else {
            
                speakJapanese(
                    currentQuestion.reading,
                    nextQuestion
                );
            }

        return;
    }


    /* =========================================================
       WRONG
       ========================================================= */

    button.classList.add(
        "wrong"
    );


    showCorrectAnswer();


    playSfx(
        "wrong"
    );


    lives--;


    combo = 0;


    showReading();


    updateHUD();


    /*###speakJapanese(
        currentQuestion.reading,
        () => {

            if (
                lives <= 0
            ) {

                endGame();

                return;
            }


            nextQuestion();

        }
    );*/

     const continueGame = () => {
        
            if (lives <= 0) {
                endGame();
                return;
            }
        
            nextQuestion();
        };
        
        
        if (isAudioMode()) {
        
            setTimeout(
                continueGame,
                500
            );
        
        }
        else {
        
            speakJapanese(
                currentQuestion.reading,
                continueGame
            );
        }
}


/* =============================================================
   SCORE
   ============================================================= */

function calculateScore() {

    let gained =
        100
        +
        Math.floor(
            timeLeft * 10
        );


    if (
        combo >= 10
    ) {

        gained *= 1.5;

    }
    else if (
        combo >= 5
    ) {

        gained *= 1.2;
    }


    return Math.floor(
        gained
    );
}


/* =============================================================
   TIMER
   ============================================================= */

function startTimer(
    duration
) {

    stopTimer();


    timeLeft =
        duration;


    updateTimer();


    timer =
        setInterval(
            () => {

                timeLeft -=
                    0.1;


                if (
                    timeLeft <= 0
                ) {

                    timeLeft = 0;


                    updateTimer();


                    stopTimer();


                    handleTimeout();


                    return;
                }


                updateTimer();

            },

            100
        );
}


function stopTimer() {

    if (timer) {

        clearInterval(
            timer
        );


        timer = null;
    }
}


function updateTimer() {

    timerTextElement.textContent =
        timeLeft.toFixed(1);


    const percent =
        Math.max(
            0,
            (
                timeLeft
                /
                questionTime
            )
            *
            100
        );


    timerBarElement.style.width =
        `${percent}%`;
}


/* =============================================================
   TIMEOUT
   ============================================================= */

function handleTimeout() {

    if (
        answerLocked
        ||
        !gameActive
    ) {

        return;
    }


    answerLocked =
        true;


    disableAnswers();


    showCorrectAnswer();


    showReading();


    playSfx(
        "wrong"
    );


    lives--;


    combo = 0;


    updateHUD();


    /*###speakJapanese(
        currentQuestion.reading,
        () => {

            if (
                lives <= 0
            ) {

                endGame();

                return;
            }


            nextQuestion();

        }
    );*/
    const continueGame = () => {

            if (lives <= 0) {
                endGame();
                return;
            }
        
            nextQuestion();
        };
        
        
        if (isAudioMode()) {
        
            setTimeout(
                continueGame,
                500
            );
        
        }
        else {
        
            speakJapanese(
                currentQuestion.reading,
                continueGame
            );
        }
}


/* =============================================================
   ANSWER HELPERS
   ============================================================= */

function disableAnswers() {

    const buttons =
        answersElement
            .querySelectorAll(
                ".answer-button"
            );


    buttons.forEach(
        button => {

            button.disabled =
                true;

        }
    );
}


function showCorrectAnswer() {

    const correct =
        currentQuestion[
            getAnswerField()
        ];


    const buttons =
        answersElement
            .querySelectorAll(
                ".answer-button"
            );


    buttons.forEach(
        button => {

            const text =
                button.querySelector(
                    ".answer-text"
                );


            if (
                text.textContent ===
                correct
            ) {

                button.classList.add(
                    "correct"
                );
            }

        }
    );
}


function showReading() {

    readingElement.classList.add(
        "show"
    );
}

/* =============================================================
   BEST SCORE KEY
   ============================================================= */

function getBestScoreKey() {

    return `batlingo_${currentConfig.target}_bestScore`;
}

/* =============================================================
   HUD
   ============================================================= */

function updateHUD() {

    lifeElement.textContent =
        "❤️ ".repeat(
            Math.max(
                0,
                lives
            )
        ).trim();


    scoreElement.textContent =
        score;


    comboElement.textContent =
        `🔥 COMBO ${combo}`;


    questionNumberElement.textContent =
        `QUESTION ${questionCount}`;


    const best =
        Number(
            localStorage.getItem(
                 getBestScoreKey()/*"batlingo_n1_bestScore"*/
            )
            ||
            0
        );


    bestScoreElement.textContent =
        Math.max(
            best,
            score
        );
}


/* =============================================================
   KEYBOARD 1 / 2 / 3 / 4
   ============================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            !gameActive
            ||
            answerLocked
        ) {

            return;
        }


        /*
            Không xử lý 1-4 nếu đang
            gõ vào input.
        */

        const active =
            document.activeElement;


        if (
            active
            &&
            (
                active.tagName ===
                "INPUT"
                ||
                active.tagName ===
                "TEXTAREA"
            )
        ) {

            return;
        }


        const keys = {

            "1": 0,
            "2": 1,
            "3": 2,
            "4": 3

        };


        const index =
            keys[event.key];


        if (
            index === undefined
        ) {

            return;
        }


        const buttons =
            answersElement
                .querySelectorAll(
                    ".answer-button"
                );


        const button =
            buttons[index];


        if (!button) {
            return;
        }


        /*
            Keyboard và mouse
            dùng CHUNG logic.
        */

        button.click();

    }
);


/* =============================================================
   END GAME
   ============================================================= */

function endGame() {

    gameActive =
        false;


    answerLocked =
        true;


    stopTimer();

    stopSpeech();


    playSfx(
        "gameover"
    );
    
const bestScoreKey = getBestScoreKey();

    const oldBest =
    Number(
        localStorage.getItem(
            bestScoreKey
        )
        ||
        0
    );

    /*## const oldBest =
        Number(
            localStorage.getItem(
                "batlingo_n1_bestScore"
            )
            ||
            0
        );*/


    const best =
        Math.max(
            oldBest,
            score
        );


    /*## localStorage.setItem(
        "batlingo_n1_bestScore",
        best
    );*/
    
    localStorage.setItem(
    bestScoreKey,
    best
    );


    gameScreen.classList.add(
        "hidden"
    );


    const gameOverScreen =
        document.getElementById(
            "gameOverScreen"
        );


    gameOverScreen.classList.remove(
        "hidden"
    );


    document
        .getElementById(
            "finalScore"
        )
        .textContent =
            score;


    document
        .getElementById(
            "finalQuestion"
        )
        .textContent =
            questionCount;


    document
        .getElementById(
            "finalCombo"
        )
        .textContent =
            maxCombo;


    document
        .getElementById(
            "finalBestScore"
        )
        .textContent =
            best;
}


/* =============================================================
   RETRY
   ============================================================= */

document
    .getElementById(
        "retryButton"
    )
    .addEventListener(
        "click",
        () => {

            document
                .getElementById(
                    "gameOverScreen"
                )
                .classList.add(
                    "hidden"
                );


            startGame(
                currentConfig
            );

        }
    );
