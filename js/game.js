/* =============================================================
   BATLINGO
   SOLO ENDLESS MODE

   Database format:
   {
       "id": 1,
       "word": "衰える",
       "reading": "おとろえる",
       "meaning": "Suy yếu"
   }

   Chức năng:
   - Endless mode
   - 3 mạng
   - Random câu hỏi
   - Random 3 đáp án sai từ database
   - Timer giảm dần theo độ khó
   - Đúng / Sai đều hiện reading
   - Đúng / Sai đều đọc tiếng Nhật
   - High Score lưu bằng localStorage
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

/*
    Toàn bộ từ vựng được load từ:

    data/n1.json
*/
let questions = [];


/*
    Câu hỏi hiện tại.
*/
let currentQuestion = null;


/* =============================================================
   GAME STATE
   ============================================================= */

// Số mạng ban đầu
let lives = 3;


// Điểm hiện tại
let score = 0;


// Số câu đã xuất hiện
let questionCount = 0;


// Combo hiện tại
let combo = 0;


// Combo lớn nhất trong trận
let maxCombo = 0;


// Timer ID
let timer = null;


// Thời gian còn lại
let timeLeft = 0;


// Thời gian tối đa của câu hiện tại
let questionTime = 10;


/*
    Ngăn người chơi click nhiều lần.

    false = có thể trả lời
    true  = câu đã được xử lý
*/
let answered = false;


/* =============================================================
   LOAD DATABASE
   ============================================================= */

