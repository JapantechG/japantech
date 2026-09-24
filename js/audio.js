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

export function playSfx(name) {

    const sound = sounds[name];

    if (!sound) {
        return;
    }

    sound.currentTime = 0;

    sound
        .play()
        .catch(() => {});
}


/* =============================================================
   BGM
   ============================================================= */

export function playLobbyMusic() {

    if (!sounds.lobby) {
        return;
    }

    sounds.lobby.volume = 0.35;

    sounds.lobby
        .play()
        .catch(() => {});
}


export function stopLobbyMusic() {

    if (!sounds.lobby) {
        return;
    }

    sounds.lobby.pause();

    sounds.lobby.currentTime = 0;
}


/* =============================================================
   JAPANESE SPEECH
   ============================================================= */

export function speakJapanese(
    text,
    callback = () => {}
) {

    if (
        !("speechSynthesis" in window)
    ) {

        setTimeout(callback, 500);

        return;
    }


    speechSynthesis.cancel();


    const speech =
        new SpeechSynthesisUtterance(
            text
        );


    speech.lang = "ja-JP";
    speech.rate = 0.9;
    speech.pitch = 1;


    const voices =
        speechSynthesis.getVoices();


    const japaneseVoice =
        voices.find(
            voice =>
                voice.lang
                    .toLowerCase()
                    .startsWith("ja")
        );


    if (japaneseVoice) {
        speech.voice = japaneseVoice;
    }


    speech.onend =
        () => {

            setTimeout(
                callback,
                200
            );
        };


    speech.onerror =
        () => {

            setTimeout(
                callback,
                300
            );
        };


    speechSynthesis.speak(
        speech
    );
}


export function stopSpeech() {

    if (
        "speechSynthesis" in window
    ) {

        speechSynthesis.cancel();
    }
}