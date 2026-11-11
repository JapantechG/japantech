
/* =========================================================
   BATLINGO - HOW TO PLAY V2
   8 SLIDES / 4 LANGUAGES
   EN / VI / JA / ZH
========================================================= */

import { auth } from "./firebase.js";

import {
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

/* =========================================================
   CONFIGURATION
========================================================= */

const STORAGE_KEY = "batlingo_how_to_play_seen_v1";


const DEFAULT_LANGUAGE = "en";

const LANGUAGES = [
    { code: "en", label: "EN · English" },
    { code: "vi", label: "VI · Tiếng Việt" },
    { code: "ja", label: "JP · 日本語" },
    { code: "zh", label: "ZH · 中文" }
];

const $ = id => document.getElementById(id);

let currentSlide = 0;
let currentLanguage = DEFAULT_LANGUAGE;

let isOpen = false;
let initialized = false;
let authReady = false;

let previousFocus = null;

/* =========================================================
   SLIDE CONFIGURATION

   Image paths:
   assets/how-to-play/welcome.webp
   assets/how-to-play/solo.webp
   assets/how-to-play/flashcard.webp
   assets/how-to-play/jlpt.webp
   assets/how-to-play/friends.webp
   assets/how-to-play/ranked.webp
   assets/how-to-play/progress.webp
   assets/how-to-play/account.webp
========================================================= */

const SLIDES = [
    { id: "welcome", icon: "🎌", tag: "WELCOME" },
    { id: "solo", icon: "⚔️", tag: "SOLO BATTLE" },
    { id: "flashcard", icon: "🃏", tag: "FLASHCARD" },
    { id: "jlpt", icon: "📚", tag: "JLPT EXAM" },
    { id: "friends", icon: "🤝", tag: "1 VS 1 & FRIENDS" },
    { id: "ranked", icon: "🏆", tag: "RANKED BATTLE" },
    { id: "progress", icon: "🐃", tag: "PROGRESS & MASCOT" },
    { id: "daily", icon: "📅", tag: "DAILY MISSION" },
    { id: "account", icon: "🌟", tag: "CREATE ACCOUNT" }
];

/* =========================================================
   TRANSLATIONS
========================================================= */

const CONTENT = {

    /* =====================================================
       ENGLISH
    ===================================================== */

    en: {

        ui: {
            heading: "HOW TO PLAY",
            skip: "SKIP",
            back: "BACK",
            next: "NEXT",
            explore: "EXPLORE BATLINGO",
            signup: "CREATE FREE ACCOUNT",
            image: "Illustration coming soon",
            step: "STEP",
            language: "Guide language"
        },

        slides: [

            {
                title: "Welcome to BatLingo",
                subtitle:
                    "Learn Japanese through games, practice and competition.",

                points: [
                    "Study Japanese by JLPT level N5–N1 or everyday topics.",
                    "Practice vocabulary, Kanji, Hiragana readings, grammar and listening.",
                    "Choose Solo Battle, Flashcards, JLPT Exam or online competitions.",
                    "Track your progress, grow mascots and climb the leaderboards."
                ],

                tip:
                    "Choose the learning mode that matches your level and goals."
            },

            {
                title: "Solo Battle",
                subtitle:
                    "Train your Japanese reflexes and vocabulary.",

                points: [
                    "SURVIVAL: Start with 3 hearts. Wrong or missed answers cost a heart.",
                    "SURVIVAL: Survive longer, earn points and build combos.",
                    "PRACTICE: Choose 10, 20, 50 or up to 100 custom questions.",
                    "PRACTICE: Set a time limit from 8 to 20 seconds per question.",
                    "Review your results and answer accuracy after practice.",
                    "Survival awards EXP to level up. Practice does not award EXP."
                ],

                tip:
                    "New players should try Practice before challenging Survival."
            },

            {
                title: "Learn with Flashcards",
                subtitle:
                    "Memorize Japanese vocabulary at your own pace.",

                points: [
                    "Flip cards to reveal words, Hiragana readings and meanings.",
                    "Practice Kanji → Meaning or Kanji → Hiragana.",
                    "Practice Meaning → Kanji to strengthen your memory.",
                    "Train listening with Audio → Meaning, Hiragana or Kanji.",
                    "Combine Flashcards with quizzes to check what you remember."
                ],

                tip:
                    "Flashcards are useful for learning new words before battles."
            },

            {
                title: "JLPT Exam Practice",
                subtitle:
                    "Prepare for the Japanese Language Proficiency Test.",

                points: [
                    "Choose a JLPT level from N5 to N1.",
                    "Select an available exam set or individual Mondai section.",
                    "PRACTICE: Focus on selected sections or question groups.",
                    "TEST: Take an exam-style quiz and navigate between questions.",
                    "Confirm your submission and view your results.",
                    "Review correct and incorrect answers after completing the test."
                ],

                tip:
                    "Available exam sets and sections depend on the current question database."
            },

            {
                title: "Play with Friends",
                subtitle:
                    "Challenge friends in real-time Japanese battles.",

                points: [
                    "Create PUBLIC rooms that other players can discover.",
                    "Create PRIVATE rooms and share your room code.",
                    "Join by room code or browse available public rooms.",
                    "Customize JLPT level, topic, question mode and number of questions.",
                    "Compete in timed 1V1 battles and compare your scores.",
                    "Connect with other players and manage friend invitations."
                ],

                tip:
                    "An account is required to use PvP and Friends."
            },

            {
                title: "Ranked Battle",
                subtitle:
                    "Challenge opponents and climb the ELO rankings.",

                points: [
                    "Choose a supported Ranked Battle configuration.",
                    "Find opponents with compatible settings and ELO ratings.",
                    "Accept the match when an opponent is found.",
                    "Answer 20 questions, with 10 seconds per question.",
                    "Points, combos and total response time affect match results.",
                    "Track ELO, wins, losses and your ranking progress."
                ],

                tip:
                    "Ranked requires an account. ELO may increase or decrease based on results."
            },

            {
                title: "Progress & Mascot",
                subtitle:
                    "Turn your learning journey into an adventure.",

                points: [
                    "Earn EXP from Solo Survival and increase your Level.",
                    "Choose Buffalo or Monkey as your learning companion.",
                    "Develop your mascot through five evolution stages.",
                    "Each mascot offers a unique ability in Solo Survival.",
                    "Compare progress on Level, Pet and Ranked leaderboards.",
                    "Review previously saved incorrect answers."
                ],

                tip:
                    "Create an account to save your progress and mascot development."
            },

           
            {
                title: "Daily Missions",
                subtitle:
                    "Build a consistent learning habit with daily challenges.",
            
                points: [
                    "Discover new learning missions every day.",
                    "Complete challenges by studying and playing supported game modes.",
                    "Track your mission progress as you complete each objective.",
                    "Finish daily goals to unlock available mission rewards.",
                    "Return regularly to maintain your learning motivation."
                ],
            
                tip:
                    "Check your Daily Missions regularly so you don't miss today's challenges."
            },


            {
                title: "Ready to Begin?",
                subtitle:
                    "Create a free account to enjoy the full BatLingo experience.",

                points: [
                    "Save your learning progress, EXP and Level.",
                    "Keep your mascot and its evolution stages.",
                    "Join online PvP and Ranked Battles.",
                    "Connect with friends and other Japanese learners.",
                    "Track your achievements and leaderboard positions.",
                    "Continue your learning journey whenever you return."
                ],

                tip:
                    "You can also skip registration and explore the home screen first."
            }

        ]
    },

    /* =====================================================
       VIETNAMESE
    ===================================================== */

    vi: {

        ui: {
            heading: "HƯỚNG DẪN CHƠI",
            skip: "BỎ QUA",
            back: "QUAY LẠI",
            next: "TIẾP THEO",
            explore: "KHÁM PHÁ BATLINGO",
            signup: "TẠO TÀI KHOẢN",
            image: "Ảnh minh họa sẽ được cập nhật",
            step: "TRANG",
            language: "Ngôn ngữ hướng dẫn"
        },

        slides: [

            {
                title: "Chào mừng đến BatLingo",
                subtitle:
                    "Học tiếng Nhật qua trò chơi, luyện tập và thi đấu.",

                points: [
                    "Học theo cấp độ JLPT N5–N1 hoặc các chủ đề quen thuộc.",
                    "Luyện từ vựng, Kanji, cách đọc Hiragana, ngữ pháp và nghe.",
                    "Chọn Solo Battle, Flashcard, JLPT Exam hoặc thi đấu online.",
                    "Theo dõi tiến độ, phát triển mascot và chinh phục bảng xếp hạng."
                ],

                tip:
                    "Chọn chế độ học phù hợp với trình độ và mục tiêu của bạn."
            },

            {
                title: "Solo Battle",
                subtitle:
                    "Luyện phản xạ và ghi nhớ từ vựng một mình.",

                points: [
                    "SURVIVAL: Bắt đầu với 3 mạng. Trả lời sai hoặc hết giờ sẽ mất mạng.",
                    "SURVIVAL: Cố gắng sống sót, tích điểm và duy trì combo.",
                    "PRACTICE: Chọn 10, 20, 50 hoặc tùy chỉnh tối đa 100 câu hỏi.",
                    "PRACTICE: Điều chỉnh thời gian từ 8 đến 20 giây mỗi câu.",
                    "Xem kết quả và độ chính xác sau khi hoàn thành.",
                    "Survival tích EXP để tăng Level; Practice không cộng EXP."
                ],

                tip:
                    "Người mới nên bắt đầu bằng Practice, sau đó thử Survival."
            },

            {
                title: "Học từ vựng với Flashcard",
                subtitle:
                    "Ghi nhớ từ vựng theo tốc độ học của riêng bạn.",

                points: [
                    "Lật thẻ để xem từ tiếng Nhật, cách đọc Hiragana và nghĩa.",
                    "Luyện Kanji → Nghĩa hoặc Kanji → Hiragana.",
                    "Luyện Nghĩa → Kanji để tăng khả năng ghi nhớ.",
                    "Luyện nghe bằng Audio → Nghĩa, Hiragana hoặc Kanji.",
                    "Kết hợp Flashcard với Quiz để kiểm tra kiến thức."
                ],

                tip:
                    "Flashcard phù hợp để học từ mới trước khi tham gia Battle."
            },

            {
                title: "Luyện thi JLPT",
                subtitle:
                    "Ôn luyện theo từng phần của đề thi JLPT.",

                points: [
                    "Chọn trình độ JLPT từ N5 đến N1.",
                    "Chọn bộ đề và từng Mondai theo nội dung được hỗ trợ.",
                    "PRACTICE: Luyện tập riêng từng phần hoặc nhóm câu hỏi.",
                    "TEST: Làm bài theo chế độ kiểm tra, có thể chuyển giữa các câu.",
                    "Xác nhận trước khi nộp bài và xem kết quả.",
                    "Review lại đáp án đúng, sai và nội dung đã học."
                ],

                tip:
                    "Các bộ đề và Mondai khả dụng phụ thuộc vào dữ liệu đã được cập nhật."
            },

            {
                title: "Kết nối và đấu với bạn bè",
                subtitle:
                    "Cùng học tiếng Nhật thông qua các trận đấu thời gian thực.",

                points: [
                    "Tạo phòng PUBLIC để người chơi khác có thể tìm thấy.",
                    "Tạo phòng PRIVATE và mời bạn bè bằng mã phòng.",
                    "Tham gia phòng bằng Room Code hoặc tìm phòng công khai.",
                    "Tùy chỉnh trình độ JLPT, chủ đề, dạng câu hỏi và số câu.",
                    "Thi đấu 1V1, trả lời trong thời gian giới hạn.",
                    "Kết bạn, quản lý lời mời và kết nối với người chơi khác."
                ],

                tip:
                    "Cần đăng nhập để sử dụng PvP và hệ thống bạn bè."
            },

            {
                title: "Thi đấu xếp hạng",
                subtitle:
                    "Thử thách bản thân và cạnh tranh bằng điểm ELO.",

                points: [
                    "Chọn trình độ và cấu hình thi đấu được hỗ trợ.",
                    "Hệ thống tìm đối thủ phù hợp với cấu hình và mức ELO.",
                    "Chấp nhận trận đấu khi tìm thấy đối thủ.",
                    "Mỗi trận gồm 20 câu hỏi, giới hạn 10 giây mỗi câu.",
                    "Điểm số, combo và thời gian trả lời ảnh hưởng thành tích.",
                    "Theo dõi ELO, số trận thắng, thua và tiến độ xếp hạng."
                ],

                tip:
                    "Ranked yêu cầu tài khoản. ELO có thể tăng hoặc giảm theo kết quả."
            },

            {
                title: "Level, Mascot và thành tích",
                subtitle:
                    "Biến hành trình học tiếng Nhật thành một cuộc phiêu lưu.",

                points: [
                    "Nhận EXP từ Solo Survival để tăng Level.",
                    "Chọn mascot Buffalo hoặc Monkey đồng hành cùng bạn.",
                    "Phát triển mascot qua 5 giai đoạn tiến hóa.",
                    "Mỗi mascot có kỹ năng hỗ trợ riêng trong Solo Survival.",
                    "Theo dõi bảng xếp hạng Level, Pet và Ranked.",
                    "Xem lại các câu đã trả lời sai bằng tính năng Review."
                ],

                tip:
                    "Tạo tài khoản để lưu tiến độ và theo dõi hành trình học lâu dài."
            },
           
            {
                title: "Nhiệm vụ hằng ngày",
                subtitle:
                    "Duy trì thói quen học tiếng Nhật thông qua các thử thách mỗi ngày.",
            
                points: [
                    "Khám phá các nhiệm vụ học tập được giao mỗi ngày.",
                    "Hoàn thành thử thách bằng cách học và tham gia các chế độ chơi được hỗ trợ.",
                    "Theo dõi tiến độ hoàn thành của từng nhiệm vụ.",
                    "Hoàn thành mục tiêu để nhận phần thưởng nhiệm vụ nếu có.",
                    "Quay lại BatLingo thường xuyên để duy trì động lực học tập."
                ],
            
                tip:
                    "Hãy kiểm tra Daily Mission mỗi ngày để không bỏ lỡ thử thách mới."
            },


            {
                title: "Sẵn sàng bắt đầu?",
                subtitle:
                    "Tạo tài khoản miễn phí để trải nghiệm đầy đủ BatLingo.",

                points: [
                    "Lưu tiến độ học tập, EXP và Level.",
                    "Lưu mascot cùng các giai đoạn tiến hóa.",
                    "Tham gia PvP và Ranked Battle.",
                    "Kết nối bạn bè và tham gia cộng đồng.",
                    "Xem bảng xếp hạng và theo dõi thành tích.",
                    "Tiếp tục hành trình học ở những lần đăng nhập sau."
                ],

                tip:
                    "Bạn cũng có thể bỏ qua và khám phá trang chủ trước."
            }

        ]
    },

    /* =====================================================
       JAPANESE
    ===================================================== */

    ja: {

        ui: {
            heading: "遊び方",
            skip: "スキップ",
            back: "戻る",
            next: "次へ",
            explore: "BATLINGOを探索",
            signup: "無料アカウントを作成",
            image: "画像は後日追加予定です",
            step: "ページ",
            language: "ガイドの言語"
        },

        slides: [

            {
                title: "BatLingoへようこそ！",
                subtitle:
                    "ゲームや対戦を楽しみながら日本語を学ぼう。",

                points: [
                    "JLPT N5〜N1のレベル別、または身近なテーマ別に学習できます。",
                    "漢字、読み方、意味、文法、リスニングをさまざまな問題形式で練習できます。",
                    "ソロバトル、フラッシュカード、JLPT試験対策、オンライン対戦から選べます。",
                    "学習の進捗を記録し、マスコットを成長させ、ランキング上位を目指せます。"
                ],

                tip:
                    "自分のレベルや学習目標に合ったモードを選びましょう。"
            },

            {
                title: "ソロバトル",
                subtitle:
                    "一人で日本語の反射力と記憶力を鍛えよう。",

                points: [
                    "SURVIVAL：ライフ3つでスタート。間違えたり時間切れになったりするとライフが減ります。",
                    "SURVIVAL：連続正解でコンボをつなぎ、できるだけ長く生き残りましょう。",
                    "PRACTICE：10問・20問・50問、または最大100問まで自由に設定できます。",
                    "PRACTICE：1問あたりの制限時間を8〜20秒に設定できます。",
                    "終了後に結果や正答率を確認できます。",
                    "SurvivalではEXPを獲得できます。PracticeではEXPは加算されません。"
                ],

                tip:
                    "初めての方はPracticeから始めるのがおすすめです。"
            },

            {
                title: "フラッシュカード",
                subtitle:
                    "自分のペースで日本語の単語を覚えよう。",

                points: [
                    "カードをめくって、単語・ひらがなの読み方・意味を確認できます。",
                    "漢字→意味、漢字→ひらがなの形式で学習できます。",
                    "意味→漢字の形式で記憶力を鍛えられます。",
                    "音声→意味・ひらがな・漢字の形式でリスニング練習もできます。",
                    "フラッシュカードとクイズを組み合わせて知識を定着させましょう。"
                ],

                tip:
                    "バトル前の予習や単語の復習におすすめです。"
            },

            {
                title: "JLPT試験対策",
                subtitle:
                    "日本語能力試験の問題形式に合わせて練習しよう。",

                points: [
                    "N5〜N1からレベルを選択できます。",
                    "利用可能な問題セットや問題（Mondai）を選択できます。",
                    "PRACTICE：苦手な問題形式を集中的に練習できます。",
                    "TEST：試験形式で解答し、問題間を移動して最後に提出できます。",
                    "提出前に確認し、終了後に結果を表示できます。",
                    "正解・不正解と自分の解答を振り返ることができます。"
                ],

                tip:
                    "利用可能な問題セットは、登録済みの問題データによって異なります。"
            },

            {
                title: "友達と対戦しよう",
                subtitle:
                    "ルームを作成してリアルタイムで日本語バトル！",

                points: [
                    "公開ルームまたは非公開ルームを作成できます。",
                    "ルームコードを共有して友達を招待できます。",
                    "ルームコードの入力や公開ルーム検索から参加できます。",
                    "JLPTレベル・テーマ・問題形式・問題数を設定できます。",
                    "制限時間内に解答し、相手とスコアを競います。",
                    "フレンド申請や招待を管理し、ほかのプレイヤーとつながれます。"
                ],

                tip:
                    "PvPとフレンド機能を利用するにはログインが必要です。"
            },

            {
                title: "ランクバトル",
                subtitle:
                    "実力を試してELOレーティングを上げよう。",

                points: [
                    "対応する対戦設定を選び、マッチングを開始します。",
                    "設定やELOが近いプレイヤーを検索します。",
                    "対戦相手が見つかったら試合への参加を承認します。",
                    "1試合20問で、各問題の制限時間は10秒です。",
                    "得点、コンボ、解答時間などが試合結果に影響します。",
                    "ELO、勝利数、敗北数、ランクの進捗を確認できます。"
                ],

                tip:
                    "ランクバトルにはアカウントが必要です。結果によってELOが増減します。"
            },

            {
                title: "レベルとマスコット",
                subtitle:
                    "日本語の学習と一緒にマスコットも成長！",

                points: [
                    "Solo SurvivalでEXPを獲得してレベルアップできます。",
                    "BuffaloまたはMonkeyを選び、学習のパートナーにできます。",
                    "マスコットは5段階に進化します。",
                    "それぞれのマスコットにはSolo Survivalで使える固有スキルがあります。",
                    "Level・Pet・Rankのランキングを確認できます。",
                    "保存された間違い問題をReviewで復習できます。"
                ],

                tip:
                    "アカウントを作成すると学習履歴とマスコットの成長を保存できます。"
            },
   
            {
                title: "デイリーミッション",
                subtitle:
                    "毎日のチャレンジで日本語学習を習慣にしよう。",
            
                points: [
                    "毎日新しい学習ミッションに挑戦できます。",
                    "対象の学習モードやゲームをプレイしてミッションを進めましょう。",
                    "各ミッションの達成状況を確認できます。",
                    "目標を達成すると、設定されている報酬を獲得できます。",
                    "毎日BatLingoにアクセスして、学習のモチベーションを維持しましょう。"
                ],
            
                tip:
                    "その日のチャレンジを見逃さないよう、毎日ミッションを確認しましょう。"
            },


            {
                title: "さあ、始めよう！",
                subtitle:
                    "無料アカウントを作成してBatLingoを楽しもう。",

                points: [
                    "EXP・レベル・学習の進捗を保存できます。",
                    "マスコットと進化段階を保存できます。",
                    "PvPやランクバトルに参加できます。",
                    "友達やほかの学習者とつながることができます。",
                    "ランキングや実績を確認できます。",
                    "次回ログインしたときも続きから学習できます。"
                ],

                tip:
                    "登録せずにガイドを閉じてホーム画面を探索することもできます。"
            }

        ]
    },

    /* =====================================================
       SIMPLIFIED CHINESE
    ===================================================== */

    zh: {

        ui: {
            heading: "游戏指南",
            skip: "跳过",
            back: "返回",
            next: "下一步",
            explore: "探索BATLINGO",
            signup: "免费创建账号",
            image: "示例图片即将添加",
            step: "第",
            language: "指南语言"
        },

        slides: [

            {
                title: "欢迎来到 BatLingo！",
                subtitle:
                    "通过游戏、练习和对战轻松学习日语。",

                points: [
                    "可以按照JLPT N5至N1等级或日常主题学习日语。",
                    "通过多种题型练习汉字、读音、词义、语法和听力。",
                    "可以选择单人挑战、闪卡、JLPT考试练习或在线对战。",
                    "记录学习进度、培养吉祥物并挑战排行榜。"
                ],

                tip:
                    "选择适合自己日语水平和学习目标的模式。"
            },

            {
                title: "单人挑战",
                subtitle:
                    "独自训练日语反应速度和记忆能力。",

                points: [
                    "SURVIVAL：开始时有3颗心，回答错误或超时会失去一颗心。",
                    "SURVIVAL：连续答对可以累积连击，尽可能坚持更久。",
                    "PRACTICE：可选择10、20、50题，或自定义最多100题。",
                    "PRACTICE：每题限时可设为8至20秒。",
                    "练习结束后查看成绩和正确率。",
                    "Survival模式可以获得经验值，Practice模式不提供经验值。"
                ],

                tip:
                    "新玩家建议先尝试Practice，再挑战Survival。"
            },

            {
                title: "单词闪卡",
                subtitle:
                    "按照自己的节奏记忆日语单词。",

                points: [
                    "翻转卡片即可查看日语单词、平假名读音和词义。",
                    "支持汉字→词义、汉字→平假名的练习方式。",
                    "支持词义→汉字，帮助加深记忆。",
                    "支持音频→词义、平假名或汉字的听力练习。",
                    "通过闪卡和小测验巩固所学知识。"
                ],

                tip:
                    "适合在参加对战前预习和复习词汇。"
            },

            {
                title: "JLPT考试练习",
                subtitle:
                    "按照考试题型进行日语能力测试训练。",

                points: [
                    "可以选择N5至N1等级。",
                    "可以选择已有的试题套装或指定的Mondai题型。",
                    "PRACTICE：针对特定题型进行强化练习。",
                    "TEST：模拟考试流程，在题目之间切换并提交答案。",
                    "提交前可以确认，结束后查看成绩。",
                    "复习正确答案、错误答案和已完成的题目。"
                ],

                tip:
                    "可用的试题和题型取决于当前已添加的题库。"
            },

            {
                title: "与好友一起对战",
                subtitle:
                    "创建房间，进行实时日语知识对战。",

                points: [
                    "创建公开房间或私人房间。",
                    "通过分享房间代码邀请好友。",
                    "使用房间代码或公开房间列表加入游戏。",
                    "可以设置JLPT等级、学习主题、题型和题目数量。",
                    "在限定时间内回答问题，与对手比较得分。",
                    "添加好友并管理邀请，与其他玩家保持联系。"
                ],

                tip:
                    "PvP和好友功能需要登录账号才能使用。"
            },

            {
                title: "排位对战",
                subtitle:
                    "挑战其他玩家，提升自己的ELO积分。",

                points: [
                    "选择支持的比赛设置并开始匹配。",
                    "系统寻找设置兼容、ELO接近的对手。",
                    "找到对手后确认接受比赛。",
                    "每场比赛有20道题，每题限时10秒。",
                    "得分、连击和答题时间会影响比赛结果。",
                    "查看ELO、胜负记录和排位进度。"
                ],

                tip:
                    "排位赛需要账号，ELO积分会根据比赛结果上升或下降。"
            },

            {
                title: "等级与吉祥物",
                subtitle:
                    "让你的日语学习之旅变成成长冒险。",

                points: [
                    "在Solo Survival中获得经验值并提升等级。",
                    "选择Buffalo或Monkey作为学习伙伴。",
                    "吉祥物共有5个进化阶段。",
                    "不同吉祥物在Solo Survival中拥有专属技能。",
                    "查看Level、Pet和Rank排行榜。",
                    "通过Review功能复习已保存的错题。"
                ],

                tip:
                    "创建账号后可以保存学习记录和吉祥物的成长进度。"
            },

           
            {
                title: "每日任务",
                subtitle:
                    "通过每天的挑战，养成持续学习日语的习惯。",
            
                points: [
                    "每天查看新的学习任务和挑战。",
                    "通过学习和参与支持的游戏模式完成任务。",
                    "实时查看每项任务的完成进度。",
                    "达到目标后领取已设置的任务奖励。",
                    "每天回到BatLingo，保持学习动力。"
                ],
            
                tip:
                    "记得每天查看Daily Mission，不要错过新的挑战。"
            },


            {
                title: "准备好开始了吗？",
                subtitle:
                    "创建免费账号，体验完整的BatLingo。",

                points: [
                    "保存学习进度、经验值和等级。",
                    "保存吉祥物及其进化阶段。",
                    "参加在线PvP和排位对战。",
                    "与好友和其他日语学习者交流。",
                    "查看排行榜和个人成就。",
                    "以后登录时可以继续之前的学习。"
                ],

                tip:
                    "也可以关闭指南，先自由探索主页。"
            }

        ]
    }
};

/* =========================================================
   LANGUAGE HELPERS
========================================================= */

function getContent() {
    return CONTENT[currentLanguage] || CONTENT.en;
}

function getText() {
    return getContent().ui;
}

function getSlides() {
    return getContent().slides;
}

function changeLanguage(language) {

    if (!CONTENT[language]) return;

    currentLanguage = language;

    if (isOpen) {
        renderHowToPlay(true);
    }
}

/* =========================================================
   DOM HELPERS
========================================================= */

function createElement(
    tag,
    className = "",
    text = null
) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== null) {
        element.textContent = String(text);
    }

    return element;
}

