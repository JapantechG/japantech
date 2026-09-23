/* =============================================================
   BATLINGO
   SOLO ENDLESS MODE

   PC / Tablet / Mobile
   ============================================================= */


/* =============================================================
   DOM ELEMENTS
   ============================================================= */

const gameScreen =
    document.getElementById("gameScreen");

const gameOverScreen =
    document.getElementById("gameOverScreen");

const lifeElement =
    document.getElementById("life");

const scoreElement =
    document.getElementById("score");

const bestScoreElement =
    document.getElementById("bestScore");

const questionNumberElement =
    document.getElementById("questionNumber");

const questionElement =
    document.getElementById("question");

const readingElement =
    document.getElementById("reading");

const answersElement =
    document.getElementById("answers");

const timerTextElement =
    document.getElementById("timerText");

const timerBarElement =
    document.getElementById("timerBar");

const comboElement =
    document.getElementById("combo");

const finalScoreElement =
    document.getElementById("finalScore");

const finalQuestionElement =
    document.getElementById("finalQuestion");

const finalComboElement =
    document.getElementById("finalCombo");

const finalBestScoreElement =
    document.getElementById("finalBestScore");

const retryButton =
    document.getElementById("retryButton");


/* =============================================================
   DATABASE
   ============================================================= */

let questions = [];

let currentQuestion = null;


/* =============================================================
   GAME STATE
   ============================================================= */

let lives = 3;

let score = 0;

let questionCount = 0;

let combo = 0;

let maxCombo = 0;

let timer = null;

let timeLeft = 0;

let questionTime = 10;

/*
    answered dùng để ngăn:
    - double click
    - timer hết cùng lúc người dùng click
*/
let answered = false;


/* =============================================================
   LOAD JSON DATABASE
   ============================================================= */

async function loadQuestions() {

    try {

        const response =
            await fetch("data/n1.json");


        if (!response.ok) {

            throw new Error(
                "Cannot load N1 database."
            );
        }


        questions =
            await response.json();


        console.log(
            `Loaded ${questions.length} questions`
        );


        startGame();

    }
    catch (error) {

        console.error(error);

        questionElement.textContent =
            "DATABASE ERROR";
    }
}


/* =============================================================
   START GAME
   ============================================================= */

function startGame() {

    /*
        Hủy speech cũ.

        Quan trọng khi người chơi Retry
        trong lúc trình duyệt còn đang đọc.
    */
    stopSpeech();


    clearInterval(timer);


    lives = 3;

    score = 0;

    questionCount = 0;

    combo = 0;

    maxCombo = 0;


    gameScreen.style.display =
        "block";

    gameOverScreen.style.display =
        "none";


    loadBestScore();

    updateHUD();

    nextQuestion();
}


/* =============================================================
   NEXT QUESTION
   ============================================================= */

function nextQuestion() {

    if (questions.length === 0)
        return;


    answered = false;


    questionCount++;


    /*
        Random hoàn toàn.

        Câu vừa xuất hiện vẫn có khả năng
        xuất hiện lại.

        Đây là thiết kế Endless Mode.
    */
    const randomIndex =
        Math.floor(
            Math.random() * questions.length
        );


    currentQuestion =
        questions[randomIndex];


    /* -----------------------------------------
       Question
       ----------------------------------------- */

    questionNumberElement.textContent =
        `QUESTION ${questionCount}`;


    questionElement.textContent =
        currentQuestion.word;


    /*
        Reading được ẩn khi câu mới xuất hiện.

        Người chơi phải tự biết cách đọc trước.
    */
    readingElement.textContent =
        currentQuestion.reading;


    readingElement.classList.remove("show");


    /* -----------------------------------------
       Answer
       ----------------------------------------- */

    const choices =
        [...currentQuestion.choices];


    shuffleArray(choices);


    answersElement.innerHTML = "";


    choices.forEach(choice => {

        const button =
            document.createElement("button");


        button.className =
            "answer-button";


        button.textContent =
            choice;


        button.addEventListener(
            "click",
            () => selectAnswer(choice, button)
        );


        answersElement.appendChild(button);
    });


    /* -----------------------------------------
       Timer
       ----------------------------------------- */

    questionTime =
        getQuestionTime(questionCount);


    timeLeft =
        questionTime;


    startTimer();

    updateHUD();
}


/* =============================================================
   DIFFICULTY
   ============================================================= */

