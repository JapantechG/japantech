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
        },
          common: {
          back: "戻る",
          save: "保存",
          cancel: "キャンセル",
          confirm: "確認",
          continue: "続ける",
          close: "閉じる",
          retry: "もう一度",
          loading: "読み込み中...",
          saving: "保存中...",
          yes: "はい",
          no: "いいえ"
         },
      
      profile: {
          title: "プロフィール",
          level: "レベル",
          exp: "EXP",
          rank: "ランク",
          elo: "ELO",
          battles: "バトル",
          wins: "勝利",
          losses: "敗北",
          draws: "引き分け",
          winRate: "勝率",
          bestCombo: "ベストコンボ",
          bestScore: "ベストスコア",
          displayName: "表示名",
          displayNameHint: "公開プレイヤー名",
          bio: "自己紹介",
          email: "メールアドレス",
          batlingoId: "BATLINGO ID",
          save: "プロフィールを保存",
          saved: "プロフィールを保存しました"
      },
      
      game: {
          question: "問題",
          score: "スコア",
          best: "ベスト",
          combo: "コンボ",
          lives: "ライフ",
          vocabulary: "語彙",
          grammar: "文法",
          listening: "聴解",
          reading: "読解",
          correct: "正解",
          wrong: "不正解",
          timeUp: "時間切れ"
      },
      
      gameOver: {
          title: "ゲーム終了",
          finalScore: "スコア",
          questions: "問題数",
          bestCombo: "ベストコンボ",
          bestScore: "ベストスコア",
          expGained: "獲得EXP",
          retry: "もう一度",
          home: "ホームへ"
      },
      
      pvp: {
          title: "1 VS 1",
          createRoom: "ルーム作成",
          joinRoom: "ルーム参加",
          roomCode: "ルームコード",
          enterRoomCode: "ルームコードを入力",
          waitingOpponent: "対戦相手を待っています...",
          opponentJoined: "対戦相手が参加しました",
          startBattle: "バトル開始",
          you: "あなた",
          opponent: "相手",
          rematch: "再戦",
          leaveRoom: "ルームを退出"
      },
      
      flashcard: {
          title: "フラッシュカード",
          study: "学習",
          review: "復習",
          known: "覚えた",
          unknown: "まだ",
          again: "もう一度",
          learned: "習得済み",
          remaining: "残り"
      },
      
      rank: {
          title: "ランクバトル",
          rank: "ランク",
          elo: "ELO",
          peakElo: "最高ELO",
          season: "シーズン",
          findMatch: "対戦相手を探す",
          searching: "検索中..."
      },
      
      result: {
          victory: "勝利",
          defeat: "敗北",
          draw: "引き分け",
          expGained: "獲得EXP",
          levelUp: "レベルアップ！"
      },
      
      error: {
          generic: "エラーが発生しました。",
          network: "ネットワークエラーが発生しました。",
          saveFailed: "保存できませんでした。",
          roomNotFound: "ルームが見つかりません。",
          roomFull: "ルームは満員です。"
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
        },
       common: {
    back: "BACK",
    save: "SAVE",
    cancel: "CANCEL",
    confirm: "CONFIRM",
    continue: "CONTINUE",
    close: "CLOSE",
    retry: "RETRY",
    loading: "Loading...",
    saving: "Saving...",
    yes: "YES",
    no: "NO"
},

profile: {
    title: "PROFILE",
    level: "LEVEL",
    exp: "EXP",
    rank: "RANK",
    elo: "ELO",
    battles: "BATTLES",
    wins: "WINS",
    losses: "LOSSES",
    draws: "DRAWS",
    winRate: "WIN RATE",
    bestCombo: "BEST COMBO",
    bestScore: "BEST SCORE",
    displayName: "DISPLAY NAME",
    displayNameHint: "Your public player name",
    bio: "BIO",
    email: "EMAIL",
    batlingoId: "BATLINGO ID",
    save: "SAVE PROFILE",
    saved: "Profile saved."
},

game: {
    question: "QUESTION",
    score: "SCORE",
    best: "BEST",
    combo: "COMBO",
    lives: "LIVES",
    vocabulary: "VOCABULARY",
    grammar: "GRAMMAR",
    listening: "LISTENING",
    reading: "READING",
    correct: "CORRECT",
    wrong: "WRONG",
    timeUp: "TIME UP"
},

