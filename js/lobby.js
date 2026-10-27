import {
    playSfx,
    stopLobbyMusic
}
from "./audio.js";

import {
    isLoggedIn
} from "./auth.js";

import { t } from "./i18n.js";
/* =============================================================
   DATA
   ============================================================= */

const battleModes = [
    {
        id: "solo",
        name: "SOLO BATTLE"
    },

    {
        id: "pvp",
        name: "1 VS 1"
    },

    {
        id: "flashcard",
        name: "FLASHCARD"
    },
    {   
        id: "rank", 
        name: "RANKED BATTLE" 
    }
];

const studyModes = [
    {
        id: "jlpt",
        name: "JLPT"
    },

    {
        id: "topic",
        name: "CHỦ ĐỀ"
    }
];

const jlptLevels = [
    { id: "n5", name: "N5" },
    { id: "n4", name: "N4" },
    { id: "n3", name: "N3" },
    { id: "n2", name: "N2" },
    { id: "n1", name: "N1" }
];


const topics = [
    { id: "colors", name: "001 - MÀU SẮC" },
    { id: "fruits", name: "002 - TRÁI CÂY" },
    { id: "vegetables", name: "003 - RAU CỦ" },
    { id: "animals", name: "004 - ĐỘNG VẬT" },
    { id: "birds", name: "005 - CÁC LOÀI CHIM" },
    { id: "sea_animals", name: "006 - CÁ VÀ SINH VẬT BIỂN" },
    { id: "insects", name: "007 - CÔN TRÙNG" },
    { id: "flowers", name: "008 - CÁC LOÀI HOA" },
    { id: "plants", name: "009 - THỰC VẬT" },
    { id: "transport", name: "010 - PHƯƠNG TIỆN GIAO THÔNG" },

    { id: "numbers", name: "011 - SỐ ĐẾM" },
    { id: "time", name: "012 - THỜI GIAN" },
    { id: "dates", name: "013 - THỨ VÀ NGÀY THÁNG" },
    { id: "seasons", name: "014 - CÁC MÙA" },
    { id: "weather", name: "015 - THỜI TIẾT" },
    { id: "shapes", name: "016 - HÌNH DẠNG" },
    { id: "directions", name: "017 - PHƯƠNG HƯỚNG VÀ VỊ TRÍ" },
    { id: "greetings", name: "018 - CHÀO HỎI" },
    { id: "self_introduction", name: "019 - GIỚI THIỆU BẢN THÂN" },
    { id: "family", name: "020 - GIA ĐÌNH" },

    { id: "body", name: "021 - BỘ PHẬN CƠ THỂ" },
    { id: "face", name: "022 - KHUÔN MẶT" },
    { id: "personality", name: "023 - TÍNH CÁCH" },
    { id: "emotions", name: "024 - CẢM XÚC" },
    { id: "jobs", name: "025 - NGHỀ NGHIỆP" },
    { id: "foods", name: "026 - ĐỒ ĂN" },
    { id: "drinks", name: "027 - ĐỒ UỐNG" },
    { id: "meats", name: "028 - CÁC LOẠI THỊT" },
    { id: "seasonings", name: "029 - GIA VỊ" },
    { id: "cooking", name: "030 - MÓN ĂN VÀ NẤU ĂN" },

    { id: "kitchen", name: "031 - DỤNG CỤ NHÀ BẾP" },
    { id: "furniture", name: "032 - ĐỒ NỘI THẤT" },
    { id: "appliances", name: "033 - THIẾT BỊ ĐIỆN GIA DỤNG" },
    { id: "rooms", name: "034 - CÁC PHÒNG TRONG NHÀ" },
    { id: "daily_items", name: "035 - ĐỒ DÙNG SINH HOẠT" },
    { id: "clothes", name: "036 - QUẦN ÁO" },
    { id: "shoes_accessories", name: "037 - GIÀY DÉP VÀ PHỤ KIỆN" },
    { id: "stationery", name: "038 - VĂN PHÒNG PHẨM" },
    { id: "school", name: "039 - TRƯỜNG HỌC" },
    { id: "subjects", name: "040 - MÔN HỌC" },

    { id: "studying", name: "041 - HỌC TẬP" },
    { id: "exams", name: "042 - THI CỬ" },
    { id: "sports", name: "043 - THỂ THAO" },
    { id: "hobbies", name: "044 - SỞ THÍCH" },
    { id: "music", name: "045 - ÂM NHẠC" },
    { id: "movies_tv", name: "046 - PHIM ẢNH VÀ TRUYỀN HÌNH" },
    { id: "games", name: "047 - TRÒ CHƠI" },
    { id: "travel", name: "048 - DU LỊCH" },
    { id: "sightseeing", name: "049 - ĐỊA ĐIỂM DU LỊCH" },
    { id: "hotel", name: "050 - KHÁCH SẠN" },

    { id: "airport", name: "051 - SÂN BAY" },
    { id: "trains", name: "052 - TÀU ĐIỆN VÀ NHÀ GA" },
    { id: "driving", name: "053 - Ô TÔ VÀ LÁI XE" },
    { id: "roads", name: "054 - ĐƯỜNG SÁ VÀ GIAO THÔNG" },
    { id: "buildings", name: "055 - CÁC LOẠI CÔNG TRÌNH" },
    { id: "places", name: "056 - ĐỊA ĐIỂM VÀ CƠ SỞ VẬT CHẤT" },
    { id: "shops", name: "057 - CÁC LOẠI CỬA HÀNG" },
    { id: "shopping", name: "058 - MUA SẮM" },
    { id: "money", name: "059 - TIỀN BẠC" },
    { id: "banking", name: "060 - NGÂN HÀNG" },

    { id: "diseases", name: "061 - BỆNH TẬT" },
    { id: "symptoms", name: "062 - TRIỆU CHỨNG" },
    { id: "hospital", name: "063 - BỆNH VIỆN" },
    { id: "medicine", name: "064 - THUỐC" },
    { id: "health", name: "065 - SỨC KHỎE" },
    { id: "exercise", name: "066 - VẬN ĐỘNG" },
    { id: "nature", name: "067 - THIÊN NHIÊN" },
    { id: "mountains_rivers", name: "068 - NÚI, SÔNG VÀ BIỂN" },
    { id: "geography", name: "069 - ĐỊA LÝ" },
    { id: "disasters", name: "070 - THIÊN TAI" },

    { id: "countries", name: "071 - QUỐC GIA VÀ QUỐC TỊCH" },
    { id: "languages", name: "072 - NGÔN NGỮ" },
    { id: "japanese_culture", name: "073 - VĂN HÓA NHẬT BẢN" },
    { id: "festivals", name: "074 - LỄ HỘI VÀ SỰ KIỆN" },
    { id: "holidays", name: "075 - NGÀY LỄ" },
    { id: "work", name: "076 - CÔNG VIỆC" },
    { id: "company", name: "077 - CÔNG TY" },
    { id: "meetings", name: "078 - CUỘC HỌP" },
    { id: "business_email", name: "079 - EMAIL CÔNG VIỆC" },
    { id: "keigo", name: "080 - KÍNH NGỮ" },

    { id: "factory", name: "081 - NHÀ MÁY" },
    { id: "machinery", name: "082 - MÁY MÓC" },
    { id: "tools", name: "083 - DỤNG CỤ CƠ KHÍ" },
    { id: "design_drawings", name: "084 - THIẾT KẾ VÀ BẢN VẼ" },
    { id: "materials", name: "085 - VẬT LIỆU" },
    { id: "computers", name: "086 - MÁY TÍNH" },
    { id: "internet", name: "087 - INTERNET" },
    { id: "smartphones", name: "088 - ĐIỆN THOẠI THÔNG MINH" },
    { id: "science", name: "089 - KHOA HỌC" },
    { id: "environment", name: "090 - MÔI TRƯỜNG" },

    { id: "daily_actions", name: "091 - ĐỘNG TÁC HẰNG NGÀY" },
    { id: "habits", name: "092 - THÓI QUEN SINH HOẠT" },
    { id: "relationships", name: "093 - QUAN HỆ CON NGƯỜI" },
    { id: "romance", name: "094 - TÌNH YÊU VÀ HÔN NHÂN" },
    { id: "childcare", name: "095 - NUÔI DẠY TRẺ" },
    { id: "opinions", name: "096 - Ý KIẾN VÀ SUY NGHĨ" },
    { id: "cause_effect", name: "097 - NGUYÊN NHÂN VÀ KẾT QUẢ" },
    { id: "comparison", name: "098 - SO SÁNH VÀ MỨC ĐỘ" },
    { id: "abstract_words", name: "099 - TỪ VỰNG TRỪU TƯỢNG" },
    { id: "society_news", name: "100 - XÃ HỘI VÀ TIN TỨC" }
];



