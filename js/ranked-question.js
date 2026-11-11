
/* BATLINGO - Shared seeded mixed ranked questions */

const cache = new Map();

const MODES = {
    kanji_meaning: ['word', 'meaning'],
    meaning_kanji: ['meaning', 'word'],
    kanji_hiragana: ['word', 'reading'],
    hiragana_meaning: ['reading', 'meaning'],
    audio_meaning: ['reading', 'meaning'],
    audio_hiragana: ['reading', 'reading'],
    audio_kanji: ['reading', 'word'],
    grammar_meaning: ['grammar', 'meaning']
};

export const RANK_MIXED_MODES = Object.keys(MODES);

export async function loadRankDatabase(level) {
    const key = String(level).toLowerCase();

    if (!/^n[1-5]$/.test(key)) {
        throw new Error('INVALID_JLPT_LEVEL');
    }

    if (!cache.has(key)) {
        const request = (async () => {
            const response = await fetch(`data/${key}.json`);

            if (!response.ok) {
                throw new Error(
                    `DATABASE_LOAD_FAILED: ${key}`
                );
            }

            const words = await response.json();

            if (!Array.isArray(words)) {
                throw new Error('INVALID_DATABASE_FORMAT');
            }

            // Optional grammar source.
            let grammar = [];

            try {
                const r = await fetch(
                    `data/grammar/${key}.json`
                );

                if (r.ok) {
                    const parsed = await r.json();

                    if (Array.isArray(parsed)) {
                        grammar = parsed
                            .filter(x => x.grammar && x.meaning)
                            .map(x => ({
                                ...x,
                                _rankCategory: 'grammar'
                            }));
                    }
                }
            } catch (error) {
                console.debug(
                    '[RANK] Optional grammar not loaded:',
                    error
                );
            }

            return [
                ...words.map(x => ({
                    ...x,
                    _rankCategory: 'vocabulary'
                })),
                ...grammar
            ];
        })();

        cache.set(key, request);

        request.catch(() => cache.delete(key));
    }

    return cache.get(key);
}

function hash(value) {
    let h = 2166136261;

    for (const char of value) {
        h ^= char.charCodeAt(0);
        h = Math.imul(h, 16777619);
    }

    return h >>> 0;
}

function rng(seed) {
    let s = seed >>> 0;

    return () => {
        s = (s + 0x6D2B79F5) >>> 0;

        let t = s;

        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function shuffle(items, rand) {
    const arr = [...items];

    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));

        [arr[i], arr[j]] = [arr[j], arr[i]];
    }

    return arr;
}

export function eligibleRankModes(database, index) {
    const item = database[index];

    if (!item) return [];

    const baseModes = item._rankCategory === 'grammar'
        ? ['grammar_meaning']
        : [
            'kanji_meaning',
            'meaning_kanji',
            'kanji_hiragana',
            'hiragana_meaning',
            'audio_meaning',
            'audio_hiragana',
            'audio_kanji'
        ];

    return baseModes.filter(mode => {
        const [from, to] = MODES[mode];

        if (
            !String(item[from] ?? '').trim() ||
            !String(item[to] ?? '').trim()
        ) {
            return false;
        }

        const other = new Set(
            database
                .filter((x, i) =>
                    i !== index &&
                    x._rankCategory === item._rankCategory
                )
                .map(x => String(x[to] ?? '').trim())
                .filter(s =>
                    s &&
                    s !== String(item[to]).trim()
                )
        );

        return other.size >= 3;
    });
}

export function buildRankQuestion(database, match, position) {
    const questionIndex = match.questionIndexes?.[position];
    const item = database[questionIndex];

    if (!item) {
        throw new Error('QUESTION_NOT_FOUND');
    }

    const allowed = eligibleRankModes(
        database,
        questionIndex
    );

    const configured = match.questionModes?.[position];

    const mode =
        configured && allowed.includes(configured)
            ? configured
            : allowed[
                hash(`${match.matchId}:${position}:mode`) %
                allowed.length
            ];

    if (!mode) {
        throw new Error('NO_VALID_RANK_QUESTION_MODE');
    }

    const [from, to] = MODES[mode];

    const rand = rng(
        hash(`${match.matchId}:${position}:${mode}`)
    );

    const correctAnswer = String(item[to]).trim();

    const distractors = [
        ...new Set(
            database
                .filter((x, i) =>
                    i !== questionIndex &&
                    x._rankCategory === item._rankCategory
                )
                .map(x => String(x[to] ?? '').trim())
                .filter(x =>
                    x &&
                    x !== correctAnswer
                )
        )
    ];

    if (distractors.length < 3) {
        throw new Error('NOT_ENOUGH_DISTRACTORS');
    }

    const options = shuffle(
        [
            correctAnswer,
            ...shuffle(distractors, rand).slice(0, 3)
        ],
        rand
    );

    return {
        position,
        questionIndex,

        question: mode.startsWith('audio_')
            ? '🔊'
            : String(item[from]).trim(),

        speechText: String(
            item.reading || item.word || ''
        ),

        category: item._rankCategory,
        mode,
        options,

        correctIndex: options.indexOf(correctAnswer)
    };
}