function getQuestionTime(questionNumber) {

    /*
        Càng lên cao càng ít thời gian.

        1  - 10  = 10s
        11 - 20  = 8s
        21 - 30  = 6s
        31 - 50  = 5s
        51 - 75  = 4s
        76 - 100 = 3s
        101+     = 2.5s
    */

    if (questionNumber <= 10)
        return 10;

    if (questionNumber <= 20)
        return 8;

    if (questionNumber <= 30)
        return 6;

    if (questionNumber <= 50)
        return 5;

    if (questionNumber <= 75)
        return 4;

    if (questionNumber <= 100)
        return 3;


    return 2.5;
}


/* =============================================================
   TIMER
   ============================================================= */

function startTimer() {

    clearInterval(timer);


    updateTimerDisplay();


    timer = setInterval(() => {

        timeLeft -= 0.1;


        if (timeLeft < 0)
            timeLeft = 0;


        updateTimerDisplay();


        if (timeLeft <= 0) {

            clearInterval(timer);

            handleTimeout();
        }

    }, 100);
}


/* =============================================================
   TIMER DISPLAY
   ============================================================= */

function updateTimerDisplay() {

    timerTextElement.textContent =
        timeLeft.toFixed(1);


    const percentage =
        (timeLeft / questionTime) * 100;


    timerBarElement.style.width =
        percentage + "%";
}


/* =============================================================
   SELECT ANSWER
   ============================================================= */

function selectAnswer(
    selectedAnswer,
    selectedButton
) {

    /*
        Không cho click lần thứ hai.
    */
    if (answered)
        return;


    answered = true;


    clearInterval(timer);


    /*
        Khóa toàn bộ button ngay lập tức.

        Quan trọng cho cả mouse và touchscreen.
    */
    disableAnswerButtons();


    if (
        selectedAnswer ===
        currentQuestion.answer
    ) {

        selectedButton.classList.add(
            "correct"
        );


        correctAnswer();
    }
    else {

        selectedButton.classList.add(
            "wrong"
        );


        /*
            Khi sai:
            hiện đáp án đúng bằng màu xanh.
        */
        showCorrectAnswer();


        wrongAnswer();
    }
}


/* =============================================================
   DISABLE BUTTON
   ============================================================= */

function disableAnswerButtons() {

    const buttons =
        document.querySelectorAll(
            ".answer-button"
        );


    buttons.forEach(button => {

        button.disabled = true;
    });
}


/* =============================================================
   SHOW CORRECT ANSWER
   ============================================================= */

function showCorrectAnswer() {

    const buttons =
        document.querySelectorAll(
            ".answer-button"
        );


    buttons.forEach(button => {

        if (
            button.textContent ===
            currentQuestion.answer
        ) {

            button.classList.add(
                "correct"
            );
        }

    });
}


/* =============================================================
   CORRECT ANSWER
   ============================================================= */

function correctAnswer() {

    combo++;


    if (combo > maxCombo) {

        maxCombo = combo;
    }


    /* ---------------------------------------------------------
       SCORE
       --------------------------------------------------------- */

    let earnedScore =
        100 +
        Math.floor(timeLeft * 10);


    /*
        Combo bonus.
    */
    if (combo >= 10) {

        earnedScore *= 1.5;
    }
    else if (combo >= 5) {

        earnedScore *= 1.2;
    }


    earnedScore =
        Math.floor(earnedScore);


    score += earnedScore;


    updateHUD();


    /* ---------------------------------------------------------
       READING
       --------------------------------------------------------- */

    /*
        Sau khi trả lời đúng:

        衰える

        ↓

        おとろえる

        đồng thời máy đọc:
        "おとろえる"
    */
    readingElement.classList.add("show");


    /*
        Đọc reading.

        Sau khi đọc xong
        callback sẽ gọi nextQuestion().
    */
    speakJapanese(
        currentQuestion.reading,
        () => {

            nextQuestion();
        }
    );
}


/* =============================================================
   WRONG ANSWER
   ============================================================= */

function wrongAnswer() {

    lives--;

    combo = 0;


    updateHUD();


    /*
        Khi sai cũng cho người chơi
        nhìn đáp án đúng một chút.

        Hiện tại KHÔNG đọc âm thanh.
    */
    setTimeout(() => {

        checkLife();

    }, 700);
}


/* =============================================================
   TIME OUT
   ============================================================= */

function handleTimeout() {

    if (answered)
        return;


    answered = true;


    lives--;

    combo = 0;


    disableAnswerButtons();

    showCorrectAnswer();

    updateHUD();


    setTimeout(() => {

        checkLife();

    }, 700);
}


/* =============================================================
   TEXT TO SPEECH - JAPANESE
   ============================================================= */