function createButton(text, className, callback) {

    const button = createElement(
        "button",
        className,
        text
    );

    button.type = "button";
    button.addEventListener("click", callback);

    return button;
}

/* =========================================================
   FIRST VISIT STORAGE
========================================================= */

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
   CLOSE GUIDE
========================================================= */

export function closeHowToPlay() {

    const overlay = $("howToPlayOverlay");

    if (!overlay || !isOpen) return;

    overlay.classList.add("hidden");
    overlay.setAttribute("aria-hidden", "true");

    document.body.classList.remove("htp-open");

    isOpen = false;

    markGuideSeen();

    if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
    ) {

        previousFocus.focus({
            preventScroll: true
        });

    }

    previousFocus = null;
}

/* =========================================================
   OPEN GUIDE
========================================================= */

export function openHowToPlay() {

    const overlay = $("howToPlayOverlay");

    if (!overlay) return;

    if (isOpen) return;

    currentSlide = 0;

    // Default to English every time guide is opened.
    currentLanguage = DEFAULT_LANGUAGE;

    previousFocus = document.activeElement;

    // Close side menu.
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
   CREATE ACCOUNT
========================================================= */

function openCreateAccount() {

    if (auth.currentUser) {
        closeHowToPlay();
        return;
    }

    closeHowToPlay();

    const authUI = window.BatLingoAuthUI;

    if (!authUI?.open) {

        console.warn(
            "[HOW TO PLAY] Auth UI unavailable"
        );

        return;
    }

    authUI.open();

    // Open signup tab if the existing auth UI
    // provides a signup switch.
    requestAnimationFrame(() => {
        $("openSignupBtn")?.click();
    });
}


/* =========================================================
   HOW TO PLAY - PLACEHOLDER ONLY

   - Keep existing illustration container
   - No image loading
   - No WebP links
   - No image path or coming soon message
========================================================= */

function createImageArea(slide, translation, text) {

    const container = createElement(
        "div",
        "htp-media"
    );

    const placeholder = createElement(
        "div",
        "htp-image-placeholder"
    );

    /* MODE ICON */

    const icon = createElement(
        "div",
        "htp-placeholder-icon",
        slide.icon
    );

    /* MODE TITLE */

    const title = createElement(
        "strong",
        "",
        slide.tag
    );

    placeholder.append(
        icon,
        title
    );

    container.append(placeholder);

    return container;
}


/* =========================================================
   LANGUAGE SELECTOR
========================================================= */

function createLanguageSelector() {

    const text = getText();

    const wrapper = createElement(
        "div",
        "htp-language-box"
    );

    const icon = createElement(
        "span",
        "htp-language-icon",
        "🌐"
    );

    icon.setAttribute("aria-hidden", "true");

    const select = createElement(
        "select",
        "htp-language-select"
    );

    select.id = "htpLanguageSelect";

    select.setAttribute(
        "aria-label",
        text.language
    );

    LANGUAGES.forEach(language => {

        const option = document.createElement("option");

        option.value = language.code;
        option.textContent = language.label;

        select.append(option);
    });

    select.value = currentLanguage;

    select.addEventListener("change", event => {

        changeLanguage(event.target.value);

    });

    wrapper.append(
        icon,
        select
    );

    return wrapper;
}

/* =========================================================
   RENDER HOW TO PLAY
========================================================= */

function renderHowToPlay(focusLanguage = false) {

    const overlay = $("howToPlayOverlay");

    if (!overlay) return;

    const text = getText();
    const translations = getSlides();

    const slide = SLIDES[currentSlide];
    const translation = translations[currentSlide];

    if (!slide || !translation) return;

    /* =====================================================
       PANEL
    ===================================================== */

    const panel = createElement(
        "section",
        "htp-panel"
    );

    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");

    panel.setAttribute(
        "aria-label",
        text.heading
    );

    panel.lang =
        currentLanguage === "zh"
            ? "zh-CN"
            : currentLanguage;

    /* =====================================================
       HEADER
    ===================================================== */

    const header = createElement(
        "header",
        "htp-header"
    );

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

    const languageSelector =
        createLanguageSelector();

    const skipButton = createButton(
        text.skip + " ✕",
        "htp-skip",
        closeHowToPlay
    );

    header.append(
        brand,
        heading,
        languageSelector,
        skipButton
    );

    /* =====================================================
       PROGRESS
    ===================================================== */

    const progress = createElement(
        "div",
        "htp-progress"
    );

    progress.setAttribute(
        "aria-label",
        `${text.step} ${currentSlide + 1} / ${SLIDES.length}`
    );

    SLIDES.forEach((item, index) => {

        const button = createButton(
            "",
            "htp-progress-step" +
                (index <= currentSlide
                    ? " is-done"
                    : ""),
            () => {

                currentSlide = index;
                renderHowToPlay();

            }
        );

        if (index === currentSlide) {

            button.setAttribute(
                "aria-current",
                "step"
            );

        }

        button.setAttribute(
            "aria-label",
            `${text.step} ${index + 1}`
        );

        progress.append(button);
    });

    /* =====================================================
       CONTENT
    ===================================================== */

    const content = createElement(
        "main",
        "htp-content"
    );

    const copy = createElement(
        "div",
        "htp-copy"
    );

    const tag = createElement(
        "span",
        "htp-tag",
        slide.tag
    );

    const title = createElement(
        "h2",
        "htp-title",
        translation.title
    );

    title.id = "htpSlideTitle";

    panel.setAttribute(
        "aria-labelledby",
        title.id
    );

    const subtitle = createElement(
        "p",
        "htp-subtitle",
        translation.subtitle
    );

    copy.append(
        tag,
        title,
        subtitle
    );

    /* FEATURES */

    const list = createElement(
        "ul",
        "htp-list"
    );

    translation.points.forEach(point => {

        const item = createElement("li");

        const check = createElement(
            "span",
            "htp-check",
            "✓"
        );

        check.setAttribute(
            "aria-hidden",
            "true"
        );

        const label = createElement(
            "span",
            "htp-point",
            point
        );

        item.append(
            check,
            label
        );

        list.append(item);
    });

    copy.append(list);

    /* TIP */

    const tip = createElement(
        "p",
        "htp-tip",
        "✦ " + translation.tip
    );

    copy.append(tip);

    /* IMAGE */

    const media = createImageArea(
        slide,
        translation,
        text
    );

    content.append(
        copy,
        media
    );

    /* =====================================================
       FOOTER
    ===================================================== */

    const footer = createElement(
        "footer",
        "htp-footer"
    );

    const counter = createElement(
        "span",
        "htp-counter",
        `${text.step} ${currentSlide + 1} / ${SLIDES.length}`
    );

    const actions = createElement(
        "div",
        "htp-actions"
    );

    /* BACK */

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

    /* NEXT */

    if (currentSlide < SLIDES.length - 1) {

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

        /* LAST SLIDE */

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

    footer.append(
        counter,
        actions
    );

    /* =====================================================
       FINAL PANEL
    ===================================================== */

    panel.append(
        header,
        progress,
        content,
        footer
    );

    overlay.replaceChildren(panel);

    /* RESET CONTENT SCROLL */

    content.scrollTop = 0;

    /* FOCUS */

    if (focusLanguage) {

        $("htpLanguageSelect")?.focus({
            preventScroll: true
        });

    } else {

        skipButton.focus({
            preventScroll: true
        });

    }
}

/* =========================================================
   KEYBOARD CONTROLS
========================================================= */

function handleKeyboard(event) {

    if (!isOpen) return;

    const overlay = $("howToPlayOverlay");

    if (!overlay) return;

    /* ESCAPE */

    if (event.key === "Escape") {

        event.preventDefault();
        closeHowToPlay();
        return;
    }

    /* IGNORE ARROWS IN INPUTS */

    const tag = event.target?.tagName;

    const isInput = [
        "INPUT",
        "TEXTAREA",
        "SELECT"
    ].includes(tag);

    if (!isInput) {

        if (
            event.key === "ArrowRight" &&
            currentSlide < SLIDES.length - 1
        ) {

            event.preventDefault();

            currentSlide++;
            renderHowToPlay();

            return;
        }

        if (
            event.key === "ArrowLeft" &&
            currentSlide > 0
        ) {

            event.preventDefault();

            currentSlide--;
            renderHowToPlay();

            return;
        }

    }

    /* FOCUS TRAP */

    if (event.key !== "Tab") return;

    const focusables = Array.from(
        overlay.querySelectorAll(
            'button:not([disabled]), ' +
            'select:not([disabled]), ' +
            'input:not([disabled]), ' +
            'a[href], ' +
            '[tabindex]:not([tabindex="-1"])'
        )
    ).filter(element => element.getClientRects().length);

    if (!focusables.length) return;

    const first = focusables[0];
    const last = focusables[focusables.length - 1];

    if (
        event.shiftKey &&
        document.activeElement === first
    ) {

        event.preventDefault();
        last.focus();

    } else if (
        !event.shiftKey &&
        document.activeElement === last
    ) {

        event.preventDefault();
        first.focus();

    }
}

/* =========================================================
   INITIALIZATION
========================================================= */

function initHowToPlay() {

    if (initialized) return;

    initialized = true;

    /* CREATE OVERLAY */

    const overlay = createElement(
        "div",
        "htp-overlay hidden"
    );

    overlay.id = "howToPlayOverlay";

    overlay.setAttribute(
        "aria-hidden",
        "true"
    );

    document.body.append(overlay);

    /* MENU BUTTON */

    $("menuHowToPlayBtn")?.addEventListener(
        "click",
        openHowToPlay
    );

    /* OPTIONAL OPEN BUTTON */

    document.addEventListener("click", event => {

        const target = event.target;

        if (
            target instanceof Element &&
            target.closest("[data-open-how-to-play]")
        ) {

            openHowToPlay();

        }

    });

    /* KEYBOARD */

    document.addEventListener(
        "keydown",
        handleKeyboard
    );

    /* FIREBASE AUTH CHECK */

    onAuthStateChanged(auth, user => {

        if (authReady) return;

        authReady = true;

        if (
            !user &&
            !hasSeenGuide()
        ) {

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
