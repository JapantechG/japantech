
import { auth, db } from './firebase.js';

import {
    loadRankDatabase,
    buildRankQuestion
} from './ranked-question.js';

import {
    calculateRankPlayer,
    determineRankWinner
} from './ranked-score.js';

import {
    calculateMatchElo
} from './ranked-elo.js';

import {
    ref,
    get,
    onValue,
    runTransaction,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js';

let unsubscribeMatch = null;
let activeMatchId = null;

let serverOffset = 0;

onValue(ref(db, '.info/serverTimeOffset'), snapshot => {
    serverOffset = Number(snapshot.val()) || 0;
});

export function rankedServerNow() {
    return Date.now() + serverOffset;
}

function emit(type, detail = {}) {
    window.dispatchEvent(
        new CustomEvent('batlingo-ranked-match', {
            detail: { type, ...detail }
        })
    );
}

export function stopRankedMatch() {
    unsubscribeMatch?.();
    unsubscribeMatch = null;
    activeMatchId = null;
}


const RANK_QUESTION_COUNT = 20;
const RANK_QUESTION_TIME_MS = 10_000;
const RANK_BASE_QUESTIONS = 20;

async function createRankQuestionIndexes(config) {
    const level = String(config.target || 'n1').toLowerCase();

    if (!/^n[1-5]$/.test(level)) {
        throw new Error('INVALID_JLPT_LEVEL');
    }

    if (config.category !== 'vocabulary') {
        throw new Error('RANK_CATEGORY_NOT_SUPPORTED');
    }

    const response = await fetch(`data/${level}.json`);

    if (!response.ok) {
        throw new Error(`DATABASE_LOAD_FAILED: ${level}`);
    }

    const database = await response.json();

    if (!Array.isArray(database)) {
        throw new Error('INVALID_DATABASE_FORMAT');
    }

    if (database.length < RANK_QUESTION_COUNT) {
        throw new Error('NOT_ENOUGH_QUESTIONS');
    }

    // Tạo danh sách vị trí câu hỏi: 0, 1, 2...
    const indexes = Array.from(
        { length: database.length },
        (_, index) => index
    );

    // Fisher-Yates shuffle
    for (let i = indexes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [indexes[i], indexes[j]] = [
            indexes[j],
            indexes[i]
        ];
    }

    // Chỉ lấy 20 câu đầu tiên
    return indexes.slice(0, RANK_QUESTION_COUNT);
}


export async function connectRankedMatch(info) {
    stopRankedMatch();

    const {
        matchId,
        role,
        opponentUid,
        group,
        config
    } = info;

    if (!matchId || !group || !['host', 'guest'].includes(role)) {
        throw new Error('INVALID_RANK_MATCH');
    }

    activeMatchId = matchId;

    const matchRef = ref(db, `rankedMatches/${matchId}`);
    const queueRef = ref(db, `rankedQueues/${group}`);

    if (role === 'host') {
        const queueSnapshot = await get(queueRef);
        const queue = queueSnapshot.val() || {};

        const host = Object.values(queue).find(
            t => t.matchId === matchId && t.role === 'host'
        );

        const guest = Object.values(queue).find(
            t => t.matchId === matchId && t.role === 'guest'
        );

        if (
            !host || !guest ||
            host.status !== 'ready' ||
            guest.status !== 'ready' ||
            !host.accepted ||
            !guest.accepted
        ) {
            throw new Error('PLAYERS_NOT_READY');
        }

      
        if (activeMatchId !== matchId) return;

        // HOST chọn 20 câu từ database.
        const questionIndexes =
            await createRankQuestionIndexes(config);

        if (activeMatchId !== matchId) return;

        // Chỉ tạo khi bản ghi chưa tồn tại.
        const result = await runTransaction(matchRef, current => {

            if (current !== null) return;

            return {
                matchId,
                group,
                status: 'countdown',
                hostUid: host.uid,
                guestUid: guest.uid,

                initialElo: {
                        host: Number(host.elo),
                        guest: Number(guest.elo)
                    },

                createdAt: serverTimestamp(),
                startAt: rankedServerNow() + 3000,
             
                config: {
                    studyMode: config.studyMode || 'jlpt',
                    target: String(config.target || 'n1').toLowerCase(),
                    category: config.category,
                    subMode: config.subMode || 'kanji_meaning'
                },

                questionCount: RANK_QUESTION_COUNT,
                questionIndexes,

                currentQuestion: 0,
                hostScore: 0,
                guestScore: 0

            };
        }, { applyLocally: false });

        if (!result.committed && !result.snapshot.exists()) {
            throw new Error('MATCH_CREATE_FAILED');
        }
    }

    if (activeMatchId !== matchId) return;

    unsubscribeMatch = onValue(matchRef, snapshot => {
        if (activeMatchId !== matchId) return;

        const match = snapshot.val();
        if (!match) return;

        emit('updated', {
            matchId,
            role,
            match
        });
    }, error => {
        emit('error', { message: error.message });
    });
}


export async function startRankedMatch(matchId) {
    if (!matchId || activeMatchId !== matchId) return;

    const matchRef = ref(db, `rankedMatches/${matchId}`);

    const result = await runTransaction(matchRef, match => {
        if (!match) return;

        // Trận đã bắt đầu thì không xử lý lại
        if (match.status === 'playing') return;

        // Chỉ cho phép countdown chuyển sang playing
        if (match.status !== 'countdown') return;

        // Chưa đến thời điểm bắt đầu
        if (rankedServerNow() < match.startAt) return;

       return {
            ...match,
            status: 'playing',
            startedAt: match.startAt,

            questionStartedAt: match.startAt,
            questionDeadline: match.startAt + RANK_QUESTION_TIME_MS,

            answers: {}
        };

    }, { applyLocally: false });

    if (result.committed) {
        console.log('[RANK] Match started:', matchId);
    }
}


export async function submitRankAnswer(
    matchId,
    questionPosition,
    selectedIndex
) {
    const user = auth.currentUser;

    if (!user) throw new Error('LOGIN_REQUIRED');

    if (
        !Number.isInteger(selectedIndex) ||
        selectedIndex < 0 ||
        selectedIndex > 3
    ) {
        throw new Error('INVALID_ANSWER');
    }

    const matchRef = ref(db, `rankedMatches/${matchId}`);

    const result = await runTransaction(matchRef, match => {
        if (!match || match.status !== 'playing') return;

        if (match.currentQuestion !== questionPosition) {
            return;
        }

        const role =
            user.uid === match.hostUid ? 'host' :
            user.uid === match.guestUid ? 'guest' :
            null;

        if (!role) return;

        const answers = match.answers || {};

        // Một người chỉ trả lời một lần mỗi câu.
        if (answers[role]) return;

        const now = rankedServerNow();

        // Hết giờ thì không được gửi đáp án.
        if (now >= match.questionDeadline) return;

        const elapsedMs = Math.max(
            0,
            Math.min(
                RANK_QUESTION_TIME_MS,
                Math.round(now - match.questionStartedAt)
            )
        );

        match.answers = {
            ...answers,
            [role]: {
                selectedIndex,
                elapsedMs
            }
        };

        return match;
    }, { applyLocally: false });

    return result.committed;
}


export async function advanceRankQuestion(
    matchId,
    questionPosition
) {
    const matchRef = ref(db, `rankedMatches/${matchId}`);

    const result = await runTransaction(matchRef, match => {
        if (!match || match.status !== 'playing') return;

        // Tránh chuyển trùng khi cả hai máy cùng gửi yêu cầu.
        if (match.currentQuestion !== questionPosition) {
            return;
        }

        const answers = match.answers || {};
        const bothAnswered =
            !!answers.host && !!answers.guest;

        const expired =
            rankedServerNow() >= match.questionDeadline;

        if (!bothAnswered && !expired) return;

        // Ghi lại câu vừa hoàn thành.
        const history = match.answerHistory || {};

        history[String(questionPosition)] = {
            host: answers.host || null,
            guest: answers.guest || null
        };

        match.answerHistory = history;

        const next = questionPosition + 1;

        // Đã hoàn thành đủ 20 câu.
        if (next >= match.questionCount) {
            match.status = 'pending_result';
            match.completedAt = rankedServerNow();
            return match;
        }

        // Câu tiếp theo có thời hạn mới.
        const nextStart = rankedServerNow();

        match.currentQuestion = next;
        match.questionStartedAt = nextStart;
        match.questionDeadline =
            nextStart + RANK_QUESTION_TIME_MS;

        match.answers = {};

        return match;
    }, { applyLocally: false });

    return result.committed;
}



export async function finalizeRankMatch(matchId) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('LOGIN_REQUIRED');

    const matchRef = ref(db, `rankedMatches/${matchId}`);
    const snapshot = await get(matchRef);
    const match = snapshot.val();

    if (!match || match.status !== 'pending_result') {
        return false;
    }

    if (match.hostUid !== uid) return false;

    if (
        !Array.isArray(match.questionIndexes) ||
        match.questionIndexes.length < 20 ||
        match.questionCount !== match.questionIndexes.length
    ) {
        throw new Error('INVALID_QUESTION_LIST');
    }

    const database = await loadRankDatabase(
        match.config.target
    );

    // Tính kết quả 20 câu chính.
    const baseCorrectIndexes = [];

    for (let i = 0; i < 20; i++) {
        const question = buildRankQuestion(database, match, i);
        baseCorrectIndexes.push(question.correctIndex);
    }

    const hostResult = calculateRankPlayer(
        match.answerHistory || {},
        baseCorrectIndexes,
        'host'
    );

    const guestResult = calculateRankPlayer(
        match.answerHistory || {},
        baseCorrectIndexes,
        'guest'
    );

    const isTiebreak = match.questionIndexes.length > 20;

    let winner = null;
    let reason = null;

    if (!isTiebreak) {
        winner = determineRankWinner(hostResult, guestResult);

        reason = winner
            ? (
                hostResult.score !== guestResult.score
                    ? 'score'
                    : 'time'
            )
            : 'tiebreak';

    } else {
        // Chỉ chấm câu phụ mới nhất.
        const position = match.questionIndexes.length - 1;

        const question = buildRankQuestion(
            database,
            match,
            position
        );

        const answers = match.answerHistory?.[position] || {};

        const hostAnswer = answers.host;
        const guestAnswer = answers.guest;

        const hostCorrect =
            hostAnswer?.selectedIndex === question.correctIndex;

        const guestCorrect =
            guestAnswer?.selectedIndex === question.correctIndex;

        if (hostCorrect && !guestCorrect) {
            winner = 'host';

        } else if (guestCorrect && !hostCorrect) {
            winner = 'guest';

        } else if (hostCorrect && guestCorrect) {
            const hostTime = Number(hostAnswer.elapsedMs);
            const guestTime = Number(guestAnswer.elapsedMs);

            if (hostTime < guestTime) {
                winner = 'host';
            } else if (guestTime < hostTime) {
                winner = 'guest';
            }
        }

        // Cả hai sai hoặc kết quả vẫn bằng nhau:
        // winner = null, tiếp tục câu phụ.
        reason = 'tiebreak';
    }

    
        let eloPreview = null;

        if (winner) {
            const hostElo = Number(match.initialElo?.host);
            const guestElo = Number(match.initialElo?.guest);

            if (
                !Number.isFinite(hostElo) ||
                !Number.isFinite(guestElo) ||
                hostElo < 0 ||
                guestElo < 0
            ) {
                throw new Error('MATCH_INITIAL_ELO_MISSING');
            }

            eloPreview = calculateMatchElo(
                hostElo,
                guestElo,
                winner
            );
        }


    const result = await runTransaction(matchRef, current => {
        if (!current || current.status !== 'pending_result') {
            return;
        }

        // Không ghi kết quả tính từ phiên bản dữ liệu cũ.
        if (
            current.questionIndexes?.length !==
                match.questionIndexes.length ||
            current.currentQuestion !== match.currentQuestion
        ) {
            return;
        }

        current.hostScore = hostResult.score;
        current.guestScore = guestResult.score;

        current.result = {
            host: hostResult,
            guest: guestResult,
            winnerRole: winner || 'pending',
            reason,
            tiebreakRounds: Math.max(
                0,
                current.questionIndexes.length - 20
            ),
            eloPreview
        };

        current.status = winner
            ? 'finished'
            : 'tiebreak_pending';

        return current;
    }, { applyLocally: false });

    return result.committed;
}



