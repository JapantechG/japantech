
import {
    setJLPTAnswerReviewResult,
    clearJLPTAnswerReview
} from "./jlpt-answer-review.js";

import { renderJLPTText } from "./jlpt-text.js";

/* ==========================================
   BATLINGO - JLPT EXAM PLAYER
========================================== */

let session = null;
let timerId = null;
let onSubmitHandler = null;

const $ = id => document.getElementById(id);

function show(id, visible) {
    $(id).classList.toggle("hidden", !visible);
}

function clearTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return `${String(minutes).padStart(2, "0")}:` +
           `${String(secs).padStart(2, "0")}`;
}

function answeredCount() {
    if (!session) return 0;

    return session.questions.filter(
        q => q.selectedAnswer !== null
    ).length;
}

/* ==========================================
   NAVIGATOR
========================================== */

function renderNavigator() {
    const container = $("jlptExamQuestionNavigator");
    container.replaceChildren();

    session.questions.forEach((q, index) => {
        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "jlpt-exam-nav-item";
        btn.textContent = String(index + 1);

        if (q.selectedAnswer !== null) {
            btn.classList.add("answered");
        }

        if (q.flagged) {
            btn.classList.add("flagged");
        }

        if (index === session.currentIndex) {
            btn.classList.add("current");
            btn.setAttribute("aria-current", "step");
        }

        btn.setAttribute(
            "aria-label",
            `Question ${index + 1}: ` +
            (q.selectedAnswer !== null ? "Answered" : "Unanswered") +
            (q.flagged ? ", Flagged" : "")
        );

        btn.addEventListener("click", () => {
            if (!session || session.submitted) return;

            session.currentIndex = index;
            renderQuestion();
        });

        container.appendChild(btn);
    });

    $("jlptExamAnswered").textContent =
        `${answeredCount()} / ${session.questions.length}`;
}

/* ==========================================
   QUESTION
========================================== */

function renderQuestion() {
    if (!session || session.submitted) return;

    const index = session.currentIndex;
    const q = session.questions[index];
    const total = session.questions.length;

    renderJLPTText($("jlptExamQuestionText"),q.question);

    const context = $("jlptExamContext");
    const audioBox = $("jlptExamAudioBox");
    const audio = $("jlptExamAudio");

    // Stop previous audio when changing question.
    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    // In Test Mode, hide listening transcript.
    // Practice Mode can show it for basic testing.
    const showContext =
        q.category !== "listening" ||
        session.mode === "practice";

    context.textContent =
        showContext ? (q.context || "") : "";

    if (q.audio) {
        audio.src = q.audio;
        audioBox.classList.remove("hidden");
    } else {
        audioBox.classList.add("hidden");
    }

    $("jlptExamQuestionGroup").textContent =
        `${q.category.toUpperCase()} · 問題${q.mondai}`;

    $("jlptExamProgress").textContent =
        `${index + 1} / ${total}`;

    $("jlptExamProgressBar").style.width =
        `${((index + 1) / total) * 100}%`;

    $("jlptExamFlag").classList.toggle("active", q.flagged);

    $("jlptExamFlag").textContent =
        q.flagged ? "⚑ FLAGGED" : "⚑ FLAG";

    const container = $("jlptExamAnswers");
    container.replaceChildren();

    q.options.forEach((option, optionIndex) => {
        const btn = document.createElement("button");

        btn.type = "button";
        btn.className = "jlpt-exam-answer";
        btn.textContent = `${optionIndex + 1}. ${option}`;

        if (q.selectedAnswer === optionIndex) {
            btn.classList.add("active");
            btn.setAttribute("aria-pressed", "true");
        } else {
            btn.setAttribute("aria-pressed", "false");
        }

        btn.addEventListener("click", () => {
            if (!session || session.submitted) return;

            q.selectedAnswer = optionIndex;
            renderQuestion();
        });

        container.appendChild(btn);
    });

    $("jlptExamPrev").disabled = index === 0;
    $("jlptExamNext").disabled = index === total - 1;

    renderNavigator();
}

function previousQuestion() {
    if (!session || session.submitted) return;

    session.currentIndex = Math.max(
        0, session.currentIndex - 1
    );

    renderQuestion();
}

function nextQuestion() {
    if (!session || session.submitted) return;

    session.currentIndex = Math.min(
        session.questions.length - 1,
        session.currentIndex + 1
    );

    renderQuestion();
}

function toggleFlag() {
    if (!session || session.submitted) return;

    const q = session.questions[session.currentIndex];
    q.flagged = !q.flagged;

    renderQuestion();
}

/* ==========================================
   TIMER
========================================== */

function updateTimer() {
    if (!session || session.submitted) return;

    const elapsed = Math.floor(
        (Date.now() - session.startedAt) / 1000
    );

    if (session.mode === "practice") {
        $("jlptExamTimer").textContent =
            formatTime(elapsed);
        return;
    }

    const remaining = Math.max(
        0,
        session.durationSeconds - elapsed
    );

    $("jlptExamTimer").textContent =
        formatTime(remaining);

    if (remaining <= 0) {
        finishExam("timeout");
    }
}

/* ==========================================
   SUBMIT
========================================== */

function requestSubmit() {
    if (!session || session.submitted) return;

    const answered = answeredCount();
    const total = session.questions.length;
    const flagged = session.questions.filter(
        q => q.flagged
    ).length;

    $("jlptExamConfirmSummary").textContent =
        `Answered: ${answered}/${total}\n` +
        `Unanswered: ${total - answered}\n` +
        `Flagged: ${flagged}\n\n` +
        "Sau khi nộp bài sẽ không thể sửa đáp án.";

    show("jlptExamConfirm", true);
    $("jlptExamCancelSubmit").focus();
}

