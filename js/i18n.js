/* =========================================================
   BATLINGO - i18n
   UI Language Manager
========================================================= */

const DEFAULT_LANGUAGE = "en";

const SUPPORTED_LANGUAGES = [
    "ja",
    "en",
    "zh",
    "vi"
];


/* =========================================================
   TRANSLATIONS
========================================================= */

const translations = {

    /* =========================
       JAPANESE
    ========================= */

    ja: {

        home: {
            login: "ログイン",

            battleMode: "バトルモード",
            studyMode: "学習モード",
            jlptLevel: "JLPT レベル",
            category: "カテゴリー",
            questionMode: "出題モード",

            battle: "バトル"
        },

        battleMode: {
            solo: "ソロバトル",
            pvp: "1 VS 1"
        },

        studyMode: {
            jlpt: "JLPT"
        },

        category: {
            vocabulary: "語彙",
            grammar: "文法"
        },

        menu: {
            title: "メニュー",
            profile: "プロフィール",
            pet: "ペット",
            settings: "設定",
            audio: "サウンド",
            language: "言語"
        },

        auth: {
            login: "ログイン",
            loginTitle: "おかえりなさい",
            loginDescription: "ログインしてバトルを続けましょう。",

            email: "メールアドレス",
            emailPlaceholder: "example@email.com",

            password: "パスワード",
            passwordPlaceholder: "パスワード",

            forgotPassword: "パスワードを忘れた場合",

            or: "または",

            google: "Googleで続ける",

            noAccount: "アカウントをお持ちでないですか？",
            signup: "新規登録",

            createAccount: "アカウント作成",
            signupDescription: "BatLingoアカウントを作成します。",

            confirmPassword: "パスワード確認",

            ruleLength: "8～64文字",
            ruleUpper: "大文字を1文字以上",
            ruleLower: "小文字を1文字以上",
            ruleNumber: "数字を1文字以上",

            haveAccount: "すでにアカウントをお持ちですか？",

            verifyTitle: "メールを確認してください",
            verifyDescription: "確認メールを送信しました：",
            verifyNote:
                "メール内のリンクをクリックしてからログインしてください。",

            backLogin: "ログインへ戻る"
        }
    },


    /* =========================
       ENGLISH
    ========================= */

    en: {

        home: {
            login: "Login",

            battleMode: "BATTLE MODE",
            studyMode: "STUDY MODE",
            jlptLevel: "JLPT LEVEL",
            category: "CATEGORY",
            questionMode: "QUESTION MODE",

            battle: "BATTLE"
        },

        battleMode: {
            solo: "SOLO BATTLE",
            pvp: "1 VS 1"
        },

        studyMode: {
            jlpt: "JLPT"
        },

        category: {
            vocabulary: "VOCABULARY",
            grammar: "GRAMMAR"
        },

        menu: {
            title: "MENU",
            profile: "PROFILE",
            pet: "PET",
            settings: "SETTINGS",
            audio: "AUDIO",
            language: "LANGUAGE"
        },

        auth: {
            login: "LOGIN",
            loginTitle: "Welcome back",
            loginDescription: "Sign in to continue your battle.",

            email: "Email",
            emailPlaceholder: "example@email.com",

            password: "Password",
            passwordPlaceholder: "Password",

            forgotPassword: "Forgot password?",

            or: "OR",

            google: "Continue with Google",

            noAccount: "Don't have an account?",
            signup: "Sign up",

            createAccount: "Create account",
            signupDescription: "Create your BatLingo account.",

            confirmPassword: "Confirm password",

            ruleLength: "8–64 characters",
            ruleUpper: "At least 1 uppercase letter",
            ruleLower: "At least 1 lowercase letter",
            ruleNumber: "At least 1 number",

            haveAccount: "Already have an account?",

            verifyTitle: "Check your email",
            verifyDescription: "We sent a verification link to:",
            verifyNote:
                "Open the email and click the verification link before logging in.",

            backLogin: "BACK TO LOGIN"
        }
    },


    /* =========================
       CHINESE
    ========================= */

    zh: {

        home: {
            login: "登录",

            battleMode: "对战模式",
            studyMode: "学习模式",
            jlptLevel: "JLPT 等级",
            category: "类别",
            questionMode: "答题模式",

            battle: "开始对战"
        },

        battleMode: {
            solo: "单人对战",
            pvp: "1 VS 1"
        },

        studyMode: {
            jlpt: "JLPT"
        },

        category: {
            vocabulary: "词汇",
            grammar: "语法"
        },

        menu: {
            title: "菜单",
            profile: "个人资料",
            pet: "宠物",
            settings: "设置",
            audio: "声音",
            language: "语言"
        },

        auth: {
            login: "登录",
            loginTitle: "欢迎回来",
            loginDescription: "登录后继续战斗。",

            email: "电子邮箱",
            emailPlaceholder: "example@email.com",

            password: "密码",
            passwordPlaceholder: "密码",

            forgotPassword: "忘记密码？",

            or: "或",

            google: "使用 Google 继续",

            noAccount: "还没有账号？",
            signup: "注册",

            createAccount: "创建账号",
            signupDescription: "创建你的 BatLingo 账号。",

            confirmPassword: "确认密码",

            ruleLength: "8–64 个字符",
            ruleUpper: "至少包含 1 个大写字母",
            ruleLower: "至少包含 1 个小写字母",
            ruleNumber: "至少包含 1 个数字",

            haveAccount: "已有账号？",

            verifyTitle: "请检查邮箱",
            verifyDescription: "验证邮件已发送至：",
            verifyNote:
                "请点击邮件中的验证链接，然后再登录。",

            backLogin: "返回登录"
        }
    },


    /* =========================
       VIETNAMESE
    ========================= */

    vi: {

        home: {
            login: "Đăng nhập",

            battleMode: "CHẾ ĐỘ ĐẤU",
            studyMode: "CHẾ ĐỘ HỌC",
            jlptLevel: "CẤP ĐỘ JLPT",
            category: "NỘI DUNG",
            questionMode: "DẠNG CÂU HỎI",

            battle: "BẮT ĐẦU"
        },

        battleMode: {
            solo: "ĐẤU SOLO",
            pvp: "1 VS 1"
        },

        studyMode: {
            jlpt: "JLPT"
        },

        category: {
            vocabulary: "TỪ VỰNG",
            grammar: "NGỮ PHÁP"
        },

        menu: {
            title: "MENU",
            profile: "HỒ SƠ",
            pet: "LINH VẬT",
            settings: "CÀI ĐẶT",
            audio: "ÂM THANH",
            language: "NGÔN NGỮ"
        },

        auth: {
            login: "ĐĂNG NHẬP",
            loginTitle: "Chào mừng trở lại",
            loginDescription: "Đăng nhập để tiếp tục trận đấu.",

            email: "Email",
            emailPlaceholder: "example@email.com",

            password: "Mật khẩu",
            passwordPlaceholder: "Mật khẩu",

            forgotPassword: "Quên mật khẩu?",

            or: "HOẶC",

            google: "Tiếp tục với Google",

            noAccount: "Chưa có tài khoản?",
            signup: "Đăng ký",

            createAccount: "Tạo tài khoản",
            signupDescription: "Tạo tài khoản BatLingo của bạn.",

            confirmPassword: "Xác nhận mật khẩu",

            ruleLength: "8–64 ký tự",
            ruleUpper: "Ít nhất 1 chữ hoa",
            ruleLower: "Ít nhất 1 chữ thường",
            ruleNumber: "Ít nhất 1 chữ số",

            haveAccount: "Đã có tài khoản?",

            verifyTitle: "Kiểm tra email",
            verifyDescription: "Đã gửi liên kết xác nhận đến:",
            verifyNote:
                "Mở email và nhấn vào liên kết xác nhận trước khi đăng nhập.",

            backLogin: "QUAY LẠI ĐĂNG NHẬP"
        }
    }
};


