import {
    rankedServerNow,
    stopRankedMatch,
    startRankedMatch,
    submitRankAnswer,
    advanceRankQuestion,
    finalizeRankMatch,
    prepareRankTiebreak
} from './ranked-match.js';

import { settleMyRankMatch } from './rank-store.js';
import { speakJapanese } from './audio.js';

import {
    loadRankDatabase,
    buildRankQuestion
} from './ranked-question.js';

import { auth } from './firebase.js';

const $ = id => document.getElementById(id);

let initialized = false;
let countdownInterval = null;
let countdownMatchId = null;

let renderedQuestionKey = null;
let renderGeneration = 0;

let questionTimer = null;
let questionTimerKey = null;
let latestRankMatch = null;
let advancingQuestion = false;

let finalizingMatchId = null;
let preparingTiebreakKey = null;

const settledMatches = new Set();

function stopCountdown() {
    clearInterval(countdownInterval);
    countdownInterval = null;
    countdownMatchId = null;
}

export function openRankedGame(matchInfo) {
    stopQuestionTimer();
    latestRankMatch = null;
    advancingQuestion = false;
    renderGeneration++;
    renderedQuestionKey = null;
    finalizingMatchId = null;
    preparingTiebreakKey = null;

    $('rankScreen')?.classList.add('hidden');

    $('rankedGameScreen')?.classList.remove('hidden');

    $('rankedGameStatus').textContent = 'MATCH FOUND';

    $('rankedGameMatchId').textContent =
        `MATCH ID: ${matchInfo.matchId}`;

    $('rankedGameRole').textContent =
        `ROLE: ${matchInfo.role.toUpperCase()}`;

    $('rankedGameContent').textContent =
        'Waiting for match initialization...';
}


export function closeRankedGame() {
    stopQuestionTimer();
    latestRankMatch = null;
    advancingQuestion = false;
    renderGeneration++;
    renderedQuestionKey = null;
    finalizingMatchId = null;
    preparingTiebreakKey = null;


    // 1. Dừng đồng hồ đếm ngược
    stopCountdown();

    // 2. Ngừng theo dõi trận đấu trên Firebase
    stopRankedMatch();

    // 3. Ẩn màn hình Ranked Game
    $('rankedGameScreen')?.classList.add('hidden');

    // 4. Quay lại Rank Lobby
    $('rankScreen')?.classList.remove('hidden');
}


function updateRankAnswerUI(match) {
    const uid = auth.currentUser?.uid;

    const role =
        uid === match.hostUid ? 'host' :
        uid === match.guestUid ? 'guest' :
        null;

    const myAnswer = role
        ? match.answers?.[role]
        : null;

    const buttons = document.querySelectorAll(
        '#rankedGameContent .ranked-option'
    );

    buttons.forEach((button, index) => {
        const answered = !!myAnswer;
        const expired =
            rankedServerNow() >= match.questionDeadline;

        button.disabled = answered || expired;

        button.classList.toggle(
            'selected',
            answered && myAnswer.selectedIndex === index
        );
    });
}


