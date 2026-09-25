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

    sounds[name].volume = 0.3;
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

    sounds.lobby.volume = 0.15;

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
   
            /* =============================================================
            SPEECH CALLBACK SAFETY
            ============================================================= */
         
         /*
             Biến kiểm tra callback đã được chạy hay chưa.
         
             false = chưa chạy
             true  = đã chạy
         
             Mục đích:
             Không cho callback chạy 2 lần.
         */
         let finished = false;
         
         
         /*
             Function dùng chung để kết thúc speech
             và tiếp tục game.
         */
         function finish() {
         
             /*
                 Nếu callback đã chạy rồi
                 thì dừng ngay.
             */
             if (finished) {
                 return;
             }
         
             /*
                 Đánh dấu đã hoàn thành.
             */
             finished = true;
         
         
             /*
                 Hủy safety timer vì speech
                 đã kết thúc bình thường hoặc đã báo lỗi.
             */
             clearTimeout(
                 safetyTimer
             );
         
         
             /*
                 Chạy callback.
         
                 Trong game.js callback này
                 thường là nextQuestion.
             */
             callback();
         }

      /*
          SAFETY TIMER
      
          Nếu sau 3 giây browser vẫn không gọi
          onend hoặc onerror thì tự gọi finish().
      
          Mục đích:
          tránh game bị treo vô hạn.
      */
      const safetyTimer =
          setTimeout(
              finish,
              3000
          );
   /*Speech đọc xong bình thường.*/
    speech.onend =
        () => {
           /*Chờ thêm 200ms rồi tiếp tục game.*/
            setTimeout(
                /*###callback,*/
               finish,
                200
            );
        };

   /*Speech gặp lỗi*/
    speech.onerror =
        () => {
             /* Dù speech lỗi,vẫn tiếp tục game sau 300ms.*/
            setTimeout(
                /*###callback,*/
                finish,
                300
            );
        };

   /*Bắt đầu đọc.*/
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
