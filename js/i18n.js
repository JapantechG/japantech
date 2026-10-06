/* =========================================================
   BATLINGO - i18n
   Keyword-first translation structure
   Languages: Japanese / English / Chinese / Vietnamese
========================================================= */

const DEFAULT_LANGUAGE = "en";

const SUPPORTED_LANGUAGES = ["ja", "en", "zh", "vi"];


/* =========================================================
   TRANSLATIONS
========================================================= */

const translations = {

    /* =====================================================
       HOME
    ===================================================== */

    home: {
        login: {
            ja: "ログイン",
            en: "Login",
            zh: "登录",
            vi: "Đăng nhập"
        },

        battleMode: {
            ja: "バトルモード",
            en: "BATTLE MODE",
            zh: "对战模式",
            vi: "CHẾ ĐỘ ĐẤU"
        },

        studyMode: {
            ja: "学習モード",
            en: "STUDY MODE",
            zh: "学习模式",
            vi: "CHẾ ĐỘ HỌC"
        },

        jlptLevel: {
            ja: "JLPT レベル",
            en: "JLPT LEVEL",
            zh: "JLPT 等级",
            vi: "CẤP ĐỘ JLPT"
        },

        category: {
            ja: "カテゴリー",
            en: "CATEGORY",
            zh: "类别",
            vi: "NỘI DUNG"
        },

        questionMode: {
            ja: "出題モード",
            en: "QUESTION MODE",
            zh: "答题模式",
            vi: "DẠNG CÂU HỎI"
        },

        battle: {
            ja: "バトル",
            en: "BATTLE",
            zh: "开始对战",
            vi: "BẮT ĐẦU"
        },
       learningLanguage: {
          ja: "学習言語",
          en: "LEARNING LANGUAGE",
          zh: "学习语言",
          vi: "NGÔN NGỮ HỌC"
        },
   
      languageJapanese: {
             ja: "🇯🇵 日本語",
             en: "🇯🇵 JAPANESE",
             zh: "🇯🇵 日语",
             vi: "🇯🇵 TIẾNG NHẬT"
       }
    },
   
      


    /* =====================================================
       BATTLE MODE
    ===================================================== */
      
    battleMode: {
        solo: {
            ja: "ソロバトル",
            en: "SOLO BATTLE",
            zh: "单人对战",
            vi: "ĐẤU SOLO"
        },

        pvp: {
            ja: "1 VS 1",
            en: "1 VS 1",
            zh: "1 VS 1",
            vi: "1 VS 1"
        },

        rank: {
            ja: "ランクバトル",
            en: "RANK BATTLE",
            zh: "排位赛",
            vi: "ĐẤU HẠNG"
        }
    },


    /* =====================================================
       STUDY MODE
    ===================================================== */

    studyMode: {
        jlpt: {
            ja: "JLPT",
            en: "JLPT",
            zh: "JLPT",
            vi: "JLPT"
        },

        flashcard: {
            ja: "フラッシュカード",
            en: "FLASHCARD",
            zh: "闪卡",
            vi: "FLASHCARD"
        }
    },


    /* =====================================================
       CATEGORY
    ===================================================== */

    category: {
        vocabulary: {
            ja: "語彙",
            en: "VOCABULARY",
            zh: "词汇",
            vi: "TỪ VỰNG"
        },

        grammar: {
            ja: "文法",
            en: "GRAMMAR",
            zh: "语法",
            vi: "NGỮ PHÁP"
        }
    },


    /* =====================================================
       MENU
    ===================================================== */

    menu: {
        title: {
            ja: "メニュー",
            en: "MENU",
            zh: "菜单",
            vi: "MENU"
        },

        profile: {
            ja: "プロフィール",
            en: "PROFILE",
            zh: "个人资料",
            vi: "HỒ SƠ"
        },

        pet: {
            ja: "ペット",
            en: "PET",
            zh: "宠物",
            vi: "LINH VẬT"
        },

        settings: {
            ja: "設定",
            en: "SETTINGS",
            zh: "设置",
            vi: "CÀI ĐẶT"
        },

        audio: {
            ja: "サウンド",
            en: "AUDIO",
            zh: "声音",
            vi: "ÂM THANH"
        },

        language: {
            ja: "言語",
            en: "LANGUAGE",
            zh: "语言",
            vi: "NGÔN NGỮ"
        },

        logout: {
            ja: "ログアウト",
            en: "LOG OUT",
            zh: "退出登录",
            vi: "ĐĂNG XUẤT"
        }
    },


    /* =====================================================
       AUTH
    ===================================================== */

    auth: {
        login: {
            ja: "ログイン",
            en: "LOGIN",
            zh: "登录",
            vi: "ĐĂNG NHẬP"
        },

        loginTitle: {
            ja: "おかえりなさい",
            en: "Welcome back",
            zh: "欢迎回来",
            vi: "Chào mừng trở lại"
        },

        loginDescription: {
            ja: "ログインしてバトルを続けましょう。",
            en: "Sign in to continue your battle.",
            zh: "登录后继续战斗。",
            vi: "Đăng nhập để tiếp tục trận đấu."
        },

        email: {
            ja: "メールアドレス",
            en: "Email",
            zh: "电子邮箱",
            vi: "Email"
        },

        emailPlaceholder: {
            ja: "example@email.com",
            en: "example@email.com",
            zh: "example@email.com",
            vi: "example@email.com"
        },

        password: {
            ja: "パスワード",
            en: "Password",
            zh: "密码",
            vi: "Mật khẩu"
        },

        passwordPlaceholder: {
            ja: "パスワード",
            en: "Password",
            zh: "密码",
            vi: "Mật khẩu"
        },

        forgotPassword: {
            ja: "パスワードを忘れた場合",
            en: "Forgot password?",
            zh: "忘记密码？",
            vi: "Quên mật khẩu?"
        },

        or: {
            ja: "または",
            en: "OR",
            zh: "或",
            vi: "HOẶC"
        },

        google: {
            ja: "Googleで続ける",
            en: "Continue with Google",
            zh: "使用 Google 继续",
            vi: "Tiếp tục với Google"
        },

        noAccount: {
            ja: "アカウントをお持ちでないですか？",
            en: "Don't have an account?",
            zh: "还没有账号？",
            vi: "Chưa có tài khoản?"
        },

        signup: {
            ja: "新規登録",
            en: "Sign up",
            zh: "注册",
            vi: "Đăng ký"
        },

        createAccount: {
            ja: "アカウント作成",
            en: "Create account",
            zh: "创建账号",
            vi: "Tạo tài khoản"
        },

        signupDescription: {
            ja: "BatLingoアカウントを作成します。",
            en: "Create your BatLingo account.",
            zh: "创建你的 BatLingo 账号。",
            vi: "Tạo tài khoản BatLingo của bạn."
        },

        confirmPassword: {
            ja: "パスワード確認",
            en: "Confirm password",
            zh: "确认密码",
            vi: "Xác nhận mật khẩu"
        },

        ruleLength: {
            ja: "8～64文字",
            en: "8–64 characters",
            zh: "8–64 个字符",
            vi: "8–64 ký tự"
        },

        ruleUpper: {
            ja: "大文字を1文字以上",
            en: "At least 1 uppercase letter",
            zh: "至少包含 1 个大写字母",
            vi: "Ít nhất 1 chữ hoa"
        },

        ruleLower: {
            ja: "小文字を1文字以上",
            en: "At least 1 lowercase letter",
            zh: "至少包含 1 个小写字母",
            vi: "Ít nhất 1 chữ thường"
        },

        ruleNumber: {
            ja: "数字を1文字以上",
            en: "At least 1 number",
            zh: "至少包含 1 个数字",
            vi: "Ít nhất 1 chữ số"
        },

        haveAccount: {
            ja: "すでにアカウントをお持ちですか？",
            en: "Already have an account?",
            zh: "已有账号？",
            vi: "Đã có tài khoản?"
        },

        verifyTitle: {
            ja: "メールを確認してください",
            en: "Check your email",
            zh: "请检查邮箱",
            vi: "Kiểm tra email"
        },

        verifyDescription: {
            ja: "確認メールを送信しました：",
            en: "We sent a verification link to:",
            zh: "验证邮件已发送至：",
            vi: "Đã gửi liên kết xác nhận đến:"
        },

        verifyNote: {
            ja: "メール内のリンクをクリックしてからログインしてください。",
            en: "Open the email and click the verification link before logging in.",
            zh: "请点击邮件中的验证链接，然后再登录。",
            vi: "Mở email và nhấn vào liên kết xác nhận trước khi đăng nhập."
        },

        backLogin: {
            ja: "ログインへ戻る",
            en: "BACK TO LOGIN",
            zh: "返回登录",
            vi: "QUAY LẠI ĐĂNG NHẬP"
        },

        resendVerification: {
            ja: "確認メールを再送",
            en: "RESEND VERIFICATION",
            zh: "重新发送验证邮件",
            vi: "GỬI LẠI EMAIL XÁC NHẬN"
        },

        resetPassword: {
            ja: "パスワードをリセット",
            en: "RESET PASSWORD",
            zh: "重置密码",
            vi: "ĐẶT LẠI MẬT KHẨU"
        }
    },
      /* =====================================================
       COMMON
    ===================================================== */

    common: {
        back: {
            ja: "戻る",
            en: "BACK",
            zh: "返回",
            vi: "QUAY LẠI"
        },

        save: {
            ja: "保存",
            en: "SAVE",
            zh: "保存",
            vi: "LƯU"
        },

        cancel: {
            ja: "キャンセル",
            en: "CANCEL",
            zh: "取消",
            vi: "HỦY"
        },

        confirm: {
            ja: "確認",
            en: "CONFIRM",
            zh: "确认",
            vi: "XÁC NHẬN"
        },

        continue: {
            ja: "続ける",
            en: "CONTINUE",
            zh: "继续",
            vi: "TIẾP TỤC"
        },

        close: {
            ja: "閉じる",
            en: "CLOSE",
            zh: "关闭",
            vi: "ĐÓNG"
        },

        retry: {
            ja: "もう一度",
            en: "RETRY",
            zh: "再试一次",
            vi: "CHƠI LẠI"
        },

        loading: {
            ja: "読み込み中...",
            en: "Loading...",
            zh: "加载中...",
            vi: "Đang tải..."
        },

        saving: {
            ja: "保存中...",
            en: "Saving...",
            zh: "保存中...",
            vi: "Đang lưu..."
        },

        yes: {
            ja: "はい",
            en: "YES",
            zh: "是",
            vi: "CÓ"
        },

        no: {
            ja: "いいえ",
            en: "NO",
            zh: "否",
            vi: "KHÔNG"
        },

        or: {
            ja: "または",
            en: "OR",
            zh: "或",
            vi: "HOẶC"
        }
    },


    /* =====================================================
       PROFILE
    ===================================================== */

    profile: {
        title: {
            ja: "プロフィール",
            en: "PROFILE",
            zh: "个人资料",
            vi: "HỒ SƠ"
        },

        level: {
            ja: "レベル",
            en: "LEVEL",
            zh: "等级",
            vi: "CẤP ĐỘ"
        },

        exp: {
            ja: "EXP",
            en: "EXP",
            zh: "经验值",
            vi: "EXP"
        },

        rank: {
            ja: "ランク",
            en: "RANK",
            zh: "段位",
            vi: "XẾP HẠNG"
        },

        elo: {
            ja: "ELO",
            en: "ELO",
            zh: "ELO",
            vi: "ELO"
        },

        battles: {
            ja: "バトル",
            en: "BATTLES",
            zh: "对战",
            vi: "TRẬN ĐẤU"
        },

        wins: {
            ja: "勝利",
            en: "WINS",
            zh: "胜利",
            vi: "THẮNG"
        },

        losses: {
            ja: "敗北",
            en: "LOSSES",
            zh: "失败",
            vi: "THUA"
        },

        draws: {
            ja: "引き分け",
            en: "DRAWS",
            zh: "平局",
            vi: "HÒA"
        },

        winRate: {
            ja: "勝率",
            en: "WIN RATE",
            zh: "胜率",
            vi: "TỈ LỆ THẮNG"
        },

        bestCombo: {
            ja: "ベストコンボ",
            en: "BEST COMBO",
            zh: "最高连击",
            vi: "COMBO CAO NHẤT"
        },

        bestScore: {
            ja: "ベストスコア",
            en: "BEST SCORE",
            zh: "最高分",
            vi: "ĐIỂM CAO NHẤT"
        },

        displayName: {
            ja: "表示名",
            en: "DISPLAY NAME",
            zh: "玩家名称",
            vi: "TÊN HIỂN THỊ"
        },

        displayNameHint: {
            ja: "公開プレイヤー名",
            en: "Your public player name",
            zh: "公开显示的玩家名称",
            vi: "Tên công khai của người chơi"
        },

        bio: {
            ja: "自己紹介",
            en: "BIO",
            zh: "简介",
            vi: "GIỚI THIỆU"
        },

        bioPlaceholder: {
            ja: "自己紹介を入力",
            en: "Tell other players about yourself",
            zh: "介绍一下自己",
            vi: "Giới thiệu ngắn về bạn"
        },

        email: {
            ja: "メールアドレス",
            en: "EMAIL",
            zh: "电子邮箱",
            vi: "EMAIL"
        },

        batlingoId: {
            ja: "BATLINGO ID",
            en: "BATLINGO ID",
            zh: "BATLINGO ID",
            vi: "BATLINGO ID"
        },

        save: {
            ja: "プロフィールを保存",
            en: "SAVE PROFILE",
            zh: "保存个人资料",
            vi: "LƯU HỒ SƠ"
        },

        saved: {
            ja: "プロフィールを保存しました",
            en: "Profile saved.",
            zh: "个人资料已保存",
            vi: "Đã lưu hồ sơ."
        }
    },


    /* =====================================================
       GAME
    ===================================================== */

    game: {
        question: {
            ja: "問題",
            en: "QUESTION",
            zh: "问题",
            vi: "CÂU HỎI"
        },

        score: {
            ja: "スコア",
            en: "SCORE",
            zh: "分数",
            vi: "ĐIỂM"
        },

        best: {
            ja: "ベスト",
            en: "BEST",
            zh: "最高分",
            vi: "KỶ LỤC"
        },

        combo: {
            ja: "コンボ",
            en: "COMBO",
            zh: "连击",
            vi: "COMBO"
        },

        lives: {
            ja: "ライフ",
            en: "LIVES",
            zh: "生命",
            vi: "MẠNG"
        },

        vocabulary: {
            ja: "語彙",
            en: "VOCABULARY",
            zh: "词汇",
            vi: "TỪ VỰNG"
        },

        grammar: {
            ja: "文法",
            en: "GRAMMAR",
            zh: "语法",
            vi: "NGỮ PHÁP"
        },

        listening: {
            ja: "聴解",
            en: "LISTENING",
            zh: "听力",
            vi: "NGHE"
        },

        reading: {
            ja: "読解",
            en: "READING",
            zh: "阅读",
            vi: "ĐỌC HIỂU"
        },

        correct: {
            ja: "正解",
            en: "CORRECT",
            zh: "正确",
            vi: "ĐÚNG"
        },

        wrong: {
            ja: "不正解",
            en: "WRONG",
            zh: "错误",
            vi: "SAI"
        },

        timeUp: {
            ja: "時間切れ",
            en: "TIME UP",
            zh: "时间到",
            vi: "HẾT GIỜ"
        },

        keyboardHint: {
            ja: "1〜4キーで回答",
            en: "PRESS 1–4 TO ANSWER",
            zh: "按 1–4 键作答",
            vi: "NHẤN 1–4 ĐỂ TRẢ LỜI"
        }
    },


    /* =====================================================
       GAME OVER
    ===================================================== */

    gameOver: {
        title: {
            ja: "ゲーム終了",
            en: "GAME OVER",
            zh: "游戏结束",
            vi: "KẾT THÚC"
        },

        finalScore: {
            ja: "スコア",
            en: "SCORE",
            zh: "分数",
            vi: "ĐIỂM"
        },

        questions: {
            ja: "問題数",
            en: "QUESTIONS",
            zh: "题数",
            vi: "SỐ CÂU"
        },

        bestCombo: {
            ja: "ベストコンボ",
            en: "BEST COMBO",
            zh: "最高连击",
            vi: "COMBO CAO NHẤT"
        },

        bestScore: {
            ja: "ベストスコア",
            en: "BEST SCORE",
            zh: "最高分",
            vi: "KỶ LỤC"
        },

        expGained: {
            ja: "獲得EXP",
            en: "EXP GAINED",
            zh: "获得经验值",
            vi: "EXP NHẬN ĐƯỢC"
        },

        retry: {
            ja: "もう一度",
            en: "RETRY",
            zh: "再试一次",
            vi: "CHƠI LẠI"
        },

        home: {
            ja: "ホームへ",
            en: "HOME",
            zh: "主页",
            vi: "TRANG CHỦ"
        }
    },
      /* =====================================================
       PVP
    ===================================================== */

    pvp: {
        title: {
            ja: "1 VS 1",
            en: "1 VS 1",
            zh: "1 VS 1",
            vi: "1 VS 1"
        },

        onlineBattle: {
            ja: "オンラインバトル",
            en: "ONLINE BATTLE",
            zh: "在线对战",
            vi: "ĐẤU TRỰC TUYẾN"
        },

        createRoom: {
            ja: "ルーム作成",
            en: "CREATE ROOM",
            zh: "创建房间",
            vi: "TẠO PHÒNG"
        },

        joinRoom: {
            ja: "ルーム参加",
            en: "JOIN ROOM",
            zh: "加入房间",
            vi: "VÀO PHÒNG"
        },

        roomCode: {
            ja: "ルームコード",
            en: "ROOM CODE",
            zh: "房间代码",
            vi: "MÃ PHÒNG"
        },

        enterRoomCode: {
            ja: "ルームコードを入力",
            en: "Enter room code",
            zh: "输入房间代码",
            vi: "Nhập mã phòng"
        },

        sendCode: {
            ja: "ルームコードを共有",
            en: "SHARE ROOM CODE",
            zh: "分享房间代码",
            vi: "GỬI MÃ PHÒNG"
        },

        waitingOpponent: {
            ja: "対戦相手を待っています...",
            en: "Waiting for opponent...",
            zh: "等待对手...",
            vi: "Đang chờ đối thủ..."
        },

        opponentJoined: {
            ja: "対戦相手が参加しました",
            en: "Opponent joined",
            zh: "对手已加入",
            vi: "Đối thủ đã vào phòng"
        },

        startBattle: {
            ja: "バトル開始",
            en: "START BATTLE",
            zh: "开始对战",
            vi: "BẮT ĐẦU"
        },

        you: {
            ja: "あなた",
            en: "YOU",
            zh: "你",
            vi: "BẠN"
        },

        opponent: {
            ja: "相手",
            en: "OPPONENT",
            zh: "对手",
            vi: "ĐỐI THỦ"
        },

        host: {
            ja: "ホスト",
            en: "HOST",
            zh: "房主",
            vi: "CHỦ PHÒNG"
        },

        guest: {
            ja: "ゲスト",
            en: "GUEST",
            zh: "访客",
            vi: "KHÁCH"
        },

        player1: {
            ja: "プレイヤー1",
            en: "PLAYER 1",
            zh: "玩家 1",
            vi: "NGƯỜI CHƠI 1"
        },

        player2: {
            ja: "プレイヤー2",
            en: "PLAYER 2",
            zh: "玩家 2",
            vi: "NGƯỜI CHƠI 2"
        },

        ready: {
            ja: "準備完了",
            en: "READY",
            zh: "准备就绪",
            vi: "SẴN SÀNG"
        },

        waiting: {
            ja: "待機中...",
            en: "WAITING...",
            zh: "等待中...",
            vi: "ĐANG CHỜ..."
        },

        thinking: {
            ja: "考え中...",
            en: "THINKING...",
            zh: "思考中...",
            vi: "ĐANG SUY NGHĨ..."
        },

        locked: {
            ja: "回答済み",
            en: "LOCKED",
            zh: "已锁定",
            vi: "ĐÃ CHỐT"
        },

        correct: {
            ja: "正解",
            en: "CORRECT",
            zh: "正确",
            vi: "ĐÚNG"
        },

        wrong: {
            ja: "不正解",
            en: "WRONG",
            zh: "错误",
            vi: "SAI"
        },

        rematch: {
            ja: "再戦",
            en: "REMATCH",
            zh: "再战",
            vi: "ĐẤU LẠI"
        },

        rematchWaiting: {
            ja: "相手の再戦を待っています...",
            en: "Waiting for opponent to rematch...",
            zh: "等待对手再战...",
            vi: "Đang chờ đối thủ đấu lại..."
        },

        leaveRoom: {
            ja: "ルームを退出",
            en: "LEAVE ROOM",
            zh: "离开房间",
            vi: "RỜI PHÒNG"
        },

        opponentLeft: {
            ja: "相手が退出しました",
            en: "OPPONENT LEFT",
            zh: "对手已离开",
            vi: "ĐỐI THỦ ĐÃ RỜI TRẬN"
        },

        opponentDisconnected: {
            ja: "相手との接続が切れました",
            en: "OPPONENT DISCONNECTED",
            zh: "对手已断开连接",
            vi: "ĐỐI THỦ ĐÃ MẤT KẾT NỐI"
        },

        backToLobby: {
            ja: "ロビーへ戻る",
            en: "BACK TO LOBBY",
            zh: "返回大厅",
            vi: "VỀ SẢNH"
        },

        roomDeleted: {
            ja: "ルームが終了しました",
            en: "ROOM CLOSED",
            zh: "房间已关闭",
            vi: "PHÒNG ĐÃ ĐÓNG"
        }
    },


    /* =====================================================
       FLASHCARD
    ===================================================== */

    flashcard: {
        title: {
            ja: "フラッシュカード",
            en: "FLASHCARD",
            zh: "闪卡",
            vi: "FLASHCARD"
        },

        study: {
            ja: "学習",
            en: "STUDY",
            zh: "学习",
            vi: "HỌC"
        },

        review: {
            ja: "復習",
            en: "REVIEW",
            zh: "复习",
            vi: "ÔN TẬP"
        },

        known: {
            ja: "覚えた",
            en: "KNOWN",
            zh: "已掌握",
            vi: "ĐÃ NHỚ"
        },

        unknown: {
            ja: "まだ",
            en: "DON'T KNOW",
            zh: "不会",
            vi: "CHƯA NHỚ"
        },

        again: {
            ja: "もう一度",
            en: "AGAIN",
            zh: "再来一次",
            vi: "HỌC LẠI"
        },

        hard: {
            ja: "難しい",
            en: "HARD",
            zh: "困难",
            vi: "KHÓ"
        },

        good: {
            ja: "できた",
            en: "GOOD",
            zh: "良好",
            vi: "TỐT"
        },

        easy: {
            ja: "簡単",
            en: "EASY",
            zh: "简单",
            vi: "DỄ"
        },

        learned: {
            ja: "習得済み",
            en: "LEARNED",
            zh: "已学习",
            vi: "ĐÃ HỌC"
        },

        remaining: {
            ja: "残り",
            en: "REMAINING",
            zh: "剩余",
            vi: "CÒN LẠI"
        },

        tapToFlip: {
            ja: "タップして裏返す",
            en: "TAP TO FLIP",
            zh: "点击翻面",
            vi: "CHẠM ĐỂ LẬT THẺ"
        },

        auto: {
            ja: "自動",
            en: "AUTO",
            zh: "自动",
            vi: "TỰ ĐỘNG"
        },

        autoStart: {
            ja: "自動再生",
            en: "AUTO START",
            zh: "自动播放",
            vi: "TỰ ĐỘNG"
        },

        autoStop: {
            ja: "停止",
            en: "STOP AUTO",
            zh: "停止自动",
            vi: "DỪNG"
        },

        previous: {
            ja: "前へ",
            en: "PREVIOUS",
            zh: "上一张",
            vi: "THẺ TRƯỚC"
        },

        next: {
            ja: "次へ",
            en: "NEXT",
            zh: "下一张",
            vi: "THẺ TIẾP"
        }
    },


    /* =====================================================
       RANK
    ===================================================== */

    rank: {
        title: {
            ja: "ランクバトル",
            en: "RANK BATTLE",
            zh: "排位赛",
            vi: "ĐẤU HẠNG"
        },

        rank: {
            ja: "ランク",
            en: "RANK",
            zh: "段位",
            vi: "HẠNG"
        },

        elo: {
            ja: "ELO",
            en: "ELO",
            zh: "ELO",
            vi: "ELO"
        },

        peakElo: {
            ja: "最高ELO",
            en: "PEAK ELO",
            zh: "最高 ELO",
            vi: "ELO CAO NHẤT"
        },

        season: {
            ja: "シーズン",
            en: "SEASON",
            zh: "赛季",
            vi: "MÙA GIẢI"
        },

        findMatch: {
            ja: "対戦相手を探す",
            en: "FIND MATCH",
            zh: "寻找对手",
            vi: "TÌM ĐỐI THỦ"
        },

        searching: {
            ja: "検索中...",
            en: "SEARCHING...",
            zh: "搜索中...",
            vi: "ĐANG TÌM..."
        }
    },


    /* =====================================================
       RESULT
    ===================================================== */

    result: {
        victory: {
            ja: "勝利",
            en: "VICTORY",
            zh: "胜利",
            vi: "CHIẾN THẮNG"
        },

        defeat: {
            ja: "敗北",
            en: "DEFEAT",
            zh: "失败",
            vi: "THẤT BẠI"
        },

        draw: {
            ja: "引き分け",
            en: "DRAW",
            zh: "平局",
            vi: "HÒA"
        },

        expGained: {
            ja: "獲得EXP",
            en: "EXP GAINED",
            zh: "获得经验值",
            vi: "EXP NHẬN ĐƯỢC"
        },

        levelUp: {
            ja: "レベルアップ！",
            en: "LEVEL UP!",
            zh: "升级！",
            vi: "LÊN CẤP!"
        }
    },


    /* =====================================================
       ERROR
    ===================================================== */

    error: {
        generic: {
            ja: "エラーが発生しました。",
            en: "Something went wrong.",
            zh: "发生错误。",
            vi: "Đã xảy ra lỗi."
        },

        network: {
            ja: "ネットワークエラーが発生しました。",
            en: "Network error.",
            zh: "网络错误。",
            vi: "Lỗi kết nối mạng."
        },

        saveFailed: {
            ja: "保存できませんでした。",
            en: "Could not save.",
            zh: "保存失败。",
            vi: "Không thể lưu."
        },

        roomNotFound: {
            ja: "ルームが見つかりません。",
            en: "Room not found.",
            zh: "找不到房间。",
            vi: "Không tìm thấy phòng."
        },

        roomFull: {
            ja: "ルームは満員です。",
            en: "Room is full.",
            zh: "房间已满。",
            vi: "Phòng đã đầy."
        },

        roomClosed: {
            ja: "ルームは終了しました。",
            en: "Room has been closed.",
            zh: "房间已关闭。",
            vi: "Phòng đã đóng."
        },

        opponentLeft: {
            ja: "対戦相手が退出しました。",
            en: "Opponent left the match.",
            zh: "对手已离开比赛。",
            vi: "Đối thủ đã rời trận."
        },

        databaseLoadFailed: {
            ja: "データを読み込めませんでした。",
            en: "Could not load data.",
            zh: "无法加载数据。",
            vi: "Không thể tải dữ liệu."
        }
    }

};

