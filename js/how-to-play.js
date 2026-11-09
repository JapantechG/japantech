
/* =========================================================
   BATLINGO - HOW TO PLAY
   8 SLIDES / FIRST VISIT / RESPONSIVE
========================================================= */

import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

const STORAGE_KEY = "batlingo_how_to_play_seen_v1";
const IMAGE_PATH = "assets/how-to-play/";

const $ = id => document.getElementById(id);

let currentSlide = 0;
let isOpen = false;
let initialized = false;
let authReady = false;
let previousFocus = null;

/* =========================================================
   CONTENT - VIETNAMESE
========================================================= */

const slidesVI = [

    {
        id: "welcome",
        icon: "🎌",
        tag: "WELCOME",
        title: "Chào mừng đến BatLingo",
        subtitle: "Học tiếng Nhật qua trò chơi, luyện tập và thi đấu.",

        points: [
            "Học theo cấp độ JLPT N5–N1 hoặc các chủ đề quen thuộc.",
            "Luyện từ vựng, Kanji, cách đọc Hiragana, ngữ pháp và nghe.",
            "Chơi một mình, thi đấu với bạn bè hoặc tham gia Ranked.",
            "Theo dõi tiến độ, phát triển mascot và chinh phục bảng xếp hạng."
        ],

        tip: "Chọn chế độ học phù hợp với trình độ và mục tiêu của bạn."
    },

    {
        id: "solo",
        icon: "⚔️",
        tag: "SOLO BATTLE",
        title: "Solo Battle",
        subtitle: "Luyện phản xạ và ghi nhớ từ vựng một mình.",

        points: [
            "SURVIVAL: Bắt đầu với 3 mạng. Trả lời sai hoặc hết giờ sẽ mất mạng.",
            "SURVIVAL: Cố gắng sống sót, tích điểm và duy trì combo.",
            "PRACTICE: Chọn 10, 20, 50 hoặc tự chọn tối đa 100 câu hỏi.",
            "PRACTICE: Điều chỉnh thời gian từ 8 đến 20 giây mỗi câu.",
            "Xem kết quả và độ chính xác sau khi hoàn thành.",
            "Survival tích EXP để tăng Level; Practice không cộng EXP."
        ],

        tip: "Người mới nên bắt đầu bằng Practice, sau đó thử Survival."
    },

    {
        id: "flashcard",
        icon: "🃏",
        tag: "FLASHCARD",
        title: "Học từ vựng với Flashcard",
        subtitle: "Ghi nhớ từ vựng theo tốc độ học của riêng bạn.",

        points: [
            "Lật thẻ để xem từ tiếng Nhật, cách đọc Hiragana và nghĩa.",
            "Luyện Kanji → Nghĩa hoặc Kanji → Hiragana.",
            "Luyện Nghĩa → Kanji để tăng khả năng ghi nhớ.",
            "Luyện nghe bằng Audio → Nghĩa, Hiragana hoặc Kanji.",
            "Kết hợp Flashcard với Quiz để kiểm tra kiến thức."
        ],

        tip: "Flashcard phù hợp để học từ mới trước khi tham gia Battle."
    },

    {
        id: "jlpt",
        icon: "📚",
        tag: "JLPT EXAM",
        title: "Luyện thi JLPT",
        subtitle: "Ôn luyện theo từng phần của đề thi JLPT.",

        points: [
            "Chọn trình độ JLPT từ N5 đến N1.",
            "Chọn bộ đề và từng Mondai theo nội dung được hỗ trợ.",
            "PRACTICE: Luyện tập riêng từng phần hoặc nhóm câu hỏi.",
            "TEST: Làm bài theo chế độ kiểm tra, có thể chuyển giữa các câu.",
            "Xác nhận trước khi nộp bài và xem kết quả.",
            "Review lại đáp án đúng, sai và nội dung đã học."
        ],

        tip: "Các bộ đề và Mondai khả dụng phụ thuộc vào dữ liệu đã được cập nhật."
    },

    {
        id: "friends",
        icon: "🤝",
        tag: "1 VS 1 & FRIENDS",
        title: "Kết nối và đấu với bạn bè",
        subtitle: "Cùng học tiếng Nhật thông qua những trận đấu thời gian thực.",

        points: [
            "Tạo phòng PUBLIC để người khác có thể tìm thấy.",
            "Tạo phòng PRIVATE và mời bạn bè bằng mã phòng.",
            "Tham gia phòng bằng Room Code hoặc tìm phòng công khai.",
            "Tùy chỉnh trình độ JLPT, chủ đề và dạng câu hỏi.",
            "Thi đấu 1V1, trả lời trong thời gian giới hạn.",
            "Kết bạn, quản lý lời mời và kết nối với người chơi khác."
        ],

        tip: "Cần đăng nhập để sử dụng PvP và hệ thống bạn bè."
    },

    {
        id: "ranked",
        icon: "🏆",
        tag: "RANKED BATTLE",
        title: "Thi đấu xếp hạng",
        subtitle: "Thử thách bản thân và cạnh tranh bằng điểm ELO.",

        points: [
            "Chọn trình độ và cấu hình thi đấu được hỗ trợ.",
            "Hệ thống tìm đối thủ phù hợp với cấu hình và mức ELO.",
            "Chấp nhận trận đấu khi tìm thấy đối thủ.",
            "Mỗi trận gồm 20 câu hỏi, giới hạn 10 giây mỗi câu.",
            "Điểm số, combo và thời gian trả lời ảnh hưởng thành tích.",
            "Thắng để tăng ELO, theo dõi Rank và tỷ lệ chiến thắng."
        ],

        tip: "Ranked yêu cầu tài khoản. ELO có thể tăng hoặc giảm theo kết quả trận."
    },

    {
        id: "progress",
        icon: "🐃",
        tag: "PROGRESS & MASCOT",
        title: "Level, Mascot và thành tích",
        subtitle: "Biến hành trình học tiếng Nhật thành một cuộc phiêu lưu.",

        points: [
            "Nhận EXP từ Solo Survival để tăng Level.",
            "Chọn mascot Buffalo hoặc Monkey đồng hành cùng bạn.",
            "Phát triển mascot qua 5 giai đoạn tiến hóa.",
            "Mỗi mascot có kỹ năng hỗ trợ riêng trong Solo Survival.",
            "Theo dõi bảng xếp hạng Level, Pet và Ranked.",
            "Xem lại các câu đã trả lời sai bằng tính năng Review."
        ],

        tip: "Tạo tài khoản để lưu tiến độ và theo dõi hành trình học lâu dài."
    },

    {
        id: "account",
        icon: "🌟",
        tag: "CREATE ACCOUNT",
        title: "Sẵn sàng bắt đầu?",
        subtitle: "Tạo tài khoản miễn phí để trải nghiệm đầy đủ BatLingo.",

        points: [
            "Lưu tiến độ học tập, EXP và Level.",
            "Lưu Mascot cùng các giai đoạn tiến hóa.",
            "Tham gia PvP và Ranked Battle.",
            "Kết nối bạn bè và tham gia cộng đồng.",
            "Xem bảng xếp hạng và theo dõi thành tích.",
            "Tiếp tục hành trình học ở những lần đăng nhập sau."
        ],

        tip: "Bạn cũng có thể bỏ qua và khám phá trang chủ trước."
    }

];