/* =========================================================
   CURRENT LANGUAGE
========================================================= */

let uiLanguage =
    localStorage.getItem("batlingo_ui_language")
    || DEFAULT_LANGUAGE;


/* Validate saved value */

if (!SUPPORTED_LANGUAGES.includes(uiLanguage)) {
    uiLanguage = DEFAULT_LANGUAGE;
}


/* =========================================================
   GET TRANSLATION
========================================================= */

export function t(key) {

    const parts = key.split(".");

    let value = translations[uiLanguage];

    for (const part of parts) {

        if (
            value === undefined ||
            value === null
        ) {
            return key;
        }

        value = value[part];
    }

    return value ?? key;
}


/* =========================================================
   APPLY LANGUAGE TO HTML
========================================================= */

export function applyLanguage() {

    document.documentElement.lang = uiLanguage;


    /* Normal text */

    document
        .querySelectorAll("[data-i18n]")
        .forEach(element => {

            const key =
                element.dataset.i18n;

            element.textContent =
                t(key);

        });


    /* Placeholder */

    document
        .querySelectorAll(
            "[data-i18n-placeholder]"
        )
        .forEach(element => {

            const key =
                element.dataset.i18nPlaceholder;

            element.placeholder =
                t(key);

        });


    /* Sync language selects */

    const homeLanguage =
        document.getElementById(
            "homeLanguage"
        );

    const authLanguage =
        document.getElementById(
            "authLanguage"
        );


    if (homeLanguage) {
        homeLanguage.value =
            uiLanguage;
    }

    if (authLanguage) {
        authLanguage.value =
            uiLanguage;
    }
}


/* =========================================================
   SET LANGUAGE
========================================================= */

export function setLanguage(language) {

    if (
        !SUPPORTED_LANGUAGES.includes(
            language
        )
    ) {
        return;
    }


    uiLanguage = language;


    localStorage.setItem(
        "batlingo_ui_language",
        language
    );


    applyLanguage();


    window.dispatchEvent(
        new CustomEvent(
            "batlingo-language-change",
            {
                detail: {
                    language
                }
            }
        )
    );
}


/* =========================================================
   GET CURRENT LANGUAGE
========================================================= */

export function getLanguage() {
    return uiLanguage;
}


/* =========================================================
   INIT
========================================================= */

export function initI18n() {

    const homeLanguage =
        document.getElementById(
            "homeLanguage"
        );

    const authLanguage =
        document.getElementById(
            "authLanguage"
        );


    homeLanguage?.addEventListener(
        "change",
        event => {

            setLanguage(
                event.target.value
            );

        }
    );


    authLanguage?.addEventListener(
        "change",
        event => {

            setLanguage(
                event.target.value
            );

        }
    );


    applyLanguage();
}