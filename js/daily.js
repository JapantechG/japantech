
/* ============================================================
   BATLINGO DAILY MISSION V4.1

   01. Firebase / Configuration
   02. Helpers / Vocabulary
   03. Daily Streak / Firebase Save
   04. Goal / Source Selection
   05. Batch / Flashcard / Review / Quiz
   06. Learning UI
   07. Dashboard / History
   08. Focus UI / Rendering
   09. Initialization

   TIMEZONE: Asia/Ho_Chi_Minh
   GOAL: 5 - 100 words
   BATCH: Maximum 10 words

   Vocabulary order:
       ID 1 -> ID 2 -> ID 3 -> ...

   Quiz:
       Random question mode and answer positions
============================================================ */


/* ============================================================
   01. FIREBASE IMPORTS
============================================================ */

import {
    auth,
    db
} from './firebase.js';

import {
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js';

import {
    ref,
    onValue,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';


/* ============================================================
   02. CONFIGURATION
============================================================ */

const $ = id => document.getElementById(id);

const TZ = 'Asia/Ho_Chi_Minh';

const MIN_GOAL = 5;
const MAX_GOAL = 100;
const BATCH = 10;

const MODES = [
    'kanji_meaning',
    'kanji_hiragana',
    'hiragana_meaning',
    'meaning_kanji',
    'audio_meaning',
    'audio_hiragana',
    'audio_kanji'
];

const LABEL = {
    kanji_meaning: 'Kanji → Nghĩa',
    kanji_hiragana: 'Kanji → Hiragana',
    hiragana_meaning: 'Hiragana → Nghĩa',
    meaning_kanji: 'Nghĩa → Kanji',
    audio_meaning: 'Nghe → Nghĩa',
    audio_hiragana: 'Nghe → Hiragana',
    audio_kanji: 'Nghe → Kanji'
};

const FIELD = {
    kanji_meaning: ['word', 'meaning'],
    kanji_hiragana: ['word', 'reading'],
    hiragana_meaning: ['reading', 'meaning'],
    meaning_kanji: ['meaning', 'word'],
    audio_meaning: ['reading', 'meaning'],
    audio_hiragana: ['reading', 'reading'],
    audio_kanji: ['reading', 'word']
};


/* ============================================================
   03. STATE
============================================================ */

let offset = 0;
let uid = '';

let stopUser = null;
let state = {};

let initialized = false;
let busy = false;

let words = [];
let loadedSource = '';
let loadSeq = 0;

let question = null;
let questionSig = '';
let revealed = false;

let tab = 'learn';

let dashboardFilter = 'all';
let dashboardSearch = '';

let lastDate = '';
let lastError = '';

/* Sau khi lưu mục tiêu:
   Ẩn form để dành không gian học. */

let setupCollapsed = false;


/* ============================================================
   04. HELPER FUNCTIONS
============================================================ */

const clean = value =>
    String(value ?? '').trim();

const safeTarget = value =>
    /^[a-z][a-z0-9_]{0,50}$/.test(value);

const sourceKey = (type, target) =>
    `${type}_${target}`;

const wordKey = id =>
    encodeURIComponent(String(id))
        .replace(/\./g, '%2E');

const idOrder = new Intl.Collator('en', {
    numeric: true,
    sensitivity: 'base'
});

const compareIds = (a, b) =>
    idOrder.compare(String(a), String(b));

const clamp = value =>
    Math.max(
        MIN_GOAL,
        Math.min(
            MAX_GOAL,
            Math.floor(Number(value) || MIN_GOAL)
        )
    );


/* Random chỉ dùng cho Quiz, không dùng chọn từ. */

function shuffle(items) {

    const result = [...items];

    for (
        let i = result.length - 1;
        i > 0;
        i--
    ) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [
            result[i],
            result[j]
        ] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


/* ============================================================
   05. VIETNAM DATE
============================================================ */

function today() {

    const parts = new Intl.DateTimeFormat(
        'en-US',
        {
            timeZone: TZ,
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }
    ).formatToParts(
        new Date(Date.now() + offset)
    );

    const p = Object.fromEntries(
        parts.map(x => [x.type, x.value])
    );

    return `${p.year}-${p.month}-${p.day}`;
}


function yday(date) {

    const d = new Date(
        `${date}T00:00:00Z`
    );

    d.setUTCDate(
        d.getUTCDate() - 1
    );

    return d.toISOString().slice(0, 10);
}


/* ============================================================
   06. DATA HELPERS
============================================================ */

const day = () =>
    state.days?.[today()] || {};

const mission = () =>
    day().mission || null;

const learned = () =>
    state.learned || {};

const completeMap = d =>
    d.completed || {};

const dayCompleted = d =>
    Object.values(
        completeMap(d)
    ).reduce(
        (n, group) =>
            n + Object.keys(group || {}).length,
        0
    );

const remaining = (d, s) =>
    Math.max(
        0,
        clamp(s.goal) - dayCompleted(d)
    );

const getWord = id =>
    words.find(
        x => String(x.id) === String(id)
    );


/* ============================================================
   07. STATUS
============================================================ */

function message(value = '', error = false) {

    lastError = error ? value : '';

    const e = $('dailyMessage');

    if (!e) return;

    e.textContent = value;

    e.classList.toggle(
        'error',
        error
    );
}


/* ============================================================
   08. JAPANESE TEXT-TO-SPEECH

   Chạy trực tiếp khi người dùng bấm đáp án.
============================================================ */

function speak(item) {

    if (
        !('speechSynthesis' in window) ||
        !item
    ) {
        return;
    }

    window.speechSynthesis.cancel();

    const utterance =
        new SpeechSynthesisUtterance(
            item.reading || item.word
        );

    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;

    window.speechSynthesis.speak(
        utterance
    );
}


/* ============================================================
   09. NORMALIZE VOCABULARY
============================================================ */

function normalize(raw) {

    const seen = new Set();

    return raw.map(item => ({

        id: clean(item.id),
        word: clean(item.word),
        reading: clean(item.reading),
        meaning: clean(item.meaning)

    })).filter(item => {

        if (
            !item.id ||
            !item.word ||
            !item.reading ||
            !item.meaning ||
            seen.has(item.id)
        ) {
            return false;
        }

        seen.add(item.id);

        return true;
    });
}


/* ============================================================
   10. LOAD WORDS

   JLPT: data/n5.json ... data/n1.json
   TOPIC: data/topics/{target}.json

   QUAN TRỌNG:
   Danh sách từ luôn theo ID tăng dần.
============================================================ */

async function loadWords(type, target) {

    if (
        !['jlpt', 'topic'].includes(type) ||
        !safeTarget(target) ||
        (
            type === 'jlpt' &&
            !/^n[1-5]$/.test(target)
        )
    ) {
        throw Error('Bộ từ không hợp lệ.');
    }

    const key = sourceKey(
        type,
        target
    );

    if (
        key === loadedSource &&
        words.length
    ) {
        return words;
    }

    const request = ++loadSeq;

    const url = type === 'topic'
        ? `data/topics/${target}.json`
        : `data/${target}.json`;

    const res = await fetch(url);

    if (!res.ok) {
        throw Error(
            'Không tải được bộ từ ' + target
        );
    }

    const raw = await res.json();

    if (!Array.isArray(raw)) {
        throw Error(
            'Database không phải mảng.'
        );
    }

    /* KHÔNG random. */

    const list = normalize(raw).sort(
        (a, b) => compareIds(a.id, b.id)
    );

    if (list.length < 4) {
        throw Error(
            'Bộ từ cần ít nhất 4 từ hợp lệ để tạo Quiz 4 lựa chọn.'
        );
    }

    if (request === loadSeq) {

        words = list;
        loadedSource = key;
    }

    return list;
}


/* ============================================================
   11. QUESTION ENGINE

   REVIEW:
       Kanji -> Meaning

   QUIZ:
       7 chế độ ngẫu nhiên.

   Đáp án:
       4 lựa chọn, vị trí ngẫu nhiên.
============================================================ */

function makeQuestion(word, stage) {

    if (!word) return null;

    const candidates =
        stage === 'review'
            ? ['kanji_meaning']
            : shuffle(MODES);

    for (const mode of candidates) {

        const [
            prompt,
            field
        ] = FIELD[mode];

        if (
            !word[prompt] ||
            !word[field]
        ) {
            continue;
        }

        const distractors = [
            ...new Set(

                words.filter(
                    w => w.id !== word.id
                ).map(
                    w => w[field]
                ).filter(
                    value =>
                        value &&
                        value !== word[field]
                )
            )
        ];

        if (distractors.length < 3) {
            continue;
        }

        return {

            id: word.id,
            mode,

            ask: word[prompt],
            answer: word[field],

            choices: shuffle([
                word[field],
                ...shuffle(distractors).slice(0, 3)
            ])
        };
    }

    return null;
}


/* ============================================================
   12. STREAK
============================================================ */

function streakFor(profile, date) {

    if (
        profile.lastCheckin === date ||
        profile.lastCheckin === yday(date)
    ) {
        return Number(profile.streak) || 0;
    }

    return 0;
}


/* Chỉ đánh dấu khi đạt mục tiêu. */

function markDayDone(profile, date) {

    const d = profile.days[date];

    if (
        !d ||
        d.mission?.stage !== 'done' ||
        dayCompleted(d) < clamp(profile.goal)
    ) {
        return;
    }

    d.missionDone = true;

    if (d.checked) return;

    d.checked = true;

    profile.streak =
        profile.lastCheckin === yday(date)
            ? (Number(profile.streak) || 0) + 1
            : 1;

    profile.lastCheckin = date;
}


/* ============================================================
   13. FIREBASE TRANSACTION

   dailyProgress/{uid}

   Giữ history, completed và streak.
============================================================ */

async function update(change) {

    const currentUid =
        auth.currentUser?.uid;

    if (
        !currentUid ||
        busy
    ) {
        return false;
    }

    busy = true;
    render();

    const date = today();

    try {

        const result = await runTransaction(

            ref(
                db,
                `dailyProgress/${currentUid}`
            ),

            raw => {

                const s =
                    raw &&
                    typeof raw === 'object'
                        ? raw
                        : {};

                s.goal = clamp(s.goal);

                s.days ||= {};
                s.learned ||= {};

                const d = s.days[date] || {};

                d.completed ||= {};

                s.days[date] = d;

                change(s, d, date);

                markDayDone(s, date);

                return s;
            },

            {
                applyLocally: false
            }
        );

        if (!result.committed) {
            return false;
        }

        if (
            auth.currentUser?.uid === currentUid
        ) {

            state =
                result.snapshot.val() || state;

            render();
        }

        return true;

    } catch (error) {

        console.error('[DAILY]', error);

        message(
            'Firebase: ' + error.message,
            true
        );

        return false;

    } finally {

        busy = false;
        render();
    }
}


/* ============================================================
   14. SOURCE SELECTION
============================================================ */

async function topicsOptions() {

    const {
        topics
    } = await import('./lobby.js');

    return Array.isArray(topics)
        ? topics
        : [];
}


async function updateTargets(preferred = '') {

    const target =
        $('dailyTarget');

    const type =
        $('dailyStudyMode')?.value || 'jlpt';

    if (!target) return;

    if (type === 'jlpt') {

        target.replaceChildren(
            ...[
                'n5', 'n4', 'n3', 'n2', 'n1'
            ].map(
                n => new Option(
                    n.toUpperCase(),
                    n
                )
            )
        );

    } else {

        try {

            const list = await topicsOptions();

            target.replaceChildren(
                ...list.map(
                    t => new Option(
                        t.name,
                        t.id
                    )
                )
            );

        } catch (error) {

            message(
                'Không đọc được danh sách chủ đề.',
                true
            );
        }
    }

    if (
        preferred &&
        [...target.options].some(
            o => o.value === preferred
        )
    ) {
        target.value = preferred;
    }
}


/* ============================================================
   15. CHOOSE NEW WORDS

   - ID 1 -> hết bộ.
   - Bỏ qua từ đã thuộc.
   - Không random.
============================================================ */

function chooseNewIds(
    list,
    s,
    d,
    type,
    target
) {

    const key = sourceKey(
        type,
        target
    );

    const doneToday =
        d.completed?.[key] || {};

    const known =
        s.learned?.[key] || {};

    return list.filter(
        w =>

            !known[wordKey(w.id)] &&
            !doneToday[wordKey(w.id)]

    ).sort(
        (a, b) => compareIds(a.id, b.id)
    ).map(
        w => w.id
    );
}


/* ============================================================
   16. START / CHANGE GOAL

   Lưu mục tiêu -> thu gọn form.

   Đổi bộ:
   Lưu tiến độ của bộ trước.
============================================================ */

async function startMission() {

    if (busy) return;

    const type =
        $('dailyStudyMode')?.value || 'jlpt';

    const target =
        $('dailyTarget')?.value || 'n5';

    const n = Number(
        $('dailyGoalInput')?.value
    );

    if (
        !Number.isInteger(n) ||
        n < MIN_GOAL ||
        n > MAX_GOAL
    ) {

        message(
            'Mục tiêu phải là số nguyên từ 5 đến 100.',
            true
        );

        return;
    }

    const current = mission();

    const different =
        !!current &&
        (
            current.type !== type ||
            current.target !== target
        );

    if (
        different &&
        !confirm(
            'Đổi bộ từ sẽ lưu tiến độ bộ cũ. Tiếp tục?'
        )
    ) {
        return;
    }

    try {

        message('Đang tải bộ từ...');

        const list = await loadWords(
            type,
            target
        );

        const selected = chooseNewIds(
            list,
            state,
            day(),
            type,
            target
        );

        const changed = await update(
            (s, d) => {

                s.goal = n;

                d.missionDone =
                    dayCompleted(d) >= n;

                d.pausedMissions ||= {};

                const sk = sourceKey(
                    type,
                    target
                );

                const keep =
                    d.mission &&
                    d.mission.type === type &&
                    d.mission.target === target;

                /* Tiếp tục bộ đang học. */

                if (keep) {

                    d.mission.goal = n;
                    d.mission.queue = selected;

                    if (
                        dayCompleted(d) >= n
                    ) {

                        d.mission.stage = 'done';
                        d.mission.batch = [];

                    } else if (
                        ['done', 'exhausted'].includes(
                            d.mission.stage
                        )
                    ) {

                        d.mission.stage = 'between';
                        d.mission.batch = [];
                        d.mission.queue = selected;
                    }

                    return;
                }

                /* Tạm lưu bộ trước. */

                if (d.mission) {

                    const oldKey = sourceKey(
                        d.mission.type,
                        d.mission.target
                    );

                    d.pausedMissions[oldKey] =
                        d.mission;
                }

                /* Khôi phục bộ nếu có. */

                const resumed =
                    d.pausedMissions[sk];

                d.mission = resumed || {

                    type,
                    target,
                    goal: n,

                    queue: selected,

                    stage:
                        dayCompleted(d) >= n
                            ? 'done'
                            : 'between',

                    batch: [],
                    cursor: 0,

                    review: {},
                    quizResults: {},

                    feedback: null,
                    round: 0,
                    summary: null
                };

                d.mission.goal = n;

                d.mission.queue =
                    selected.filter(
                        id =>
                            !d.mission.batch?.some(
                                b =>
                                    String(b) === String(id)
                            )
                    );

                if (
                    dayCompleted(d) >= n
                ) {

                    d.mission.stage = 'done';
                    d.mission.batch = [];

                } else if (
                    ['done', 'exhausted'].includes(
                        d.mission.stage
                    )
                ) {

                    d.mission.stage = 'between';
                    d.mission.batch = [];
                    d.mission.queue = selected;
                }

                delete d.pausedMissions[sk];
            }
        );

        if (!changed) return;

        /* Thu gọn form mục tiêu. */

        setupCollapsed = true;

        revealed = false;
        question = null;
        questionSig = '';

        await nextBatch();

    } catch (error) {

        message(
            error.message,
            true
        );
    }
}


/* ============================================================
   17. PREPARE NEXT BATCH

   Nhóm tối đa 10 từ.

   Nếu còn 2 từ -> học đúng 2 từ.
============================================================ */

async function nextBatch() {

    const m = mission();

    if (
        !m ||
        busy ||
        m.stage === 'done' ||
        m.stage === 'exhausted' ||
        m.batch?.length
    ) {
        return;
    }

    const n = remaining(
        day(),
        state
    );

    if (n <= 0) return;

    await update(
        (s, d) => {

            const x = d.mission;

            if (
                !x ||
                x.batch?.length
            ) {
                return;
            }

            const sk = sourceKey(
                x.type,
                x.target
            );

            const selected =
                d.completed?.[sk] || {};

            x.queue = (
                x.queue || []
            ).filter(
                id =>
                    !selected[wordKey(id)]
            );

            const slice = x.queue.slice(
                0,
                Math.min(
                    BATCH,
                    remaining(d, s)
                )
            );

            if (!slice.length) {

                x.stage = 'exhausted';

                return;
            }

            x.batch = slice;
            x.cursor = 0;

            x.stage = 'flashcard';

            x.review = {};
            x.quizResults = {};

            x.feedback = null;
            x.summary = null;
        }
    );
}


/* ============================================================
   18. RESUME SOURCE
============================================================ */

async function resumeSource() {

    const m = mission();

    if (
        !m ||
        m.stage === 'done'
    ) {
        return;
    }

    if (
        loadedSource === sourceKey(
            m.type,
            m.target
        ) &&
        words.length
    ) {
        return;
    }

    try {

        await loadWords(
            m.type,
            m.target
        );

        renderStudy();

    } catch (error) {

        message(
            error.message,
            true
        );
    }
}


/* ============================================================
   19. FLASHCARD

   Chỉ chuyển khi đã hiện đáp án
   và bấm Đã thuộc.
============================================================ */

async function known() {

    const m = mission();

    if (
        !m ||
        m.stage !== 'flashcard' ||
        !revealed
    ) {
        return;
    }

    revealed = false;
    question = null;
    questionSig = '';

    await update(
        (s, d) => {

            const x = d.mission;

            if (
                x?.stage !== 'flashcard'
            ) {
                return;
            }

            x.cursor++;

            if (
                x.cursor >= x.batch.length
            ) {

                x.cursor = 0;
                x.stage = 'review';

                x.review ||= {};
            }
        }
    );
}


/* ============================================================
   20. REVIEW NEXT INDEX

   REVIEW:
   Đúng 3 lần cộng dồn.

   Sai không reset lượt đúng.
============================================================ */

function nextReviewIndex(m, after) {

    for (
        let i = 1;
        i <= m.batch.length;
        i++
    ) {

        const at =
            (after + i) % m.batch.length;

        const id = m.batch[at];

        if (
            (Number(m.review?.[id]) || 0) < 3
        ) {
            return at;
        }
    }

    return -1;
}


/* ============================================================
   21. ANSWER QUESTION

   Sau khi bấm:
   1. Đọc từ ngay.
   2. Lưu Firebase.
   3. Hiện kết quả.
   4. Đợi bấm NEXT.
============================================================ */

async function answer(choice) {

    const m = mission();
    const q = question;

    if (
        !m ||
        !q ||
        busy ||
        m.feedback ||
        !['review', 'quiz'].includes(m.stage) ||
        String(m.batch[m.cursor]) !== String(q.id)
    ) {
        return;
    }

    const correct =
        choice === q.answer;

    const mode = q.mode;

    /* Phát âm ngay trong sự kiện click. */

    speak(getWord(q.id));

    const expectedStage = m.stage;
    const expectedCursor = m.cursor;

    await update(
        (s, d) => {

            const x = d.mission;

            if (
                !x ||
                x.feedback ||
                x.stage !== expectedStage ||
                x.cursor !== expectedCursor ||
                String(x.batch[x.cursor]) !== String(q.id)
            ) {
                return;
            }

            x.feedback = {

                id: q.id,

                selected: choice,
                answer: q.answer,

                mode,
                correct,

                choices: q.choices,
                ask: q.ask
            };

            if (x.stage === 'review') {

                x.review ||= {};

                /* Sai cộng 0, không reset. */

                x.review[q.id] = Math.min(
                    3,

                    (Number(x.review[q.id]) || 0) +
                    (correct ? 1 : 0)
                );

            } else if (
                x.stage === 'quiz'
            ) {

                x.quizResults ||= {};

                x.quizResults[q.id] = {

                    correct,
                    selected: choice,

                    answer: q.answer,
                    mode
                };
            }
        }
    );
}


/* ============================================================
   22. NEXT QUESTION

   REVIEW:
       Đủ 3 lượt đúng cho tất cả -> QUIZ.

   QUIZ:
       Hết batch -> SUMMARY.
============================================================ */

async function nextQuestion() {

    const m = mission();

    if (
        !m?.feedback ||
        busy
    ) {
        return;
    }

    question = null;
    questionSig = '';

    await update(
        (s, d) => {

            const x = d.mission;

            if (!x?.feedback) {
                return;
            }

            x.feedback = null;

            /* ================================================
               REVIEW
            ================================================ */

            if (
                x.stage === 'review'
            ) {

                const next = nextReviewIndex(
                    x,
                    x.cursor
                );

                if (next < 0) {

                    x.stage = 'quiz';
                    x.cursor = 0;
                    x.quizResults = {};

                } else {

                    x.cursor = next;
                }

                return;
            }

            /* ================================================
               QUIZ
            ================================================ */

            if (
                x.stage !== 'quiz'
            ) {
                return;
            }

            x.cursor++;

            if (
                x.cursor < x.batch.length
            ) {
                return;
            }

            /* ================================================
               QUIZ SUMMARY
            ================================================ */

            const results = x.batch.map(
                id => ({

                    id,

                    ...(
                        x.quizResults?.[id] ||
                        {
                            correct: false
                        }
                    )
                })
            );

            const correct = results.filter(
                r => r.correct
            ).length;

            const wrong =
                results.length - correct;

            x.summary = {
                results,
                correct,
                wrong
            };

            /* ================================================
               SAVE LEARNED WORDS
            ================================================ */

            const sk = sourceKey(
                x.type,
                x.target
            );

            d.completed[sk] ||= {};
            s.learned[sk] ||= {};

            for (
                const r of results.filter(
                    item => item.correct
                )
            ) {

                const item = getWord(r.id);

                if (!item) continue;

                const key = wordKey(
                    r.id
                );

                d.completed[sk][key] = true;

                const previous =
                    s.learned[sk][key] || {};

                s.learned[sk][key] = {

                    ...item,

                    firstLearnedAt:
                        previous.firstLearnedAt || today(),

                    lastLearnedAt:
                        today(),

                    timesPassed:
                        (Number(previous.timesPassed) || 0) + 1
                };
            }

            /* ================================================
               SAVE QUIZ HISTORY
            ================================================ */

            d.quizHistory ||= {};

            const no =
                (Number(d.quizRoundCount) || 0) + 1;

            d.quizRoundCount = no;

            d.quizHistory[`round_${no}`] = {

                source: sk,

                correct,
                wrong,

                results: results.map(
                    r => ({

                        id: r.id,

                        correct: !!r.correct,

                        selected: r.selected || '',
                        answer: r.answer || '',
                        mode: r.mode || '',

                        word:
                            getWord(r.id)?.word || r.id,

                        reading:
                            getWord(r.id)?.reading || '',

                        meaning:
                            getWord(r.id)?.meaning || ''
                    })
                )
            };

            x.stage = 'summary';
            x.cursor = 0;
        }
    );
}


/* ============================================================
   23. AFTER SUMMARY

   Từ sai -> Flashcard -> Review -> Quiz.

   Từ đúng -> đã chốt.

   Đủ mục tiêu -> Done.
============================================================ */

async function afterSummary() {

    const m = mission();

    if (
        m?.stage !== 'summary' ||
        busy
    ) {
        return;
    }

    const failed =
        m.summary?.results
            ?.filter(r => !r.correct)
            .map(r => r.id) || [];

    await update(
        (s, d) => {

            const x = d.mission;

            if (
                x?.stage !== 'summary'
            ) {
                return;
            }

            x.summary = null;
            x.feedback = null;

            x.review = {};
            x.quizResults = {};

            x.cursor = 0;
            x.round =
                (Number(x.round) || 0) + 1;

            if (
                dayCompleted(d) >= clamp(s.goal)
            ) {

                x.batch = [];
                x.stage = 'done';

                return;
            }

            if (failed.length) {

                x.batch = failed;
                x.stage = 'flashcard';

            } else {

                x.batch = [];
                x.stage = 'between';
            }
        }
    );

    if (!failed.length) {
        await nextBatch();
    }
}


/* ============================================================
   24. DOM HELPERS
============================================================ */

function el(tag, className, value) {

    const e = document.createElement(
        tag
    );

    if (className) {
        e.className = className;
    }

    if (value !== undefined) {
        e.textContent = value;
    }

    return e;
}


function button(
    label,
    callback,
    className = 'daily-button daily-wide'
) {

    const b = el(
        'button',
        className,
        label
    );

    b.type = 'button';
    b.disabled = busy;

    b.addEventListener(
        'click',
        callback
    );

    return b;
}


/* ============================================================
   25. RENDER STUDY
============================================================ */

function renderStudy() {

    const root = $('dailyStudy');
    const m = mission();

    if (!root) return;

    root.replaceChildren();

    /* ================================================
       NO MISSION
    ================================================ */

    if (!m) {

        root.append(
            el(
                'p',
                'daily-muted',

                'Chọn JLPT hoặc Chủ đề, đặt mục tiêu rồi bấm Bắt đầu.'
            )
        );

        return;
    }

    /* ================================================
       DAILY COMPLETE
    ================================================ */

    if (
        day().missionDone ||
        m.stage === 'done'
    ) {

        const rounds = Object.values(
            day().quizHistory || {}
        );

        const right = rounds.reduce(
            (n, r) => n + (r.correct || 0),
            0
        );

        const wrong = rounds.reduce(
            (n, r) => n + (r.wrong || 0),
            0
        );

        const total = right + wrong;

        root.append(

            el(
                'div',
                'daily-finished',

                '🏆 HOÀN THÀNH NHIỆM VỤ HÔM NAY!'
            ),

            el(
                'p',
                'daily-muted',

                `Đã hoàn thành ${dayCompleted(day())} từ.`
            ),

            el(
                'div',
                'daily-summary-numbers',

                `Quiz: ${total} lượt · Đúng ${right} · Sai ${wrong} · ${total ? Math.round(right * 100 / total) : 0}%`
            )
        );

        return;
    }

    /* ================================================
       SOURCE EXHAUSTED
    ================================================ */

    if (
        m.stage === 'exhausted'
    ) {

        root.append(

            el(
                'div',
                'daily-finished',

                '📚 ĐÃ HỌC HẾT BỘ TỪ ĐANG CHỌN'
            ),

            el(
                'p',
                'daily-muted',

                `Còn ${remaining(day(), state)} từ để đạt mục tiêu. Hãy chọn bộ từ khác hoặc giảm mục tiêu.`
            )
        );

        return;
    }

    /* ================================================
       LOADING SOURCE
    ================================================ */

    if (
        loadedSource !== sourceKey(
            m.type,
            m.target
        ) ||
        !words.length
    ) {

        root.append(
            el(
                'p',
                'daily-muted',

                'Đang tải dữ liệu từ vựng...'
            )
        );

        resumeSource();

        return;
    }

    /* ================================================
       PREPARING BATCH
    ================================================ */

    if (!m.batch?.length) {

        root.append(
            el(
                'p',
                'daily-muted',

                'Đang chuẩn bị nhóm từ tiếp theo...'
            )
        );

        if (
            m.stage === 'between'
        ) {
            nextBatch();
        }

        return;
    }

    /* ================================================
       QUIZ SUMMARY
    ================================================ */

    if (
        m.stage === 'summary'
    ) {

        const summary = m.summary || {
            results: [],
            correct: 0,
            wrong: 0
        };

        const total =
            summary.results.length;

        const percent = total
            ? Math.round(
                100 * summary.correct / total
            )
            : 0;

        root.append(

            el(
                'h3',
                'daily-stage-title',
                '📊 KẾT QUẢ QUIZ'
            ),

            el(
                'div',
                'daily-summary-numbers',

                `✅ ${summary.correct} đúng · ❌ ${summary.wrong} sai · ${percent}%`
            )
        );

        const list = el(
            'div',
            'daily-result-list'
        );

        summary.results.forEach(
            (r, index) => {

                const w = getWord(
                    r.id
                );

                const row = el(
                    'div',
                    'daily-result-row'
                );

                row.append(

                    el(
                        'span',
                        '',

                        `${index + 1}. ${w?.word || r.id} · ${w?.reading || ''}`
                    ),

                    el(
                        'span',

                        r.correct
                            ? 'daily-good'
                            : 'daily-bad',

                        r.correct
                            ? '✓ Đúng'
                            : `✕ ${r.selected || '—'} → ${r.answer || '—'}`
                    )
                );

                list.append(row);
            }
        );

        root.append(list);

        root.append(
            button(

                summary.wrong
                    ? '↻ HỌC LẠI CÁC TỪ SAI'
                    : '▶ TIẾP TỤC / HOÀN THÀNH',

                afterSummary
            )
        );

        return;
    }

    /* ================================================
       CURRENT WORD
    ================================================ */

    const id =
        m.batch[m.cursor];

    const w = getWord(id);

    if (!w) {

        root.append(
            el(
                'p',
                'daily-muted',

                'Không tìm thấy từ trong dữ liệu.'
            )
        );

        return;
    }

    const stageName =
        m.stage === 'flashcard'
            ? '1 · FLASHCARD'
            : m.stage === 'review'
                ? '2 · REVIEW'
                : '3 · QUIZ RANDOM';

    root.append(
        el(
            'h3',
            'daily-stage-title',

            `${stageName} · ${m.cursor + 1}/${m.batch.length}`
        )
    );

    /* ================================================
       FLASHCARD
    ================================================ */

    if (
        m.stage === 'flashcard'
    ) {

        root.append(

            el(
                'div',
                'daily-word',
                w.word
            ),

            button(
                '🔊 PHÁT ÂM',
                () => speak(w),
                'daily-sound'
            )
        );

        root.append(
            el(
                'div',
                'daily-word-back',

                revealed
                    ? `${w.reading}\n${w.meaning}`
                    : 'Lật thẻ để xem cách đọc và nghĩa.'
            )
        );

        root.append(
            button(

                revealed
                    ? 'ẨN ĐÁP ÁN'
                    : 'HIỆN ĐÁP ÁN',

                () => {

                    revealed = !revealed;
                    renderStudy();
                },

                'daily-button daily-secondary daily-wide'
            )
        );

        const next = button(

            '✓ ĐÃ THUỘC · TIẾP THEO',

            known
        );

        next.disabled =
            busy || !revealed;

        root.append(next);

        return;
    }

    /* ================================================
       REVIEW PROGRESS
    ================================================ */

    if (
        m.stage === 'review'
    ) {

        const count = Object.values(
            m.review || {}
        ).reduce(
            (n, value) =>
                n + Math.min(
                    3,
                    Number(value) || 0
                ),
            0
        );

        root.append(
            el(
                'p',
                'daily-muted',

                `Tổng lượt đúng ${count}/${m.batch.length * 3} · Từ này ${m.review?.[id] || 0}/3 · Sai không trừ lượt đúng.`
            )
        );
    }

    /* ================================================
       GET / CACHE QUESTION
    ================================================ */

    const sig = [

        today(),

        m.type,
        m.target,
        m.stage,

        m.round,
        m.cursor,

        id,
        m.review?.[id] || 0

    ].join(':');

    if (
        !question ||
        questionSig !== sig
    ) {

        question = makeQuestion(
            w,
            m.stage
        );

        questionSig = sig;
    }

    const q = question;

    if (
        m.feedback &&
        q
    ) {

        q.choices =
            m.feedback.choices || q.choices;

        q.answer =
            m.feedback.answer;

        q.mode =
            m.feedback.mode;

        q.ask =
            m.feedback.ask || q.ask;
    }

    if (!q) {

        root.append(
            el(
                'p',
                'daily-muted',

                'Không đủ đáp án nhiễu. Kiểm tra database.'
            )
        );

        return;
    }

    root.append(
        el(
            'p',
            'daily-muted',

            LABEL[q.mode]
        )
    );

    /* ================================================
       AUDIO MODE
    ================================================ */

    if (
        q.mode.startsWith('audio_')
    ) {

        root.append(

            el(
                'div',
                'daily-word daily-audio',

                '🔊 NGHE VÀ CHỌN ĐÁP ÁN'
            ),

            button(

                '▶ NGHE LẠI',

                () => speak(w),

                'daily-button daily-wide daily-secondary'
            )
        );

    } else {

        root.append(
            el(
                'div',
                'daily-word',
                q.ask
            )
        );
    }

    /* ================================================
       FOUR ANSWERS
    ================================================ */

    const options = el(
        'div',
        'daily-answers'
    );

    q.choices.forEach(choice => {

        const b = button(

            choice,

            () => answer(choice),

            'daily-answer'
        );

        if (
            m.feedback
        ) {

            b.disabled = true;

            if (
                choice === q.answer
            ) {

                b.classList.add(
                    'correct'
                );

            } else if (
                choice === m.feedback.selected
            ) {

                b.classList.add(
                    'wrong'
                );
            }
        }

        options.append(b);
    });

    root.append(options);

    /* ================================================
       FEEDBACK AREA

       Luôn chiếm sẵn không gian.
       Không làm đáp án nhảy sau khi chọn.
    ================================================ */

    const response = el(
        'div',
        'daily-response-area'
    );

    response.setAttribute(
        'aria-live',
        'polite'
    );

    if (
        m.feedback
    ) {

        const f = m.feedback;

        const feedback = el(

            'div',

            `daily-feedback ${
                f.correct ? 'correct' : 'wrong'
            }`
        );

        feedback.append(

            el(
                'strong',
                '',

                f.correct
                    ? '✓ CHÍNH XÁC'
                    : '✕ CHƯA CHÍNH XÁC'
            ),

            el(
                'div',
                '',

                `Đáp án: ${f.answer}`
            ),

            el(
                'div',
                'daily-muted',

                `${w.word} · ${w.reading} · ${w.meaning}`
            )
        );

        response.append(

            feedback,

            button(
                'NEXT →',
                nextQuestion,
                'daily-button daily-next-button'
            )
        );

    } else {

        response.append(
            el(
                'div',
                'daily-feedback-placeholder',

                'Chọn một đáp án để xem kết quả và nghe phát âm.'
            )
        );
    }

    root.append(response);
}


/* ============================================================
   26. HISTORY DATA
============================================================ */

function historyRows() {

    const rows = [];

    for (
        const [sk, group]
        of Object.entries(learned())
    ) {

        for (
            const [key, value]
            of Object.entries(group || {})
        ) {

            if (
                !value ||
                !value.word
            ) {
                continue;
            }

            rows.push({

                ...value,

                source: sk,
                key
            });
        }
    }

    return rows.sort(
        (a, b) =>

            String(
                b.lastLearnedAt || ''
            ).localeCompare(
                String(a.lastLearnedAt || '')
            ) ||

            compareIds(
                a.id,
                b.id
            )
    );
}


/* ============================================================
   27. DASHBOARD ROOT

   Tương thích index.html hiện tại.

   Chuyển nội dung Dashboard sang vùng render động.
============================================================ */

function ensureDashboardRoot() {

    let root = $(
        'dailyDashboard'
    );

    if (root) {
        return root;
    }

    const section = $(
        'dailyHistoryPage'
    )?.querySelector('.daily-card');

    if (!section) {
        return null;
    }

    const title = el(
        'h3',
        '',
        '📊 DASHBOARD TỪ ĐÃ HỌC'
    );

    root = el('div', '');

    root.id = 'dailyDashboard';

    section.replaceChildren(
        title,
        root
    );

    return root;
}


/* ============================================================
   28. CLEAR HISTORY BY SOURCE

   Xóa bộ được chọn.
   Cho phép học lại từ ID đầu tiên.
============================================================ */

async function clearLearnedSource(sk) {

    if (sk === 'all') {
        return;
    }

    const count = historyRows().filter(
        word => word.source === sk
    ).length;

    if (
        !confirm(
            `Xóa lịch sử ${count} từ của ${sk.toUpperCase()} để học lại từ ID 1?`
        )
    ) {
        return;
    }

    const success = await update(
        (profile, d) => {

            if (
                profile.learned
            ) {
                delete profile.learned[sk];
            }

            if (
                d.completed
            ) {
                delete d.completed[sk];
            }

            if (
                d.mission &&
                sourceKey(
                    d.mission.type,
                    d.mission.target
                ) === sk
            ) {
                d.mission = null;
            }

            if (
                d.pausedMissions
            ) {
                delete d.pausedMissions[sk];
            }
        }
    );

    if (success) {

        dashboardFilter = 'all';

        question = null;
        questionSig = '';

        renderDashboard();

        message(
            'Đã xóa lịch sử bộ từ ' + sk
        );
    }
}


/* ============================================================
   29. DASHBOARD
============================================================ */

function renderDashboard() {

    const root =
        ensureDashboardRoot();

    if (!root) return;

    root.replaceChildren();

    const all = historyRows();

    const sourceStats = new Map();

    for (const w of all) {

        sourceStats.set(

            w.source,

            (sourceStats.get(w.source) || 0) + 1
        );
    }

    root.append(
        el(
            'div',
            'daily-dashboard-total',

            `📚 ${all.length} từ đã thuộc · ${sourceStats.size} bộ từ`
        )
    );

    /* ================================================
       QUIZ TODAY STATS
    ================================================ */

    const rounds = Object.values(
        day().quizHistory || {}
    );

    const right = rounds.reduce(
        (n, r) =>
            n + (Number(r.correct) || 0),
        0
    );

    const wrong = rounds.reduce(
        (n, r) =>
            n + (Number(r.wrong) || 0),
        0
    );

    const total = right + wrong;

    root.append(
        el(
            'div',
            'daily-summary-numbers',

            `Quiz hôm nay: ${right} đúng / ${wrong} sai · ${total ? Math.round(100 * right / total) : 0}%`
        )
    );

    /* ================================================
       QUIZ REVIEW HISTORY
    ================================================ */

    if (rounds.length) {

        const details = el(
            'details',
            'daily-available-details'
        );

        details.append(
            el(
                'summary',
                '',

                `Xem lại ${rounds.length} lượt Quiz hôm nay`
            )
        );

        const review = el(
            'div',
            'daily-result-list'
        );

        rounds.forEach(
            (round, index) => {

                review.append(
                    el(
                        'h4',
                        'daily-muted',

                        `Lượt ${index + 1} · ${round.source || ''} · ${round.correct || 0} đúng / ${round.wrong || 0} sai`
                    )
                );

                for (
                    const item
                    of round.results || []
                ) {

                    const row = el(
                        'div',
                        'daily-result-row'
                    );

                    row.append(

                        el(
                            'span',
                            '',

                            `${item.word || item.id} · ${item.reading || ''} · ${LABEL[item.mode] || ''}`
                        ),

                        el(
                            'span',

                            item.correct
                                ? 'daily-good'
                                : 'daily-bad',

                            item.correct
                                ? '✓ Đúng'
                                : `✕ ${item.selected || '—'} → ${item.answer || '—'}`
                        )
                    );

                    review.append(row);
                }
            }
        );

        details.append(review);
        root.append(details);
    }

    /* ================================================
       SOURCE CHIPS
    ================================================ */

    const chips = el(
        'div',
        'daily-filter-chips'
    );

    for (
        const [sk, n]
        of sourceStats
    ) {

        const b = button(

            `${sk.replace('_', ' / ').toUpperCase()} (${n})`,

            () => {

                dashboardFilter = sk;

                renderDashboard();
            },

            'daily-chip' +
            (
                dashboardFilter === sk
                    ? ' active'
                    : ''
            )
        );

        chips.append(b);
    }

    root.append(chips);

    /* ================================================
       SOURCE FILTER
    ================================================ */

    const filters = el(
        'div',
        'daily-dashboard-filters'
    );

    const select = el(
        'select',
        'daily-select'
    );

    select.append(
        new Option(
            'Tất cả các bộ',
            'all'
        )
    );

    for (
        const [sk, n]
        of sourceStats
    ) {

        select.add(
            new Option(
                `${sk.toUpperCase()} (${n})`,
                sk
            )
        );
    }

    if (
        dashboardFilter !== 'all' &&
        !sourceStats.has(dashboardFilter)
    ) {

        dashboardFilter = 'all';
    }

    select.value =
        dashboardFilter;

    select.onchange = () => {

        dashboardFilter = select.value;
        renderDashboard();
    };

    /* ================================================
       CLEAR BUTTON
    ================================================ */

    const clear = button(

        '🗑 XÓA LỊCH SỬ BỘ NÀY',

        () => clearLearnedSource(
            dashboardFilter
        ),

        'daily-clear-button'
    );

    clear.disabled =
        busy ||
        dashboardFilter === 'all';

    root.append(clear);

    /* ================================================
       SEARCH
    ================================================ */

    const search = el(
        'input',
        'daily-select'
    );

    search.placeholder =
        'Tìm Kanji / Hiragana / nghĩa...';

    search.value = dashboardSearch;

    search.oninput = () => {

        dashboardSearch = search.value;

        renderHistoryList();
    };

    filters.append(
        select,
        search
    );

    root.append(filters);

    root.append(
        el(
            'div',
            'daily-muted',

            `Hôm nay: ${dayCompleted(day())} từ · Điểm danh: ${day().checked ? 'Có' : 'Chưa'}`
        )
    );

    /* ================================================
       VOCABULARY LIST
    ================================================ */

    root.append(
        el(
            'div',
            'daily-history-list'
        )
    );

    renderHistoryList();
}


/* ============================================================
   30. DASHBOARD VOCABULARY LIST
============================================================ */

function renderHistoryList() {

    const root = $(
        'dailyDashboard'
    )?.querySelector(
        '.daily-history-list'
    );

    if (!root) return;

    root.replaceChildren();

    const q =
        dashboardSearch
            .trim()
            .toLocaleLowerCase();

    const filtered = historyRows().filter(
        word => {

            const correctSource =
                dashboardFilter === 'all' ||
                dashboardFilter === word.source;

            const searchMatch =
                !q ||
                [
                    word.word,
                    word.reading,
                    word.meaning
                ].some(
                    value =>
                        String(value || '')
                            .toLocaleLowerCase()
                            .includes(q)
                );

            return (
                correctSource &&
                searchMatch
            );
        }
    );

    root.append(
        el(
            'p',
            'daily-muted',

            `Đang hiển thị ${filtered.length} từ`
        )
    );

    for (
        const word of filtered.slice(0, 500)
    ) {

        const row = el(
            'div',
            'daily-history-word'
        );

        const info = el(
            'div',
            ''
        );

        info.append(

            el(
                'strong',
                '',
                word.word
            ),

            el(
                'span',
                '',

                ` ${word.reading} · ${word.meaning}`
            ),

            el(
                'small',
                '',

                `${word.source.toUpperCase()} · ${word.lastLearnedAt || '—'}`
            )
        );

        row.append(

            info,

            button(
                '🔊',

                () => speak(word),

                'daily-history-sound'
            )
        );

        root.append(row);
    }

    if (
        filtered.length > 500
    ) {

        root.append(
            el(
                'p',
                'daily-muted',

                `Hiển thị 500/${filtered.length} từ. Hãy lọc để thu hẹp danh sách.`
            )
        );
    }
}


/* ============================================================
   31. RENDER MAIN UI

   - Header streak
   - Goal progress
   - Auto-collapse configuration
   - Focus mode
   - Dashboard
============================================================ */

function render() {

    const signed =
        !!auth.currentUser;

    const header =
        $('dailyHeaderButton');

    header?.classList.toggle(
        'hidden',
        !signed
    );

    if (!signed) return;

    const d = day();
    const m = mission();

    const g = clamp(
        state.goal
    );

    const count =
        dayCompleted(d);

    const streak = streakFor(
        state,
        today()
    );

    /* ================================================
       HEADER STREAK
    ================================================ */

    if (
        $('dailyStreakCount')
    ) {

        $('dailyStreakCount').textContent =
            streak;
    }

    header?.classList.toggle(
        'checked',
        !!d.checked
    );

    if (
        $('dailyStreak')
    ) {

        $('dailyStreak').textContent =
            `${streak} ngày`;
    }

    if (
        $('dailyDate')
    ) {

        $('dailyDate').textContent =
            `${today()} · Việt Nam (UTC+7)`;
    }

    /* ================================================
       CHECK-IN
    ================================================ */

    if (
        $('dailyCheckinStatus')
    ) {

        $('dailyCheckinStatus').textContent =
            d.checked

                ? '✓ Nhiệm vụ hoàn thành · Đã điểm danh'

                : 'Điểm danh tự động khi hoàn thành mục tiêu';
    }

    const checkButton =
        $('dailyCheckinButton');

    if (checkButton) {

        checkButton.disabled = true;

        checkButton.textContent =
            d.checked
                ? '✓ ĐÃ ĐIỂM DANH'
                : '🔒 HOÀN THÀNH ĐỂ ĐIỂM DANH';
    }

    /* ================================================
       GOAL
    ================================================ */

    if (
        $('dailyGoalLabel')
    ) {

        $('dailyGoalLabel').textContent =
            `${g} từ/ngày`;
    }

    if (
        $('dailyProgress')
    ) {

        $('dailyProgress').textContent =
            `${Math.min(g, count)} / ${g}`;
    }

    if (
        $('dailyBar')
    ) {

        $('dailyBar').style.width =
            `${Math.min(100, 100 * count / g)}%`;
    }

    if (
        $('dailyMissionStatus')
    ) {

        $('dailyMissionStatus').textContent =
            d.missionDone

                ? '✓ HOÀN THÀNH NHIỆM VỤ NGÀY'

                : `Còn ${Math.max(0, g - count)} từ`;
    }

    if (
        $('dailyActual')
    ) {

        $('dailyActual').textContent =
            `Hôm nay: ${count} từ · Lịch sử: ${historyRows().length} từ`;
    }

    if (
        $('dailyGoalInput') &&
        document.activeElement !==
        $('dailyGoalInput')
    ) {

        $('dailyGoalInput').value = g;
    }

    if (
        $('dailyStartButton')
    ) {

        $('dailyStartButton').disabled =
            busy;
    }

    /* ================================================
       FOCUS MODE

       Chỉ kích hoạt khi:
       - Ở tab học
       - Đang học
       - Mục tiêu đã thu gọn
    ================================================ */

    const studying =
        tab === 'learn' &&
        [
            'flashcard',
            'review',
            'quiz'
        ].includes(m?.stage);

    const overlay =
        $('dailyOverlay');

    overlay?.classList.toggle(
        'daily-focus-mode',
        studying && setupCollapsed
    );

    /* ================================================
       AUTO COLLAPSE GOAL
    ================================================ */

    $('dailySetup')?.classList.toggle(
        'daily-setup-collapsed',

        setupCollapsed && !!m
    );

    const edit =
        $('dailyEditGoalButton');

    if (edit) {

        edit.hidden = !m;

        edit.textContent =
            setupCollapsed
                ? '⚙ SỬA MỤC TIÊU'
                : '✕ THU GỌN';
    }

    /* ================================================
       REMAINING WORDS
    ================================================ */

    const available =
        $('dailyAvailableWords');

    if (available) {

        available.replaceChildren();

        if (
            m &&
            loadedSource === sourceKey(
                m.type,
                m.target
            ) &&
            words.length
        ) {

            const sk = sourceKey(
                m.type,
                m.target
            );

            const known =
                learned()[sk] || {};

            const completedToday =
                day().completed?.[sk] || {};

            const left = words.filter(
                w =>

                    !known[wordKey(w.id)] &&
                    !completedToday[wordKey(w.id)]
            );

            const details = el(
                'details',
                'daily-available-details'
            );

            details.append(
                el(
                    'summary',
                    '',

                    `Còn ${left.length} từ trong bộ ${m.target.toUpperCase()} · Xem danh sách`
                )
            );

            const list = el(
                'div',
                'daily-remaining-list'
            );

            for (
                const w of left.slice(0, 500)
            ) {

                list.append(
                    el(
                        'div',
                        'daily-remaining-word',

                        `${w.word} · ${w.reading} · ${w.meaning}`
                    )
                );
            }

            details.append(list);
            available.append(details);
        }
    }

    /* ================================================
       CURRENT SOURCE
    ================================================ */

    if (
        $('dailyStageSummary')
    ) {

        $('dailyStageSummary').textContent =
            m
                ? `Nguồn: ${m.type.toUpperCase()} / ${m.target.toUpperCase()} · Nhóm tối đa ${BATCH} từ`
                : 'Chưa bắt đầu';
    }

    /* ================================================
       TABS
    ================================================ */

    $('dailyMissionTab')?.classList.toggle(
        'active',
        tab === 'learn'
    );

    $('dailyHistoryTab')?.classList.toggle(
        'active',
        tab === 'history'
    );

    $('dailyLearningPage')?.classList.toggle(
        'hidden',
        tab !== 'learn'
    );

    $('dailyHistoryPage')?.classList.toggle(
        'hidden',
        tab !== 'history'
    );

    /* ================================================
       RENDER ACTIVE TAB
    ================================================ */

    if (
        !$('dailyOverlay')?.classList.contains(
            'hidden'
        )
    ) {

        if (
            tab === 'learn'
        ) {

            renderStudy();

        } else {

            renderDashboard();
        }
    }
}


/* ============================================================
   32. OPEN DAILY
============================================================ */

async function open() {

    if (!auth.currentUser) {

        window.BatLingoAuthUI?.open?.();

        return;
    }

    tab = 'learn';

    const m = mission();

    setupCollapsed = !!m;

    if (m) {

        if (
            $('dailyStudyMode')
        ) {

            $('dailyStudyMode').value =
                m.type;
        }

        await updateTargets(
            m.target
        );
    }

    $('dailyOverlay')?.classList.remove(
        'hidden'
    );

    render();

    resumeSource();
}


/* ============================================================
   33. CLOSE DAILY
============================================================ */

function close() {

    $('dailyOverlay')?.classList.add(
        'hidden'
    );

    window.speechSynthesis?.cancel();
}


/* ============================================================
   34. FIREBASE USER LISTENER
============================================================ */

function watch(userId) {

    if (
        uid === userId &&
        stopUser
    ) {
        return;
    }

    stopUser?.();

    stopUser = null;

    uid = userId || '';

    state = {};

    loadedSource = '';
    words = [];

    loadSeq++;

    question = null;
    questionSig = '';

    revealed = false;

    close();
    render();

    if (!userId) return;

    stopUser = onValue(

        ref(
            db,
            `dailyProgress/${userId}`
        ),

        snapshot => {

            if (
                uid !== userId
            ) {
                return;
            }

            state =
                snapshot.val() || {};

            render();
        },

        error => {

            message(
                'Firebase: ' + error.message,
                true
            );
        }
    );
}


/* ============================================================
   35. INITIALIZE DAILY MISSION

   Được gọi từ main.js:
       initDaily();
============================================================ */

export function initDaily() {

    if (initialized) return;

    initialized = true;

    /* ================================================
       CREATE EDIT GOAL BUTTON

       Tạo bằng JS:
       Không cần sửa index.html.
    ================================================ */

    const setup =
        $('dailySetup');

    if (
        setup &&
        !$('dailyEditGoalButton')
    ) {

        const heading =
            setup.querySelector('h3');

        const edit = el(

            'button',
            'daily-edit-goal',
            '⚙ SỬA MỤC TIÊU'
        );

        edit.id =
            'dailyEditGoalButton';

        edit.type = 'button';
        edit.hidden = true;

        edit.addEventListener(
            'click',
            () => {

                setupCollapsed =
                    !setupCollapsed;

                render();

                if (
                    !setupCollapsed
                ) {

                    setup.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        );

        heading?.after(edit);
    }

    /* ================================================
       SERVER TIME OFFSET
    ================================================ */

    onValue(

        ref(
            db,
            '.info/serverTimeOffset'
        ),

        snapshot => {

            offset =
                Number(snapshot.val()) || 0;

            render();
        }
    );

    /* ================================================
       HEADER BUTTON
    ================================================ */

    $('dailyHeaderButton')
        ?.addEventListener(
            'click',
            open
        );

    /* ================================================
       CLOSE BUTTON
    ================================================ */

    $('dailyCloseButton')
        ?.addEventListener(
            'click',
            close
        );

    $('dailyOverlay')
        ?.addEventListener(
            'click',
            event => {

                if (
                    event.target ===
                    $('dailyOverlay')
                ) {

                    close();
                }
            }
        );

    /* ================================================
       SELECT SOURCE
    ================================================ */

    $('dailyStudyMode')
        ?.addEventListener(
            'change',
            () => updateTargets()
        );

    /* ================================================
       SAVE GOAL
    ================================================ */

    $('dailyStartButton')
        ?.addEventListener(
            'click',
            startMission
        );

    /* ================================================
       TABS
    ================================================ */

    $('dailyMissionTab')
        ?.addEventListener(
            'click',
            () => {

                tab = 'learn';
                render();
            }
        );

    $('dailyHistoryTab')
        ?.addEventListener(
            'click',
            () => {

                tab = 'history';
                render();
            }
        );

    /* ================================================
       ESC CLOSE
    ================================================ */

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Escape'
            ) {

                close();
            }
        }
    );

    /* ================================================
       FIREBASE AUTH
    ================================================ */

    onAuthStateChanged(
        auth,
        user => watch(user?.uid)
    );

    /* ================================================
       DATE CHANGE
    ================================================ */

    lastDate = today();

    setInterval(
        () => {

            if (
                today() !== lastDate
            ) {

                lastDate = today();

                question = null;
                questionSig = '';

                revealed = false;
            }

            render();

        },
        30000
    );

    /* ================================================
       INITIAL TARGETS
    ================================================ */

    updateTargets().catch(
        error => message(
            error.message,
            true
        )
    );

    render();
}