/* =========================================================
   ENGLISH CONTENT
========================================================= */

const slidesEN = [

    {
        id: "welcome",
        icon: "🎌",
        tag: "WELCOME",
        title: "Welcome to BatLingo",
        subtitle: "Learn Japanese through games, practice and competition.",
        points: [
            "Study JLPT N5–N1 or everyday vocabulary topics.",
            "Practice kanji, hiragana readings, grammar and listening.",
            "Play Solo, challenge friends or compete in Ranked.",
            "Track your progress, grow mascots and climb leaderboards."
        ],
        tip: "Choose the learning mode that matches your goals."
    },

    {
        id: "solo",
        icon: "⚔️",
        tag: "SOLO BATTLE",
        title: "Solo Battle",
        subtitle: "Train your Japanese reflexes and vocabulary.",
        points: [
            "SURVIVAL: Start with 3 hearts. Wrong or missed answers cost a heart.",
            "SURVIVAL: Survive longer, earn points and build combos.",
            "PRACTICE: Choose 10, 20, 50 or up to 100 custom questions.",
            "PRACTICE: Set 8–20 seconds per question.",
            "Review your results and accuracy.",
            "Earn EXP in Survival. Practice does not award EXP."
        ],
        tip: "New players should try Practice before Survival."
    },

    {
        id: "flashcard",
        icon: "🃏",
        tag: "FLASHCARD",
        title: "Learn with Flashcards",
        subtitle: "Memorize Japanese vocabulary at your own pace.",
        points: [
            "Flip cards to reveal Japanese words, readings and meanings.",
            "Practice Kanji → Meaning or Kanji → Hiragana.",
            "Practice Meaning → Kanji.",
            "Train listening with Audio → Meaning, Hiragana or Kanji.",
            "Reinforce your knowledge with Flashcard quizzes."
        ],
        tip: "Flashcards help you prepare before joining battles."
    },

    {
        id: "jlpt",
        icon: "📚",
        tag: "JLPT EXAM",
        title: "JLPT Exam Practice",
        subtitle: "Prepare for Japanese language proficiency tests.",
        points: [
            "Choose your JLPT level from N5 to N1.",
            "Select an available exam set or Mondai section.",
            "PRACTICE: Focus on individual sections.",
            "TEST: Take an exam-style quiz and navigate questions.",
            "Confirm before submitting your answers.",
            "Review correct and incorrect answers afterward."
        ],
        tip: "Available content depends on the exam question database."
    },

    {
        id: "friends",
        icon: "🤝",
        tag: "1 VS 1 & FRIENDS",
        title: "Play with Friends",
        subtitle: "Challenge your friends in real-time battles.",
        points: [
            "Create PUBLIC rooms for other players to discover.",
            "Create PRIVATE rooms and share the room code.",
            "Join by room code or browse public rooms.",
            "Customize JLPT level, topic and question mode.",
            "Compete in timed 1V1 battles.",
            "Make friends and manage invitations."
        ],
        tip: "Sign-in is required for PvP and Friends."
    },

    {
        id: "ranked",
        icon: "🏆",
        tag: "RANKED BATTLE",
        title: "Ranked Battle",
        subtitle: "Challenge opponents and increase your ELO.",
        points: [
            "Choose a supported battle configuration.",
            "Find opponents with compatible settings and ELO.",
            "Accept a match when an opponent is found.",
            "Answer 20 questions with a 10-second time limit each.",
            "Score, combos and response time affect performance.",
            "Earn ELO by winning and track your ranking."
        ],
        tip: "Ranked requires an account. ELO can increase or decrease."
    },

    {
        id: "progress",
        icon: "🐃",
        tag: "PROGRESS & MASCOT",
        title: "Progress & Mascot",
        subtitle: "Turn your learning journey into an adventure.",
        points: [
            "Earn EXP from Solo Survival and level up.",
            "Choose Buffalo or Monkey as your mascot.",
            "Unlock five mascot evolution stages.",
            "Each mascot offers special Solo Survival abilities.",
            "Compare Level, Pet and Rank leaderboards.",
            "Review saved incorrect answers."
        ],
        tip: "Create an account to save your long-term progress."
    },

    {
        id: "account",
        icon: "🌟",
        tag: "CREATE ACCOUNT",
        title: "Ready to Begin?",
        subtitle: "Create a free account to unlock BatLingo.",
        points: [
            "Save your learning progress, EXP and Level.",
            "Keep your mascot and evolution stages.",
            "Join PvP and Ranked battles.",
            "Connect with friends and other learners.",
            "Track rankings and achievements.",
            "Continue your learning journey anytime."
        ],
        tip: "You can also skip and explore the home screen first."
    }

];

