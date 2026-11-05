
import {
    initLobby,
    selectBattleMode,
    resetLobbyConfig
} from "./lobby.js";

import {
    initHome,
    showHome,
    showConfiguration,
    updateHomePlayer,
    updateHomeReviewCount
} from "./home.js";

import {
    startGame
}
from "./game.js";

import {
    initPvp,
    closePvpSocial
} from "./pvp.js";

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
    closeFlashcard,
    resumeFlashcardFromQuiz
} from "./flashcard.js";


import {
    openProfile,
    closeProfile
}
from "./profile.js";

import {
    initMascot,
    ensureMascotSelected,
    cancelMascotFlow
} from "./mascot.js";

import {
    initMascotEvolution,
    openMascotEvolution,
    closeMascotEvolution,
    syncMascotEvolution
} from "./mascot-evolution.js";

import {getReviewCount} from "./user.js";

import { startReview } from "./review.js";

import "./info.js";
import { initRank, openRank } from "./rank.js";

import {
    initLeaderboard,
    openLeaderboard
} from "./leaderboard.js";

/* ==========================================
   FRIENDS SYSTEM
========================================== */

import {
    initFriends,
    openFriends
} from "./friends.js";

import { initRankedGame } from "./ranked-game.js";

import { initJLPTExam } from "./jlpt-exam-ui.js";

/* =========================================
   I18N
========================================= */

initI18n();
initRank();
initRankedGame();
initMascot();
initMascotEvolution();

initJLPTExam();

initFriends();

// ==========================================
// QUICK ACCESS - LEADERBOARD
// ==========================================

initLeaderboard();

/* ==========================================
   HOME - OPEN FRIENDS
========================================== */

document.getElementById("batHomeFriends")
    ?.addEventListener("click", () => {

        console.log("[HOME] Open Friends");

        openFriends();
    });

const btnHomeLeaderboard =
    document.getElementById("batHomeLeaderboard");

if (btnHomeLeaderboard) {

    btnHomeLeaderboard.addEventListener("click", () => {

        console.log("[HOME] Open Leaderboard");

        openLeaderboard("level");

    });

}
/* =============================================================
   DOM
   ============================================================= */

const setupScreen =document.getElementById("setupScreen");

const pvpScreen =document.getElementById("pvpScreen");

const gameOverScreen =document.getElementById("gameOverScreen");

const homeLoginBtn =document.getElementById("homeLoginBtn");

const homeLanguage =document.getElementById("homeLanguage");

const authLanguage =document.getElementById("authLanguage");

const homeUserBtn =document.getElementById("homeUserBtn");

const homeUserMenu =document.getElementById("homeUserMenu");

const userMenuName =document.getElementById("userMenuName");

const userMenuEmail =document.getElementById("userMenuEmail");

const userMenuAvatar =document.getElementById("userMenuAvatar");

const logoutBtn =document.getElementById("logoutBtn");

const flashcardScreen =document.getElementById("flashcardScreen");

const userProfileBtn =document.getElementById("userProfileBtn");

const profileBackBtn =document.getElementById("profileBackBtn");

const reviewScreen = document.getElementById("reviewScreen");
const reviewBackButton = document.getElementById("reviewBackButton");

reviewBackButton?.addEventListener("click", () => {
    reviewScreen.classList.add("hidden");
    playLobbyMusic();
});

function setUILanguage(language) 
{
    homeLanguage.value = language;

    authLanguage.value = language;

    localStorage.setItem("batlingo_ui_language",language);

    /*
       Bước sau:

       I18n.setLanguage(language);
    */

}

homeLanguage.addEventListener("change",event => 
    {
        setUILanguage(event.target.value);
    }
);

authLanguage.addEventListener("change",event => 
    {
        setUILanguage(event.target.value);
    }
);

homeLoginBtn.addEventListener("click",() => 
    {
        BatLingoAuthUI.open();
    }
);