async function showRankedQuestion(match) {
    const position = Number(match.currentQuestion) || 0;

    const key = `${match.matchId}:${position}`;

    if (renderedQuestionKey === key) return;

    renderedQuestionKey = key;
    const generation = ++renderGeneration;

    const content = $('rankedGameContent');

    content.textContent = 'Loading question...';

    try {
        const database = await loadRankDatabase(
            match.config.target
        );

        // Bỏ kết quả tải cũ nếu đã đổi trận hoặc đóng màn hình.
        if (
            generation !== renderGeneration ||
            $('rankedGameScreen')?.classList.contains('hidden')
        ) return;

        const question = buildRankQuestion(
            database,
            match,
            position
        );

        const card = document.createElement('div');
        card.className = 'ranked-question-card';

        const number = document.createElement('div');
        number.className = 'ranked-question-number';
        number.textContent = position < 20
                            ? `QUESTION ${position + 1} / 20`
                            : `SUDDEN DEATH · ROUND ${position - 19}`;

        const word = document.createElement('div');
        word.className = 'ranked-question-word';
        word.textContent = question.question;

        
        /* ==========================================
           MIXED QUESTION MODE LABEL / AUDIO
        ========================================== */
        
        const modeLabel = document.createElement('div');
        
        modeLabel.className = 'ranked-question-mode';
        
        modeLabel.textContent =
            `${String(match.config?.target || 'n5').toUpperCase()} · ` +
            `${question.mode.replaceAll('_', ' → ').toUpperCase()}`;
        
        if (question.mode.startsWith('audio_')) {
        
            word.classList.add('ranked-audio-trigger');
        
            word.setAttribute('role', 'button');
            word.tabIndex = 0;
        
            const speak = () =>
                speakJapanese(question.speechText);
        
            word.addEventListener('click', speak);
        
            word.addEventListener('keydown', e => {
        
                if (
                    e.key === 'Enter' ||
                    e.key === ' '
                ) {
                    e.preventDefault();
                    speak();
                }
            });
        
            setTimeout(() => {
                if (generation === renderGeneration) {
                    speak();
                }
            }, 250);
        }


        const options = document.createElement('div');
        options.className = 'ranked-options';

        question.options.forEach((answer, index) => {
            const button = document.createElement('button');

            button.type = 'button';
            button.className = 'ranked-option';
            button.textContent = `${index + 1}. ${answer}`;

                    
            button.addEventListener('click', async () => {
                const current = latestRankMatch;

                if (
                    !current ||
                    current.matchId !== match.matchId ||
                    current.currentQuestion !== position ||
                    current.status !== 'playing'
                ) return;

                // Khóa ngay tại máy để tránh bấm liên tục.
                options.querySelectorAll('button').forEach(btn => {
                    btn.disabled = true;
                });

                try {
                    const saved = await submitRankAnswer(
                        match.matchId,
                        position,
                        index
                    );

                    if (!saved) {
                        console.warn(
                            '[RANK] Answer rejected: expired or already answered'
                        );
                    }
                } catch (error) {
                    console.error('[RANK] Submit answer:', error);
                }

                // Firebase listener sẽ quyết định trạng thái cuối.
                if (latestRankMatch?.currentQuestion === position) {
                    updateRankAnswerUI(latestRankMatch);
                }
            });


            options.appendChild(button);
        });

        card.append(
                number,
                modeLabel,
                word,
                options
            );
        content.replaceChildren(card);

        if (
            latestRankMatch?.matchId === match.matchId &&
            latestRankMatch?.currentQuestion === position
        ) {
            updateRankAnswerUI(latestRankMatch);
        }

        console.log('[RANK] Question rendered:', {
            matchId: match.matchId,
            position,
            questionIndex: question.questionIndex,
            options: question.options
        });

    } catch (error) {
        if (generation !== renderGeneration) return;

        renderedQuestionKey = null;

        console.error('[RANK] Question:', error);
        content.textContent = `Question error: ${error.message}`;
    }
}



/* ==========================================
   RANKED MATCH RESULT
========================================== */

