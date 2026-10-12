
export const RANK_ANSWER_LIMIT_MS = 10000;

export function getRankComboPoints(combo) {
    if (combo >= 13) return 130;
    if (combo >= 9) return 120;
    if (combo >= 5) return 110;
    if (combo >= 1) return 100;
    return 0;
}

export function calculateRankPlayer(
    answerHistory,
    correctIndexes,
    role
) {
    let score = 0;
    let combo = 0;
    let maxCombo = 0;
    let correct = 0;
    let wrong = 0;
    let missed = 0;
    let totalTimeMs = 0;

    correctIndexes.forEach((correctIndex, position) => {
        const answer = answerHistory?.[position]?.[role];

        const elapsed = answer
            ? Math.max(
                0,
                Math.min(
                    RANK_ANSWER_LIMIT_MS,
                    Math.round(Number(answer.elapsedMs) || 0)
                )
            )
            : RANK_ANSWER_LIMIT_MS;

        totalTimeMs += elapsed;

        if (!answer) {
            missed++;
            combo = 0;
            return;
        }

        if (answer.selectedIndex === correctIndex) {
            correct++;
            combo++;

            maxCombo = Math.max(maxCombo, combo);
            score += getRankComboPoints(combo);
        } else {
            wrong++;
            combo = 0;
        }
    });

    return {
        score,
        correct,
        wrong,
        missed,
        totalTimeMs,
        maxCombo
    };
}

export function determineRankWinner(host, guest) {
    if (host.score > guest.score) return 'host';
    if (guest.score > host.score) return 'guest';

    if (host.totalTimeMs < guest.totalTimeMs) return 'host';
    if (guest.totalTimeMs < host.totalTimeMs) return 'guest';

    return null; // Cần câu phụ, không phải DRAW.
}