const categories = [
    {
        id: "vocabulary",
        name: "TỪ VỰNG"
    },

    {
        id: "grammar",
        name: "NGỮ PHÁP"
    },

    {
        id: "listening",
        name: "NGHE"
    },

    {
        id: "reading",
        name: "ĐỌC HIỂU"
    }
];

const subModes = {vocabulary: 
    [
        {
            id: "kanji_meaning",
            name: "KANJI → MEANING"
        },

        {
            id: "kanji_hiragana",
            name: "KANJI → HIRAGANA"
        },

        {
            id: "audio_hiragana",
            name: "AUDIO → HIRAGANA"
        },
        {
            id: "audio_kanji",
            name: "AUDIO → KANJI"
        },

        {
            id: "audio_meaning",
            name: "AUDIO → MEANING"
        },

        {
            id: "hiragana_meaning",
            name: "HIRAGANA → MEANING"
        },

        {
            id: "meaning_kanji",
            name: "MEANING → KANJI"
        }

    ],

    grammar: [

        {
            id: "grammar_meaning",
            name: "NGỮ PHÁP → NGHĨA"
        },

        {
            id: "grammar_sentence",
            name: "CHỌN CÂU ĐÚNG"
        }

    ],

    listening: [

        {
            id: "listening_answer",
            name: "NGHE → ĐÁP ÁN"
        }

    ],

    reading: [

        {
            id: "reading_answer",
            name: "ĐỌC → ĐÁP ÁN"
        }

    ]

};

