import {
    initLobby
}
from "./lobby.js";


import {
    startGame
}
from "./game.js";


import {
    initPvp
}
from "./pvp.js";


import {
    playLobbyMusic,
    playSfx
}
from "./audio.js";


/* =============================================================
   DOM
   ============================================================= */

const setupScreen =
    document.getElementById(
        "setupScreen"
    );


const pvpScreen =
    document.getElementById(
        "pvpScreen"
    );


const gameOverScreen =
    document.getElementById(
        "gameOverScreen"
    );


/* =============================================================
   LOBBY
   ============================================================= */

initLobby({

    /* SOLO */

    onSolo: config => {

        setupScreen.classList.add(
            "hidden"
        );


        startGame(
            config
        );

    },


    /* 1 VS 1 */

    onPvp: config => {

        setupScreen.classList.add(
            "hidden"
        );


        pvpScreen.classList.remove(
            "hidden"
        );


        initPvp(
            config
        );

    }

});


/* =============================================================
   PVP BACK
   ============================================================= */

document
    .getElementById(
        "pvpBackButton"
    )
    .addEventListener(
        "click",
        () => {

            pvpScreen.classList.add(
                "hidden"
            );


            setupScreen.classList.remove(
                "hidden"
            );

        }
    );


/* =============================================================
   GAME OVER → LOBBY
   ============================================================= */

document
    .getElementById(
        "backLobbyButton"
    )
    .addEventListener(
        "click",
        () => {

            gameOverScreen.classList.add(
                "hidden"
            );


            setupScreen.classList.remove(
                "hidden"
            );


            playLobbyMusic();

        }
    );


/* =============================================================
   MENU
   ============================================================= */

const sideMenu =
    document.getElementById(
        "sideMenu"
    );


const menuOverlay =
    document.getElementById(
        "menuOverlay"
    );


function openMenu() {

    sideMenu.classList.add(
        "show"
    );


    menuOverlay.classList.add(
        "show"
    );
}


function closeMenu() {

    sideMenu.classList.remove(
        "show"
    );


    menuOverlay.classList.remove(
        "show"
    );
}


document
    .getElementById(
        "menuButton"
    )
    .addEventListener(
        "click",
        openMenu
    );


document
    .getElementById(
        "menuCloseButton"
    )
    .addEventListener(
        "click",
        closeMenu
    );


menuOverlay.addEventListener(
    "click",
    closeMenu
);


/* =============================================================
   GLOBAL BUTTON CLICK SOUND

   Answer:
       correct / wrong sound

   Selector:
       slide sound

   Nên bỏ 2 loại trên.
   ============================================================= */

document.addEventListener(
    "click",
    event => {

        const button =
            event.target.closest(
                "button"
            );


        if (!button) {
            return;
        }


        if (
            button.classList.contains(
                "answer-button"
            )
            ||
            button.classList.contains(
                "selector-arrow"
            )
        ) {

            return;
        }


        playSfx(
            "click"
        );

    }
);


/* =============================================================
   START BGM

   Browser không cho autoplay nếu user
   chưa tương tác với trang.
   ============================================================= */

function enableAudio() {

    playLobbyMusic();


    document.removeEventListener(
        "pointerdown",
        enableAudio
    );
}


document.addEventListener(
    "pointerdown",
    enableAudio
);