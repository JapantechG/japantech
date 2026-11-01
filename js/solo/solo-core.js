
/* =============================================================
   BATLINGO - SOLO CORE
   Shared by Survival and Practice
============================================================= */

/* =============================================================
   DATABASE PATH
============================================================= */

export function getSoloDataFile(config) {

    if (
        config.studyMode === "jlpt" &&
        config.category === "vocabulary"
    ) {
        return `data/${config.target}.json`;
    }

    if (
        config.studyMode === "jlpt" &&
        config.category === "grammar"
    ) {
        return `data/grammar/${config.target}.json`;
    }

    if (
        config.studyMode === "topic" &&
        config.category === "vocabulary"
    ) {
        if (!config.target) return null;

        return `data/topics/${config.target}.json`;
    }

    return null;
}

/* =============================================================
   LOAD DATABASE
============================================================= */

export async function loadSoloQuestions(config) {

    const dataFile = getSoloDataFile(config);

    if (!dataFile) {
        throw new Error(
            "Mode này hiện chưa có database."
        );
    }

    const response = await fetch(dataFile);

    if (!response.ok) {
        throw new Error(
            `Không thể load ${dataFile}`
        );
    }

    const questions = await response.json();

    if (!Array.isArray(questions)) {
        throw new Error(
            "Database không đúng định dạng Array."
        );
    }

    if (questions.length < 4) {
        throw new Error(
            "Database cần ít nhất 4 câu hỏi."
        );
    }

    return questions;
}

/* =============================================================
   SHUFFLE
============================================================= */

export function shuffleSoloArray(array) {

    for (let i = array.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [array[i], array[j]] = [
            array[j], array[i]
        ];
    }

    return array;
}

/* =============================================================
   ANSWER FIELD
============================================================= */

export function getSoloAnswerField(subMode) {

    switch (subMode) {

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
   GENERATE ANSWER CHOICES
============================================================= */

export function generateSoloChoices(
    question,
    database,
    config
) {

    let correctAnswer;
    let wrongAnswers;

    if (config.subMode === "grammar_sentence") {

        correctAnswer = question.grammar;

        wrongAnswers = database
            .filter(item =>
                item.id !== question.id &&
                item.grammar &&
                item.grammar !== correctAnswer
            )
            .map(item => item.grammar);

    } else {

        const field = getSoloAnswerField(
            config.subMode
        );

        correctAnswer = question[field];

        wrongAnswers = database
            .filter(item =>
                item[field] !== correctAnswer
            )
            .map(item => item[field]);
    }

    if (
        correctAnswer === undefined ||
        correctAnswer === null ||
        correctAnswer === ""
    ) {
        throw new Error(
            "Question has no correct answer."
        );
    }

    const uniqueWrong = [
        ...new Set(
            wrongAnswers.filter(answer =>
                answer !== null &&
                answer !== undefined &&
                answer !== ""
            )
        )
    ];

    shuffleSoloArray(uniqueWrong);

    if (uniqueWrong.length < 3) {
        throw new Error(
            "Database không đủ 3 đáp án sai."
        );
    }

    const choices = [
        correctAnswer,
        ...uniqueWrong.slice(0, 3)
    ];

    shuffleSoloArray(choices);

    return {
        correctAnswer,
        choices
    };
}

/* =============================================================
   QUESTION DISPLAY
============================================================= */

export function getSoloQuestionText(
    question,
    config,
    grammarExample = null
) {

    switch (config.subMode) {

        case "grammar_meaning":
            return question.grammar ?? "";

        case "grammar_sentence":
            return grammarExample?.translation ?? "";

        case "kanji_hiragana":
            return question.word ?? "";

        case "hiragana_meaning":
            return question.reading ?? "";

        case "meaning_kanji":
            return question.meaning ?? "";

        case "audio_hiragana":
        case "audio_meaning":
        case "audio_kanji":
            return "🔊";

        default:
            return question.word ?? "";
    }
}

/* =============================================================
   GRAMMAR EXAMPLE
============================================================= */

export function getRandomGrammarExample(question) {

    const examples = question.examples ?? [];

    if (!Array.isArray(examples) || examples.length === 0) {
        return null;
    }

    return examples[
        Math.floor(Math.random() * examples.length)
    ];
}

/* =============================================================
   AUDIO MODE
============================================================= */

export function isSoloAudioMode(subMode) {

    return [
        "audio_hiragana",
        "audio_meaning",
        "audio_kanji"
    ].includes(subMode);
}

/* =============================================================
   SURVIVAL TIME
============================================================= */

export function getSurvivalQuestionTime(number) {

    if (number <= 10) return 10;
    if (number <= 20) return 8;
    if (number <= 30) return 6;
    if (number <= 50) return 5;
    if (number <= 75) return 4;
    if (number <= 100) return 3;

    return 2.5;
}

/* =============================================================
   PRACTICE QUESTION POOL
   No repeated question objects
============================================================= */

export function createPracticeQuestionPool(
    database,
    requestedCount
) {

    const raw = Number(requestedCount);

    const count = Number.isFinite(raw)
        ? Math.max(1, Math.min(100, Math.round(raw)))
        : 20;

    const unique = [];
    const used = new Set();

    database.forEach((question, index) => {

        // Prefer unique ID; otherwise use original index.
        const key = question.id != null
            ? `id:${question.id}`
            : `index:${index}`;

        if (used.has(key)) return;

        used.add(key);
        unique.push(question);
    });

    return shuffleSoloArray(unique).slice(0, count);
}
