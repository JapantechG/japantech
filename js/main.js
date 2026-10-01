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

import {
    logout
} from "./auth.js";

import {
    auth
} from "./firebase.js";

import {
    initFlashcard,
    closeFlashcard
}
from "./flashcard.js";

import {
    openProfile,
    closeProfile
}
from "./profile.js";

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

const homeUserBtn =
    document.getElementById("homeUserBtn");

const homeUserMenu =
    document.getElementById("homeUserMenu");

const userMenuName =
    document.getElementById("userMenuName");

const userMenuEmail =
    document.getElementById("userMenuEmail");

const userMenuAvatar =
    document.getElementById("userMenuAvatar");

const logoutBtn =
    document.getElementById("logoutBtn");

const flashcardScreen =
    document.getElementById("flashcardScreen");

const userProfileBtn =
    document.getElementById(
        "userProfileBtn"
    );


const profileBackBtn =
    document.getElementById(
        "profileBackBtn"
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

    onSolo: config => 
    {
        setupScreen.classList.add("hidden");
        startGame(config);

    },


    /* 1 VS 1 */

    onPvp: config => 
    {
        setupScreen.classList.add("hidden");

        pvpScreen.classList.remove("hidden");

        initPvp(config);

    },

    /* =========================
       FLASHCARD
       ========================= */

    onFlashcard: config =>
    {
        console.log("[MAIN] Start Flashcard:",config);

        setupScreen.classList.add("hidden");

        flashcardScreen.classList.remove("hidden");

        initFlashcard(config);
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

/* =========================================
   AUTH UI STATE
========================================= */

window.addEventListener(
    "batlingo-auth-state",
    event => {

        const {
            loggedIn,
            displayName,
            email,
            photoURL
        } = event.detail;


        if (loggedIn) {

            /* Hide Login */

            homeLoginBtn?.classList.add(
                "hidden"
            );


            /* Show User */

            homeUserBtn?.classList.remove(
                "hidden"
            );


            /* Name */

            const userName =
                homeUserBtn?.querySelector(
                    ".home-user-name"
                );


            if (userName) {

                userName.textContent =
                    displayName ||
                    email?.split("@")[0] ||
                    "User";

            }


            /* Avatar */

                const avatar =
            homeUserBtn?.querySelector(
                ".home-user-avatar"
            );

            const avatarFallback =
            homeUserBtn?.querySelector(
                ".home-user-avatar-fallback"
            );



           if (photoURL) {

                            avatar.src = photoURL;

                            avatar.classList.remove(
                                "hidden"
                            );

                            avatarFallback.classList.add(
                                "hidden"
                            );

                        }
                        else {

                            avatar.removeAttribute("src");

                            avatar.classList.add(
                                "hidden"
                            );


                            const name =
                                displayName ||
                                email?.split("@")[0] ||
                                "U";


                            avatarFallback.textContent =
                                name.charAt(0).toUpperCase();

                            avatarFallback.classList.remove(
                                "hidden"
                            );

                        }



            const displayUserName =
            displayName ||
            email?.split("@")[0] ||
            "User";

            if (userMenuName) {

                    userMenuName.textContent =
                        displayUserName;

                }


                if (userMenuEmail) {

                    userMenuEmail.textContent =
                        email || "";

                }

            /* USER MENU AVATAR */

                if (userMenuAvatar) {

                    if (photoURL) {

                        userMenuAvatar.innerHTML = "";

                        const img =
                            document.createElement("img");

                        img.src = photoURL;
                        img.alt = "";

                        userMenuAvatar.appendChild(img);

                    }
                    else {

                        userMenuAvatar.textContent =
                            displayUserName
                                .charAt(0)
                                .toUpperCase();

                    }

                }


        }
        else {

            homeLoginBtn?.classList.remove(
                "hidden"
            );


            homeUserBtn?.classList.add(
                "hidden"
            );

        }

    }
);

/* =========================================
   USER MENU
========================================= */

homeUserBtn?.addEventListener(
    "click",
    event => {

        event.stopPropagation();

        homeUserMenu?.classList.toggle(
            "hidden"
        );

    }
);

document.addEventListener(
    "click",
    event => {

        if (
            homeUserMenu &&
            !homeUserMenu.contains(event.target) &&
            !homeUserBtn?.contains(event.target)
        ) {

            homeUserMenu.classList.add(
                "hidden"
            );

        }

    }
);

logoutBtn?.addEventListener(
    "click",
    async () => {

        homeUserMenu?.classList.add(
            "hidden"
        );

        await logout();

    }
);

/* =========================================
   AUTH GUARD
========================================= */

function requireLogin() {

    const user = auth.currentUser;


    if (
        !user ||
        !user.emailVerified
    ) {

        window.BatLingoAuthUI?.open();

        return false;

    }


    return true;
}

window.addEventListener("batlingo-flashcard-close",() =>
    {
        flashcardScreen.classList.add(
            "hidden"
        );


        setupScreen.classList.remove(
            "hidden"
        );


        playLobbyMusic();
    }
);

userProfileBtn?.addEventListener(
    "click",
    () => {

        homeUserMenu?.classList.add(
            "hidden"
        );


        openProfile();

    }
);


profileBackBtn?.addEventListener(
    "click",
    () => {

        closeProfile();

    }
);

/* =========================================
   PROFILE UPDATED
========================================= */

window.addEventListener(
    "batlingo-profile-updated",

    event => {

        const {
            displayName
        } = event.detail;


        /* HOME USER NAME */

        const homeName =
            homeUserBtn?.querySelector(
                ".home-user-name"
            );


        if (homeName) {

            homeName.textContent =
                displayName;
        }


        /* USER MENU */

        if (userMenuName) {

            userMenuName.textContent =
                displayName;
        }


        /* FALLBACK AVATAR */

        const avatar =
            homeUserBtn?.querySelector(
                ".home-user-avatar"
            );


        const avatarFallback =
            homeUserBtn?.querySelector(
                ".home-user-avatar-fallback"
            );


        /*
            Nếu không có ảnh thì đổi chữ
            avatar theo tên mới.
        */

        if (
            avatarFallback &&
            avatar?.classList.contains(
                "hidden"
            )
        ) {

            avatarFallback.textContent =
                displayName
                    .charAt(0)
                    .toUpperCase();
        }

    }
);