/* =========================================================
   CURRENT LANGUAGE
========================================================= */

let uiLanguage = localStorage.getItem("batlingo_ui_language") || DEFAULT_LANGUAGE;


/* Validate saved language */

if (!SUPPORTED_LANGUAGES.includes(uiLanguage)) {
    uiLanguage = DEFAULT_LANGUAGE;
}


/* =========================================================
   GET TRANSLATION
========================================================= */

export function t(key) {
    const parts = key.split(".");
    let value = translations;

    for (const part of parts) {
        if (value === undefined || value === null) {
            return key;
        }

        value = value[part];
    }

    if (
        value === undefined ||
        value === null ||
        typeof value !== "object"
    ) {
        return key;
    }

    return value[uiLanguage] ?? value[DEFAULT_LANGUAGE] ?? key;
}


/* =========================================================
   APPLY LANGUAGE TO HTML
========================================================= */

export function applyLanguage() {
    document.documentElement.lang = uiLanguage;


    /* Normal text */

    document.querySelectorAll("[data-i18n]").forEach(element => {
        const key = element.dataset.i18n;
        element.textContent = t(key);
    });


    /* Placeholder */

    document.querySelectorAll("[data-i18n-placeholder]").forEach(element => {
        const key = element.dataset.i18nPlaceholder;
        element.placeholder = t(key);
    });


    /* Sync language selects */

    const homeLanguage = document.getElementById("homeLanguage");
    const authLanguage = document.getElementById("authLanguage");

    if (homeLanguage) {
        homeLanguage.value = uiLanguage;
    }

    if (authLanguage) {
        authLanguage.value = uiLanguage;
    }
}


/* =========================================================
   SET LANGUAGE
========================================================= */

export function setLanguage(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
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
    const homeLanguage = document.getElementById("homeLanguage");
    const authLanguage = document.getElementById("authLanguage");


    homeLanguage?.addEventListener("change", event => {
        setLanguage(event.target.value);
    });


    authLanguage?.addEventListener("change", event => {
        setLanguage(event.target.value);
    });


    applyLanguage();
}