/* =============================================================
   LOBBY
   ============================================================= */

initLobby(
    {

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
    },
    onRank: config => {
        openRank(config, {
            back: () => {
                showHome();
                playLobbyMusic();
            }
        });
    }

}
);


/* ==========================================
   NEW HOME INITIALIZATION
========================================== */

initHome({

    onSelectMode: (modeId) => {

        // Reset study configuration
        resetLobbyConfig();

        // Keep original battle mode logic
        const selected = selectBattleMode(modeId);

        if (!selected) return;
        
        /* ==========================================
           1V1 - OPEN ONLINE LOBBY
        ========================================== */
        
        if (modeId === "pvp") {
        
            if (!auth.currentUser) {
        
                window.BatLingoAuthUI?.open();
        
                return;
            }
        
            setupScreen.classList.add("hidden");
        
            pvpScreen.classList.remove("hidden");
        
            initPvp({
        
                studyMode: "jlpt",
        
                target: "n5",
        
                category: "vocabulary",
        
                subMode: "kanji_meaning"
            });
        
            return;
        }
        
        /* OTHER MODES */
        
        showConfiguration(modeId);

    }

});


/* =============================================================
   PVP BACK
   ============================================================= */


document.getElementById("pvpBackButton")
    ?.addEventListener("click", async () => {

        await closePvpSocial();

        pvpScreen.classList.add("hidden");

        showHome();

        playLobbyMusic();
    });


/* =============================================================
   GAME OVER → LOBBY
   ============================================================= */


document.getElementById("backLobbyButton")
    .addEventListener("click", () => {

        gameOverScreen.classList.add("hidden");

        showHome();

        playLobbyMusic();
    });



/* =====================================================
   PRACTICE / FLASHCARD QUIZ RETURN
===================================================== */

window.addEventListener(
    "batlingo-practice-home",
    event => {

        document.getElementById("practiceResultScreen")
            ?.classList.add("hidden");

        document.getElementById("practiceReviewScreen")
            ?.classList.add("hidden");

        if (event.detail?.source === "flashcard") {

            const restored = resumeFlashcardFromQuiz();

            if (restored) {
                return;
            }
        }

        showHome();

        playLobbyMusic();
    }
);




/* =============================================================
   MENU
   ============================================================= */

const sideMenu =document.getElementById("sideMenu");

const menuOverlay =document.getElementById("menuOverlay");

function openMenu() 
{
    sideMenu.classList.add("show");

    menuOverlay.classList.add("show");
}


function closeMenu() 
{
    sideMenu.classList.remove("show");

    menuOverlay.classList.remove("show");
}


document.getElementById("menuButton").addEventListener("click",openMenu);

document.getElementById("menuCloseButton").addEventListener("click",closeMenu);

menuOverlay.addEventListener("click",closeMenu);

/* ==========================================
   OPEN MASCOT EVOLUTION
========================================== */

function handleOpenMascotEvolution() {

    // Login required
    if (!requireLogin()) return;

    // Close side menu
    closeMenu();

    // Close user menu
    homeUserMenu?.classList.add("hidden");

    // Open Mascot profile
    openMascotEvolution();
}

/* HOME MASCOT IMAGE */

document.getElementById("batHomeMascotBtn")
    ?.addEventListener(
        "click",
        handleOpenMascotEvolution
    );

/* SIDE MENU PET */

document.getElementById("menuPetBtn")
    ?.addEventListener(
        "click",
        handleOpenMascotEvolution
    );

/* =============================================================
   GLOBAL BUTTON CLICK SOUND

   Answer:
       correct / wrong sound

   Selector:
       slide sound

   Nên bỏ 2 loại trên.
   ============================================================= */

document.addEventListener("click",event => 
    {
        const button =event.target.closest("button");

        if (!button) 
        {
            return;
        }

        if (button.classList.contains("answer-button") || button.classList.contains("selector-arrow")) 
        {
            return;
        }
        playSfx("click");
    }
);