async function loadQuestions() {

    try {

        const response =
            await fetch("data/n1.json");


        /*
            Kiểm tra HTTP response.
        */
        if (!response.ok) {

            throw new Error(
                "Cannot load N1 database."
            );
        }


        /*
            Chuyển JSON thành Array JavaScript.
        */
        questions =
            await response.json();


        /*
            Cần ít nhất 4 từ:

            1 đáp án đúng
            3 đáp án sai
        */
        if (questions.length < 4) {

            throw new Error(
                "Database must contain at least 4 words."
            );
        }


        console.log(
            `Loaded ${questions.length} N1 words`
        );


        /*
            Load xong database
            → bắt đầu game.
        */
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
        Dừng timer cũ.
    */
    clearInterval(timer);


    /*
        Dừng giọng đọc cũ nếu đang đọc.
    */
    stopSpeech();


    /*
        Reset Game State.
    */
    lives = 3;

    score = 0;

    questionCount = 0;

    combo = 0;

    maxCombo = 0;

    answered = false;


    /*
        Hiện Game Screen.
    */
    gameScreen.style.display =
        "block";


    /*
        Ẩn Game Over Screen.
    */
    gameOverScreen.style.display =
        "none";


    /*
        Load High Score.
    */
    loadBestScore();


    /*
        Update UI.
    */
    updateHUD();


    /*
        Bắt đầu câu đầu tiên.
    */
    nextQuestion();
}


/* =============================================================
   NEXT QUESTION
   ============================================================= */

function nextQuestion() {

    /*
        Kiểm tra database.
    */
    if (questions.length < 4) {

        return;
    }


    /*
        Câu mới có thể trả lời.
    */
    answered = false;


    /*
        Tăng số câu.
    */
    questionCount++;


    /* ---------------------------------------------------------
       RANDOM QUESTION
       --------------------------------------------------------- */

    /*
        Random một từ trong toàn database.

        Câu hỏi CÓ THỂ lặp lại.
        Đây là thiết kế của Endless Mode.
    */
    const randomIndex =
        Math.floor(
            Math.random() * questions.length
        );


    currentQuestion =
        questions[randomIndex];


    /* ---------------------------------------------------------
       DISPLAY QUESTION
       --------------------------------------------------------- */

    questionNumberElement.textContent =
        `QUESTION ${questionCount}`;


    /*
        Chỉ hiện Kanji / từ vựng.

        Ví dụ:
        衰える
    */
    questionElement.textContent =
        currentQuestion.word;


    /*
        Chuẩn bị reading.

        Ví dụ:
        おとろえる

        Nhưng chưa cho người chơi nhìn thấy.
    */
    readingElement.textContent =
        currentQuestion.reading;


    /*
        Ẩn hiragana trước khi trả lời.
    */
    readingElement.classList.remove(
        "show"
    );


    /* ---------------------------------------------------------
       GENERATE ANSWERS
       --------------------------------------------------------- */

    /*
        Tạo:

        1 đáp án đúng
        +
        3 đáp án sai random từ database.
    */
    const choices =
        generateChoices(currentQuestion);


    /*
        Xóa button câu trước.
    */
    answersElement.innerHTML = "";


    /*
        Tạo 4 button.
    */
    choices.forEach(choice => {

        const button =
            document.createElement("button");


        button.className =
            "answer-button";


        button.textContent =
            choice;


        /*
            Khi click:

            gửi:
            - nghĩa đã chọn
            - chính button đó

            vào selectAnswer().
        */
        button.addEventListener(
            "click",
            () =>
                selectAnswer(
                    choice,
                    button
                )
        );


        answersElement.appendChild(
            button
        );
    });


    /* ---------------------------------------------------------
       TIMER
       --------------------------------------------------------- */

    /*
        Lấy thời gian dựa vào
        số câu hiện tại.
    */
    questionTime =
        getQuestionTime(
            questionCount
        );


    /*
        Reset thời gian.
    */
    timeLeft =
        questionTime;


    /*
        Bắt đầu countdown.
    */
    startTimer();


    /*
        Update UI.
    */
    updateHUD();
}


/* =============================================================
   GENERATE RANDOM CHOICES
   ============================================================= */

function generateChoices(question) {

    /*
        Nghĩa đúng.
    */
    const correctAnswer =
        question.meaning;


    /*
        Lấy nghĩa của tất cả từ khác.

        Ví dụ câu hiện tại:

        衰える
        Suy yếu

        thì "Suy yếu" sẽ không nằm
        trong danh sách đáp án sai.
    */
    let wrongAnswers =
        questions

            .filter(item => {

                /*
                    Không lấy chính câu hiện tại.
                */
                return (
                    item.id !== question.id
                    &&
                    item.meaning !== correctAnswer
                );
            })

            .map(item =>
                item.meaning
            );


    /*
        Xóa các meaning bị trùng.

        Ví dụ database có 2 từ
        cùng meaning "Cản trở"

        thì chỉ giữ 1.
    */
    wrongAnswers =
        [...new Set(wrongAnswers)];


    /*
        Random toàn bộ đáp án sai.
    */
    shuffleArray(
        wrongAnswers
    );


    /*
        Chỉ lấy 3 đáp án sai.
    */
    const randomWrongAnswers =
        wrongAnswers.slice(0, 3);


    /*
        Ghép:

        1 đúng
        +
        3 sai
    */
    const choices = [

        correctAnswer,

        ...randomWrongAnswers
    ];


    /*
        Random vị trí đáp án đúng.
    */
    shuffleArray(
        choices
    );


    return choices;
}


/* =============================================================
   DIFFICULTY SYSTEM
   ============================================================= */

function getQuestionTime(questionNumber) {

    /*
        Càng lên cao
        thời gian càng ngắn.

        Q1  - Q10   = 10s
        Q11 - Q20   = 8s
        Q21 - Q30   = 6s
        Q31 - Q50   = 5s
        Q51 - Q75   = 4s
        Q76 - Q100  = 3s
        Q101+       = 2.5s
    */


    if (questionNumber <= 10) {

        return 10;
    }


    if (questionNumber <= 20) {

        return 8;
    }


    if (questionNumber <= 30) {

        return 6;
    }


    if (questionNumber <= 50) {

        return 5;
    }


    if (questionNumber <= 75) {

        return 4;
    }


    if (questionNumber <= 100) {

        return 3;
    }


    return 2.5;
}


/* =============================================================
   TIMER
   ============================================================= */

function startTimer() {

    /*
        Đảm bảo không còn timer cũ.
    */
    clearInterval(timer);


    /*
        Hiện thời gian ngay lập tức.
    */
    updateTimerDisplay();


    /*
        Update mỗi 100ms.

        100ms = 0.1 giây.
    */
    timer =
        setInterval(() => {

            timeLeft -= 0.1;


            /*
                Không cho âm.
            */
            if (timeLeft < 0) {

                timeLeft = 0;
            }


            updateTimerDisplay();


            /*
                Hết giờ.
            */
            if (timeLeft <= 0) {

                clearInterval(timer);


                handleTimeout();
            }

        }, 100);
}


/* =============================================================
   UPDATE TIMER UI
   ============================================================= */

function updateTimerDisplay() {

    /*
        Ví dụ:
        9.8
        9.7
        9.6
    */
    timerTextElement.textContent =
        timeLeft.toFixed(1);


    /*
        Tính % timer còn lại.
    */
    const percentage =
        (
            timeLeft /
            questionTime
        ) * 100;


    /*
        Update thanh timer.
    */
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
        Nếu câu đã xử lý
        → không làm gì.

        Tránh double click / double tap.
    */
    if (answered) {

        return;
    }


    /*
        Đánh dấu câu đã trả lời.
    */
    answered = true;


    /*
        Dừng timer ngay khi chọn.
    */
    clearInterval(timer);


    /*
        Khóa toàn bộ 4 đáp án.
    */
    disableAnswerButtons();


    /*
        QUAN TRỌNG:

        Dù trả lời ĐÚNG hay SAI
        đều hiện hiragana.
    */
    showReading();


    /* ---------------------------------------------------------
       CORRECT
       --------------------------------------------------------- */

    if (
        selectedAnswer ===
        currentQuestion.meaning
    ) {

        /*
            Button đúng → màu xanh.
        */
        selectedButton.classList.add(
            "correct"
        );


        /*
            Xử lý điểm/combo.
        */
        handleCorrectAnswer();


        /*
            Đọc reading.

            Ví dụ:
            おとろえる

            Đọc xong mới sang câu mới.
        */
        speakJapanese(
            currentQuestion.reading,
            () => {

                nextQuestion();
            }
        );
    }


    /* ---------------------------------------------------------
       WRONG
       --------------------------------------------------------- */

    else {

        /*
            Button người chơi chọn
            → màu đỏ.
        */
        selectedButton.classList.add(
            "wrong"
        );


        /*
            Hiện đáp án đúng
            → màu xanh.
        */
        showCorrectAnswer();


        /*
            Xử lý mất mạng/combo.
        */
        handleWrongAnswer();


        /*
            Dù SAI vẫn đọc từ.

            Đây là phần mới theo yêu cầu.

            Ví dụ:

            衰える
            おとろえる 🔊
        */
        speakJapanese(
            currentQuestion.reading,
            () => {

                /*
                    Sau khi đọc xong
                    mới kiểm tra mạng.
                */
                checkLife();
            }
        );
    }
}


/* =============================================================
   CORRECT ANSWER
   ============================================================= */

function handleCorrectAnswer() {

    /*
        Tăng combo.
    */
    combo++;


    /*
        Update Max Combo.
    */
    if (combo > maxCombo) {

        maxCombo = combo;
    }


    /* ---------------------------------------------------------
       CALCULATE SCORE
       --------------------------------------------------------- */

    /*
        Base Score = 100

        Bonus dựa trên
        thời gian còn lại.

        Ví dụ còn 7.3 giây:

        100 + 73
        =
        173
    */
    let earnedScore =
        100 +
        Math.floor(
            timeLeft * 10
        );


    /*
        Combo >= 5

        x1.2
    */
    if (
        combo >= 5 &&
        combo < 10
    ) {

        earnedScore *= 1.2;
    }


    /*
        Combo >= 10

        x1.5
    */
    if (combo >= 10) {

        earnedScore *= 1.5;
    }


    /*
        Làm tròn.
    */
    earnedScore =
        Math.floor(
            earnedScore
        );


    /*
        Cộng vào Score.
    */
    score +=
        earnedScore;


    /*
        Update UI.
    */
    updateHUD();
}


/* =============================================================
   WRONG ANSWER
   ============================================================= */

function handleWrongAnswer() {

    /*
        Mất 1 mạng.
    */
    lives--;


    /*
        Sai → Combo về 0.
    */
    combo = 0;


    /*
        Update UI ngay.
    */
    updateHUD();
}


/* =============================================================
   TIME OUT
   ============================================================= */

function handleTimeout() {

    /*
        Nếu đã xử lý câu
        thì bỏ qua.
    */
    if (answered) {

        return;
    }


    answered = true;


    /*
        Hết giờ = mất mạng.
    */
    lives--;


    /*
        Reset combo.
    */
    combo = 0;


    /*
        Khóa button.
    */
    disableAnswerButtons();


    /*
        Hiện đáp án đúng.
    */
    showCorrectAnswer();


    /*
        Hết giờ cũng hiện Hiragana.
    */
    showReading();


    /*
        Update HUD.
    */
    updateHUD();


    /*
        Hết giờ cũng đọc từ.

        Nhờ vậy người học vẫn được:

        Kanji
        ↓
        Hiragana
        ↓
        Pronunciation
    */
    speakJapanese(
        currentQuestion.reading,
        () => {

            checkLife();
        }
    );
}


/* =============================================================
   SHOW READING
   ============================================================= */

function showReading() {

    /*
        reading đã được gán từ lúc
        nextQuestion():

        readingElement.textContent =
            currentQuestion.reading

        Bây giờ chỉ cần hiện nó.
    */
    readingElement.classList.add(
        "show"
    );
}


/* =============================================================
   DISABLE ANSWER BUTTONS
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

        /*
            Tìm button có nội dung
            giống meaning đúng.
        */
        if (
            button.textContent ===
            currentQuestion.meaning
        ) {

            button.classList.add(
                "correct"
            );
        }

    });
}


