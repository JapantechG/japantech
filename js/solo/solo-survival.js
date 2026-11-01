import {
    playSfx,
    speakJapanese,
    stopSpeech
} from "../audio.js";

import {
    saveSoloResult,
    saveWrongQuestion
} from "../user.js";


import {
    loadSoloQuestions,
    generateSoloChoices,
    getSoloQuestionText,
    getRandomGrammarExample,
    isSoloAudioMode,
    getSurvivalQuestionTime
} from "./solo-core.js";


/* =============================================================
   STATE
   ============================================================= */

let questions = [];

let currentQuestion = null;

let currentChoices = [];

let currentConfig = null;

let currentCorrectAnswer = null;

let currentGrammarExample = null;

let lives = 3;

let score = 0;

let combo = 0;

let maxCombo = 0;

let questionCount = 0;

let correctCount = 0;

let wrongCount = 0;

let answerLocked = false;

let gameActive = false;

let timer = null;

let timeLeft = 0;

let questionTime = 10;


/* =============================================================
   DOM
   ============================================================= */

const gameScreen = document.getElementById("gameScreen");

const lifeElement = document.getElementById("life");

const scoreElement = document.getElementById("score");

const bestScoreElement =document.getElementById("bestScore");

const questionNumberElement =document.getElementById("questionNumber");

const questionElement =document.getElementById("question");

const readingElement =document.getElementById("reading");

const answersElement =document.getElementById("answers");

const timerTextElement =document.getElementById("timerText");

const timerBarElement =document.getElementById("timerBar");

const comboElement =document.getElementById("combo");

const gameModeInfoElement =document.getElementById("gameModeInfo");

/* =============================================================
   GAME MODE INFORMATION
   ============================================================= */

function updateGameModeInfo() 
{
    if (currentConfig.studyMode === "jlpt") 
    {
        const level = currentConfig.target.toUpperCase();

        let categoryName = "";

        switch (currentConfig.category) 
        {
            case "vocabulary":
                categoryName = "VOCABULARY";
                break;

            case "grammar":
                categoryName = "GRAMMAR";
                break;

            case "listening":
                categoryName = "LISTENING";
                break;

            case "reading":
                categoryName = "READING";
                break;
        }

        gameModeInfoElement.textContent = `JLPT ${level} · ${categoryName}`;

        return;
    }

    /*
        Sau này xử lý TOPIC...
    */

    gameModeInfoElement.textContent = "";
}    


/* =============================================================
   START GAME
   ============================================================= */

export async function startSurvival(config)
{
    currentConfig =config;

    gameScreen.classList.remove("solo-practice-mode");

    updateGameModeInfo();

    stopSpeech();

    stopTimer();

    lives = 3;

    score = 0;

    combo = 0;

    maxCombo = 0;

    questionCount = 0;

    correctCount = 0;

    wrongCount = 0;

    answerLocked = false;

    gameActive = true;

    /* =========================================================
   LOAD DATABASE
   ========================================================= */


        try {
            questions = await loadSoloQuestions(config);
        }
        catch (error) {
            gameActive = false;

            console.error(
                "[SURVIVAL] Database error:",
                error
            );

            alert(error.message);

            return;
        }


    updateHUD();

    gameScreen.classList.remove("hidden");

    nextQuestion();
}



/* =============================================================
   NEXT QUESTION
   ============================================================= */

function nextQuestion() 
{
    if (!gameActive) 
    {
        return;
    }

    stopTimer();

    answerLocked = false;

    questionCount++;

    currentQuestion = questions[Math.floor(Math.random()*questions.length)];

/* =========================================================
   GRAMMAR SENTENCE
   Random 1 example của grammar hiện tại
   ========================================================= */

        currentGrammarExample = null;

        if (
            currentConfig.category === "grammar" &&
            currentConfig.subMode === "grammar_sentence"
        ) {
            currentGrammarExample = getRandomGrammarExample(
                currentQuestion
            );
        }

        const generated = generateSoloChoices(
            currentQuestion,
            questions,
            currentConfig
        );

        currentCorrectAnswer = generated.correctAnswer;
        currentChoices = generated.choices;


    /* READING */
    readingElement.textContent = currentQuestion.reading ?? "";

    readingElement.classList.remove("show");

    showQuestion();

    renderAnswers(currentChoices);

    if (currentConfig.subMode === "grammar_sentence") 
    {
        questionTime = 60;
    }
    else 
    {
        questionTime = getSurvivalQuestionTime(questionCount);
    }


    startTimer(questionTime);

    updateHUD();
}