/* =========================================================
   LANGUAGE
========================================================= */

const UI_TEXT = {

    vi: {
        heading: "HƯỚNG DẪN CHƠI",
        skip: "BỎ QUA",
        back: "QUAY LẠI",
        next: "TIẾP THEO",
        explore: "KHÁM PHÁ BATLINGO",
        signup: "TẠO TÀI KHOẢN",
        image: "Ảnh minh họa sẽ được cập nhật",
        step: "TRANG"
    },

    en: {
        heading: "HOW TO PLAY",
        skip: "SKIP",
        back: "BACK",
        next: "NEXT",
        explore: "EXPLORE BATLINGO",
        signup: "CREATE FREE ACCOUNT",
        image: "Illustration coming soon",
        step: "STEP"
    }

};

function getLanguage() {

    let language = $("homeLanguage")?.value;

    if (!language) {
        try {
            language = localStorage.getItem("batlingo_ui_language");
        } catch (_) {}
    }

    return language === "vi" ? "vi" : "en";
}

function getSlides() {
    return getLanguage() === "vi" ? slidesVI : slidesEN;
}

function getText() {
    return UI_TEXT[getLanguage()];
}

/* =========================================================
   HELPERS
========================================================= */

function createElement(tag, className = "", text = null) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== null) {
        element.textContent = text;
    }

    return element;
}