gameOver: {
    title: "GAME OVER",
    finalScore: "SCORE",
    questions: "QUESTIONS",
    bestCombo: "BEST COMBO",
    bestScore: "BEST SCORE",
    expGained: "EXP GAINED",
    retry: "RETRY",
    home: "HOME"
},

pvp: {
    title: "1 VS 1",
    createRoom: "CREATE ROOM",
    joinRoom: "JOIN ROOM",
    roomCode: "ROOM CODE",
    enterRoomCode: "Enter room code",
    waitingOpponent: "Waiting for opponent...",
    opponentJoined: "Opponent joined",
    startBattle: "START BATTLE",
    you: "YOU",
    opponent: "OPPONENT",
    rematch: "REMATCH",
    leaveRoom: "LEAVE ROOM"
},

flashcard: {
    title: "FLASHCARD",
    study: "STUDY",
    review: "REVIEW",
    known: "KNOWN",
    unknown: "DON'T KNOW",
    again: "AGAIN",
    learned: "LEARNED",
    remaining: "REMAINING"
},

rank: {
    title: "RANK BATTLE",
    rank: "RANK",
    elo: "ELO",
    peakElo: "PEAK ELO",
    season: "SEASON",
    findMatch: "FIND MATCH",
    searching: "SEARCHING..."
},

result: {
    victory: "VICTORY",
    defeat: "DEFEAT",
    draw: "DRAW",
    expGained: "EXP GAINED",
    levelUp: "LEVEL UP!"
},

error: {
    generic: "Something went wrong.",
    network: "Network error.",
    saveFailed: "Could not save.",
    roomNotFound: "Room not found.",
    roomFull: "Room is full."
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
        },
       common: {
    back: "返回",
    save: "保存",
    cancel: "取消",
    confirm: "确认",
    continue: "继续",
    close: "关闭",
    retry: "再试一次",
    loading: "加载中...",
    saving: "保存中...",
    yes: "是",
    no: "否"
},

profile: {
    title: "个人资料",
    level: "等级",
    exp: "经验值",
    rank: "段位",
    elo: "ELO",
    battles: "对战",
    wins: "胜利",
    losses: "失败",
    draws: "平局",
    winRate: "胜率",
    bestCombo: "最高连击",
    bestScore: "最高分",
    displayName: "玩家名称",
    displayNameHint: "公开显示的玩家名称",
    bio: "简介",
    email: "电子邮箱",
    batlingoId: "BATLINGO ID",
    save: "保存个人资料",
    saved: "个人资料已保存"
},

game: {
    question: "问题",
    score: "分数",
    best: "最高分",
    combo: "连击",
    lives: "生命",
    vocabulary: "词汇",
    grammar: "语法",
    listening: "听力",
    reading: "阅读",
    correct: "正确",
    wrong: "错误",
    timeUp: "时间到"
},

gameOver: {
    title: "游戏结束",
    finalScore: "分数",
    questions: "题数",
    bestCombo: "最高连击",
    bestScore: "最高分",
    expGained: "获得经验值",
    retry: "再试一次",
    home: "主页"
},

pvp: {
    title: "1 VS 1",
    createRoom: "创建房间",
    joinRoom: "加入房间",
    roomCode: "房间代码",
    enterRoomCode: "输入房间代码",
    waitingOpponent: "等待对手...",
    opponentJoined: "对手已加入",
    startBattle: "开始对战",
    you: "你",
    opponent: "对手",
    rematch: "再战",
    leaveRoom: "离开房间"
},

flashcard: {
    title: "闪卡",
    study: "学习",
    review: "复习",
    known: "已掌握",
    unknown: "不会",
    again: "再来一次",
    learned: "已学习",
    remaining: "剩余"
},

rank: {
    title: "排位赛",
    rank: "段位",
    elo: "ELO",
    peakElo: "最高 ELO",
    season: "赛季",
    findMatch: "寻找对手",
    searching: "搜索中..."
},

result: {
    victory: "胜利",
    defeat: "失败",
    draw: "平局",
    expGained: "获得经验值",
    levelUp: "升级！"
},