export async function prepareRankTiebreak(matchId) {
    const uid = auth.currentUser?.uid;
    if (!uid) throw new Error('LOGIN_REQUIRED');

    const matchRef = ref(db, `rankedMatches/${matchId}`);
    const snapshot = await get(matchRef);
    const current = snapshot.val();

    if (!current || current.status !== 'tiebreak_pending') {
        return false;
    }

    // Prototype: HOST khởi tạo câu phụ.
    if (current.hostUid !== uid) return false;

    const database = await loadRankDatabase(
        current.config.target
    );

    if (database.length < RANK_BASE_QUESTIONS + 1) {
        throw new Error('NOT_ENOUGH_TIEBREAK_QUESTIONS');
    }

    const result = await runTransaction(matchRef, match => {
        if (!match || match.status !== 'tiebreak_pending') {
            return;
        }

        if (match.hostUid !== uid) return;

        const indexes = match.questionIndexes || [];
        const used = new Set(indexes);

        // Ưu tiên câu chưa từng xuất hiện trong trận.
        // Khi dùng hết database, cho phép sử dụng lại.
        const available = [];

        for (let i = 0; i < database.length; i++) {
            if (!used.has(i)) available.push(i);
        }

        if (available.length === 0) {
            for (let i = 0; i < database.length; i++) {
                if (i !== indexes[indexes.length - 1]) {
                    available.push(i);
                }
            }
        }

        if (!available.length) return;

        // Chọn cố định dựa trên matchId và số câu phụ.
        // Không sử dụng Math.random() trong transaction.
        const round = indexes.length - RANK_BASE_QUESTIONS + 1;
        const seed = `${matchId}:${round}`;

        let hash = 2166136261;

        for (const char of seed) {
            hash ^= char.charCodeAt(0);
            hash = Math.imul(hash, 16777619);
        }

        const selectedIndex =
            available[(hash >>> 0) % available.length];

        const now = rankedServerNow();

        match.questionIndexes = [...indexes, selectedIndex];
        match.questionCount = match.questionIndexes.length;

        match.currentQuestion = indexes.length;

        match.questionStartedAt = now;
        match.questionDeadline = now + RANK_QUESTION_TIME_MS;

        match.answers = {};
        match.tiebreakRound = round;
        match.status = 'playing';

        return match;
    }, { applyLocally: false });

    return result.committed;
}
