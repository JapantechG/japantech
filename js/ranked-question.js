
const databaseCache = new Map();

export async function loadRankDatabase(level) {
    const key = String(level).toLowerCase();

    if (!/^n[1-5]$/.test(key)) {
        throw new Error('INVALID_JLPT_LEVEL');
    }

    if (!databaseCache.has(key)) {
        const promise = fetch(`data/${key}.json`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('DATABASE_LOAD_FAILED');
                }
                return response.json();
            })
            .then(data => {
                if (!Array.isArray(data)) {
                    throw new Error('INVALID_DATABASE_FORMAT');
                }
                return data;
            });

        databaseCache.set(key, promise);
    }

    return databaseCache.get(key);
}

// Biến chuỗi thành seed cố định.
function hashString(value) {
    let hash = 2166136261;

    for (const char of value) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }

    return hash >>> 0;
}

// Bộ random có kết quả lặp lại với cùng seed.
function seededRandom(seed) {
    let state = seed >>> 0;

    return () => {
        state = (state + 0x6D2B79F5) >>> 0;

        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(items, random) {
    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result;
}

export function buildRankQuestion(database, match, position) {
    const questionIndex = match.questionIndexes?.[position];
    const item = database[questionIndex];

    if (!item) {
        throw new Error('QUESTION_NOT_FOUND');
    }

    const subMode = match.config?.subMode || 'kanji_meaning';

    const fields = {
        kanji_meaning: ['word', 'meaning'],
        kanji_hiragana: ['word', 'reading']
    };

    if (!fields[subMode]) {
        throw new Error(`UNSUPPORTED_RANK_MODE: ${subMode}`);
    }

    const [questionField, answerField] = fields[subMode];

    const question = String(item[questionField] ?? '').trim();
    const correctAnswer = String(item[answerField] ?? '').trim();

    if (!question || !correctAnswer) {
        throw new Error('INVALID_QUESTION_DATA');
    }

    const seed = hashString(
        `${match.matchId}:${position}:${subMode}`
    );

    const random = seededRandom(seed);

    // Loại đáp án trùng để luôn có 4 lựa chọn khác nhau.
    const distractors = [
        ...new Set(
            database
                .filter((entry, index) => index !== questionIndex)
                .map(entry => String(entry[answerField] ?? '').trim())
                .filter(value => value && value !== correctAnswer)
        )
    ];

    const picked = shuffle(distractors, random).slice(0, 3);

    if (picked.length !== 3) {
        throw new Error('NOT_ENOUGH_DISTRACTORS');
    }

    const options = shuffle(
        [correctAnswer, ...picked],
        random
    );

    return {
        position,
        questionIndex,
        question,
        options,
        correctIndex: options.indexOf(correctAnswer)
    };
}