function calculateResult() {
    const questions = session.questions;
    const total = questions.length;

    const correct = questions.filter(
        q => q.selectedAnswer === q.correctIndex
    ).length;

    const answered = answeredCount();

    const groups = new Map();

    questions.forEach(q => {
        const key = `${q.category}:${q.mondai}`;

        if (!groups.has(key)) {
            groups.set(key, {
                category: q.category,
                mondai: q.mondai,
                total: 0,
                correct: 0,
                wrong: 0,
                unanswered: 0
            });
        }

        const group = groups.get(key);
        group.total++;

        if (q.selectedAnswer === null) {
            group.unanswered++;
        } else if (q.selectedAnswer === q.correctIndex) {
            group.correct++;
        } else {
            group.wrong++;
        }
    });

    return {
        level: session.level,
        setId: session.setId,
        mode: session.mode,
        total,
        correct,
        wrong: answered - correct,
        unanswered: total - answered,
        accuracy: Math.round(correct / total * 1000) / 10,
        elapsedSeconds: Math.floor(
            (session.finishedAt - session.startedAt) / 1000
        ),
        submittedBy: session.submittedBy,
        groups: [...groups.values()],
        questions: questions.map(q => ({
            ...q,
            options: [...q.options]
        }))
    };
}

function renderResult(result) {
    $("jlptExamAccuracy").textContent =
        `${result.accuracy}%`;

    $("jlptExamResultSummary").textContent =
        `${result.correct}/${result.total} correct · ` +
        `${result.wrong} wrong · ` +
        `${result.unanswered} unanswered`;

    const container = $("jlptExamResultDetails");
    container.replaceChildren();

    result.groups.forEach(group => {
        const accuracy = Math.round(
            group.correct / group.total * 1000
        ) / 10;

        const item = document.createElement("div");
        item.className = "jlpt-exam-result-item";

        const name = document.createElement("span");
        name.textContent =
            `${group.category} · 問題${group.mondai}`;

        const score = document.createElement("strong");
        score.textContent =
            `${group.correct}/${group.total} (${accuracy}%)`;

        item.append(name, score);
        container.appendChild(item);
    });
}

function finishExam(reason = "manual") {
    if (!session || session.submitted) return;

    session.submitted = true;
    session.submittedBy = reason;
    session.finishedAt = Date.now();

    clearTimer();
    show("jlptExamConfirm", false);

   const result = calculateResult();

    // Lưu kết quả để xem lại sau khi nộp
    setJLPTAnswerReviewResult(result);

    // Hiển thị kết quả tổng
    renderResult(result);

    show("jlptExamPlaying", false);
    show("jlptExamResult", true);

    // Future integration point for Exam History
    // and separate JLPT Wrong Answer Review.
    if (typeof onSubmitHandler === "function") {
        try {
            Promise.resolve(onSubmitHandler(result))
                .catch(console.error);
        } catch (error) {
            console.error(error);
        }
    }
}

/* ==========================================
   PUBLIC API
========================================== */

export function startJLPTExamPlayer({
    level,
    setId,
    mode,
    questions,
    durationSeconds,
    onSubmit
}) {

    clearJLPTAnswerReview();

    if (!Array.isArray(questions) || !questions.length) {
        throw new Error("Exam has no questions");
    }

    if (!["practice", "test"].includes(mode)) {
        throw new Error("Invalid exam mode");
    }

    if (
        mode === "test" &&
        (!Number.isSafeInteger(durationSeconds) ||
         durationSeconds <= 0)
    ) {
        throw new Error("Invalid test duration");
    }

    clearTimer();

    onSubmitHandler = onSubmit || null;

    session = {
        level,
        setId,
        mode,
        durationSeconds,
        questions: questions.map(q => ({
            ...q,
            options: [...q.options],
            selectedAnswer: null,
            flagged: false
        })),
        currentIndex: 0,
        submitted: false,
        submittedBy: null,
        startedAt: Date.now()
    };

    $("jlptExamPlayingTitle").textContent =
        `${level} · ${setId} · ${mode.toUpperCase()}`;

    $("jlptExamTimerLabel").textContent =
        mode === "test" ? "Remaining" : "Elapsed";

    show("jlptExamConfirm", false);
    show("jlptExamConfig", false);
    show("jlptExamResult", false);
    show("jlptExamPlaying", true);

    renderQuestion();
    updateTimer();

    if (!session.submitted) {
        timerId = setInterval(updateTimer, 1000);
    }
}

export function stopJLPTExamPlayer() {
    clearTimer();
    session = null;
    onSubmitHandler = null;

    show("jlptExamConfirm", false);
}

export function hasActiveJLPTExam() {
    return !!session && !session.submitted;
}

/* Bind all player buttons once */

export function initJLPTExamPlayer() {
    $("jlptExamPrev").addEventListener(
        "click", previousQuestion
    );

    $("jlptExamNext").addEventListener(
        "click", nextQuestion
    );

    $("jlptExamFlag").addEventListener(
        "click", toggleFlag
    );

    $("jlptExamSubmit").addEventListener(
        "click", requestSubmit
    );

    $("jlptExamCancelSubmit").addEventListener(
        "click", () => show("jlptExamConfirm", false)
    );

    $("jlptExamConfirmSubmit").addEventListener(
        "click", () => finishExam("manual")
    );
}
