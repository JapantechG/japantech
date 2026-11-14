
/* BATLINGO ANALYTICS */

export function trackEvent(name, params = {}) {
    if (typeof window.gtag !== "function") return;

    window.gtag("event", name, params);
}

export function trackGameStart(config) {
    trackEvent("game_start", {
        game_mode: config.soloType || "solo",
        study_mode: config.studyMode,
        jlpt_level: config.target,
        category: config.category
    });
}

export function trackGameComplete(mode, correct, wrong) {
    trackEvent("game_complete", {
        game_mode: mode,
        correct_answers: correct,
        wrong_answers: wrong
    });
}
