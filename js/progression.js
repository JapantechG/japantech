/* =========================================================
   BATLINGO PROGRESSION SYSTEM
========================================================= */


/* =========================================================
   EXP REQUIRED FOR LEVEL

   Level 1 → 2 : 100
   Level 2 → 3 : 150
   Level 3 → 4 : 200
   ...
========================================================= */

export function getExpRequired(level)
{
    const safeLevel =Math.max(1,Number(level) || 1);

    return 100 + (safeLevel - 1) * 50;
}

/* =========================================================
   CALCULATE SOLO EXP
========================================================= */

export function calculateSoloExp({correct,wrong})
{
    const correctExp = correct * 10;

    const wrongExp = wrong * 2;

    const completionBonus = 20;

    return (
        correctExp +
        wrongExp +
        completionBonus
    );
}

/* =========================================================
   APPLY EXP / LEVEL UP

   exp = EXP của level hiện tại
   totalExp = toàn bộ EXP account từng kiếm
========================================================= */

export function applyExp(currentProgress,gainedExp)
{
    let level = Number(currentProgress?.level) || 1;

    let exp = Number(currentProgress?.exp) || 0;

    let totalExp =Number(currentProgress?.totalExp) || 0;

    const gained =Math.max(0,Number(gainedExp) || 0);

    exp += gained;

    totalExp += gained;

    let levelsGained = 0;

    /*
        Có thể tăng nhiều level
        trong cùng một lần nhận EXP.
    */

    while (exp >=getExpRequired(level)) 
    {
        exp -= getExpRequired(level);

        level++;

        levelsGained++;
    }

    return {
        level,
        exp,
        totalExp,
        levelsGained,
        expRequired:
            getExpRequired(level)
    };
}
