import { renderJLPTText } from "./jlpt-text.js";

/* ==========================================
   BATLINGO - JLPT ANSWER REVIEW
========================================== */

const $ = id => document.getElementById(id);

let reviewResult = null;
let filter = "all";
let currentIndex = 0;
let initialized = false;

function show(id, visible) {
    $(id).classList.toggle("hidden", !visible);
}

function getStatus(q) {
    if (q.selectedAnswer === null ||
        q.selectedAnswer === undefined) {
        return "unanswered";
    }

    return q.selectedAnswer === q.correctIndex
        ? "correct"
        : "wrong";
}

function getVisibleIndexes() {
    if (!reviewResult) return [];

    return reviewResult.questions
        .map((q, i) => ({ q, i }))
        .filter(({ q }) =>
            filter === "all" || getStatus(q) === filter
        )
        .map(({ i }) => i);
}

function renderFilters() {
    document.querySelectorAll(
        "[data-review-filter]"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.reviewFilter === filter
        );
    });
}

/* Question navigator */

function renderNavigator() {
    const root = $("jlptAnswerReviewNavigator");
    root.replaceChildren();

    const indexes = getVisibleIndexes();

    indexes.forEach(index => {
        const q = reviewResult.questions[index];
        const status = getStatus(q);

        const button = document.createElement("button");
        button.type = "button";

        button.className =
            `jlpt-exam-nav-item review-${status}`;

        if (index === currentIndex) {
            button.classList.add("review-current");
        }

        button.textContent = index + 1;

        button.title =
            `Question ${index + 1}: ${status}`;

        button.onclick = () => {
            currentIndex = index;
            renderReview();
        };

        root.appendChild(button);
    });
}

/* Display current question */

function renderQuestion() {
    const indexes = getVisibleIndexes();

    const card = $("jlptAnswerReviewQuestionCard");

    if (!indexes.length) {
        show("jlptAnswerReviewQuestionCard", false);

        $("jlptAnswerReviewProgress").textContent =
            "0 / 0";

        $("jlptAnswerReviewPrev").disabled = true;
        $("jlptAnswerReviewNext").disabled = true;
        return;
    }

    show("jlptAnswerReviewQuestionCard", true);

    if (!indexes.includes(currentIndex)) {
        currentIndex = indexes[0];
    }

    const q = reviewResult.questions[currentIndex];
    const status = getStatus(q);

    const position = indexes.indexOf(currentIndex);

    $("jlptAnswerReviewProgress").textContent =
        `${position + 1} / ${indexes.length}`;

    $("jlptAnswerReviewGroup").textContent =
        `Question ${currentIndex + 1} · ` +
        `${q.category} · 問題${q.mondai}`;

    $("jlptAnswerReviewContext").textContent =
        q.context || "";

    const audioBox = $("jlptAnswerReviewAudioBox");
    const audio = $("jlptAnswerReviewAudio");

    audio.pause();
    audio.removeAttribute("src");
    audio.load();

    if (q.audio) {
        audio.src = q.audio;
        audioBox.classList.remove("hidden");
    } else {
        audioBox.classList.add("hidden");
    }

    renderJLPTText($("jlptAnswerReviewQuestion"),q.question);

    const statusElement = $("jlptAnswerReviewStatus");

    statusElement.className =
        `jlpt-review-status-${status}`;

    statusElement.textContent = {
        correct: "✓ CORRECT",
        wrong: "✕ WRONG",
        unanswered: "— UNANSWERED"
    }[status];

    const answers = $("jlptAnswerReviewOptions");
    answers.replaceChildren();

    q.options.forEach((option, i) => {
        const div = document.createElement("div");

        div.className = "jlpt-answer-review-option";

        if (i === q.correctIndex) {
            div.classList.add("correct");
        } else if (i === q.selectedAnswer) {
            div.classList.add("wrong");
        }

        const text = document.createElement("span");
        text.textContent = `${i + 1}. ${option}`;
        div.appendChild(text);

        if (i === q.correctIndex) {
            const tag = document.createElement("span");
            tag.className = "jlpt-review-tag";
            tag.textContent = "✓ CORRECT ANSWER";
            div.appendChild(tag);
        }

        if (i === q.selectedAnswer) {
            const tag = document.createElement("span");
            tag.className = "jlpt-review-tag";
            tag.textContent = "YOUR ANSWER";
            div.appendChild(tag);
        }

        answers.appendChild(div);
    });

    $("jlptAnswerReviewExplanation").textContent =
        q.explanation || "";

    $("jlptAnswerReviewPrev").disabled =
        position === 0;

    $("jlptAnswerReviewNext").disabled =
        position === indexes.length - 1;
}

function renderReview() {
    if (!reviewResult) return;

    renderFilters();
    renderNavigator();
    renderQuestion();
}

function moveQuestion(direction) {
    const indexes = getVisibleIndexes();
    const position = indexes.indexOf(currentIndex);
    const next = position + direction;

    if (next < 0 || next >= indexes.length) return;

    currentIndex = indexes[next];
    renderReview();
}

export function setJLPTAnswerReviewResult(result) {
    reviewResult = {
        ...result,
        questions: result.questions.map(q => ({
            ...q,
            options: [...q.options]
        }))
    };

    filter = "all";
    currentIndex = 0;
}

/* Open saved result */

export function openJLPTAnswerReview(result) {
    if (result) {
        reviewResult = {
            ...result,
            questions: result.questions.map(q => ({
                ...q,
                options: [...q.options]
            }))
        };
    }

    if (!reviewResult) return;

    filter = "all";
    currentIndex = 0;

    const total = reviewResult.total;

    $("jlptAnswerReviewSummary").textContent =
        `${reviewResult.correct} correct · ` +
        `${reviewResult.wrong} wrong · ` +
        `${reviewResult.unanswered} unanswered · ` +
        `${total} questions`;

    show("jlptExamResult", false);
    show("jlptExamPlaying", false);
    show("jlptExamAnswerReview", true);

    renderReview();
}

/* Return to result screen */

export function closeJLPTAnswerReview() {
    show("jlptExamAnswerReview", false);
    show("jlptExamResult", true);
}

/* Clear result when starting another exam */

export function clearJLPTAnswerReview() {
    reviewResult = null;
    filter = "all";
    currentIndex = 0;

    show("jlptExamAnswerReview", false);
}

export function isJLPTAnswerReviewOpen() {
    return !$("jlptExamAnswerReview")
        .classList.contains("hidden");
}

/* Initialize once */

export function initJLPTAnswerReview() {
    if (initialized) return;
    initialized = true;

    $("jlptExamReviewAnswersBtn").addEventListener(
        "click",
        () => openJLPTAnswerReview()
    );

    $("jlptAnswerReviewBack").addEventListener(
        "click",
        closeJLPTAnswerReview
    );

    $("jlptAnswerReviewPrev").addEventListener(
        "click",
        () => moveQuestion(-1)
    );

    $("jlptAnswerReviewNext").addEventListener(
        "click",
        () => moveQuestion(1)
    );

    document.querySelectorAll(
        "[data-review-filter]"
    ).forEach(button => {
        button.addEventListener("click", () => {
            filter = button.dataset.reviewFilter;
            currentIndex = getVisibleIndexes()[0] ?? 0;
            renderReview();
        });
    });
}