function showRankedResult(match) {

    stopQuestionTimer();

    const result = match.result;
    const uid = auth.currentUser?.uid;

    const role =
        uid === match.hostUid ? 'host' :
        uid === match.guestUid ? 'guest' :
        null;

    if (!result || !role) return;

    const otherRole =
        role === 'host' ? 'guest' : 'host';

    const mine = result[role] || {};
    const other = result[otherRole] || {};

    const won = result.winnerRole === role;

    $('rankedGameStatus').textContent =
        won ? '🏆 VICTORY!' : '💔 DEFEAT';

    const content = $('rankedGameContent');

    content.replaceChildren();

    const wrap = document.createElement('div');
    wrap.className = 'ranked-result-card';

    /* TITLE */

    const h = document.createElement('h2');

    h.textContent = won
        ? '🏆 VICTORY'
        : '💔 DEFEAT';

    h.className = won ? 'win' : 'lose';

    wrap.append(h);

    /* SCORE */

    const heading = document.createElement('div');

    heading.className = 'ranked-result-versus';

    heading.textContent =
        `YOU ${Number(mine.score) || 0}  :  ` +
        `${Number(other.score) || 0} OPPONENT`;

    wrap.append(heading);

    /* DETAIL */

    const rows = [
        [
            'JLPT',
            String(
                match.config?.target || 'n5'
            ).toUpperCase()
        ],

        [
            'CORRECT',
            `${mine.correct || 0} / 20  ·  ` +
            `Opponent ${other.correct || 0} / 20`
        ],

        [
            'WRONG / MISSED',
            `${mine.wrong || 0} / ${mine.missed || 0}`
        ],

        [
            'MAX COMBO',
            `${mine.maxCombo || 0}`
        ],

        [
            'TOTAL TIME',
            `${((mine.totalTimeMs || 0) / 1000).toFixed(2)}s`
        ],

        [
            'DECIDED BY',
            String(result.reason || 'score').toUpperCase()
        ]
    ];

    const grid = document.createElement('div');

    grid.className = 'ranked-result-grid';

    rows.forEach(([label, value]) => {

        const line = document.createElement('div');
        line.className = 'ranked-result-line';

        const a = document.createElement('span');
        a.textContent = label;

        const b = document.createElement('strong');
        b.textContent = value;

        line.append(a, b);
        grid.append(line);
    });

    wrap.append(grid);

    /* ELO CHANGE */

    const change = result.eloPreview?.[role];

    if (change) {

        const elo = document.createElement('div');

        elo.className =
            `ranked-result-elo ${won ? 'win' : 'lose'}`;

        elo.textContent =
            `${change.change >= 0 ? '+' : ''}` +
            `${change.change} ELO  ·  ` +
            `${change.before} → ${change.after}`;

        wrap.append(elo);
    }

    /* SAVE RESULT */

    const note = document.createElement('p');

    note.className = 'rank-muted';

    note.textContent =
        'Saving rating and match history…';

    wrap.append(note);
    content.append(wrap);

    if (!settledMatches.has(match.matchId)) {

        settledMatches.add(match.matchId);

        settleMyRankMatch(match)
            .then(() => {
                note.textContent =
                    '✓ Result saved to Rank history';
            })
            .catch(error => {

                settledMatches.delete(match.matchId);

                note.textContent =
                    `Could not save result: ${error.message}`;

                console.error(
                    '[RANK] Save:',
                    error
                );
            });

    } else {
        note.textContent = 'Result already processed';
    }
}



export function initRankedGame() {
    if (initialized) return;
    initialized = true;

    // Sự kiện nút Back
    $('rankedGameBackButton')?.addEventListener(
        'click',
        closeRankedGame
    );

    // Lắng nghe dữ liệu trận đấu từ Firebase
    window.addEventListener('batlingo-ranked-match', event => {
        const { type, matchId, match, message } = event.detail;

        if (type === 'error') {
            stopCountdown();

            $('rankedGameStatus').textContent = 'MATCH ERROR';
            $('rankedGameContent').textContent = message;

            return;
        }

        if (type !== 'updated') return;

        // Không xử lý nếu màn hình Ranked Game đang ẩn
        if ($('rankedGameScreen')?.classList.contains('hidden')) {
            return;
        }

       
        if (match.status === 'countdown') {
            showRankedCountdown(matchId, match.startAt);

     
        
                
        } else if (match.status === 'playing') {
            stopCountdown();

            if (
                !Array.isArray(match.questionIndexes) ||
                match.questionIndexes.length < 20 ||
                match.questionIndexes.length !== match.questionCount
            ) {
                $('rankedGameContent').textContent =
                    'Invalid shared question list.';
                return;
            }

            if (
                !Number.isFinite(match.questionStartedAt) ||
                !Number.isFinite(match.questionDeadline)
            ) {
                $('rankedGameContent').textContent =
                    'Invalid question timer.';
                return;
            }

            latestRankMatch = match;

            // Hiển thị câu hỏi, chỉ render lại khi đổi câu.
            showRankedQuestion(match).catch(console.error);

            // Đồng hồ dùng mốc thời gian Firebase.
            startQuestionTimer(match);

            updateRankAnswerUI(match);

        
            } else if (match.status === 'pending_result') {
                stopCountdown();
                stopQuestionTimer();

                $('rankedGameStatus').textContent =
                    'CALCULATING RESULT...';

                $('rankedGameContent').textContent =
                    'Please wait for the final result.';

                // HOST tính kết quả một lần.
                if (
                    auth.currentUser?.uid === match.hostUid &&
                    finalizingMatchId !== matchId
                ) {
                    finalizingMatchId = matchId;

                    finalizeRankMatch(matchId).catch(error => {
                        console.error('[RANK] Finalize:', error);

                        // Cho phép thử lại khi có cập nhật tiếp theo.
                        finalizingMatchId = null;

                        $('rankedGameContent').textContent =
                            `Result error: ${error.message}`;
                    });
                }

            } else if (match.status === 'finished') {
                showRankedResult(match);

            
            } else if (match.status === 'tiebreak_pending') {
                stopQuestionTimer();

                // Cho phép tính kết quả của câu phụ kế tiếp.
                finalizingMatchId = null;

                $('rankedGameStatus').textContent =
                    '⚔ SUDDEN DEATH!';

                $('rankedGameContent').textContent =
                    'Preparing an extra question...';

                const key = `${matchId}:${match.questionCount}`;

                if (
                    auth.currentUser?.uid === match.hostUid &&
                    preparingTiebreakKey !== key
                ) {
                    preparingTiebreakKey = key;

                    prepareRankTiebreak(matchId).catch(error => {
                        console.error('[RANK] Tiebreak:', error);

                        preparingTiebreakKey = null;

                        $('rankedGameContent').textContent =
                            `Tiebreak error: ${error.message}`;
                    });
                }
            }




    });
}