/* =============================================================
   STATE
   ============================================================= */

let battleModeIndex = 0;

let studyModeIndex = 0;

/*
    Mặc định N1.
*/
let studyTargetIndex = 4;

let categoryIndex = 0;

let subModeIndex = 0;


// Set Battle Mode from new Home
export function selectBattleMode(modeId) {

    const index = battleModes.findIndex(
        mode => mode.id === modeId
    );

    if (index === -1) {
        console.warn("[LOBBY] Invalid mode:", modeId);
        return false;
    }

    battleModeIndex = index;

    // Update the existing selector value as well
    if (battleModeValue) {
        battleModeValue.textContent = battleModes[index].name;
    }

    return true;
}


/* =============================================================
   DOM
   ============================================================= */

const battleModeValue =document.getElementById("battleModeValue");

const studyModeValue =document.getElementById("studyModeValue");

const studyTargetValue =document.getElementById("studyTargetValue");

const studyTargetLabel =document.getElementById("studyTargetLabel");

const categoryValue =document.getElementById("categoryValue");

const subModeValue =document.getElementById("subModeValue");

/* =============================================================
   SLIDE
   ============================================================= */

function slideSelector(element,newText,direction) 
{
    playSfx("slide");

    const viewport =element.parentElement;

    const clone =element.cloneNode(true);

    clone.removeAttribute("id");

    clone.textContent =newText;

    if (direction === "next") 
    {
        element.classList.add("slide-out-left");

        clone.classList.add("slide-in-right");
    }
    else 
    {
        element.classList.add("slide-out-right");

        clone.classList.add("slide-in-left");
    }

    viewport.appendChild(clone);

    setTimeout(() => 
        {
            element.textContent =newText;

            element.classList.remove("slide-out-left","slide-out-right");

            clone.remove();
        },
        220
    );
}

/* =============================================================
   HELPER
   ============================================================= */

function moveIndex(index,length,direction) 
{
    if (direction === "next") 
    {
        return (index + 1) % length;
    }
    return (index - 1 + length) % length;
}

function getTargets() 
{
    if (studyModes[studyModeIndex].id === "jlpt") 
    {
        return jlptLevels;
    }
    return topics;
}


// Reset configuration when opening a mode from Home
export function resetLobbyConfig() {

    studyModeIndex = 0;
    studyTargetIndex = 4; // N1
    categoryIndex = 0;
    subModeIndex = 0;

    const category = categories[categoryIndex];

    studyModeValue.textContent =
        studyModes[studyModeIndex].name;

    studyTargetLabel.textContent = "JLPT LEVEL";

    studyTargetValue.textContent =
        jlptLevels[studyTargetIndex].name;

    categoryValue.textContent = category.name;

    subModeValue.textContent =
        subModes[category.id][subModeIndex].name;
}