/* =============================================================
   START BGM

   Browser không cho autoplay nếu user
   chưa tương tác với trang.
   ============================================================= */

function enableAudio() 
{
    playLobbyMusic();

    document.removeEventListener("pointerdown",enableAudio);
}

document.addEventListener("pointerdown",enableAudio);

function handleBattleClick() 
{
    if (!window.currentUser) 
    {
        BatLingoAuthUI.open();
        return;
    }
    openLobby();
}

/* =========================================
   AUTH UI STATE
========================================= */

window.addEventListener("batlingo-auth-state",event => 
    {
        const {loggedIn,displayName,email,photoURL} = event.detail;

        
updateHomePlayer({
    displayName: loggedIn
        ? (displayName || email?.split("@")[0] || "PLAYER")
        : "PLAYER"
});
/* ==========================================
   UPDATE HOME LEVEL / EXP ON LOGIN
========================================== */

        if (loggedIn) 
        {
            updateHomePlayer(event.detail.userData);

            syncMascotEvolution(event.detail.userData);

            updateReviewBadge();

            /* Hide Login */

            homeLoginBtn?.classList.add("hidden");

            /* Show User */

            homeUserBtn?.classList.remove("hidden");

            /* Name */

            const userName =homeUserBtn?.querySelector(".home-user-name");

            if (userName) 
            {
                userName.textContent =displayName || email?.split("@")[0] || "User";
            }

            /* Avatar */

            const avatar =homeUserBtn?.querySelector(".home-user-avatar");

            const avatarFallback =homeUserBtn?.querySelector(".home-user-avatar-fallback");

           if (photoURL) 
           {
                avatar.src = photoURL;

                avatar.classList.remove("hidden");

                avatarFallback.classList.add("hidden");
            }
            else 
            {

                
                avatar.removeAttribute("src");

                avatar.classList.add("hidden");

                const name =displayName || email?.split("@")[0] ||"U";

                avatarFallback.textContent =name.charAt(0).toUpperCase();

                avatarFallback.classList.remove("hidden");
            }

            const displayUserName =displayName || email?.split("@")[0] ||"User";

            if (userMenuName) 
            {
                userMenuName.textContent =displayUserName;
            }

            if (userMenuEmail) 
            {
                userMenuEmail.textContent =email || "";
            }

            /* USER MENU AVATAR */

                if (userMenuAvatar) 
                {
                    if (photoURL) 
                    {
                        userMenuAvatar.innerHTML = "";

                        const img =document.createElement("img");

                        img.src = photoURL;
                        img.alt = "";

                        userMenuAvatar.appendChild(img);
                    }
                    else 
                    {
                        userMenuAvatar.textContent =displayUserName.charAt(0).toUpperCase();
                    }

                }


        }
        else 
        {
            ++reviewUpdateToken;

            homeLoginBtn?.classList.remove("hidden");
            homeUserBtn?.classList.add("hidden");

            updateHomeReviewCount(0);

            updateHomePlayer(null);

            if (!document.getElementById("mascotEvolutionScreen")
                    ?.classList.contains("hidden")) {
                closeMascotEvolution();
            }
        }

    }
);

/* =========================================
   USER MENU
========================================= */

homeUserBtn?.addEventListener("click",event => 
    {
        event.stopPropagation();
        
        homeUserMenu?.classList.toggle("hidden");
    }
);

document.addEventListener("click",event => 
    {
        if (homeUserMenu && !homeUserMenu.contains(event.target) && !homeUserBtn?.contains(event.target)) 
        {
            homeUserMenu.classList.add("hidden");
        }
    }
);

logoutBtn?.addEventListener("click",async () => 
    {
        homeUserMenu?.classList.add("hidden");

        await logout();
    }
);

/* =========================================
   AUTH GUARD
========================================= */

