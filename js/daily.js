
/* ============================================================
   BATLINGO - DAILY MISSION V4

   01. Config
   02. Helper
   03. Load Vocabulary theo ID
   04. Firebase / Streak
   05. Mục tiêu và chọn bộ từ
   06. Tạo nhóm tối đa 10 từ
   07. Flashcard
   08. Review / Question Engine
   09. Quiz / Summary
   10. Dashboard / Clear History
   11. Render Learning
   12. Render Main UI
   13. Initialize
============================================================ */

import { auth, db } from './firebase.js';

import {
    ref,
    onValue,
    runTransaction
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';


/* ============================================================
   01. CONFIG
============================================================ */

const $ = id => document.getElementById(id);

const TIMEZONE = 'Asia/Ho_Chi_Minh';

const MIN_GOAL = 5;
const MAX_GOAL = 100;
const BATCH_SIZE = 10;

const MODES = [
    'kanji_meaning',
    'kanji_hiragana',
    'hiragana_meaning',
    'meaning_kanji',
    'audio_meaning',
    'audio_hiragana',
    'audio_kanji'
];

const MODE_LABELS = {
    kanji_meaning: 'Kanji → Nghĩa',
    kanji_hiragana: 'Kanji → Hiragana',
    hiragana_meaning: 'Hiragana → Nghĩa',
    meaning_kanji: 'Nghĩa → Kanji',
    audio_meaning: 'Nghe → Nghĩa',
    audio_hiragana: 'Nghe → Hiragana',
    audio_kanji: 'Nghe → Kanji'
};

const ANSWER_FIELD = {
    kanji_meaning: 'meaning',
    kanji_hiragana: 'reading',
    hiragana_meaning: 'meaning',
    meaning_kanji: 'word',
    audio_meaning: 'meaning',
    audio_hiragana: 'reading',
    audio_kanji: 'word'
};


/* ============================================================
   02. STATE
============================================================ */

let currentUid = '';
let unsubscribeUser = null;

let databaseOffset = 0;
let data = {};

let loadedKey = '';
let vocabulary = [];
let loadVersion = 0;

let inProgress = false;
let initialized = false;

let activeTab = 'mission';

let filterSource = 'all';
let searchText = '';

let cardRevealed = false;
let cachedQuestion = null;
let cachedQuestionKey = '';

let lastVietnamDate = '';


/* ============================================================
   03. HELPERS
============================================================ */

const text = value =>
    String(value ?? '').trim();

const sourceKey = (type, target) =>
    `${type}_${target}`;

const keyForId = id =>
    encodeURIComponent(String(id)).replace(/\./g, '%2E');

const numericSort = new Intl.Collator('en', {
    numeric: true,
    sensitivity: 'base'
});

const sortIds = (a, b) =>
    numericSort.compare(String(a), String(b));

const validTarget = value =>
    /^[a-z][a-z0-9_]{0,50}$/.test(value);

const clampGoal = value =>
    Math.min(
        MAX_GOAL,
        Math.max(
            MIN_GOAL,
            Math.floor(Number(value) || MIN_GOAL)
        )
    );


/* ------------------------------------------------------------
   RANDOM: Chỉ dùng để random QUIZ / ANSWERS

   KHÔNG dùng hàm này để chọn danh sách từ học.
------------------------------------------------------------ */

function randomize(items) {

    const result = [...items];

    for (let i = result.length - 1; i > 0; i--) {

        const j = Math.floor(
            Math.random() * (i + 1)
        );

        [result[i], result[j]] = [
            result[j],
            result[i]
        ];
    }

    return result;
}


/* ------------------------------------------------------------
   DATE: Luôn dùng giờ Việt Nam
------------------------------------------------------------ */

function vietnamDate() {

    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: TIMEZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(
        new Date(Date.now() + databaseOffset)
    );

    const p = Object.fromEntries(
        parts.map(value => [value.type, value.value])
    );

    return `${p.year}-${p.month}-${p.day}`;
}


function previousDate(date) {

    const value = new Date(
        `${date}T00:00:00Z`
    );

    value.setUTCDate(
        value.getUTCDate() - 1
    );

    return value.toISOString().slice(0, 10);
}


/* ------------------------------------------------------------
   Lấy dữ liệu ngày hiện tại
------------------------------------------------------------ */

function currentDay() {
    return data.days?.[vietnamDate()] || {};
}

function currentMission() {
    return currentDay().mission || null;
}

function currentWord(id) {
    return vocabulary.find(
        word => word.id === String(id)
    );
}

function allLearned() {
    return data.learned || {};
}


/* ------------------------------------------------------------
   Đếm số từ đã hoàn thành trong ngày

   Cộng tất cả các bộ từ:
   JLPT N5 + JLPT N4 + Topic...
------------------------------------------------------------ */

function completedCount(day) {

    return Object.values(
        day.completed || {}
    ).reduce(
        (total, group) =>
            total + Object.keys(group || {}).length,
        0
    );
}


function remainingGoal(day, profile) {

    return Math.max(
        0,
        clampGoal(profile.goal) - completedCount(day)
    );
}


/* ------------------------------------------------------------
   STATUS MESSAGE
------------------------------------------------------------ */

function notify(message, isError = false) {

    const label = $('dailyMessage');

    if (!label) return;

    label.textContent = message;
    label.classList.toggle('error', isError);
}


/* ------------------------------------------------------------
   Reset UI state của câu hỏi hiện tại
------------------------------------------------------------ */

function resetQuestion() {

    cachedQuestion = null;
    cachedQuestionKey = '';

    cardRevealed = false;
}


/* ------------------------------------------------------------
   ĐỌC TIẾNG NHẬT
------------------------------------------------------------ */

function sayJapanese(word) {

    if (!word || !window.speechSynthesis) {
        return;
    }

    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(
        word.reading || word.word
    );

    utterance.lang = 'ja-JP';
    utterance.rate = 0.85;

    speechSynthesis.speak(utterance);
}


/* ------------------------------------------------------------
   Tạo HTML Element an toàn
------------------------------------------------------------ */

function element(tag, className = '', value) {

    const result = document.createElement(tag);

    if (className) {
        result.className = className;
    }

    if (value !== undefined) {
        result.textContent = value;
    }

    return result;
}


function action(
    label,
    callback,
    className = 'daily-button daily-wide'
) {

    const button = element(
        'button',
        className,
        label
    );

    button.type = 'button';
    button.disabled = inProgress;

    button.addEventListener(
        'click',
        callback
    );

    return button;
}


/* ============================================================
   04. LOAD VOCABULARY

   JLPT:
   data/n5.json
   data/n4.json
   ...
   data/n1.json

   TOPIC:
   data/topics/animals.json
   data/topics/colors.json
   ...
============================================================ */

async function loadVocabulary(type, target) {

    if (
        !['jlpt', 'topic'].includes(type) ||
        !validTarget(target) ||
        (type === 'jlpt' && !/^n[1-5]$/.test(target))
    ) {
        throw new Error(
            'Nguồn từ vựng không hợp lệ.'
        );
    }

    const key = sourceKey(type, target);

    // Sử dụng cache nếu đúng bộ từ đang mở.
    if (
        loadedKey === key &&
        vocabulary.length
    ) {
        return vocabulary;
    }

    const version = ++loadVersion;

    const url = type === 'jlpt'
        ? `data/${target}.json`
        : `data/topics/${target}.json`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(
            `Không tải được ${url}`
        );
    }

    const json = await response.json();

    if (!Array.isArray(json)) {
        throw new Error(
            'Database phải là mảng JSON.'
        );
    }

    const seen = new Set();

    const list = json.map(item => ({

        id: text(item.id),
        word: text(item.word),
        reading: text(item.reading),
        meaning: text(item.meaning)

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

    /* ========================================================
       QUAN TRỌNG

       Sắp xếp từ theo ID tăng dần.

       ID 1 → ID 2 → ID 3 → ...

       Không random danh sách từ.
    ======================================================== */

    list.sort(
        (a, b) => sortIds(a.id, b.id)
    );

    // Quiz cần tối thiểu 4 lựa chọn phân biệt.
    if (list.length < 4) {
        throw new Error(
            'Bộ từ cần ít nhất 4 từ để tạo Quiz.'
        );
    }

    if (version === loadVersion) {

        vocabulary = list;
        loadedKey = key;
    }

    return list;
}


/* ============================================================
   05. DANH SÁCH TỪ CHƯA HỌC

   - Bỏ qua những từ đã hoàn thành.
   - Bắt đầu từ ID nhỏ nhất chưa học.
   - Không random.
   - Nếu chỉ còn 2 từ thì trả về đúng 2 từ.
============================================================ */

function availableWordIds(
    list,
    profile,
    day,
    type,
    target
) {

    const key = sourceKey(type, target);

    const previouslyLearned =
        profile.learned?.[key] || {};

    const completedToday =
        day.completed?.[key] || {};

    return list.filter(word => {

        const id = keyForId(word.id);

        return (
            !previouslyLearned[id] &&
            !completedToday[id]
        );

    }).map(word => word.id);
}


/* ============================================================
   06. FIREBASE / DAILY STREAK
============================================================ */

/* ------------------------------------------------------------
   Điểm danh tự động

   Chỉ điểm danh khi đủ số từ mục tiêu.

   Đã điểm danh ngày hôm nay:
   Không tăng lần thứ hai.
------------------------------------------------------------ */

function updateStreak(profile, date) {

    const day = profile.days?.[date];

    if (
        !day ||
        day.checked ||
        completedCount(day) < clampGoal(profile.goal)
    ) {
        return;
    }

    day.checked = true;
    day.missionDone = true;

    const yesterday = previousDate(date);

    profile.streak =
        profile.lastCheckin === yesterday

            ? (Number(profile.streak) || 0) + 1

            : 1;

    profile.lastCheckin = date;
}


/* ------------------------------------------------------------
   Số streak để hiển thị

   Nếu hôm qua đã điểm danh:
   Vẫn giữ streak.

   Nếu bỏ lỡ nhiều hơn một ngày:
   Hiển thị 0.
------------------------------------------------------------ */

function visibleStreak() {

    const last = data.lastCheckin;
    const today = vietnamDate();

    if (
        last === today ||
        last === previousDate(today)
    ) {
        return Number(data.streak) || 0;
    }

    return 0;
}


/* ------------------------------------------------------------
   FIREBASE TRANSACTION

   Sử dụng một nút:
   dailyProgress/{uid}

   Đảm bảo thao tác ghi cho từng tài khoản
   không ghi đè nhầm tiến độ của máy khác.
------------------------------------------------------------ */

async function save(change) {

    const uid = auth.currentUser?.uid;

    if (!uid || inProgress) {
        return false;
    }

    inProgress = true;

    render();

    const date = vietnamDate();

    try {

        const databaseRef = ref(
            db,
            `dailyProgress/${uid}`
        );

        const result = await runTransaction(
            databaseRef,
            raw => {

                const profile =
                    raw && typeof raw === 'object'
                        ? raw
                        : {};

                profile.goal = clampGoal(
                    profile.goal
                );

                profile.days ||= {};
                profile.learned ||= {};

                profile.days[date] ||= {};

                const day = profile.days[date];

                day.completed ||= {};

                // Gọi chức năng cần lưu.
                change(profile, day, date);

                // Kiểm tra điều kiện điểm danh.
                updateStreak(profile, date);

                return profile;

            },
            {
                applyLocally: false
            }
        );

        if (
            result.committed &&
            auth.currentUser?.uid === uid
        ) {

            data = result.snapshot.val() || {};
        }

        return result.committed;

    } catch (error) {

        console.error('[DAILY]', error);

        notify(
            `Firebase: ${error.message}`,
            true
        );

        return false;

    } finally {

        inProgress = false;

        render();
    }
}


/* ============================================================
   07. JLPT / TOPIC SELECT
============================================================ */

async function refreshTargets(selected = '') {

    const type =
        $('dailyStudyMode')?.value || 'jlpt';

    const target = $('dailyTarget');

    if (!target) return;

    if (type === 'jlpt') {

        const levels = [
            'n5', 'n4', 'n3', 'n2', 'n1'
        ];

        target.replaceChildren(
            ...levels.map(level =>
                new Option(
                    level.toUpperCase(),
                    level
                )
            )
        );

    } else {

        // Lấy danh sách topic từ lobby.js.
        const module = await import('./lobby.js');

        const topics = module.topics || [];

        target.replaceChildren(
            ...topics.map(topic =>
                new Option(
                    topic.name,
                    topic.id
                )
            )
        );
    }

    if (
        [...target.options].some(
            option => option.value === selected
        )
    ) {
        target.value = selected;
    }
}


/* ============================================================
   08. START / CHANGE GOAL / CHANGE SOURCE

   Người học có thể:

   - Đổi mục tiêu 5–100.
   - Đổi JLPT N1–N5.
   - Đổi chủ đề.
   - Giữ lịch sử từ đã hoàn thành.
   - Tạm lưu bài học của bộ cũ.
============================================================ */

async function startMission() {

    if (inProgress) return;

    const type =
        $('dailyStudyMode')?.value || 'jlpt';

    const target =
        $('dailyTarget')?.value || 'n5';

    const goal = Number(
        $('dailyGoalInput')?.value
    );

    if (
        !Number.isInteger(goal) ||
        goal < MIN_GOAL ||
        goal > MAX_GOAL
    ) {

        notify(
            'Chỉ tiêu phải là số nguyên từ 5 đến 100.',
            true
        );

        return;
    }

    const old = currentMission();

    const changingSource =
        old &&
        (
            old.type !== type ||
            old.target !== target
        );

    if (
        changingSource &&
        !confirm(
            'Đổi bộ từ? Tiến độ bộ đang học sẽ được lưu để tiếp tục sau.'
        )
    ) {
        return;
    }

    try {

        notify('Đang tải bộ từ...');

        const list = await loadVocabulary(
            type,
            target
        );

        const ids = availableWordIds(
            list,
            data,
            currentDay(),
            type,
            target
        );

        const changed = await save(
            (profile, day) => {

                profile.goal = goal;

                day.pausedMissions ||= {};

                const chosen = sourceKey(
                    type,
                    target
                );

                const same =
                    day.mission?.type === type &&
                    day.mission?.target === target;

                /* ----------------------------------------
                   Nếu đang học bộ A và đổi sang B,
                   tạm lưu tiến độ bộ A.
                ----------------------------------------- */

                if (
                    !same &&
                    day.mission
                ) {

                    const previousKey = sourceKey(
                        day.mission.type,
                        day.mission.target
                    );

                    day.pausedMissions[previousKey] =
                        day.mission;
                }

                /* ----------------------------------------
                   Khôi phục tiến độ cũ nếu có.
                ----------------------------------------- */

                const previous = same
                    ? day.mission
                    : day.pausedMissions[chosen];

                const m = previous || {

                    type,
                    target,

                    stage: 'between',

                    batch: [],
                    cursor: 0,

                    review: {},
                    quizResults: {},

                    feedback: null,
                    summary: null,

                    round: 0

                };

                m.type = type;
                m.target = target;
                m.goal = goal;

                /* ----------------------------------------
                   Hàng chờ được tạo theo thứ tự ID.
                   Không chèn lại từ đang nằm trong batch.
                ----------------------------------------- */

                m.queue = ids.filter(
                    id => !m.batch?.includes(id)
                );

                /* ----------------------------------------
                   Nếu đủ mục tiêu thì hoàn thành ngày.
                ----------------------------------------- */

                if (
                    remainingGoal(day, profile) <= 0
                ) {

                    m.stage = 'done';
                    m.batch = [];

                } else if (
                    ['done', 'exhausted'].includes(m.stage)
                ) {

                    m.stage = 'between';
                    m.batch = [];
                }

                day.mission = m;

                delete day.pausedMissions[chosen];
            }
        );

        if (!changed) return;

        resetQuestion();

        await prepareBatch();

    } catch (error) {

        notify(
            error.message,
            true
        );
    }
}


/* ============================================================
   09. PREPARE BATCH

   Ví dụ còn 25 từ:

   Batch 1: 10
   Batch 2: 10
   Batch 3: 5

   Nếu chỉ còn 2 từ:
   Batch = 2

   Không ép đủ 10 từ.
============================================================ */

async function prepareBatch() {

    const m = currentMission();

    if (
        !m ||
        inProgress ||
        m.batch?.length ||
        !['between', 'exhausted'].includes(m.stage)
    ) {
        return;
    }

    await save((profile, day) => {

        const x = day.mission;

        if (
            !x ||
            x.batch?.length
        ) {
            return;
        }

        const key = sourceKey(
            x.type,
            x.target
        );

        const completed =
            day.completed?.[key] || {};

        /* ----------------------------------------
           Loại từ đã hoàn thành.
        ----------------------------------------- */

        x.queue = (
            x.queue || []
        ).filter(
            id => !completed[keyForId(id)]
        );

        /* ----------------------------------------
           Chỉ lấy tối đa 10 từ.

           Danh sách queue đã có thứ tự ID.
        ----------------------------------------- */

        x.batch = x.queue.slice(
            0,
            Math.min(
                BATCH_SIZE,
                remainingGoal(day, profile)
            )
        );

        x.cursor = 0;

        x.review = {};
        x.quizResults = {};

        x.feedback = null;
        x.summary = null;

        x.stage = x.batch.length
            ? 'flashcard'
            : 'exhausted';
    });
}


/* ============================================================
   10. ENSURE SOURCE
============================================================ */

async function ensureSourceLoaded() {

    const m = currentMission();

    if (
        !m ||
        m.stage === 'done'
    ) {
        return;
    }

    if (
        loadedKey === sourceKey(m.type, m.target) &&
        vocabulary.length
    ) {
        return;
    }

    try {

        await loadVocabulary(
            m.type,
            m.target
        );

        render();

    } catch (error) {

        notify(
            error.message,
            true
        );
    }
}


/* ============================================================
   11. FLASHCARD

   Người học:

   1. Xem Kanji.
   2. Hiện Hiragana và nghĩa.
   3. Bấm đã thuộc.
   4. Chuyển từ tiếp theo.

   Khi tất cả đã thuộc → REVIEW.
============================================================ */

async function confirmFlashcard() {

    const m = currentMission();

    if (
        !m ||
        m.stage !== 'flashcard' ||
        !cardRevealed
    ) {
        return;
    }

    resetQuestion();

    await save((profile, day) => {

        const x = day.mission;

        if (
            x.stage !== 'flashcard'
        ) {
            return;
        }

        x.cursor++;

        /* ----------------------------------------
           Khi học xong batch Flashcard,
           chuyển sang Review.
        ----------------------------------------- */

        if (
            x.cursor >= x.batch.length
        ) {

            x.stage = 'review';
            x.cursor = 0;

            x.review = {};
        }
    });
}



/* ============================================================
   FIND NEXT REVIEW WORD

   Ví dụ:
   ID 1: 3/3 → Bỏ qua
   ID 2: 1/3 → Tiếp tục
   ID 3: 2/3 → Tiếp tục

   Khi tất cả đạt 3/3 → trả về -1.
============================================================ */

function nextReviewPosition(m, cursor) {

    const batch = m.batch || [];

    if (!batch.length) {
        return -1;
    }

    for (let i = 1; i <= batch.length; i++) {

        const index =
            (cursor + i) % batch.length;

        const id = String(batch[index]);

        const correctCount =
            Number(m.review?.[id]) || 0;

        if (correctCount < 3) {
            return index;
        }
    }

    return -1;
}


/* ============================================================
   13. QUESTION ENGINE

   Review:
     Kanji → Meaning

   Quiz:
     Random 7 modes.

   Đáp án:
     Random thứ tự.

   Từ học:
     Không random.
============================================================ */

function buildQuestion(word, stage) {

    if (!word) return null;

    const modes =
        stage === 'review'

            ? ['kanji_meaning']

            : randomize(MODES);

    for (const mode of modes) {

        const field = ANSWER_FIELD[mode];

        let prompt;

        if (
            mode.startsWith('audio_')
        ) {

            prompt = '🔊';

        } else if (
            mode.startsWith('meaning_')
        ) {

            prompt = word.meaning;

        } else if (
            mode.startsWith('hiragana_')
        ) {

            prompt = word.reading;

        } else {

            prompt = word.word;
        }

        const answer = word[field];

        /* ----------------------------------------
           Lấy đáp án nhiễu từ toàn bộ database,
           không chỉ trong batch đang học.
        ----------------------------------------- */

        const other = [
            ...new Set(
                vocabulary

                    .filter(
                        item => item.id !== word.id
                    )

                    .map(
                        item => item[field]
                    )

                    .filter(
                        value =>
                            value &&
                            value !== answer
                    )
            )
        ];

        if (
            other.length < 3 ||
            !prompt ||
            !answer
        ) {
            continue;
        }

        return {

            id: word.id,

            mode,
            prompt,
            answer,

            options: randomize([
                answer,
                ...randomize(other).slice(0, 3)
            ])
        };
    }

    return null;
}


/* ============================================================
   14. QUESTION CACHE

   Giữ câu hỏi và thứ tự đáp án
   khi giao diện cập nhật.
============================================================ */

function getQuestion(m) {

    const id = m.batch[m.cursor];

    const signature = [

        vietnamDate(),

        m.type,
        m.target,

        m.stage,
        m.round,

        m.cursor,
        id,

        m.review?.[id] || 0

    ].join(':');

    if (
        !cachedQuestion ||
        cachedQuestionKey !== signature
    ) {

        cachedQuestion = buildQuestion(
            currentWord(id),
            m.stage
        );

        cachedQuestionKey = signature;
    }

    /* ----------------------------------------
       Nếu đã chọn đáp án, khôi phục feedback
       và thứ tự lựa chọn đã lưu.
    ----------------------------------------- */

    if (
        m.feedback &&
        cachedQuestion
    ) {

        cachedQuestion.mode =
            m.feedback.mode;

        cachedQuestion.prompt =
            m.feedback.prompt;

        cachedQuestion.answer =
            m.feedback.answer;

        cachedQuestion.options =
            m.feedback.options;
    }

    return cachedQuestion;
}


/* ============================================================
   15. ANSWER QUESTION

   Review:
     Đúng +1
     Sai +0

   Quiz:
     Đúng / Sai được lưu kết quả.

   Không chuyển câu ngay sau khi chọn.
============================================================ */


/* ============================================================
   DAILY - ANSWER QUESTION

   REVIEW:
   - Đúng: cộng 1 lượt.
   - Sai: giữ nguyên số lượt đã đúng.
   - Lưu kết quả và chờ người học bấm NEXT.

   QUIZ:
   - Lưu đáp án và trạng thái đúng/sai.
============================================================ */

async function chooseAnswer(selected) {

    if (inProgress) return;

    const m = currentMission();

    if (!m) return;

    if (
        m.stage !== 'review' &&
        m.stage !== 'quiz'
    ) {
        return;
    }

    // Không cho trả lời lại câu đã chọn.
    if (m.feedback) return;

    const q = getQuestion(m);

    if (!q) {
        notify(
            'Không tạo được câu hỏi Review.',
            true
        );
        return;
    }

    const wordId = String(q.id);

    const correct =
        String(selected) === String(q.answer);

    const expectedStage = m.stage;
    const expectedCursor = m.cursor;

    // Lưu lại câu hỏi trước khi ghi Firebase.
    const feedback = {

        id: wordId,

        selected: String(selected),
        correct,

        mode: q.mode,
        prompt: q.prompt,
        answer: q.answer,

        options: [...q.options]
    };

    const saved = await save((profile, day) => {

        const x = day.mission;

        // Tránh ghi vào câu khác nếu tiến độ đã thay đổi.
        if (
            !x ||
            x.stage !== expectedStage ||
            x.cursor !== expectedCursor ||
            String(x.batch?.[x.cursor]) !== wordId ||
            x.feedback
        ) {
            return;
        }

        // Firebase lưu kết quả để hiển thị feedback.
        x.feedback = feedback;

        /* ==========================================
           REVIEW - 3 LẦN ĐÚNG
        ========================================== */

        if (x.stage === 'review') {

            x.review ||= {};

            const previous =
                Number(x.review[wordId]) || 0;

            // Sai sẽ cộng 0, không reset.
            x.review[wordId] = Math.min(
                3,
                previous + (correct ? 1 : 0)
            );
        }

        /* ==========================================
           QUIZ - LƯU KẾT QUẢ
        ========================================== */

        if (x.stage === 'quiz') {

            x.quizResults ||= {};

            x.quizResults[wordId] = {

                id: wordId,
                correct,

                selected: String(selected),
                answer: q.answer,
                mode: q.mode
            };
        }
    });

    if (!saved) {

        console.error(
            '[DAILY] Không lưu được đáp án',
            {
                stage: expectedStage,
                wordId,
                selected
            }
        );

        return;
    }

    // Đã lưu thành công: hiển thị đáp án và nút NEXT.
    renderStudy();
}



/* ============================================================
   16. NEXT QUESTION

   Người dùng tự bấm Next.

   Review:
     Chuyển sang từ chưa đủ 3 lần đúng.

   Quiz:
     Chuyển sang từ kế tiếp.

   Hết Quiz:
     Tổng hợp kết quả.
============================================================ */

async function nextQuestion() {

    const m = currentMission();

    if (!m?.feedback) {
        return;
    }

    resetQuestion();

    await save((profile, day, date) => {

        const x = day.mission;

        if (
            !x?.feedback
        ) {
            return;
        }

        x.feedback = null;

              /* ============================================================
            REVIEW NEXT
         ============================================================ */
         
         if (x.stage === 'review') {
         
             const next = nextReviewPosition(
                 x,
                 x.cursor
             );
         
             if (next === -1) {
         
                 // Tất cả từ đã trả lời đúng đủ 3 lần.
                 x.stage = 'quiz';
                 x.cursor = 0;
                 x.quizResults = {};
         
             } else {
         
                 // Chuyển sang từ chưa đạt 3 lần đúng.
                 x.cursor = next;
             }
         
             return;
         }

        /* ====================================================
           QUIZ NEXT
        ==================================================== */

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

        /* ----------------------------------------
           TẤT CẢ CÂU QUIZ ĐÃ KẾT THÚC
        ----------------------------------------- */

        const results = x.batch.map(
            id =>

                x.quizResults[id] || {

                    id,
                    correct: false,
                    selected: '',
                    answer: '',
                    mode: ''
                }
        );

        const correct = results.filter(
            result => result.correct
        ).length;

        const wrong =
            results.length - correct;

        x.summary = {

            results,
            correct,
            wrong
        };

        x.stage = 'summary';
        x.cursor = 0;

        /* ====================================================
           SAVE LEARNED WORDS
        ==================================================== */

        const sk = sourceKey(
            x.type,
            x.target
        );

        day.completed[sk] ||= {};
        profile.learned[sk] ||= {};

        /* ----------------------------------------
           Chỉ từ đúng Quiz mới được chốt.
        ----------------------------------------- */

        for (
            const result of results.filter(
                item => item.correct
            )
        ) {

            const word = currentWord(
                result.id
            );

            if (!word) continue;

            const key = keyForId(
                result.id
            );

            day.completed[sk][key] = true;

            const previous =
                profile.learned[sk][key] || {};

            profile.learned[sk][key] = {

                ...word,

                firstLearnedAt:
                    previous.firstLearnedAt || date,

                lastLearnedAt: date,

                timesPassed:
                    (Number(previous.timesPassed) || 0) + 1
            };
        }

        /* ====================================================
           SAVE QUIZ HISTORY
        ==================================================== */

        day.quizHistory ||= {};

        const round =
            (Number(day.quizRoundCount) || 0) + 1;

        day.quizRoundCount = round;

        day.quizHistory[`round_${round}`] = {

            source: sk,

            correct,
            wrong,

            results: results.map(result => ({

                ...result,

                word:
                    currentWord(result.id)?.word ||
                    result.id,

                reading:
                    currentWord(result.id)?.reading ||
                    '',

                meaning:
                    currentWord(result.id)?.meaning ||
                    ''
            }))
        };
    });
}


/* ============================================================
   17. AFTER SUMMARY

   Từ đúng:
     Đã hoàn thành.

   Từ sai:
     Flashcard → Review → Quiz.

   Không còn từ sai:
     Chuyển batch kế tiếp.

   Đạt mục tiêu:
     Done + Check-in.
============================================================ */

async function continueAfterSummary() {

    const m = currentMission();

    if (
        m?.stage !== 'summary'
    ) {
        return;
    }

    const failed = (
        m.summary?.results || []
    )
        .filter(
            result => !result.correct
        )
        .map(
            result => result.id
        );

    resetQuestion();

    await save((profile, day) => {

        const x = day.mission;

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

        /* ----------------------------------------
           ĐÃ ĐỦ CHỈ TIÊU NGÀY
        ----------------------------------------- */

        if (
            remainingGoal(day, profile) === 0
        ) {

            x.stage = 'done';
            x.batch = [];

        } else if (
            failed.length
        ) {

            /* ------------------------------------
               CHỈ TỪ SAI QUAY LẠI FLASHCARD
            ------------------------------------- */

            x.batch = failed;
            x.stage = 'flashcard';

        } else {

            /* ------------------------------------
               Chuyển nhóm từ kế tiếp.
            ------------------------------------- */

            x.batch = [];
            x.stage = 'between';
        }
    });

    await prepareBatch();
}


/* ============================================================
   18. DASHBOARD DATA

   Danh sách học được lưu theo bộ:

   learned/
       jlpt_n5/
       jlpt_n4/
       topic_animals/
       ...
============================================================ */

function learnedRows() {

    const rows = [];

    for (
        const [source, group]
        of Object.entries(allLearned())
    ) {

        for (
            const item
            of Object.values(group || {})
        ) {

            if (
                item?.word
            ) {

                rows.push({

                    ...item,
                    source

                });
            }
        }
    }

    /* --------------------------------------------------------
       Dashboard:
       Sắp xếp theo bộ và ID.
    -------------------------------------------------------- */

    return rows.sort(
        (a, b) =>

            a.source.localeCompare(b.source) ||
            sortIds(a.id, b.id)
    );
}


/* ============================================================
   19. CLEAR LEARNED HISTORY

   Chỉ xóa một bộ từ đã chọn.

   Ví dụ:
   Xóa jlpt_n5:
     Cho phép học N5 lại từ ID 1.

   Không xóa dữ liệu các bộ khác.
============================================================ */

async function clearSource(source) {

    if (
        source === 'all'
    ) {

        notify(
            'Hãy chọn một bộ từ cụ thể trước khi xóa lịch sử.',
            true
        );

        return;
    }

    const count = learnedRows().filter(
        word => word.source === source
    ).length;

    if (
        !confirm(
            `Xóa lịch sử ${count} từ đã học của bộ ${source}? Có thể học lại từ ID 1.`
        )
    ) {
        return;
    }

    const ok = await save((profile, day) => {

        /* ----------------------------------------
           Xóa lịch sử từ đã học của bộ.
        ----------------------------------------- */

        delete profile.learned[source];

        /* ----------------------------------------
           Xóa tiến độ hôm nay của bộ,
           không xóa lịch sử điểm danh ngày cũ.
        ----------------------------------------- */

        delete day.completed[source];

        /* ----------------------------------------
           Nếu đang học chính bộ đó:
           reset nhiệm vụ hiện tại.
        ----------------------------------------- */

        if (
            day.mission &&
            sourceKey(
                day.mission.type,
                day.mission.target
            ) === source
        ) {

            day.mission = null;
        }

        if (
            day.pausedMissions
        ) {

            delete day.pausedMissions[source];
        }
    });

    if (
        ok
    ) {

        resetQuestion();

        notify(
            `Đã xóa lịch sử bộ ${source}. Chọn lại bộ để bắt đầu từ ID 1.`
        );
    }
}


/* ============================================================
   20. RENDER HISTORY TABLE

   Các cột:

   Bộ / ID / Kanji / Hiragana /
   Nghĩa / Ngày học / Âm thanh
============================================================ */

function renderHistoryRows() {

    const tbody = $('dailyHistoryRows');

    if (!tbody) return;

    tbody.replaceChildren();

    const q = searchText.toLowerCase();

    const rows = learnedRows().filter(
        word => {

            const sameSource =

                filterSource === 'all' ||
                word.source === filterSource;

            const matchSearch =

                !q ||

                [
                    word.id,
                    word.word,
                    word.reading,
                    word.meaning
                ].some(
                    value =>
                        String(value || '')
                            .toLowerCase()
                            .includes(q)
                );

            return sameSource && matchSearch;
        }
    );

    $('dailyHistoryCount').textContent =
        `${rows.length} từ`;

    /* --------------------------------------------------------
       Giới hạn 500 dòng hiển thị để nhẹ UI.

       Lịch sử Firebase vẫn được giữ đầy đủ.
    -------------------------------------------------------- */

    for (
        const word of rows.slice(0, 500)
    ) {

        const tr = element('tr');

        const columns = [

            word.source,
            word.id,
            word.word,
            word.reading,
            word.meaning,
            word.lastLearnedAt || '—'

        ];

        for (
            const value of columns
        ) {

            tr.append(
                element(
                    'td',
                    '',
                    value
                )
            );
        }

        /* ----------------------------------------
           PLAY SOUND BUTTON
        ----------------------------------------- */

        const sound = element('td');

        sound.append(
            action(
                '🔊',

                () => sayJapanese(word),

                'daily-mini-button'
            )
        );

        tr.append(sound);

        tbody.append(tr);
    }
}


/* ============================================================
   21. RENDER DASHBOARD

   - Tổng số từ đã học.
   - Quiz hôm nay.
   - Filter theo bộ.
   - Tìm kiếm.
   - Clear history.
============================================================ */

function renderDashboard() {

    const rows = learnedRows();

    $('dailyDashboardTotal').textContent =
        `${rows.length} từ đã học`;

    const sources = [
        ...new Set(
            rows.map(word => word.source)
        )
    ].sort();

    const select = $('dailySourceFilter');

    const previous = filterSource;

    select.replaceChildren(
        new Option(
            'Tất cả bộ từ',
            'all'
        )
    );

    for (
        const source of sources
    ) {

        const count = rows.filter(
            word => word.source === source
        ).length;

        select.add(
            new Option(
                `${source} (${count})`,
                source
            )
        );
    }

    if (
        previous !== 'all' &&
        !sources.includes(previous)
    ) {

        filterSource = 'all';

    } else {

        filterSource = previous;
    }

    select.value = filterSource;

    /* --------------------------------------------------------
       Chỉ bật Clear khi chọn một bộ từ cụ thể.
    -------------------------------------------------------- */

    $('dailyClearButton').disabled =
        inProgress ||
        filterSource === 'all';

    /* --------------------------------------------------------
       QUIZ STATS TODAY
    -------------------------------------------------------- */

    const rounds = Object.values(
        currentDay().quizHistory || {}
    );

    const right = rounds.reduce(
        (sum, round) =>

            sum + (
                Number(round.correct) || 0
            ),

        0
    );

    const wrong = rounds.reduce(
        (sum, round) =>

            sum + (
                Number(round.wrong) || 0
            ),

        0
    );

    const percent =
        right + wrong

            ? Math.round(
                100 * right / (right + wrong)
            )

            : 0;

    $('dailyDashboardQuiz').textContent =

        `Quiz hôm nay: ${right} đúng · ${wrong} sai · ${percent}%`;

    renderHistoryRows();
}


/* ============================================================
   22. RENDER LEARNING

   Màn hình động:

   - Chưa bắt đầu
   - Flashcard
   - Review
   - Quiz
   - Summary
   - Hết bộ
   - Hoàn thành ngày
============================================================ */

function renderStudy() {

    const root = $('dailyStudy');

    if (!root) return;

    root.replaceChildren();

    const m = currentMission();

    /* --------------------------------------------------------
       CHƯA CÓ NHIỆM VỤ
    -------------------------------------------------------- */

    if (!m) {

        root.append(
            element(
                'p',
                'daily-muted',
                'Chọn nguồn học và đặt mục tiêu để bắt đầu.'
            )
        );

        return;
    }

    /* --------------------------------------------------------
       HOÀN THÀNH MỤC TIÊU NGÀY
    -------------------------------------------------------- */

    if (
        m.stage === 'done'
    ) {

        root.append(
            element(
                'h3',
                'daily-finished',
                '🏆 ĐÃ HOÀN THÀNH MỤC TIÊU NGÀY!'
            )
        );

        return;
    }

    /* --------------------------------------------------------
       ĐÃ HỌC HẾT BỘ TỪ

       Chỉ còn 2 từ → học 2 từ → hết bộ.

       Có thể chọn bộ tiếp theo để tiếp tục mục tiêu.
    -------------------------------------------------------- */

    if (
        m.stage === 'exhausted'
    ) {

        root.append(
            element(
                'h3',
                'daily-finished',
                '📚 ĐÃ HOÀN THÀNH BỘ TỪ!'
            )
        );

        root.append(
            element(
                'p',
                'daily-muted',

                `Bộ này không còn từ mới. Bạn có thể chọn bộ tiếp theo để học tiếp ${remainingGoal(currentDay(), data)} từ còn thiếu.`
            )
        );

        return;
    }

    /* --------------------------------------------------------
       ĐANG TẢI DATABASE
    -------------------------------------------------------- */

    if (
        loadedKey !== sourceKey(
            m.type,
            m.target
        )
    ) {

        root.append(
            element(
                'p',
                'daily-muted',
                'Đang tải bộ từ...'
            )
        );

        ensureSourceLoaded();

        return;
    }

    /* --------------------------------------------------------
       CHƯA CÓ BATCH
    -------------------------------------------------------- */

    if (
        !m.batch?.length
    ) {

        root.append(
            element(
                'p',
                'daily-muted',
                'Đang chuẩn bị nhóm từ tiếp theo...'
            )
        );

        if (
            m.stage === 'between'
        ) {

            prepareBatch();
        }

        return;
    }

    /* ========================================================
       SUMMARY SCREEN
    ======================================================== */

    if (
        m.stage === 'summary'
    ) {

        const summary = m.summary || {

            results: [],
            correct: 0,
            wrong: 0
        };

        const percent =
            summary.results.length

                ? Math.round(
                    summary.correct *
                    100 /
                    summary.results.length
                )

                : 0;

        root.append(
            element(
                'h3',
                'daily-stage-title',
                '📊 KẾT QUẢ QUIZ'
            )
        );

        root.append(
            element(
                'div',
                'daily-summary-numbers',

                `Đúng ${summary.correct} · Sai ${summary.wrong} · Chính xác ${percent}%`
            )
        );

        const list = element(
            'div',
            'daily-result-list'
        );

        /* ----------------------------------------
           HIỂN THỊ TỪ ĐÚNG / SAI
        ----------------------------------------- */

        for (
            const result of summary.results
        ) {

            const word = currentWord(
                result.id
            );

            const row = element(
                'div',
                'daily-result-row'
            );

            row.append(

                element(
                    'span',
                    '',
                    `${word?.word || result.id} (${word?.reading || ''})`
                ),

                element(
                    'span',

                    result.correct
                        ? 'daily-good'
                        : 'daily-bad',

                    result.correct

                        ? '✓ Đúng'

                        : `✕ ${result.selected || '—'} → ${result.answer || '—'}`
                )
            );

            list.append(row);
        }

        root.append(list);

        root.append(
            action(

                summary.wrong
                    ? '↻ HỌC LẠI TỪ SAI'
                    : '▶ TIẾP TỤC',

                continueAfterSummary
            )
        );

        return;
    }

    /* ========================================================
       HIỆN TỪ ĐANG HỌC
    ======================================================== */

    const id = m.batch[m.cursor];

    const word = currentWord(id);

    if (!word) {

        root.append(
            element(
                'p',
                'daily-muted',
                'Không tìm thấy từ trong nguồn đã chọn.'
            )
        );

        return;
    }

    let stageName;

    if (
        m.stage === 'flashcard'
    ) {

        stageName = '1 · FLASHCARD';

    } else if (
        m.stage === 'review'
    ) {

        stageName = '2 · REVIEW';

    } else {

        stageName = '3 · QUIZ';
    }

    root.append(
        element(
            'h3',
            'daily-stage-title',

            `${stageName} · Từ ${m.cursor + 1}/${m.batch.length}`
        )
    );

    /* ========================================================
       FLASHCARD UI
    ======================================================== */

    if (
        m.stage === 'flashcard'
    ) {

        /* ----------------------------------------
           KANJI
        ----------------------------------------- */

        root.append(
            element(
                'div',
                'daily-word',
                word.word
            )
        );

        /* ----------------------------------------
           SOUND
        ----------------------------------------- */

        root.append(
            action(

                '🔊 PHÁT ÂM',

                () => sayJapanese(word),

                'daily-sound'
            )
        );

        /* ----------------------------------------
           HIRAGANA + MEANING
        ----------------------------------------- */

        root.append(
            element(
                'div',
                'daily-word-back',

                cardRevealed

                    ? `${word.reading}\n${word.meaning}`

                    : 'Bấm hiện đáp án để xem cách đọc và nghĩa.'
            )
        );

        /* ----------------------------------------
           FLIP CARD
        ----------------------------------------- */

        root.append(
            action(

                cardRevealed
                    ? 'ẨN ĐÁP ÁN'
                    : 'HIỆN ĐÁP ÁN',

                () => {

                    cardRevealed = !cardRevealed;

                    renderStudy();
                },

                'daily-button daily-secondary daily-wide'
            )
        );

        /* ----------------------------------------
           CONFIRM
        ----------------------------------------- */

        const next = action(

            '✓ ĐÃ THUỘC · TIẾP THEO',

            confirmFlashcard
        );

        next.disabled =
            inProgress ||
            !cardRevealed;

        root.append(next);

        return;
    }

    /* ========================================================
       REVIEW UI
    ======================================================== */

    if (
        m.stage === 'review'
    ) {

        const count = Object.values(
            m.review || {}
        ).reduce(

            (sum, value) =>

                sum + Math.min(
                    3,
                    Number(value) || 0
                ),

            0
        );

        root.append(
            element(
                'p',
                'daily-muted',

                `Đúng ${count}/${m.batch.length * 3} lượt · Từ này ${m.review?.[id] || 0}/3. Sai không mất lượt đúng.`
            )
        );
    }

    /* ========================================================
       REVIEW / QUIZ QUESTION
    ======================================================== */

    const q = getQuestion(m);

    if (!q) {

        root.append(
            element(
                'p',
                'daily-muted',
                'Không tạo được câu hỏi. Hãy kiểm tra dữ liệu đáp án.'
            )
        );

        return;
    }

    root.append(
        element(
            'p',
            'daily-muted',
            MODE_LABELS[q.mode]
        )
    );

    /* --------------------------------------------------------
       AUDIO MODE
    -------------------------------------------------------- */

    if (
        q.mode.startsWith('audio_')
    ) {

        root.append(
            element(
                'div',
                'daily-word daily-audio',
                '🔊 NGHE VÀ CHỌN ĐÁP ÁN'
            )
        );

        root.append(
            action(

                '▶ NGHE LẠI',

                () => sayJapanese(word),

                'daily-button daily-secondary daily-wide'
            )
        );

    } else {

        root.append(
            element(
                'div',
                'daily-word',
                q.prompt
            )
        );
    }

    /* ========================================================
       ANSWER OPTIONS
    ======================================================== */

    const choices = element(
        'div',
        'daily-answers'
    );

    for (
        const option of q.options
    ) {

        const button = action(

            option,

            () => chooseAnswer(option),

            'daily-answer'
        );

        /* ----------------------------------------
           Sau khi chọn đáp án:

           Đáp án đúng: xanh
           Đáp án sai: đỏ
           Khóa các nút chọn.
        ----------------------------------------- */

        if (
            m.feedback
        ) {

            button.disabled = true;

            if (
                option === q.answer
            ) {

                button.classList.add(
                    'correct'
                );

            } else if (
                option === m.feedback.selected
            ) {

                button.classList.add(
                    'wrong'
                );
            }
        }

        choices.append(button);
    }

    root.append(choices);

    /* ========================================================
       FEEDBACK + NEXT
    ======================================================== */

    if (
        m.feedback
    ) {

        const feedback = m.feedback;

        const info = element(
            'div',

            `daily-feedback ${
                feedback.correct
                    ? 'correct'
                    : 'wrong'
            }`
        );

        info.append(

            element(
                'strong',
                '',

                feedback.correct
                    ? '✓ CHÍNH XÁC'
                    : '✕ CHƯA CHÍNH XÁC'
            ),

            element(
                'div',
                '',

                `Đáp án đúng: ${feedback.answer}`
            ),

            element(
                'div',
                'daily-muted',

                `${word.word} · ${word.reading} · ${word.meaning}`
            )
        );

        root.append(
            info,

            action(
                'NEXT →',
                nextQuestion
            )
        );
    }
}


/* ============================================================
   23. RENDER MAIN SCREEN

   Cập nhật:

   - Header streak
   - Daily progress
   - Goal
   - Source info
   - Remaining vocabulary
   - Dashboard / Mission tabs
============================================================ */

function render() {

    const signedIn =
        !!auth.currentUser;

    $('dailyHeaderButton')?.classList.toggle(
        'hidden',
        !signedIn
    );

    if (!signedIn) {
        return;
    }

    const day = currentDay();
    const m = currentMission();

    const goal = clampGoal(
        data.goal
    );

    const completed = completedCount(
        day
    );

    const progress = Math.min(
        100,
        completed * 100 / goal
    );

    /* ========================================================
       HEADER / STREAK
    ======================================================== */

    $('dailyStreakCount').textContent =
        visibleStreak();

    $('dailyStreak').textContent =
        `${visibleStreak()} ngày`;

    $('dailyDate').textContent =
        `${vietnamDate()} · Giờ Việt Nam (UTC+7)`;

    $('dailyHeaderButton').classList.toggle(
        'checked',
        !!day.checked
    );

    /* ========================================================
       CHECK-IN STATUS
    ======================================================== */

    $('dailyCheckinStatus').textContent =

        day.checked

            ? '✓ Đã hoàn thành nhiệm vụ và điểm danh'

            : 'Hoàn thành mục tiêu để tự động điểm danh';

    $('dailyCheckinButton').textContent =

        day.checked

            ? '✓ ĐÃ ĐIỂM DANH'

            : '🔒 CHƯA ĐỦ MỤC TIÊU';

    /* ========================================================
       GOAL / PROGRESS
    ======================================================== */

    $('dailyGoalLabel').textContent =
        `${goal} từ/ngày`;

    $('dailyProgress').textContent =
        `${completed} / ${goal}`;

    $('dailyBar').style.width =
        `${progress}%`;

    $('dailyMissionStatus').textContent =

        day.checked

            ? '✓ HOÀN THÀNH NHIỆM VỤ NGÀY'

            : `Còn ${Math.max(0, goal - completed)} từ cần vượt Quiz`;

    $('dailyActual').textContent =

        `Hôm nay: ${completed} từ · Lịch sử: ${learnedRows().length} từ`;

    if (
        document.activeElement !==
        $('dailyGoalInput')
    ) {

        $('dailyGoalInput').value = goal;
    }

    $('dailyStartButton').disabled =
        inProgress;

    /* ========================================================
       SOURCE INFORMATION
    ======================================================== */

    $('dailyStageSummary').textContent =

        m

            ? `Nguồn hiện tại: ${m.type.toUpperCase()} / ${m.target.toUpperCase()}`

            : 'Chưa bắt đầu';

    /* ========================================================
       DANH SÁCH TỪ CÒN LẠI TRONG BỘ
    ======================================================== */

    const available = $(
        'dailyAvailableWords'
    );

    available.replaceChildren();

    if (
        m &&
        loadedKey === sourceKey(
            m.type,
            m.target
        )
    ) {

        const ids = availableWordIds(
            vocabulary,
            data,
            day,
            m.type,
            m.target
        );

        const details = element(
            'details',
            'daily-available-details'
        );

        details.append(
            element(
                'summary',
                '',

                `Còn ${ids.length} từ trong bộ · Xem danh sách`
            )
        );

        const list = element(
            'div',
            'daily-remaining-list'
        );

        for (
            const id of ids.slice(0, 500)
        ) {

            const word = currentWord(id);

            list.append(
                element(
                    'div',
                    'daily-remaining-word',

                    `ID ${id} · ${word.word} · ${word.reading} · ${word.meaning}`
                )
            );
        }

        details.append(list);

        available.append(details);
    }

    /* ========================================================
       TAB STATE
    ======================================================== */

    $('dailyMissionTab').classList.toggle(
        'active',
        activeTab === 'mission'
    );

    $('dailyHistoryTab').classList.toggle(
        'active',
        activeTab === 'history'
    );

    $('dailyLearningPage').classList.toggle(
        'hidden',
        activeTab !== 'mission'
    );

    $('dailyHistoryPage').classList.toggle(
        'hidden',
        activeTab !== 'history'
    );

    /* ========================================================
       RENDER CURRENT TAB
    ======================================================== */

    if (
        !$('dailyOverlay').classList.contains(
            'hidden'
        )
    ) {

        if (
            activeTab === 'mission'
        ) {

            renderStudy();

        } else {

            renderDashboard();
        }
    }
}


/* ============================================================
   24. OPEN DAILY
============================================================ */

async function openDaily() {

    if (
        !auth.currentUser
    ) {

        window.BatLingoAuthUI?.open?.();

        return;
    }

    activeTab = 'mission';

    const m = currentMission();

    if (m) {

        $('dailyStudyMode').value =
            m.type;

        await refreshTargets(
            m.target
        );
    }

    $('dailyOverlay').classList.remove(
        'hidden'
    );

    render();

    await ensureSourceLoaded();
}


/* ============================================================
   25. CLOSE DAILY
============================================================ */

function closeDaily() {

    $('dailyOverlay')?.classList.add(
        'hidden'
    );

    window.speechSynthesis?.cancel();
}


/* ============================================================
   26. FIREBASE USER LISTENER

   Mỗi UID có dữ liệu riêng.
   Khi logout hoặc đổi tài khoản:
   Xóa cache của tài khoản cũ.
============================================================ */

function listenUser(uid) {

    if (
        currentUid === uid &&
        unsubscribeUser
    ) {
        return;
    }

    unsubscribeUser?.();

    unsubscribeUser = null;

    currentUid = uid || '';

    data = {};

    loadedKey = '';
    vocabulary = [];

    loadVersion++;

    resetQuestion();

    closeDaily();

    render();

    if (!uid) {
        return;
    }

    unsubscribeUser = onValue(

        ref(
            db,
            `dailyProgress/${uid}`
        ),

        snapshot => {

            if (
                currentUid !== uid
            ) {
                return;
            }

            data = snapshot.val() || {};

            render();
        },

        error => {

            notify(
                `Firebase: ${error.message}`,
                true
            );
        }
    );
}


/* ============================================================
   27. INITIALIZE DAILY MISSION

   Được gọi từ main.js:

   import { initDaily } from "./daily.js";

   initDaily();
============================================================ */

export function initDaily() {

    if (initialized) {
        return;
    }

    initialized = true;

    /* ========================================================
       FIREBASE SERVER TIME OFFSET
    ======================================================== */

    onValue(

        ref(
            db,
            '.info/serverTimeOffset'
        ),

        snapshot => {

            databaseOffset =
                Number(snapshot.val()) || 0;

            render();
        }
    );

    /* ========================================================
       HEADER OPEN
    ======================================================== */

    $('dailyHeaderButton')
        ?.addEventListener(
            'click',
            openDaily
        );

    /* ========================================================
       CLOSE
    ======================================================== */

    $('dailyCloseButton')
        ?.addEventListener(
            'click',
            closeDaily
        );

    $('dailyOverlay')
        ?.addEventListener(
            'click',
            event => {

                if (
                    event.target === $('dailyOverlay')
                ) {

                    closeDaily();
                }
            }
        );

    /* ========================================================
       CHANGE STUDY MODE
    ======================================================== */

    $('dailyStudyMode')
        ?.addEventListener(
            'change',
            () => refreshTargets()
        );

    /* ========================================================
       START MISSION
    ======================================================== */

    $('dailyStartButton')
        ?.addEventListener(
            'click',
            startMission
        );

    /* ========================================================
       TAB NAVIGATION
    ======================================================== */

    $('dailyMissionTab')
        ?.addEventListener(
            'click',
            () => {

                activeTab = 'mission';

                render();
            }
        );

    $('dailyHistoryTab')
        ?.addEventListener(
            'click',
            () => {

                activeTab = 'history';

                render();
            }
        );

    /* ========================================================
       DASHBOARD FILTER
    ======================================================== */

    $('dailySourceFilter')
        ?.addEventListener(
            'change',
            event => {

                filterSource = event.target.value;

                renderDashboard();
            }
        );

    /* ========================================================
       DASHBOARD SEARCH
    ======================================================== */

    $('dailyHistorySearch')
        ?.addEventListener(
            'input',
            event => {

                searchText = event.target.value;

                renderHistoryRows();
            }
        );

    /* ========================================================
       CLEAR HISTORY
    ======================================================== */

    $('dailyClearButton')
        ?.addEventListener(
            'click',
            () => clearSource(filterSource)
        );

    /* ========================================================
       ESC TO CLOSE
    ======================================================== */

    document.addEventListener(
        'keydown',
        event => {

            if (
                event.key === 'Escape'
            ) {

                closeDaily();
            }
        }
    );

    /* ========================================================
       AUTH LISTENER
    ======================================================== */

    auth.onAuthStateChanged(
        user => listenUser(user?.uid)
    );

    /* ========================================================
       CHECK VIETNAM DATE CHANGE

       Kiểm tra mỗi 30 giây.
       Khi sang ngày mới:
       Reset câu hỏi đang hiển thị.
    ======================================================== */

    lastVietnamDate = vietnamDate();

    setInterval(
        () => {

            if (
                vietnamDate() !== lastVietnamDate
            ) {

                lastVietnamDate = vietnamDate();

                resetQuestion();
            }

            render();

        },
        30000
    );

    /* ========================================================
       INIT DEFAULT TARGETS
    ======================================================== */

    refreshTargets().catch(
        error => notify(
            error.message,
            true
        )
    );

    render();
}