/* =============================================================
   INIT
   ============================================================= */
export function initLobby({onSolo,onPvp,onFlashcard, onRank}) 
{
    /* BATTLE MODE */
    document.getElementById("battleModeNext").addEventListener("click",() => 
        {
                battleModeIndex =moveIndex(battleModeIndex,battleModes.length,"next");

                slideSelector(battleModeValue,battleModes[battleModeIndex].name,"next");
            }
        );

    document.getElementById("battleModePrev").addEventListener("click",() => 
        {
                battleModeIndex =moveIndex(battleModeIndex,battleModes.length,"prev");

                slideSelector(battleModeValue,battleModes[battleModeIndex].name,"prev");
            }
        );

    /* STUDY MODE */

    function changeStudyMode(direction) 
    {
        studyModeIndex =moveIndex(studyModeIndex,studyModes.length,direction);

        const mode =studyModes[studyModeIndex];

        slideSelector(studyModeValue,mode.name,direction);

        studyTargetIndex = 0;

        const targets =getTargets();

        studyTargetLabel.textContent =mode.id === "jlpt" ? "JLPT LEVEL" : "TOPIC";

        slideSelector(studyTargetValue,targets[0].name,direction);
    }

    document.getElementById("studyModeNext").addEventListener("click",() => changeStudyMode("next"));

    document.getElementById("studyModePrev").addEventListener("click", () =>changeStudyMode("prev"));

    /* TARGET */
    function changeTarget(direction) 
    {
        const targets =getTargets();

        studyTargetIndex =moveIndex(studyTargetIndex,targets.length,direction);

        slideSelector(studyTargetValue,targets[studyTargetIndex].name,direction);
    }

    document.getElementById("studyTargetNext").addEventListener("click",() => changeTarget("next"));

    document.getElementById("studyTargetPrev").addEventListener("click", () => changeTarget("prev"));

    /* CATEGORY */

    function changeCategory(direction) 
    {
        categoryIndex =moveIndex(categoryIndex,categories.length,direction);

        const category =categories[categoryIndex];

        slideSelector(categoryValue,category.name,direction);

        subModeIndex = 0;

        slideSelector(subModeValue,subModes[category.id][0].name,direction);
    }

    document.getElementById("categoryNext").addEventListener("click", () => changeCategory("next"));

    document.getElementById("categoryPrev").addEventListener("click", () => changeCategory("prev"));

    /* SUB MODE */

    function changeSubMode(direction)
    {
        const category =categories[categoryIndex];

        const modes = subModes[category.id];

        subModeIndex =moveIndex(subModeIndex,modes.length,direction);

        slideSelector(subModeValue,modes[subModeIndex].name,direction);
    }

    document.getElementById("subModeNext").addEventListener("click",() => changeSubMode("next"));

    document.getElementById("subModePrev").addEventListener("click", () =>changeSubMode("prev"));

    /* =========================================================
       BATTLE BUTTON
       ========================================================= */

    document.getElementById("battleButton").addEventListener("click",() => 
        {
            /* =================================
               LOGIN CHECK
            ================================= */
            if (!isLoggedIn()) 
            {
                window.BatLingoAuthUI?.open();

                return;
            }

            /* =================================
               CREATE BATTLE CONFIG
            ================================= */

            const category =categories[categoryIndex];

            const config = {

                battleMode: battleModes[battleModeIndex].id,

                studyMode: studyModes[studyModeIndex].id,

                target: getTargets()[studyTargetIndex].id,

                category: category.id,

                subMode: subModes[category.id][subModeIndex].id

            };

            /*SOLO*/

            if (config.battleMode === "solo")
            {
                onSolo?.(config);

                return;
            }

            /*1 VS 1*/

            if (config.battleMode === "pvp")
            {
                onPvp?.(config);

                return;
            }

            /*FLASHCARD*/

            if (config.battleMode === "flashcard")
            {
                onFlashcard?.(config);

                return;
            }

            /*RANK*/
            if (config.battleMode === "rank") 
            {
                 onRank?.(config);
                 
                return;
             }
                
        }
    );
}