function requireLogin() 
{
    const user = auth.currentUser;

    if (!user || !user.emailVerified) 
    {
        window.BatLingoAuthUI?.open();

        return false;
    }

    return true;
}


window.addEventListener(
    "batlingo-flashcard-close",
    () => {

        flashcardScreen.classList.add("hidden");

        showHome();

        playLobbyMusic();
    }
);


userProfileBtn?.addEventListener("click",() => 
    {
        homeUserMenu?.classList.add("hidden");

        openProfile();
    }
);


profileBackBtn?.addEventListener("click",() => 
    {
        closeProfile();
    }
);

/* =========================================
   PROFILE UPDATED
========================================= */

window.addEventListener("batlingo-profile-updated",event => 
    {
        const {displayName} = event.detail;

        /* HOME USER NAME */

        const homeName =homeUserBtn?.querySelector(".home-user-name");

        if (homeName) 
        {
            homeName.textContent =displayName;
        }

        /* USER MENU */

        if (userMenuName) 
        {
            userMenuName.textContent =displayName;
        }

        /* FALLBACK AVATAR */
        const avatar =homeUserBtn?.querySelector(".home-user-avatar");

        const avatarFallback =homeUserBtn?.querySelector(".home-user-avatar-fallback");

        /*
            Nếu không có ảnh thì đổi chữ
            avatar theo tên mới.
        */

        if (avatarFallback && avatar?.classList.contains("hidden")) 
        {
            avatarFallback.textContent = displayName.charAt(0).toUpperCase();
        }
    }
);

/* =============================================================
   HOME - REVIEW QUICK ACCESS
   ============================================================= */

let reviewUpdateToken = 0;

/* =============================================================
   UPDATE REVIEW COUNT
   ============================================================= */

async function updateReviewBadge() {

    const token = ++reviewUpdateToken;

    // Không đăng nhập
    if (!auth.currentUser) {
        updateHomeReviewCount(0);
        return;
    }

    try {

        // Sử dụng dữ liệu Review hiện có
        const count = await getReviewCount();

        // Tránh kết quả Firebase cũ ghi đè
        if (token !== reviewUpdateToken) return;

        // Kiểm tra lại tài khoản sau await
        if (!auth.currentUser) {
            updateHomeReviewCount(0);
            return;
        }

        // Cập nhật bộ đếm Quick Access
        updateHomeReviewCount(count);

    }
    catch (error) {

        console.error(
            "[REVIEW] Count failed:",
            error
        );

        if (token === reviewUpdateToken) {
            updateHomeReviewCount(0);
        }
    }
}

/* =============================================================
   REVIEW DATA CHANGED
   ============================================================= */

window.addEventListener(
    "batlingo-review-changed",
    updateReviewBadge
);

/* =============================================================
   REVIEW QUICK ACCESS CLICK
   ============================================================= */

document.getElementById("batHomeReview")
    ?.addEventListener("click", async () => {

        if (!requireLogin()) return;

        try {

            const started = await startReview();

            if (!started) {

                console.log(
                    "[REVIEW] No questions to review."
                );

                updateReviewBadge();
            }

        }
        catch (error) {

            console.error(
                "[REVIEW] Start failed:",
                error
            );
        }
    }
);


/* ==========================================
   UPDATE HOME AFTER SOLO
========================================== */

window.addEventListener(
    "batlingo-progress-updated",
    event => {

        const userData = event.detail?.userData;

        if (!userData) return;

        updateHomePlayer(userData);

        syncMascotEvolution(userData);
    }
);

updateHomePlayer(window.currentUserData);

/* ==========================================
   MASCOT FIRST SELECTION COMPLETED
========================================== */

document.addEventListener(
    "batlingo:mascot-ready",
    event => {

        const mascot = event.detail?.mascot;

        if (!mascot) return;

        const userData = window.currentUserData;

        if (!userData) return;

        updateHomePlayer(userData);
        syncMascotEvolution(userData);
    }
);
