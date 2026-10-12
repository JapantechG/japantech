import {
    rankedServerNow,
    stopRankedMatch,
    startRankedMatch,
    submitRankAnswer,
    advanceRankQuestion,
    finalizeRankMatch,
    prepareRankTiebreak
} from './ranked-match.js';

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

        card.append(number, word, options);
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


function showRankedResult(match) {
    stopQuestionTimer();

    const result = match.result;
    if (!result) return;

    const uid = auth.currentUser?.uid;

    const myRole =
        uid === match.hostUid ? 'host' :
        uid === match.guestUid ? 'guest' :
        null;

    if (!myRole) return;

    const opponentRole =
        myRole === 'host' ? 'guest' : 'host';

    const mine = result[myRole];
    const opponent = result[opponentRole];

    const won = result.winnerRole === myRole;

    $('rankedGameStatus').textContent =
        won ? '🏆 VICTORY!' : 'DEFEAT';

    const content = $('rankedGameContent');
    content.replaceChildren();

    const title = document.createElement('h2');
    title.textContent = won ? 'YOU WIN!' : 'YOU LOSE!';

    const score = document.createElement('p');
    score.textContent =
        `SCORE: ${mine.score} - ${opponent.score}`;

    const accuracy = document.createElement('p');
    accuracy.textContent =
        `CORRECT: ${mine.correct} / 20`;

    const combo = document.createElement('p');
    combo.textContent =
        `MAX COMBO: ${mine.maxCombo}`;

    const time = document.createElement('p');
    time.textContent =
        `TOTAL TIME: ${(mine.totalTimeMs / 1000).toFixed(2)}s`;

    const reason = document.createElement('p');
    const reasonLabels = {
    score: 'WINNER DECIDED BY SCORE',
    time: 'WINNER DECIDED BY TOTAL ANSWER TIME',
    tiebreak: `SUDDEN DEATH · ${result.tiebreakRounds} ROUND(S)`
    };

    reason.textContent =
        reasonLabels[result.reason] || 'RANKED RESULT';

   
        content.append(
            title,
            score,
            accuracy,
            combo,
            time,
            reason
        );

        // Hiển thị Elo dự kiến, chưa cập nhật hồ sơ.
        const elo = result.eloPreview?.[myRole];

        if (elo) {
            const eloTitle = document.createElement('h3');
            eloTitle.textContent = 'ELO CHANGE (PREVIEW)';

            const eloChange = document.createElement('p');
            eloChange.className = 'ranked-elo-change';

            eloChange.textContent =
                `${elo.change >= 0 ? '+' : ''}${elo.change} ELO`;

            eloChange.style.color =
                elo.change >= 0 ? '#22c55e' : '#ef4444';

            const eloValue = document.createElement('p');
            eloValue.textContent =
                `${elo.before} → ${elo.after} ELO`;

            content.append(
                eloTitle,
                eloChange,
                eloValue
            );
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