/*
    Đọc trường "reading" trong JSON.

    Ví dụ:

    word:
        衰える

    reading:
        おとろえる

    Máy sẽ đọc:
        おとろえる
*/
function speakJapanese(
    reading,
    onFinished
) {

    /*
        Kiểm tra trình duyệt có hỗ trợ
        Web Speech API hay không.
    */
    if (
        !("speechSynthesis" in window)
    ) {

        /*
            Nếu không hỗ trợ speech,
            vẫn tiếp tục game bình thường.
        */
        setTimeout(
            onFinished,
            500
        );

        return;
    }


    /*
        Hủy âm thanh cũ nếu còn.
    */
    window.speechSynthesis.cancel();


    /*
        Tạo câu cần đọc.
    */
    const speech =
        new SpeechSynthesisUtterance(
            reading
        );


    /*
        Japanese.
    */
    speech.lang =
        "ja-JP";


    /*
        Tốc độ đọc.

        1.0 = tốc độ bình thường.

        0.9 hơi chậm một chút,
        phù hợp game học từ vựng.
    */
    speech.rate =
        0.9;


    /*
        Pitch bình thường.
    */
    speech.pitch =
        1.0;


    /*
        Volume:
        0 → 1
    */
    speech.volume =
        1.0;


    /*
        Cố tìm Japanese Voice
        trong thiết bị.

        PC, Android, iPhone có thể
        sử dụng voice khác nhau.
    */
    const voices =
        window.speechSynthesis.getVoices();


    const japaneseVoice =
        voices.find(
            voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("ja")
        );


    if (japaneseVoice) {

        speech.voice =
            japaneseVoice;
    }


    /*
        Khi đọc xong
        → sang câu tiếp theo.
    */
    speech.onend = () => {

        /*
            Delay rất ngắn để game
            không chuyển quá đột ngột.
        */
        setTimeout(
            onFinished,
            150
        );
    };


    /*
        Nếu speech bị lỗi,
        game vẫn phải tiếp tục.
    */
    speech.onerror = () => {

        setTimeout(
            onFinished,
            300
        );
    };


    /*
        Bắt đầu đọc.
    */
    window.speechSynthesis.speak(
        speech
    );
}


/* =============================================================
   STOP SPEECH
   ============================================================= */

function stopSpeech() {

    if (
        "speechSynthesis" in window
    ) {

        window.speechSynthesis.cancel();
    }
}


/* =============================================================
   CHECK LIFE
   ============================================================= */

function checkLife() {

    if (lives <= 0) {

        gameOver();

    }
    else {

        nextQuestion();
    }
}


/* =============================================================
   UPDATE HUD
   ============================================================= */

function updateHUD() {

    scoreElement.textContent =
        score.toLocaleString();


    comboElement.textContent =
        `🔥 COMBO ${combo}`;


    let lifeText = "";


    for (let i = 0; i < 3; i++) {

        if (i < lives) {

            lifeText += "❤️ ";
        }
        else {

            lifeText += "🖤 ";
        }
    }


    lifeElement.textContent =
        lifeText;
}


/* =============================================================
   GAME OVER
   ============================================================= */

function gameOver() {

    clearInterval(timer);

    stopSpeech();


    saveBestScore();


    gameScreen.style.display =
        "none";


    gameOverScreen.style.display =
        "block";


    finalScoreElement.textContent =
        score.toLocaleString();


    finalQuestionElement.textContent =
        questionCount;


    finalComboElement.textContent =
        maxCombo;


    finalBestScoreElement.textContent =
        getBestScore().toLocaleString();
}


/* =============================================================
   LOCAL STORAGE
   ============================================================= */

function getBestScore() {

    return Number(
        localStorage.getItem(
            "batlingo_n1_bestScore"
        )
    ) || 0;
}


function loadBestScore() {

    bestScoreElement.textContent =
        getBestScore().toLocaleString();
}


function saveBestScore() {

    const bestScore =
        getBestScore();


    if (score > bestScore) {

        localStorage.setItem(
            "batlingo_n1_bestScore",
            score
        );
    }
}


/* =============================================================
   SHUFFLE ARRAY
   Fisher-Yates
   ============================================================= */

function shuffleArray(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() * (i + 1)
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
}


/* =============================================================
   RETRY BUTTON
   ============================================================= */

retryButton.addEventListener(
    "click",
    startGame
);


/* =============================================================
   PAGE CLOSE
   ============================================================= */

/*
    Nếu rời trang trong lúc đang đọc,
    hủy speech.
*/
window.addEventListener(
    "beforeunload",
    stopSpeech
);


/* =============================================================
   INITIALIZE
   ============================================================= */

loadQuestions();