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

import {
    initI18n,
    t
} from "./i18n.js";

import "./auth.js";

/* =========================================
   I18N
========================================= */

initI18n();

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

const homeLoginBtn =
    document.getElementById(
        "homeLoginBtn"
    );

    const homeLanguage =
    document.getElementById(
        "homeLanguage"
    );

const authLanguage =
    document.getElementById(
        "authLanguage"
    );



function setUILanguage(language) {

    homeLanguage.value =
        language;

    authLanguage.value =
        language;


    localStorage.setItem(
        "batlingo_ui_language",
        language
    );


    /*
       Bước sau:

       I18n.setLanguage(language);
    */

}


homeLanguage.addEventListener(
    "change",
    event => {

        setUILanguage(
            event.target.value
        );

    }
);


authLanguage.addEventListener(
    "change",
    event => {

        setUILanguage(
            event.target.value
        );

    }
);

homeLoginBtn.addEventListener(
    "click",
    () => {

        BatLingoAuthUI.open();

    }
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

function handleBattleClick() {

    if (!window.currentUser) {

        BatLingoAuthUI.open();

        return;
    }


    openLobby();

}