function createButton(text, className, callback) {

    const button = createElement("button", className, text);

    button.type = "button";
    button.addEventListener("click", callback);

    return button;
}

function hasSeenGuide() {

    try {
        return localStorage.getItem(STORAGE_KEY) === "1";
    } catch (_) {
        return true;
    }
}

function markGuideSeen() {

    try {
        localStorage.setItem(STORAGE_KEY, "1");
    } catch (_) {}

}

/* =========================================================
   CLOSE
========================================================= */

export function closeHowToPlay() {

    const overlay = $("howToPlayOverlay");

    if (!overlay) return;

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("htp-open");

    isOpen = false;

    markGuideSeen();

    if (previousFocus instanceof HTMLElement &&
        previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
    }

}

/* =========================================================
   OPEN
========================================================= */

export function openHowToPlay() {

    const overlay = $("howToPlayOverlay");

    if (!overlay) return;

    currentSlide = 0;

    previousFocus = document.activeElement;

    // Close side menu if it is open
    document.querySelector(".side-menu")
        ?.classList.remove("show");

    document.querySelector(".menu-overlay")
        ?.classList.remove("show");

    overlay.classList.remove("hidden");

    overlay.setAttribute("aria-hidden", "false");

    document.body.classList.add("htp-open");

    isOpen = true;

    renderHowToPlay();

}

/* =========================================================
   SIGN UP
========================================================= */

function openCreateAccount() {

    closeHowToPlay();

    if (auth.currentUser) return;

    const authUI = window.BatLingoAuthUI;

    if (!authUI?.open) {
        console.warn("[HOW TO PLAY] Auth UI unavailable");
        return;
    }

    authUI.open();

    // Use existing sign-up switch when available.
    requestAnimationFrame(() => {
        $("openSignupBtn")?.click();
    });

}

/* =========================================================
   IMAGE
========================================================= */

function createImageArea(slide, text) {

    const container = createElement("div", "htp-media");

    const image = createElement("img", "htp-image");

    image.alt = slide.title;
    image.decoding = "async";
    image.loading = "lazy";

    const placeholder = createElement(
        "div",
        "htp-image-placeholder"
    );

    placeholder.append(
        createElement(
            "div",
            "htp-placeholder-icon",
            slide.icon
        )
    );

    placeholder.append(
        createElement("strong", "", slide.tag)
    );

    placeholder.append(
        createElement("span", "", text.image)
    );

    const path = IMAGE_PATH + slide.id + ".webp";

    placeholder.append(
        createElement("code", "htp-image-path", path)
    );

    image.addEventListener("load", () => {

        image.classList.add("ready");
        placeholder.classList.add("hidden");

    });

    image.addEventListener("error", () => {

        image.classList.remove("ready");
        placeholder.classList.remove("hidden");

    });

    container.append(image, placeholder);

    image.src = path;

    return container;
}

/* =========================================================
   RENDER SLIDE
========================================================= */

