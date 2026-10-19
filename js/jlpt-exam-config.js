
/* ==========================================
   BATLINGO - JLPT EXAM CONFIG
========================================== */

export const JLPT_EXAM_SETTINGS = {
    vipOnly: false,

    // Temporary Test Mode duration.
    // Replace with official section timing later.
    testSecondsPerQuestion: 90
};

export const JLPT_CATEGORIES = {
    vocabulary: "文字・語彙",
    grammar: "文法",
    reading: "読解",
    listening: "聴解"
};

/*
 * Mondai counts:
 * Configure the exact question counts for your
 * authored exam sets here.
 *
 * Null means not configured.
 * Do not publish incomplete levels as ready.
 */
export const JLPT_EXAM_STRUCTURE = {
    N1: {
        vocabulary: [6, 7, 6, 6],
        grammar: [10, 5, 5],
        reading: [4, 9, 4, 2, 4, 2],
        listening: [5, 6, 5, 11, 3]
    },

    N2: {
        vocabulary: [5, 5, 5, 7, 5, 5],
        grammar: [12, 5, 5],
        reading: [5, 9, 2, 3, 2],
        listening: [5, 6, 5, 12, 4]
    },

    N3: {
        vocabulary: [8, 6, 11, 5, 5],
        grammar: [13, 5, 5],
        reading: [4, 6, 4, 2],
        listening: [6, 6, 3, 4, 9]
    },

    N4: {
        vocabulary: [9, 6, 10, 5, 5],
        grammar: [15, 5, 5],
        reading: [4, 4, 2],
        listening: [8, 7, 5, 8]
    },

    N5: {
        vocabulary: [12, 8, 10, 5],
        grammar: [16, 5, 5],
        reading: [3, 2, 1],
        listening: [7, 6, 5, 6]
    }
};

export function getMondaiList(level) {
    const structure = JLPT_EXAM_STRUCTURE[level];

    if (!structure) return [];

    const result = [];

    for (const [category, counts] of Object.entries(structure)) {
        counts.forEach((count, index) => {
            if (Number.isInteger(count) && count > 0) {
                result.push({
                    category,
                    mondai: index + 1,
                    count,
                    key: `${category}:${index + 1}`
                });
            }
        });
    }

    return result;
}

export function getMondaiCount(level, category, mondai) {
    return JLPT_EXAM_STRUCTURE[level]?.[category]?.[mondai - 1] ?? 0;
}
