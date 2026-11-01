
/* =============================================================
   BATLINGO - SOLO GAME ROUTER
============================================================= */

import {
    startSurvival,
    stopSurvival
} from "./solo/solo-survival.js";

import {
    startPractice,
    stopPractice
} from "./solo/solo-practice.js";

export async function startGame(config) {

    stopSurvival();
    stopPractice();

    document.getElementById("gameOverScreen")
        ?.classList.add("hidden");

    if (config.soloType === "practice") {
        return startPractice(config);
    }

    return startSurvival(config);
}

export function stopSoloGame() {
    stopSurvival();
    stopPractice();
}
