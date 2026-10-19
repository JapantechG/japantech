
/* ==========================================
   BATLINGO - JLPT EXAM UI
========================================== */

import {
    JLPT_EXAM_SETTINGS,
    JLPT_CATEGORIES,
    getMondaiList
} from "./jlpt-exam-config.js";

import {
    loadJLPTSets,
    chooseJLPTSet,
    loadJLPTExam
} from "./jlpt-exam-data.js";

import {
    initJLPTExamPlayer,
    startJLPTExamPlayer,
    stopJLPTExamPlayer,
    hasActiveJLPTExam
} from "./jlpt-exam-player.js";

import {
    saveJLPTExamMistakes
} from "./jlpt-review.js";

import {
    initJLPTReviewUI,
    openPractice
} from "./jlpt-review-ui.js";

import {
    initJLPTAnswerReview,
    clearJLPTAnswerReview,
    closeJLPTAnswerReview,
    isJLPTAnswerReviewOpen
} from "./jlpt-answer-review.js";

const $ = id => document.getElementById(id);

const state = {
    level: "N1",
    selected: new Set(),
    setMode: "random",
    sets: [],
    loading: false,
    lastSetId: null
};

let initialized = false;

function show(id, visible) {
    $(id).classList.toggle("hidden", !visible);
}

function message(text = "") {
    $("jlptExamConfigMessage").textContent = text;
}

function selectedMondai() {
    const all = getMondaiList(state.level);

    return all.filter(item => state.selected.has(item.key));
}

function updateSummary() {
    const selected = selectedMondai();

    $("jlptExamSelectedCount").textContent =
        selected.length;

    $("jlptExamQuestionCount").textContent =
        selected.reduce((sum, item) => sum + item.count, 0);

    $("jlptExamToggleAll").textContent =
        selected.length === getMondaiList(state.level).length
        ? "CLEAR ALL"
        : "SELECT ALL";

    $("jlptExamStart").disabled =
        selected.length === 0 || state.loading;
}

/* ==========================================
   LEVEL
========================================== */

function renderLevels() {
    document.querySelectorAll(
        "#jlptExamLevels [data-level]"
    ).forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.level === state.level
        );
    });
}

/* ==========================================
   MONDAI
========================================== */

function renderMondai() {
    const root = $("jlptExamMondai");
    root.replaceChildren();

    const all = getMondaiList(state.level);

    for (const [category, title] of Object.entries(JLPT_CATEGORIES)) {
        const items = all.filter(
            item => item.category === category
        );

        if (!items.length) continue;

        const section = document.createElement("div");
        section.className = "jlpt-exam-category";

        const header = document.createElement("div");
        header.className = "jlpt-exam-category-header";

        const label = document.createElement("strong");
        label.textContent = title;

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "jlpt-exam-small-btn";
        toggle.textContent = "ALL";

        toggle.addEventListener("click", () => {
            const allSelected = items.every(
                item => state.selected.has(item.key)
            );

            items.forEach(item => {
                if (allSelected) {
                    state.selected.delete(item.key);
                } else {
                    state.selected.add(item.key);
                }
            });

            renderMondai();
            updateSummary();
        });

        header.append(label, toggle);
        section.appendChild(header);

        const options = document.createElement("div");
        options.className = "jlpt-exam-category-options";

        items.forEach(item => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "jlpt-exam-mondai-btn";
            button.textContent = `問題${item.mondai}`;

            button.classList.toggle(
                "active",
                state.selected.has(item.key)
            );

            button.setAttribute(
                "aria-pressed",
                String(state.selected.has(item.key))
            );

            button.addEventListener("click", () => {
                if (state.selected.has(item.key)) {
                    state.selected.delete(item.key);
                } else {
                    state.selected.add(item.key);
                }

                renderMondai();
                updateSummary();
            });

            options.appendChild(button);
        });

        section.appendChild(options);
        root.appendChild(section);
    }
}

/* ==========================================
   SET SELECTOR
========================================== */

async function refreshSets() {
    const levelAtStart = state.level;
    const select = $("jlptExamSetSelect");

    select.replaceChildren();
    state.sets = [];

    try {
        const sets = await loadJLPTSets(levelAtStart);

        // Ignore stale results if player changed level.
        if (state.level !== levelAtStart) return;

        state.sets = sets;

        sets.forEach(set => {
            const option = document.createElement("option");
            option.value = set.id;
            option.textContent = set.id.toUpperCase();

            select.appendChild(option);
        });

        if (!sets.length) {
            message(`Chưa có Set được bật cho ${state.level}`);
        } else {
            message("");
        }
    } catch (error) {
        if (state.level !== levelAtStart) return;

        message(`Không thể tải danh sách Set: ${error.message}`);
    }
}

function updateSetMode() {
    $("jlptExamSetSelect").disabled =
        state.setMode !== "manual";
}

/* ==========================================
   MODE DESCRIPTION
========================================== */

function updateModeDescription() {
    const mode = document.querySelector(
        'input[name="jlptExamType"]:checked'
    ).value;

    $("jlptExamModeDescription").textContent =
        mode === "practice"
        ? "Practice: không giới hạn thời gian, tự nộp khi hoàn thành."
        : "Test: có đồng hồ đếm ngược, tự nộp khi hết giờ.";
}

