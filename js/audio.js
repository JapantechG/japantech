/* =============================================================
   AUDIO
   ============================================================= */

const sounds = {

    lobby:
        document.getElementById("lobbyBgm"),

    click:
        document.getElementById("clickSound"),

    slide:
        document.getElementById("slideSound"),

    correct:
        document.getElementById("correctSound"),

    wrong:
        document.getElementById("wrongSound"),

    gameover:
        document.getElementById("gameoverSound")
};


/* =============================================================
   SFX
   ============================================================= */

export function playSfx(name) 
{
    const sound = sounds[name];

    if (!sound) 
    {
        return;
    }

    sounds[name].volume = 0.2;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

/* =============================================================
   BGM
   ============================================================= */

export function playLobbyMusic() 
{
    if (!sounds.lobby) 
    {
        return;
    }

    sounds.lobby.volume = 0.15;

    sounds.lobby.play().catch(() => {});
}

export function stopLobbyMusic() 
{
    if (!sounds.lobby) 
    {
        return;
    }

    sounds.lobby.pause();

    sounds.lobby.currentTime = 0;
}


/* =============================================================
   BATLINGO - MULTI LANGUAGE SPEECH
   Japanese / Vietnamese / English
============================================================= */

/* =============================================================
   DEFAULT VOICE SETTINGS
============================================================= */

const SPEECH_CONFIG = {

    "ja-JP": {
        rate: 0.9,
        pitch: 1,
        volume: 1
    },

    "vi-VN": {
        rate: 0.9,
        pitch: 1,
        volume: 1
    },

    "en-US": {
        rate: 0.9,
        pitch: 1,
        volume: 1
    }

};


/* =============================================================
   CURRENT SPEECH STATE
============================================================= */

let activeSpeech = null;
let speechToken = 0;


/* =============================================================
   GET AVAILABLE VOICE
============================================================= */

export function getSpeechVoice(language)
{
    if (!("speechSynthesis" in window)) {
        return null;
    }

    const voices = speechSynthesis.getVoices();

    const target = String(language).toLowerCase();

    // First: exact locale
    let voice = voices.find(v =>
        v.lang.toLowerCase() === target
    );

    if (voice) {
        return voice;
    }

    // Second: same language
    const prefix = target.split("-")[0];

    voice = voices.find(v =>
        v.lang.toLowerCase() === prefix ||
        v.lang.toLowerCase().startsWith(prefix + "-")
    );

    return voice || null;
}


/* =============================================================
   CHECK VOICE AVAILABILITY
============================================================= */

export function hasSpeechVoice(language)
{
    return getSpeechVoice(language) !== null;
}


/* =============================================================
   STOP CURRENT SPEECH
============================================================= */

export function stopSpeech()
{
    ++speechToken;

    const active = activeSpeech;
    activeSpeech = null;

    if (active) {

        clearTimeout(active.safetyTimer);

        clearTimeout(active.finishTimer);

        active.utterance.onend = null;
        active.utterance.onerror = null;
    }

    if ("speechSynthesis" in window) {
        speechSynthesis.cancel();
    }
}


/* =============================================================
   GENERAL SPEECH FUNCTION
============================================================= */

export function speakText(
    text,
    language = "ja-JP",
    callback = () => {},
    options = {}
)
{
    // Stop previous speech and invalidate callbacks.
    stopSpeech();

    const token = speechToken;

    const value = String(text ?? "").trim();

    const config = SPEECH_CONFIG[language] || {
        rate: 0.9,
        pitch: 1,
        volume: 1
    };

    const rate = Number(options.rate ?? config.rate);
    const pitch = Number(options.pitch ?? config.pitch);
    const volume = Number(options.volume ?? config.volume);

    let finished = false;

    function safeCallback()
    {
        if (finished || token !== speechToken) {
            return;
        }

        finished = true;

        if (activeSpeech) {
            clearTimeout(activeSpeech.safetyTimer);
            clearTimeout(activeSpeech.finishTimer);

            activeSpeech = null;
        }

        if (typeof callback === "function") {
            callback();
        }
    }

    // Empty text: continue without speaking.
    if (!value) {
        queueMicrotask(safeCallback);
        return;
    }

    // Browser does not support TTS.
    if (
        !("speechSynthesis" in window) ||
        !("SpeechSynthesisUtterance" in window)
    ) {
        setTimeout(safeCallback, 200);
        return;
    }

    const speech = new SpeechSynthesisUtterance(value);

    speech.lang = language;

    speech.rate = Number.isFinite(rate)
        ? Math.max(0.1, Math.min(10, rate))
        : config.rate;

    speech.pitch = Number.isFinite(pitch)
        ? Math.max(0, Math.min(2, pitch))
        : config.pitch;

    speech.volume = Number.isFinite(volume)
        ? Math.max(0, Math.min(1, volume))
        : config.volume;

    const voice = getSpeechVoice(language);

    if (voice) {
        speech.voice = voice;
    }

    // Estimate a generous timeout for long meanings.
    const timeout = Math.min(
        30000,
        Math.max(5000, value.length * 250)
    );

    const state = {
        utterance: speech,
        safetyTimer: null,
        finishTimer: null
    };

    activeSpeech = state;

    function finish()
    {
        if (token !== speechToken || finished) {
            return;
        }

        clearTimeout(state.safetyTimer);

        state.finishTimer = setTimeout(
            safeCallback,
            200
        );
    }

    state.safetyTimer = setTimeout(() => {

        if (token !== speechToken || finished) {
            return;
        }

        console.warn(
            "[AUDIO] Speech timeout:",
            language
        );

        // Invalidates the pending utterance events.
        speech.onend = null;
        speech.onerror = null;

        speechSynthesis.cancel();

        safeCallback();

    }, timeout);

    speech.onend = finish;

    speech.onerror = event => {

        if (
            event.error === "canceled" ||
            event.error === "interrupted"
        ) {
            return;
        }

        console.warn(
            "[AUDIO] Speech error:",
            event.error
        );

        finish();
    };

    try {

        speechSynthesis.speak(speech);

    } catch (error) {

        console.error(
            "[AUDIO] Speech failed:",
            error
        );

        finish();
    }
}


/* =============================================================
   JAPANESE
============================================================= */

export function speakJapanese(
    text,
    callback = () => {},
    options = {}
)
{
    speakText(
        text,
        "ja-JP",
        callback,
        options
    );
}


/* =============================================================
   VIETNAMESE
============================================================= */

export function speakVietnamese(
    text,
    callback = () => {},
    options = {}
)
{
    speakText(
        text,
        "vi-VN",
        callback,
        options
    );
}


/* =============================================================
   ENGLISH
============================================================= */

export function speakEnglish(
    text,
    callback = () => {},
    options = {}
)
{
    speakText(
        text,
        "en-US",
        callback,
        options
    );
}


export async function logout() 
{
    try 
    {
        await signOut(auth);

        console.log("[AUTH] Logout success");
    }
    catch (error)
     {
        console.error("[AUTH] Logout:",error);
    }

}
