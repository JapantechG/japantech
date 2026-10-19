
/* ==========================================
   BATLINGO - JLPT REVIEW UI
========================================== */

import {
    getJLPTReviewItems,
    getJLPTReviewBatch,
    markJLPTReviewAnswer,
    JLPT_REVIEW_MAX
} from "./jlpt-review.js";

import {
    loadJLPTExam
} from "./jlpt-exam-data.js";

import {
    startJLPTExamPlayer,
    hasActiveJLPTExam
} from "./jlpt-exam-player.js";

const $ = id => document.getElementById(id);

let initialized = false;

function show(id, visible) {
    $(id).classList.toggle("hidden", !visible);
}

async function refreshReview() {
    const items = await getJLPTReviewItems();
    const count = items.length;

    $("jlptExamReviewCounter").textContent =
        `${count}/${JLPT_REVIEW_MAX}`;

    $("jlptExamReviewStatus").textContent =
        `${count} questions waiting for review`;

    $("jlptExamReviewProgressBar").style.width =
        `${count / JLPT_REVIEW_MAX * 100}%`;

    $("jlptExamReviewStart").disabled = count === 0;
}

async function openReview() {
    if (hasActiveJLPTExam()) return;

    show("jlptExamConfig", false);
    show("jlptExamResult", false);
    show("jlptExamReviewScreen", true);

    $("jlptExamOpenPractice").classList.remove("active");
    $("jlptExamOpenReview").classList.add("active");

    try {
        await refreshReview();
    } catch (error) {
        $("jlptExamReviewStatus").textContent =
            error.message;
        $("jlptExamReviewStart").disabled = true;
    }
}

function openPractice() {
    if (hasActiveJLPTExam()) return;

    show("jlptExamReviewScreen", false);
    show("jlptExamResult", false);
    show("jlptExamConfig", true);

    $("jlptExamOpenReview").classList.remove("active");
    $("jlptExamOpenPractice").classList.add("active");
}

/* Load original questions using Set references */

async function loadReviewQuestions(items) {
    const questions = [];
    const cache = new Map();

    for (const item of items) {
        const groupKey =
            `${item.level}:${item.setId}:` +
            `${item.category}:${item.mondai}`;

        if (!cache.has(groupKey)) {
            const exam = await loadJLPTExam(
                item.level,
                item.setId,
                [{
                    category: item.category,
                    mondai: item.mondai
                }]
            );

            cache.set(groupKey, exam.questions);
        }

        const source = cache.get(groupKey).find(
            q => q.id === item.questionId
        );

        if (!source) {
            throw new Error(
                `Missing review question: ${item.key}`
            );
        }

        questions.push({
            ...source,
            reviewKey: item.key
        });
    }

    return questions;
}

async function startReview() {
    const button = $("jlptExamReviewStart");
    button.disabled = true;

    try {
        const items = await getJLPTReviewBatch();

        if (items.length === 0) {
            await refreshReview();
            return;
        }

        const questions = await loadReviewQuestions(items);

        startJLPTExamPlayer({
            level: "JLPT",
            setId: "REVIEW",
            mode: "practice",
            questions,
            durationSeconds: null,

            onSubmit: async result => {
                // Update correct streak only once per
                // completed review. This basic version
                // does not include retry-safe persistence.
                for (const q of result.questions) {
                    const isCorrect =
                        q.selectedAnswer === q.correctIndex;

                    await markJLPTReviewAnswer(
                        q.reviewKey,
                        isCorrect
                    );
                }

                await refreshReview();
            }
        });

        show("jlptExamReviewScreen", false);

    } catch (error) {
        console.error(error);
        $("jlptExamReviewStatus").textContent =
            error.message;
    } finally {
        button.disabled = false;
    }
}

export function initJLPTReviewUI() {
    if (initialized) return;
    initialized = true;

    $("jlptExamOpenReview").addEventListener(
        "click", openReview
    );

    $("jlptExamOpenPractice").addEventListener(
        "click", openPractice
    );

    $("jlptExamReviewStart").addEventListener(
        "click", startReview
    );
}

export { openPractice };