function renderHowToPlay() {

    const overlay = $("howToPlayOverlay");

    if (!overlay) return;

    const slides = getSlides();
    const text = getText();
    const slide = slides[currentSlide];

    overlay.replaceChildren();

    const panel = createElement("section", "htp-panel");

    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", text.heading);

    /* HEADER */

    const header = createElement("header", "htp-header");

    const brand = createElement(
        "div",
        "htp-brand",
        "BATLINGO"
    );

    const heading = createElement(
        "div",
        "htp-header-label",
        text.heading
    );

    const skipButton = createButton(
        text.skip + " ✕",
        "htp-skip",
        closeHowToPlay
    );

    header.append(brand, heading, skipButton);

    /* PROGRESS */

    const progress = createElement("div", "htp-progress");

    slides.forEach((item, index) => {

        const button = createButton(
            "",
            "htp-progress-step" +
                (index <= currentSlide ? " is-done" : ""),
            () => {
                currentSlide = index;
                renderHowToPlay();
            }
        );

        button.setAttribute(
            "aria-label",
            `${text.step} ${index + 1}`
        );

        progress.append(button);
    });

    /* CONTENT */

    const content = createElement("main", "htp-content");
    const copy = createElement("div", "htp-copy");

    const tag = createElement(
        "span",
        "htp-tag",
        slide.tag
    );

    const title = createElement(
        "h2",
        "htp-title",
        slide.title
    );

    const subtitle = createElement(
        "p",
        "htp-subtitle",
        slide.subtitle
    );

    copy.append(tag, title, subtitle);

    const list = createElement("ul", "htp-list");

    slide.points.forEach(point => {

        const item = createElement("li");

        const check = createElement(
            "span",
            "htp-check",
            "✓"
        );

        const label = createElement(
            "span",
            "htp-point",
            point
        );

        item.append(check, label);
        list.append(item);

    });

    copy.append(list);

    const tip = createElement(
        "p",
        "htp-tip",
        "✦ " + slide.tip
    );

    copy.append(tip);

    const media = createImageArea(slide, text);

    content.append(copy, media);

    /* FOOTER */

    const footer = createElement("footer", "htp-footer");

    const counter = createElement(
        "span",
        "htp-counter",
        `${text.step} ${currentSlide + 1} / ${slides.length}`
    );

    const actions = createElement("div", "htp-actions");

    if (currentSlide > 0) {

        actions.append(
            createButton(
                "← " + text.back,
                "htp-btn htp-secondary",
                () => {
                    currentSlide--;
                    renderHowToPlay();
                }
            )
        );

    }

    if (currentSlide < slides.length - 1) {

        actions.append(
            createButton(
                text.next + " →",
                "htp-btn htp-primary",
                () => {
                    currentSlide++;
                    renderHowToPlay();
                }
            )
        );

    } else {

        actions.append(
            createButton(
                text.explore,
                "htp-btn htp-secondary",
                closeHowToPlay
            )
        );

        if (!auth.currentUser) {

            actions.append(
                createButton(
                    text.signup + " →",
                    "htp-btn htp-primary",
                    openCreateAccount
                )
            );

        }
    }

    footer.append(counter, actions);

    panel.append(
        header,
        progress,
        content,
        footer
    );

    overlay.append(panel);

    skipButton.focus({ preventScroll: true });
}

/* =========================================================
   INITIALIZATION
========================================================= */

function initHowToPlay() {

    if (initialized) return;

    initialized = true;

    const overlay = createElement(
        "div",
        "htp-overlay hidden"
    );

    overlay.id = "howToPlayOverlay";
    overlay.setAttribute("aria-hidden", "true");

    document.body.append(overlay);

    /* MENU BUTTON */

    $("menuHowToPlayBtn")?.addEventListener(
        "click",
        openHowToPlay
    );

    /* OPTIONAL BUTTONS */

    document.addEventListener("click", event => {

        if (event.target.closest("[data-open-how-to-play]")) {
            openHowToPlay();
        }

    });

    /* KEYBOARD */

    document.addEventListener("keydown", event => {

        if (!isOpen) return;

        if (event.key === "Escape") {
            event.preventDefault();
            closeHowToPlay();
            return;
        }

        if (event.key === "ArrowRight" &&
            currentSlide < getSlides().length - 1) {

            currentSlide++;
            renderHowToPlay();
        }

        if (event.key === "ArrowLeft" &&
            currentSlide > 0) {

            currentSlide--;
            renderHowToPlay();
        }

        /* Keep keyboard focus inside modal */

        if (event.key === "Tab") {

            const buttons = Array.from(
                overlay.querySelectorAll(
                    "button:not(:disabled)"
                )
            );

            if (!buttons.length) return;

            const first = buttons[0];
            const last = buttons[buttons.length - 1];

            if (event.shiftKey &&
                document.activeElement === first) {

                event.preventDefault();
                last.focus();

            } else if (!event.shiftKey &&
                document.activeElement === last) {

                event.preventDefault();
                first.focus();
            }
        }

    });

    /* CHANGE LANGUAGE */

    $("homeLanguage")?.addEventListener("change", () => {

        if (isOpen) {
            renderHowToPlay();
        }

    });

    /* FIRST VISIT */

    onAuthStateChanged(auth, user => {

        if (authReady) return;

        authReady = true;

        if (!user && !hasSeenGuide()) {
            openHowToPlay();
        }

    });

}

/* =========================================================
   START
========================================================= */

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initHowToPlay,
        { once: true }
    );

} else {

    initHowToPlay();

}