/* =============================================================
   JAPANESE TEXT TO SPEECH
   ============================================================= */

function speakJapanese(
    reading,
    onFinished
) {

    /*
        Nếu browser không hỗ trợ
        Speech Synthesis.

        Game vẫn phải tiếp tục.
    */
    if (
        !("speechSynthesis" in window)
    ) {

        setTimeout(
            onFinished,
            700
        );


        return;
    }


    /*
        Dừng speech cũ.
    */
    window.speechSynthesis.cancel();


    /*
        Tạo Speech Object.

        Ta đọc "reading"
        thay vì "word".

        Ví dụ:

        word:
        衰える

        reading:
        おとろえる

        → đọc おとろえる
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

        0.9 = hơi chậm
        để phù hợp học từ.
    */
    speech.rate =
        0.9;


    /*
        Cao độ bình thường.
    */
    speech.pitch =
        1.0;


    /*
        Âm lượng tối đa.
    */
    speech.volume =
        1.0;


    /* ---------------------------------------------------------
       FIND JAPANESE VOICE
       --------------------------------------------------------- */

    const voices =
        window.speechSynthesis
            .getVoices();


    /*
        Tìm voice:

        ja-JP
        ja_JP
        ja...

        tùy Windows / Android / iOS.
    */
    const japaneseVoice =
        voices.find(voice => {

            return (
                voice.lang &&
                voice.lang
                    .toLowerCase()
                    .startsWith("ja")
            );
        });


    /*
        Nếu máy có Japanese Voice
        → dùng voice đó.
    */
    if (japaneseVoice) {

        speech.voice =
            japaneseVoice;
    }


    /* ---------------------------------------------------------
       SPEECH FINISHED
       --------------------------------------------------------- */

    speech.onend = () => {

        /*
            Giữ màn hình lại 200ms
            sau khi đọc xong.

            Người chơi có thời gian
            nhìn Hiragana.
        */
        setTimeout(
            onFinished,
            200
        );
    };


    /* ---------------------------------------------------------
       SPEECH ERROR
       --------------------------------------------------------- */

    speech.onerror = () => {

        /*
            Speech lỗi cũng không được
            làm game đứng.

            Sau 500ms → tiếp tục.
        */
        setTimeout(
            onFinished,
            500
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

    /*
        Hết mạng.
    */
    if (lives <= 0) {

        gameOver();
    }


    /*
        Vẫn còn mạng.
    */
    else {

        nextQuestion();
    }
}


/* =============================================================
   UPDATE HUD
   ============================================================= */

function updateHUD() {

    /* ---------------------------------------------------------
       SCORE
       --------------------------------------------------------- */

    scoreElement.textContent =
        score.toLocaleString();


    /* ---------------------------------------------------------
       COMBO
       --------------------------------------------------------- */

    comboElement.textContent =
        `🔥 COMBO ${combo}`;


    /* ---------------------------------------------------------
       LIFE
       --------------------------------------------------------- */

    let lifeText = "";


    /*
        Luôn có tổng cộng 3 icon.

        Ví dụ lives = 2:

        ❤️ ❤️ 🖤
    */
    for (
        let i = 0;
        i < 3;
        i++
    ) {

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

    /*
        Dừng timer.
    */
    clearInterval(timer);


    /*
        Dừng âm thanh.
    */
    stopSpeech();


    /*
        Kiểm tra High Score.
    */
    saveBestScore();


    /*
        Ẩn Game Screen.
    */
    gameScreen.style.display =
        "none";


    /*
        Hiện Game Over.
    */
    gameOverScreen.style.display =
        "block";


    /*
        Hiển thị kết quả.
    */
    finalScoreElement.textContent =
        score.toLocaleString();


    finalQuestionElement.textContent =
        questionCount;


    finalComboElement.textContent =
        maxCombo;


    finalBestScoreElement.textContent =
        getBestScore()
            .toLocaleString();
}


/* =============================================================
   LOCAL STORAGE
   ============================================================= */

/*
    Lấy High Score.

    Nếu chưa có:
    return 0
*/
function getBestScore() {

    return (
        Number(
            localStorage.getItem(
                "batlingo_n1_bestScore"
            )
        )
        ||
        0
    );
}


/*
    Hiện High Score.
*/
function loadBestScore() {

    bestScoreElement.textContent =
        getBestScore()
            .toLocaleString();
}


/*
    Lưu High Score nếu phá record.
*/
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
   Fisher-Yates Algorithm
   ============================================================= */

function shuffleArray(array) {

    for (
        let i = array.length - 1;
        i > 0;
        i--
    ) {

        const j =
            Math.floor(
                Math.random() *
                (i + 1)
            );


        /*
            Swap array[i]
            và array[j].
        */
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
    () => {

        startGame();
    }
);


/* =============================================================
   PAGE CLOSE
   ============================================================= */

/*
    Nếu người chơi đóng / reload trang
    khi máy đang đọc tiếng Nhật
    → dừng speech.
*/
window.addEventListener(
    "beforeunload",
    () => {

        stopSpeech();
    }
);


/* =============================================================
   INITIALIZE BATLINGO
   ============================================================= */

/*
    Thứ tự:

    index.html
        ↓
    game.js
        ↓
    loadQuestions()
        ↓
    data/n1.json
        ↓
    startGame()
        ↓
    nextQuestion()
*/
loadQuestions();