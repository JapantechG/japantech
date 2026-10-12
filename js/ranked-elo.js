
export const RANK_ELO_K = 32;
export const RANK_ELO_MIN = 0;

export function calculateEloChange(
    myElo,
    opponentElo,
    won
) {
    const ratingA = Number(myElo);
    const ratingB = Number(opponentElo);

    if (
        !Number.isFinite(ratingA) ||
        !Number.isFinite(ratingB) ||
        ratingA < 0 ||
        ratingB < 0
    ) {
        throw new Error('INVALID_ELO');
    }

    const expected =
        1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));

    const actual = won ? 1 : 0;

    const delta = Math.round(
        RANK_ELO_K * (actual - expected)
    );

    const newElo = Math.max(
        RANK_ELO_MIN,
        Math.round(ratingA) + delta
    );

    return {
        before: Math.round(ratingA),
        change: newElo - Math.round(ratingA),
        after: newElo
    };
}

export function calculateMatchElo(
    hostElo,
    guestElo,
    winnerRole
) {
    if (!['host', 'guest'].includes(winnerRole)) {
        throw new Error('WINNER_NOT_DECIDED');
    }

    return {
        host: calculateEloChange(
            hostElo,
            guestElo,
            winnerRole === 'host'
        ),

        guest: calculateEloChange(
            guestElo,
            hostElo,
            winnerRole === 'guest'
        )
    };
}