/* ==========================================
   START EXAM
========================================== */

async function startExam(options = {}) {
    if (state.loading) return;

    const level = state.level;
    const selected = selectedMondai();

    if (!selected.length) {
        message("Vui lòng chọn ít nhất một Mondai");
        return;
    }

    const mode = document.querySelector(
        'input[name="jlptExamType"]:checked'
    ).value;

    const manualSet = $("jlptExamSetSelect").value;

    state.loading = true;
    updateSummary();
    message("Đang tải bộ đề...");

    try {
        let setId;

        if (options.retrySetId) {
            setId = options.retrySetId;
        } else {
            setId = await chooseJLPTSet(
                level,
                selected,
                state.setMode,
                manualSet
            );
        }

        const exam = await loadJLPTExam(
            level,
            setId,
            selected
        );

        // Temporary Test duration for the basic version.
        const durationSeconds = mode === "test"
            ? exam.questions.length *
              JLPT_EXAM_SETTINGS.testSecondsPerQuestion
            : null;

        state.lastSetId = setId;

        const submissionId = `exam_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        startJLPTExamPlayer({
            level,
            setId,
            mode,
            questions: exam.questions,
            durationSeconds,

           onSubmit: async result => {
                console.log("JLPT EXAM RESULT", result);

                try {
                    const saved = await saveJLPTExamMistakes(
                        result,
                        submissionId
                    );

                    console.log(
                        saved
                            ? "JLPT mistakes saved"
                            : "Submission already processed"
                    );
                } catch (error) {
                    console.error("JLPT Review save failed:", error);

                    // Không báo đã lưu thành công nếu Firebase lỗi.
                    // Cần cơ chế Retry cùng submissionId
                    // trong bước bổ sung lưu bài an toàn.
                }
            }
        });

        message("");
    } catch (error) {
        console.error("JLPT Exam error:", error);
        message(error.message);
    } finally {
        state.loading = false;
        updateSummary();
    }
}

/* ==========================================
   NAVIGATION
========================================== */

function returnToConfig() {
    stopJLPTExamPlayer();
    openPractice();
    clearJLPTAnswerReview();

    show("jlptExamPlaying", false);
    show("jlptExamResult", false);
    show("jlptExamConfig", true);
}

function closeExam() {
    if (
        hasActiveJLPTExam() &&
        !window.confirm(
            "Bài đang làm chưa được nộp.\n" +
            "Thoát sẽ mất tiến độ. Bạn có muốn thoát?"
        )
    ) {
        return;
    }

    returnToConfig();
    show("jlptExamScreen", false);
    show("jlptExamReviewScreen", false);
}

/* ==========================================
   PUBLIC INITIALIZER
========================================== */

export function initJLPTExam() {
    initJLPTReviewUI();
    initJLPTAnswerReview();

    if (initialized) return;

    if (!$("jlptExamScreen") || !$("jlptExamHeaderBtn")) {
        console.error("JLPT Exam HTML elements are missing");
        return;
    }

    initialized = true;

    initJLPTExamPlayer();

    $("jlptExamHeaderBtn").addEventListener("click", () => {
        show("jlptExamScreen", true);
    });

    $("jlptExamBack").addEventListener("click", () => {

        if (isJLPTAnswerReviewOpen()) {
            closeJLPTAnswerReview();
            return;
        }

        if (!$("jlptExamPlaying").classList.contains("hidden") ||
            !$("jlptExamResult").classList.contains("hidden")) {
            if (
                hasActiveJLPTExam() &&
                !window.confirm("Thoát bài đang làm?")
            ) return;

            returnToConfig();
        } else {
            closeExam();
        }
    });

    document.querySelectorAll(
        "#jlptExamLevels [data-level]"
    ).forEach(button => {
        button.addEventListener("click", async () => {
            state.level = button.dataset.level;
            state.selected.clear();
            state.lastSetId = null;

            renderLevels();
            renderMondai();
            updateSummary();

            await refreshSets();
        });
    });

    $("jlptExamToggleAll").addEventListener("click", () => {
        const all = getMondaiList(state.level);

        if (state.selected.size === all.length) {
            state.selected.clear();
        } else {
            state.selected = new Set(
                all.map(item => item.key)
            );
        }

        renderMondai();
        updateSummary();
    });

    document.querySelectorAll(
        'input[name="jlptExamSetMode"]'
    ).forEach(input => {
        input.addEventListener("change", () => {
            if (!input.checked) return;

            state.setMode = input.value;
            updateSetMode();
        });
    });

    document.querySelectorAll(
        'input[name="jlptExamType"]'
    ).forEach(input => {
        input.addEventListener(
            "change",
            updateModeDescription
        );
    });

    $("jlptExamStart").addEventListener(
        "click",
        () => startExam()
    );

    $("jlptExamRetry").addEventListener(
        "click",
        () => {
            returnToConfig();
            startExam({ retrySetId: state.lastSetId });
        }
    );

    $("jlptExamReturn").addEventListener(
        "click",
        returnToConfig
    );

    renderLevels();
    renderMondai();
    updateSummary();
    updateSetMode();
    updateModeDescription();
    refreshSets();
}
