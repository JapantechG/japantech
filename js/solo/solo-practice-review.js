
/* =============================================================
   BATLINGO - PRACTICE RESULTS & REVIEW
============================================================= */

const byId = id => document.getElementById(id);

let savedResults = [];
let filteredResults = [];
let selectedPosition = 0;
let currentFilter = "all";
let initialized = false;

function setText(id, value) {
    const el = byId(id);
    if (el) el.textContent = String(value);
}

/* =============================================================
   RESULTS
============================================================= */

export function showPracticeResults(results, total) {

    savedResults = [...results];

    const correct = results.filter(
        item => item.status === "correct"
    ).length;

    const wrong = results.filter(
        item => item.status === "wrong"
    ).length;

    const timeout = results.filter(
        item => item.status === "timeout"
    ).length;

    const accuracy = total > 0
        ? Math.round(correct / total * 100)
        : 0;

    setText("practiceAccuracy", `${accuracy}%`);
    setText("practiceCorrect", correct);
    setText("practiceWrong", wrong);
    setText("practiceTimeout", timeout);

    setText(
        "practiceTotal",
        `${results.length} / ${total} QUESTIONS`
    );

    byId("practiceReviewScreen")
        ?.classList.add("hidden");

    byId("practiceResultScreen")
        ?.classList.remove("hidden");
}

/* =============================================================
   FILTER
============================================================= */

function applyFilter(filter) {

    currentFilter = filter;

    filteredResults = savedResults.filter(item => {

        if (filter === "correct") {
            return item.status === "correct";
        }

        if (filter === "wrong") {
            return item.status === "wrong" ||
                   item.status === "timeout";
        }

        if (filter === "timeout") {
            return item.status === "timeout";
        }

        return true;
    });

    selectedPosition = 0;

    updateFilterButtons();
    renderGrid();
    renderCurrent();
}

function updateFilterButtons() {

    const allButton =
        byId("practiceReviewAllFilter");

    const wrongButton =
        byId("practiceReviewWrongFilter");

    // ALL includes the correct-only result shortcut.
    allButton?.classList.toggle(
        "active",
        currentFilter === "all" ||
        currentFilter === "correct"
    );

    wrongButton?.classList.toggle(
        "active",
        currentFilter === "wrong" ||
        currentFilter === "timeout"
    );
}

/* =============================================================
   OPEN REVIEW
============================================================= */

export function openPracticeReview(results, filter = "all") {

    savedResults = [...results];

    byId("practiceResultScreen")
        ?.classList.add("hidden");

    byId("practiceReviewScreen")
        ?.classList.remove("hidden");

    applyFilter(filter);
}

/* =============================================================
   QUESTION GRID
============================================================= */

function renderGrid() {

    const grid = byId("practiceReviewGrid");
    if (!grid) return;

    grid.replaceChildren();

    filteredResults.forEach((result, index) => {

        const button = document.createElement("button");

        button.type = "button";
        button.textContent = result.number;
        button.className = result.status;

        button.classList.toggle(
            "active",
            selectedPosition === index
        );

        button.addEventListener("click", () => {
            selectedPosition = index;
            renderGrid();
            renderCurrent();
        });

        grid.appendChild(button);
    });
}

/* =============================================================
   DISPLAY SELECTED QUESTION
============================================================= */

function renderCurrent() {

    const result = filteredResults[selectedPosition];

    const card = byId("practiceReviewQuestion");
    const answers = byId("practiceReviewAnswers");
    const explanation = byId("practiceReviewExplanation");

    if (!result) {

        setText("practiceReviewNumber", "NO QUESTIONS");
        setText("practiceReviewQuestion", "No matching answers.");
        setText("practiceReviewReading", "");

        answers?.replaceChildren();
        explanation?.replaceChildren();

        updateNavigation();
        return;
    }

    setText(
        "practiceReviewNumber",
        `QUESTION ${result.number} · ${result.status.toUpperCase()}`
    );

    if (card) {
        card.textContent = result.questionText;
    }

    const reading = result.question.reading ?? "";

    setText("practiceReviewReading", reading);

    answers.replaceChildren();

    result.choices.forEach((choice, index) => {

        const row = document.createElement("div");

        row.className = "practice-review-answer";

        const isCorrect = index === result.correctIndex;
        const isSelected = index === result.selectedIndex;

        if (isCorrect) {
            row.classList.add("correct");
        }

        if (isSelected && !isCorrect) {
            row.classList.add("wrong");
        }

        const answerText = document.createElement("span");

        answerText.textContent =
            `${index + 1}. ${String(choice)}`;

        row.appendChild(answerText);

        if (isCorrect || isSelected) {

            const indicator = document.createElement("strong");

            indicator.textContent = isCorrect
                ? " ✓ CORRECT"
                : " ✕ YOUR ANSWER";

            row.appendChild(indicator);
        }

        answers.appendChild(row);
    });

    explanation.replaceChildren();

    // Display only data that exists in the database.
    const detail =
        result.question.explanation ??
        result.question.description ??
        result.question.note ??
        "";

    if (detail) {

        const paragraph = document.createElement("p");

        paragraph.textContent = String(detail);

        explanation.appendChild(paragraph);
    }

    if (result.status === "timeout") {

        const timeoutMessage = document.createElement("p");
        timeoutMessage.textContent = "⏱ Time expired.";

        explanation.appendChild(timeoutMessage);
    }

    updateNavigation();
}

/* =============================================================
   PREVIOUS / NEXT
============================================================= */

function updateNavigation() {

    const prev = byId("practiceReviewPrev");
    const next = byId("practiceReviewNext");

    if (prev) {
        prev.disabled = selectedPosition <= 0;
    }

    if (next) {
        next.disabled =
            selectedPosition >= filteredResults.length - 1;
    }
}

function moveQuestion(direction) {

    const nextPosition = selectedPosition + direction;

    if (
        nextPosition < 0 ||
        nextPosition >= filteredResults.length
    ) {
        return;
    }

    selectedPosition = nextPosition;

    renderGrid();
    renderCurrent();
}

/* =============================================================
   CLOSE REVIEW
============================================================= */

export function hidePracticeReview() {

    byId("practiceReviewScreen")
        ?.classList.add("hidden");

    byId("practiceResultScreen")
        ?.classList.add("hidden");
}

function backToResults() {

    byId("practiceReviewScreen")
        ?.classList.add("hidden");

    byId("practiceResultScreen")
        ?.classList.remove("hidden");
}

/* =============================================================
   INITIALIZATION
============================================================= */

export function initPracticeReview() {

    if (initialized) return;
    initialized = true;

    byId("practiceReviewBackBtn")
        ?.addEventListener("click", backToResults);

    byId("practiceReviewAllFilter")
        ?.addEventListener("click", () => {
            applyFilter("all");
        });

    byId("practiceReviewWrongFilter")
        ?.addEventListener("click", () => {
            applyFilter("wrong");
        });

    byId("practiceReviewPrev")
        ?.addEventListener("click", () => {
            moveQuestion(-1);
        });

    byId("practiceReviewNext")
        ?.addEventListener("click", () => {
            moveQuestion(1);
        });
}
