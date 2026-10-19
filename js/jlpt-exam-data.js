
/* ==========================================
   BATLINGO - JLPT EXAM DATA
   Format: one object per question
========================================== */

import {
    getMondaiCount
} from "./jlpt-exam-config.js";

const ROOT = "./data/jlpt";

const CATEGORIES = [
    "vocabulary",
    "grammar",
    "reading",
    "listening"
];

/* ------------------------------------------
   VALIDATION
------------------------------------------ */

function checkLevel(level) {
    if (!/^N[1-5]$/.test(level)) {
        throw new Error("Invalid JLPT level");
    }
}

function checkSetId(setId) {
    if (!/^set\d+$/.test(setId)) {
        throw new Error("Invalid Set ID");
    }
}

function checkMondai(category, mondai) {
    if (
        !CATEGORIES.includes(category) ||
        !Number.isInteger(mondai) ||
        mondai < 1
    ) {
        throw new Error("Invalid Mondai");
    }
}

async function loadJSON(path) {
    const response = await fetch(path, {
        cache: "no-cache"
    });

    if (!response.ok) {
        throw new Error(
            `Cannot load ${path} (${response.status})`
        );
    }

    return response.json();
}

function getMondaiPath(level, setId, category, mondai) {
    checkLevel(level);
    checkSetId(setId);
    checkMondai(category, mondai);

    return `${ROOT}/${level.toLowerCase()}/` +
           `${setId}/${category}/mondai${mondai}.json`;
}

/* ------------------------------------------
   READ NEW DATABASE FORMAT
------------------------------------------ */

export function parseJLPTQuestions(data) {
    if (!Array.isArray(data)) {
        throw new Error(
            "JLPT database must be an array of questions"
        );
    }

    const ids = new Set();

    return data.map((item, index) => {
        if (!item || typeof item !== "object" ||
            Array.isArray(item)) {
            throw new Error(`Invalid item at ${index}`);
        }

        const {
            id,
            question,
            options,
            answer,
            context = "",
            audio = null,
            explanation = ""
        } = item;

        if (
            !Number.isSafeInteger(id) ||
            id < 1 ||
            ids.has(id)
        ) {
            throw new Error(
                `Invalid or duplicate question ID: ${id}`
            );
        }

        ids.add(id);

        if (
            typeof question !== "string" ||
            !question.trim()
        ) {
            throw new Error(
                `Question ${id}: missing question text`
            );
        }

        if (
            !Array.isArray(options) ||
            ![3, 4].includes(options.length) ||
            options.some(
                x => typeof x !== "string" || !x.trim()
            ) ||
            new Set(options).size !== options.length
        ) {
            throw new Error(
                `Question ${id}: invalid options`
            );
        }

        if (
            !Number.isInteger(answer) ||
            answer < 1 ||
            answer > options.length
        ) {
            throw new Error(
                `Question ${id}: invalid answer`
            );
        }

        if (
            typeof context !== "string" ||
            (audio !== null &&
             typeof audio !== "string") ||
            typeof explanation !== "string"
        ) {
            throw new Error(
                `Question ${id}: invalid optional fields`
            );
        }

        return {
            id,
            question,
            options: [...options],

            // Database: 1-4
            // JavaScript: 0-3
            correctIndex: answer - 1,

            context,
            audio,
            explanation
        };
    });
}

/* ------------------------------------------
   SHUFFLE ANSWER POSITIONS
------------------------------------------ */

export function shuffleJLPTAnswers(question) {
    const choices = question.options.map(
        (text, index) => ({
            text,
            originalIndex: index
        })
    );

    for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [choices[i], choices[j]] =
            [choices[j], choices[i]];
    }

    return {
        ...question,

        options: choices.map(x => x.text),

        correctIndex: choices.findIndex(
            x => x.originalIndex === question.correctIndex
        )
    };
}

/* ------------------------------------------
   SET LIST
------------------------------------------ */

export async function loadJLPTSets(level) {
    checkLevel(level);

    const path =
        `${ROOT}/${level.toLowerCase()}/sets.json`;

    const data = await loadJSON(path);

    if (!Array.isArray(data.sets)) {
        throw new Error("Invalid sets.json");
    }

    const ids = new Set();

    return data.sets.filter(set => {
        if (
            !set ||
            typeof set.id !== "string" ||
            !/^set\d+$/.test(set.id) ||
            ids.has(set.id)
        ) {
            throw new Error("Invalid or duplicate Set ID");
        }

        ids.add(set.id);

        return set.enabled === true;
    });
}

/* ------------------------------------------
   LOAD ONE MONDAI
------------------------------------------ */

export async function loadJLPTMondai(
    level,
    setId,
    category,
    mondai
) {
    const path = getMondaiPath(
        level, setId, category, mondai
    );

    const data = await loadJSON(path);
    const questions = parseJLPTQuestions(data);

    const required = getMondaiCount(
        level, category, mondai
    );

    if (!Number.isInteger(required) || required <= 0) {
        throw new Error(
            `Mondai not configured: ${category} ${mondai}`
        );
    }

    if (questions.length !== required) {
        throw new Error(
            `${setId}/${category}/mondai${mondai}: ` +
            `${questions.length}/${required} questions`
        );
    }

    // Resolve relative media paths from the JSON folder.
    const folder = path.slice(0, path.lastIndexOf("/") + 1);

    return questions.map(q => ({
        ...q,
        audio: q.audio
            ? new URL(q.audio, new URL(folder, document.baseURI)).href
            : null,
        level,
        setId,
        category,
        mondai
    }));
}

/* ------------------------------------------
   CHECK SELECTED SET
------------------------------------------ */

export async function isSetComplete(
    level,
    setId,
    selected
) {
    try {
        await Promise.all(
            selected.map(item =>
                loadJLPTMondai(
                    level,
                    setId,
                    item.category,
                    item.mondai
                )
            )
        );

        return true;

    } catch (error) {
        console.error(
            `[JLPT] Set ${setId} incomplete:`,
            error.message
        );

        return false;
    }
}

/* ------------------------------------------
   CHOOSE ONE WHOLE SET
------------------------------------------ */

export async function chooseJLPTSet(
    level,
    selected,
    mode,
    manualSet
) {
    if (!Array.isArray(selected) || !selected.length) {
        throw new Error("No Mondai selected");
    }

    if (!["random", "manual"].includes(mode)) {
        throw new Error("Invalid Set selection mode");
    }

    const available = await loadJLPTSets(level);

    let candidates = mode === "manual"
        ? available.filter(x => x.id === manualSet)
        : [...available];

    if (mode === "random") {
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));

            [candidates[i], candidates[j]] =
                [candidates[j], candidates[i]];
        }
    }

    for (const candidate of candidates) {
        if (
            await isSetComplete(
                level, candidate.id, selected
            )
        ) {
            return candidate.id;
        }
    }

    throw new Error(
        "No complete Set available for selected Mondai"
    );
}

/* ------------------------------------------
   LOAD ONE COMPLETE PRACTICE SESSION
------------------------------------------ */

export async function loadJLPTExam(
    level,
    setId,
    selected
) {
    if (!Array.isArray(selected) || !selected.length) {
        throw new Error("No Mondai selected");
    }

    const groups = await Promise.all(
        selected.map(async item => {
            return loadJLPTMondai(
                level,
                setId,
                item.category,
                item.mondai
            );
        })
    );

    // Preserve Mondai and question order.
    // Shuffle answers only, NOT questions.
    const questions = groups
        .flat()
        .map(q => shuffleJLPTAnswers(q));

    return {
        level,
        setId,
        questions
    };
}