/* =============================================================
   SHOW QUESTION
   ============================================================= */


function showQuestion() {

    questionElement.onclick = null;

    questionElement.textContent = getSoloQuestionText(
        currentQuestion,
        currentConfig,
        currentGrammarExample
    );

    if (!isSoloAudioMode(currentConfig.subMode)) {
        return;
    }

    const questionReading = currentQuestion.reading;

    questionElement.onclick = () => {

        if (!gameActive || answerLocked) {
            return;
        }

        speakJapanese(questionReading);
    };

    setTimeout(() => {

        if (!gameActive || answerLocked) {
            return;
        }

        if (currentQuestion.reading !== questionReading) {
            return;
        }

        speakJapanese(questionReading);

    }, 200);
}


/* =============================================================
   RENDER ANSWERS
   ============================================================= */

function renderAnswers(choices) 
{
    answersElement.innerHTML = "";

    choices.forEach((choice, index) => {const button = document.createElement("button");

            button.type = "button";

            button.className = "answer-button";

            button.dataset.answerIndex = index;

            const number = document.createElement("span");

            number.className = "answer-number";

            number.textContent = index + 1;

            const text = document.createElement("span");

            text.className = "answer-text";

            text.textContent = choice;

            button.appendChild(number);

            button.appendChild(text);

            button.addEventListener("click",() => {selectAnswer(button,choice);});

            answersElement.appendChild(button);

        }
    );
}

/* =============================================================
   SELECT ANSWER
   ============================================================= */

function selectAnswer(button,selectedAnswer) 
{
    if (!gameActive ||answerLocked) 
    {
        return;
    }

    answerLocked = true;

    stopTimer();

    disableAnswers();

    const correctAnswer = currentCorrectAnswer;

    /* =========================================================
       CORRECT
       ========================================================= */
    if (selectedAnswer ===correctAnswer) 
    {
        button.classList.add("correct");

        playSfx("correct");

        correctCount++;
        
        combo++;

        if (combo > maxCombo) 
        {
            maxCombo = combo;
        }

        score += calculateScore();

        showReading();

        updateHUD();

        if (isSoloAudioMode(currentConfig.subMode)) 
        {
                setTimeout(nextQuestion,500);
        }
        else
        {
            speakJapanese(currentQuestion.reading,nextQuestion);
        }
        return;
    }

    /* =========================================================
       WRONG
       ========================================================= */

    button.classList.add("wrong");

    showCorrectAnswer();

    playSfx("wrong");

    wrongCount++;

    saveWrongQuestion(currentQuestion.id,currentConfig,"solo").catch(error => {console.error("[REVIEW] Save wrong failed:", error);});
    
    lives--;

    combo = 0;

    showReading();

    updateHUD();

     const continueGame = () => {
        
        if (lives <= 0) 
        {
               endGame();
            return;
        }
        
            nextQuestion();
        };
        
        if (isSoloAudioMode(currentConfig.subMode)) 
        {
            setTimeout(continueGame,500);
        }
        else 
        {
            speakJapanese(currentQuestion.reading,continueGame);
        }
}

/* =============================================================
   SCORE
   ============================================================= */

function calculateScore() 
{
    let gained = 100 +Math.floor(timeLeft * 10);

    if (combo >= 10) 
    {
        gained *= 1.5;
    }
    else if (combo >= 5) 
    {
        gained *= 1.2;
    }

    return Math.floor(gained);
}

/* =============================================================
   TIMER
   ============================================================= */

