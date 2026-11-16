
/* ==========================================
   BATLINGO LEARNING SPEECH ENGINE
========================================== */

const engine = window.speechSynthesis;

let japaneseVoice = null;

function selectJapaneseVoice() {

    if (!engine) return null;

    const voices = engine.getVoices();

    return (
        voices.find(v =>
            v.lang.toLowerCase() === "ja-jp" &&
            v.localService
        ) ||
        voices.find(v =>
            v.lang.toLowerCase().startsWith("ja")
        ) ||
        null
    );
}

if (engine) {

    japaneseVoice = selectJapaneseVoice();

    engine.addEventListener?.(
        "voiceschanged",
        () => {
            japaneseVoice = selectJapaneseVoice();
        }
    );
}

export function stopLearningSpeech() {

    engine?.cancel();

}

export function speakJapanese(text, rate = 0.88) {

    const value = String(text || "").trim();

    if (!engine || !value) return false;

    engine.cancel();

    const utterance =
        new SpeechSynthesisUtterance(value);

    utterance.lang = "ja-JP";

    utterance.voice =
        japaneseVoice || selectJapaneseVoice();

    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;

    engine.speak(utterance);

    return true;
}

export function speakCard(item, kind) {

    if (!item) return false;

    let text = "";

    switch (kind) {

        case "vocabulary":
            text = item.reading || item.word;
            break;

        case "kanji":
            text =
                item.relatedWords?.[0]?.reading ||
                item.readings?.on?.[0] ||
                item.character;
            break;

        case "grammar":
            text =
                item.examples?.[0]?.sentence ||
                item.grammar;
            break;
    }

    return speakJapanese(text);
}