function showRankedCountdown(matchId, startAt) {
    if (
        countdownMatchId === matchId &&
        countdownInterval
    ) return;

    stopCountdown();
    countdownMatchId = matchId;

    const status = document.getElementById('rankedGameStatus');
    const content = document.getElementById('rankedGameContent');

    const tick = () => {
        const remaining = startAt - rankedServerNow();

 
        if (remaining <= 0) {
            stopCountdown();

            status.textContent = 'START!';
            content.textContent = 'Synchronizing battle...';

            startRankedMatch(matchId).catch(error => {
                console.error('[RANK] Start failed:', error);

                status.textContent = 'START FAILED';
                content.textContent = error.message;
            });

            return;
        }


        if (remaining > 3000) {
            status.textContent = 'GET READY!';
            content.textContent = 'Preparing match...';
        } else {
            const seconds = Math.ceil(remaining / 1000);

            status.textContent = String(seconds);
            content.textContent = 'RANKED BATTLE STARTING...';
        }
    };

    tick();
    countdownInterval = setInterval(tick, 100);
}


function stopQuestionTimer() {
    clearInterval(questionTimer);
    questionTimer = null;
    questionTimerKey = null;
}

function startQuestionTimer(match) {
    const key = `${match.matchId}:${match.currentQuestion}`;

    if (questionTimerKey === key) return;

    stopQuestionTimer();
    questionTimerKey = key;

    const tick = async () => {
        if (questionTimerKey !== key) return;

        const current = latestRankMatch;

        if (
            !current ||
            current.status !== 'playing' ||
            current.matchId !== match.matchId ||
            current.currentQuestion !== match.currentQuestion
        ) {
            stopQuestionTimer();
            return;
        }

        const remaining = Math.max(
            0,
            current.questionDeadline - rankedServerNow()
        );

        const seconds = Math.ceil(remaining / 1000);

        const questionLabel = current.currentQuestion < 20
                                ? `QUESTION ${current.currentQuestion + 1}/20`
                                : `SUDDEN DEATH ${current.currentQuestion - 19}`;

        $('rankedGameStatus').textContent =
            `${questionLabel} · ${seconds}s`;

        updateRankAnswerUI(current);

        const bothAnswered =
            !!current.answers?.host &&
            !!current.answers?.guest;

        if ((remaining <= 0 || bothAnswered) &&
            !advancingQuestion) {

            advancingQuestion = true;

            try {
                await advanceRankQuestion(
                    current.matchId,
                    current.currentQuestion
                );
            } catch (error) {
                console.error('[RANK] Next question:', error);
            } finally {
                advancingQuestion = false;
            }
        }
    };

    tick();
    questionTimer = setInterval(tick, 200);
}