error: {
    generic: "发生错误。",
    network: "网络错误。",
    saveFailed: "保存失败。",
    roomNotFound: "找不到房间。",
    roomFull: "房间已满。"
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
        },
       common: {
    back: "QUAY LẠI",
    save: "LƯU",
    cancel: "HỦY",
    confirm: "XÁC NHẬN",
    continue: "TIẾP TỤC",
    close: "ĐÓNG",
    retry: "CHƠI LẠI",
    loading: "Đang tải...",
    saving: "Đang lưu...",
    yes: "CÓ",
    no: "KHÔNG"
},

profile: {
    title: "HỒ SƠ",
    level: "CẤP ĐỘ",
    exp: "EXP",
    rank: "XẾP HẠNG",
    elo: "ELO",
    battles: "TRẬN ĐẤU",
    wins: "THẮNG",
    losses: "THUA",
    draws: "HÒA",
    winRate: "TỈ LỆ THẮNG",
    bestCombo: "COMBO CAO NHẤT",
    bestScore: "ĐIỂM CAO NHẤT",
    displayName: "TÊN HIỂN THỊ",
    displayNameHint: "Tên công khai của người chơi",
    bio: "GIỚI THIỆU",
    email: "EMAIL",
    batlingoId: "BATLINGO ID",
    save: "LƯU HỒ SƠ",
    saved: "Đã lưu hồ sơ."
},

game: {
    question: "CÂU HỎI",
    score: "ĐIỂM",
    best: "KỶ LỤC",
    combo: "COMBO",
    lives: "MẠNG",
    vocabulary: "TỪ VỰNG",
    grammar: "NGỮ PHÁP",
    listening: "NGHE",
    reading: "ĐỌC HIỂU",
    correct: "ĐÚNG",
    wrong: "SAI",
    timeUp: "HẾT GIỜ"
},

gameOver: {
    title: "KẾT THÚC",
    finalScore: "ĐIỂM",
    questions: "SỐ CÂU",
    bestCombo: "COMBO CAO NHẤT",
    bestScore: "KỶ LỤC",
    expGained: "EXP NHẬN ĐƯỢC",
    retry: "CHƠI LẠI",
    home: "TRANG CHỦ"
},

pvp: {
    title: "1 VS 1",
    createRoom: "TẠO PHÒNG",
    joinRoom: "VÀO PHÒNG",
    roomCode: "MÃ PHÒNG",
    enterRoomCode: "Nhập mã phòng",
    waitingOpponent: "Đang chờ đối thủ...",
    opponentJoined: "Đối thủ đã vào phòng",
    startBattle: "BẮT ĐẦU",
    you: "BẠN",
    opponent: "ĐỐI THỦ",
    rematch: "ĐẤU LẠI",
    leaveRoom: "RỜI PHÒNG"
},

flashcard: {
    title: "FLASHCARD",
    study: "HỌC",
    review: "ÔN TẬP",
    known: "ĐÃ NHỚ",
    unknown: "CHƯA NHỚ",
    again: "HỌC LẠI",
    learned: "ĐÃ HỌC",
    remaining: "CÒN LẠI"
},

rank: {
    title: "ĐẤU HẠNG",
    rank: "HẠNG",
    elo: "ELO",
    peakElo: "ELO CAO NHẤT",
    season: "MÙA GIẢI",
    findMatch: "TÌM ĐỐI THỦ",
    searching: "ĐANG TÌM..."
},

result: {
    victory: "CHIẾN THẮNG",
    defeat: "THẤT BẠI",
    draw: "HÒA",
    expGained: "EXP NHẬN ĐƯỢC",
    levelUp: "LÊN CẤP!"
},

error: {
    generic: "Đã xảy ra lỗi.",
    network: "Lỗi kết nối mạng.",
    saveFailed: "Không thể lưu.",
    roomNotFound: "Không tìm thấy phòng.",
    roomFull: "Phòng đã đầy."
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

    function getValue(language) 
    {
        let value = translations[language];

        for (const part of parts) 
        {
            if (value === undefined || value === null) return undefined;
            value = value[part];
        }

        return value;
    }

    return getValue(uiLanguage) ?? getValue(DEFAULT_LANGUAGE) ?? key;
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