function startTimer(duration) 
{
    stopTimer();

    timeLeft = duration;

    updateTimer();

    timer = setInterval(() => 
        {
                timeLeft -= 0.1;

                if (timeLeft <= 0) 
                {
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


function stopTimer() 
{
    if (timer) 
    {
        clearInterval(timer);

        timer = null;
    }
}

export function stopSurvival()
{
    gameActive = false;
    answerLocked = true;

    stopTimer();
    stopSpeech();
}

function updateTimer() 
{
    timerTextElement.textContent = timeLeft.toFixed(1);

    const percent = Math.max(0,(timeLeft/questionTime)*100);

    timerBarElement.style.width = `${percent}%`;
}

/* =============================================================
   TIMEOUT
   ============================================================= */
function handleTimeout() 
{
    if (answerLocked || !gameActive) 
    {
        return;
    }

    answerLocked = true;

    disableAnswers();

    showCorrectAnswer();

    showReading();

    playSfx("wrong");

    wrongCount++;

    saveWrongQuestion(currentQuestion.id,currentConfig,"solo").catch(error => {console.error("[REVIEW] Save timeout failed:", error);});
    
    lives--;

    combo = 0;

    updateHUD();

    const continueGame = () => 
        {
            if (lives <= 0) 
            {
                endGame();
                return;
            }
            nextQuestion();
        };
        
        if (isSoloAudioMode(currentConfig.subMode)) 
        {
            setTimeout(continueGame,500);
        }
        else 
        {
            speakJapanese(currentQuestion.reading,continueGame);
        }
}

/* =============================================================
   ANSWER HELPERS
   ============================================================= */

function disableAnswers() 
{
    const buttons =answersElement.querySelectorAll(".answer-button");

    buttons.forEach(button => {button.disabled =true;});
}

function showCorrectAnswer() 
{
    const correct = currentCorrectAnswer;

    const buttons =answersElement.querySelectorAll(".answer-button");

    buttons.forEach(button => {
        
        const text =button.querySelector(".answer-text");

            if (text.textContent ===correct) 
            {
                button.classList.add("correct");
            }
        }
    );
}

function showReading() 
{
    readingElement.classList.add("show");
}

/* =============================================================
   BEST SCORE KEY
   ============================================================= */

function getBestScoreKey() 
{
    return `batlingo_${currentConfig.target}_bestScore`;
}

/* =============================================================
   HUD
   ============================================================= */

function updateHUD() 
{
    lifeElement.textContent = "❤️ ".repeat(Math.max(0,lives)).trim();

    scoreElement.textContent = score;

    comboElement.textContent = `🔥 COMBO ${combo}`;

    questionNumberElement.textContent = `QUESTION ${questionCount}`;

    const best =Number(localStorage.getItem(getBestScoreKey())||0);

    bestScoreElement.textContent =Math.max(best,score);
}

/* =============================================================
   KEYBOARD 1 / 2 / 3 / 4
   ============================================================= */

document.addEventListener("keydown",event => 
    {
        if (!gameActive || answerLocked) 
        {
            return;
        }

        /*
            Không xử lý 1-4 nếu đang
            gõ vào input.
        */

        const active = document.activeElement;

        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) 
        {
            return;
        }

        const keys = {
            "1": 0,
            "2": 1,
            "3": 2,
            "4": 3
        };

        const index = keys[event.key];

        if (index === undefined) 
        {
            return;
        }

        const buttons = answersElement.querySelectorAll(".answer-button");

        const button = buttons[index];

        if (!button) 
        {
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

function endGame() 
{
    gameActive = false;

    answerLocked = true;

    stopTimer();

    stopSpeech();

    playSfx("gameover");

/* =========================================================
   SAVE SOLO RESULT
========================================================= */
saveSoloResult({

    score: score,

    /*questions: questionCount,*/
    questions: correctCount + wrongCount,

    correct: correctCount,

    wrong: wrongCount,

    bestCombo: maxCombo

})
.catch(error => 
    {

        console.error("[SOLO] Save result failed:",error);

    }
);
    
    const bestScoreKey = getBestScoreKey();

    const oldBest = Number(localStorage.getItem(bestScoreKey)||0);

    const best = Math.max(oldBest,score);

    localStorage.setItem(bestScoreKey,best);

    gameScreen.classList.add("hidden");

    const gameOverScreen = document.getElementById("gameOverScreen");

    gameOverScreen.classList.remove("hidden");

    document.getElementById("finalScore").textContent = score;

    document.getElementById("finalQuestion").textContent = questionCount;

    document.getElementById("finalCombo").textContent = maxCombo;

    document.getElementById("finalBestScore").textContent = best;
}

/* =============================================================
   RETRY
   ============================================================= */

document.getElementById("retryButton").addEventListener("click",() => {

            document.getElementById("gameOverScreen").classList.add("hidden");

            startSurvival(currentConfig);
        }
    );
