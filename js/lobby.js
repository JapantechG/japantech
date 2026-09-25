import {
    playSfx,
    stopLobbyMusic
}
from "./audio.js";


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

    { id: "colors", name: "MÀU SẮC" },
    { id: "flowers", name: "HOA" },
    { id: "animals", name: "ĐỘNG VẬT" },
    { id: "food", name: "ĐỒ ĂN" }

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


const subModes = {

    vocabulary: [

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


/* =============================================================
   DOM
   ============================================================= */

const battleModeValue =
    document.getElementById(
        "battleModeValue"
    );

const studyModeValue =
    document.getElementById(
        "studyModeValue"
    );

const studyTargetValue =
    document.getElementById(
        "studyTargetValue"
    );

const studyTargetLabel =
    document.getElementById(
        "studyTargetLabel"
    );

const categoryValue =
    document.getElementById(
        "categoryValue"
    );

const subModeValue =
    document.getElementById(
        "subModeValue"
    );


/* =============================================================
   SLIDE
   ============================================================= */

function slideSelector(
    element,
    newText,
    direction
) {

    playSfx("slide");


    const viewport =
        element.parentElement;


    const clone =
        element.cloneNode(true);


    clone.removeAttribute("id");

    clone.textContent =
        newText;


    if (direction === "next") {

        element.classList.add(
            "slide-out-left"
        );

        clone.classList.add(
            "slide-in-right"
        );

    }
    else {

        element.classList.add(
            "slide-out-right"
        );

        clone.classList.add(
            "slide-in-left"
        );
    }


    viewport.appendChild(
        clone
    );


    setTimeout(
        () => {

            element.textContent =
                newText;


            element.classList.remove(
                "slide-out-left",
                "slide-out-right"
            );


            clone.remove();

        },

        220
    );
}


/* =============================================================
   HELPER
   ============================================================= */

function moveIndex(
    index,
    length,
    direction
) {

    if (direction === "next") {

        return (
            index + 1
        ) % length;
    }


    return (
        index - 1 + length
    ) % length;
}


function getTargets() {

    if (
        studyModes[
            studyModeIndex
        ].id === "jlpt"
    ) {

        return jlptLevels;
    }


    return topics;
}


/* =============================================================
   INIT
   ============================================================= */

export function initLobby({
    onSolo,
    onPvp
}) {

    /* BATTLE MODE */

    document
        .getElementById(
            "battleModeNext"
        )
        .addEventListener(
            "click",
            () => {

                battleModeIndex =
                    moveIndex(
                        battleModeIndex,
                        battleModes.length,
                        "next"
                    );


                slideSelector(
                    battleModeValue,
                    battleModes[
                        battleModeIndex
                    ].name,
                    "next"
                );

            }
        );


    document
        .getElementById(
            "battleModePrev"
        )
        .addEventListener(
            "click",
            () => {

                battleModeIndex =
                    moveIndex(
                        battleModeIndex,
                        battleModes.length,
                        "prev"
                    );


                slideSelector(
                    battleModeValue,
                    battleModes[
                        battleModeIndex
                    ].name,
                    "prev"
                );

            }
        );


    /* STUDY MODE */

    function changeStudyMode(
        direction
    ) {

        studyModeIndex =
            moveIndex(
                studyModeIndex,
                studyModes.length,
                direction
            );


        const mode =
            studyModes[
                studyModeIndex
            ];


        slideSelector(
            studyModeValue,
            mode.name,
            direction
        );


        studyTargetIndex = 0;


        const targets =
            getTargets();


        studyTargetLabel.textContent =
            mode.id === "jlpt"
                ? "JLPT LEVEL"
                : "TOPIC";


        slideSelector(
            studyTargetValue,
            targets[0].name,
            direction
        );
    }


    document
        .getElementById(
            "studyModeNext"
        )
        .addEventListener(
            "click",
            () =>
                changeStudyMode(
                    "next"
                )
        );


    document
        .getElementById(
            "studyModePrev"
        )
        .addEventListener(
            "click",
            () =>
                changeStudyMode(
                    "prev"
                )
        );


    /* TARGET */

    function changeTarget(
        direction
    ) {

        const targets =
            getTargets();


        studyTargetIndex =
            moveIndex(
                studyTargetIndex,
                targets.length,
                direction
            );


        slideSelector(
            studyTargetValue,
            targets[
                studyTargetIndex
            ].name,
            direction
        );
    }


    document
        .getElementById(
            "studyTargetNext"
        )
        .addEventListener(
            "click",
            () =>
                changeTarget(
                    "next"
                )
        );


    document
        .getElementById(
            "studyTargetPrev"
        )
        .addEventListener(
            "click",
            () =>
                changeTarget(
                    "prev"
                )
        );


    /* CATEGORY */

    function changeCategory(
        direction
    ) {

        categoryIndex =
            moveIndex(
                categoryIndex,
                categories.length,
                direction
            );


        const category =
            categories[
                categoryIndex
            ];


        slideSelector(
            categoryValue,
            category.name,
            direction
        );


        subModeIndex = 0;


        slideSelector(
            subModeValue,
            subModes[
                category.id
            ][0].name,
            direction
        );
    }


    document
        .getElementById(
            "categoryNext"
        )
        .addEventListener(
            "click",
            () =>
                changeCategory(
                    "next"
                )
        );


    document
        .getElementById(
            "categoryPrev"
        )
        .addEventListener(
            "click",
            () =>
                changeCategory(
                    "prev"
                )
        );


    /* SUB MODE */

    function changeSubMode(
        direction
    ) {

        const category =
            categories[
                categoryIndex
            ];


        const modes =
            subModes[
                category.id
            ];


        subModeIndex =
            moveIndex(
                subModeIndex,
                modes.length,
                direction
            );


        slideSelector(
            subModeValue,
            modes[
                subModeIndex
            ].name,
            direction
        );
    }


    document
        .getElementById(
            "subModeNext"
        )
        .addEventListener(
            "click",
            () =>
                changeSubMode(
                    "next"
                )
        );


    document
        .getElementById(
            "subModePrev"
        )
        .addEventListener(
            "click",
            () =>
                changeSubMode(
                    "prev"
                )
        );


    /* =========================================================
       BATTLE BUTTON
       ========================================================= */

    document
        .getElementById(
            "battleButton"
        )
        .addEventListener(
            "click",
            () => {

                const category =
                    categories[
                        categoryIndex
                    ];


                const config = {

                    battleMode:
                        battleModes[
                            battleModeIndex
                        ].id,

                    studyMode:
                        studyModes[
                            studyModeIndex
                        ].id,

                    target:
                        getTargets()[
                            studyTargetIndex
                        ].id,

                    category:
                        category.id,

                    subMode:
                        subModes[
                            category.id
                        ][
                            subModeIndex
                        ].id

                };


                if (
                    config.battleMode ===
                    "solo"
                ) {

                    stopLobbyMusic();

                    onSolo(config);

                    return;
                }


                onPvp(config);

            }
        );
}
