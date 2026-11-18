
import {
    loadLearningProgress,
    grantLearningStar,
    grantLearningChapter
} from "./learning-firebase.js";

import {
    speakJapanese,
    speakCard,
    stopLearningSpeech
} from "./learning-speech.js";

const $ = id => document.getElementById(id);

const safe = value => String(value ?? "").replace(
    /[&<>"']/g,
    c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c])
);

async function getJSON(path) {
    if (!/^data\/learning\/[\w/-]+\.json$/.test(path)) {
        throw Error("Đường dẫn JSON không hợp lệ");
    }

    const response = await fetch(path, { cache: "no-cache" });

    if (!response.ok) {
        throw Error("Không tải được " + path);
    }

    return response.json();
}

/* ==========================================
   REVIEW SETTINGS
========================================== */

const SETTINGS_KEY = "batlingo_learning_review_settings";

let preferences = {
    autoSpeak: true,
    autoHint: false
};

try {
    preferences = {
        ...preferences,
        ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}")
    };
} catch (e) {
    console.warn("[LEARNING] Invalid settings", e);
}

function savePreferences() {
    localStorage.setItem(
        SETTINGS_KEY,
        JSON.stringify(preferences)
    );
}

/* ==========================================
   STATE
========================================== */

let userData = null;
let courses = [];
let course = null;
let manifest = null;
let chapter = null;
let lesson = null;
let lessonData = null;


let discoveryResult = null;

// Trạng thái kết quả từng bước
let practiceResult = null;
let reverseResult = null;

// Ghi nhớ nơi quay lại từ Collection
let collectionReturn = "quest";

// Vocabulary V5 session state (never used as Firebase authority)
let vocabSelected = "";
let vocabChecked = false;
let vocabCorrect = false;
let vocabTiles = [];
let vocabChosen = [];
let vocabOptions = null;
let vocabReplay = false;



let itemIndex = 0;
let phase = "discover";

let guess = "";
let hint = 0;
let answer = "";
let feedback = "";
let chosen = [];
let busy = false;

let reviewItems = [];
let reviewKind = "";
let reviewIndex = 0;
let manualHint = false;

let testItems = [];
let testIndex = 0;
let testCorrect = 0;
let testExplained = false;
let testChoice = "";
let testCorrectIds = [];
let testFinishing = false;

const cache = new Map();

const root = () => $("learningBody");

const logo = () => `
    <span class="kl-card-logo">
        <span class="kl-logo-bat">BAT</span><span class="kl-logo-lingo">LINGO</span>
    </span>
`;

function stars(value) {
    const n = Math.max(
        0,
        Math.min(5, Number(value) || 0)
    );

    return `
        <span class="kl-stars">
            ${"★".repeat(n)}${"☆".repeat(5 - n)}
        </span>
    `;
}

const card = id =>
    userData?.learning?.cards?.[id] || { stars: 0 };

const rating = id =>
    Number(card(id).stars) || 0;

const typeOf = () =>
    lessonData?.type || "vocabulary";

const titleOf = item =>
    item.word || item.character || item.grammar || "?";

const exampleOf = (item, kind) =>
    kind === "grammar"
        ? item.examples?.[0]
        : item.example;

function on(id, fn) {
    const element = $(id);
    if (element) element.onclick = fn;
}

/* ==========================================
   SPEECH BUTTON
========================================== */

function audioButton(text, label = "Nghe phát âm") {
    return `
        <button
            type="button"
            class="kl-speak-btn"
            data-speak="${safe(text || "")}"
            aria-label="${safe(label)}"
            title="${safe(label)}">
            🔊
        </button>
    `;
}

function bindAudio() {
    root()?.querySelectorAll("[data-speak]").forEach(button => {
        button.onclick = () => {
            speakJapanese(button.dataset.speak);
        };
    });
}

/* ==========================================
   OPTIONAL CARD IMAGE

   false: chưa upload ảnh
   true: bật hình gợi nhớ

   KHÔNG sử dụng ảnh trong Quiz.
========================================== */

const CARD_IMAGES_ENABLED = false;

function cardImageHTML(item, kind, compact = false) {

    if (
        !CARD_IMAGES_ENABLED ||
        kind !== "vocabulary" ||
        !item?.image
    ) {
        return "";
    }

    const path = String(item.image).trim();

    const validPath =
        /^assets\/images\/learning\/vocabulary\/[a-zA-Z0-9_-]+\.(webp|avif)$/i;

    if (!validPath.test(path)) {
        return "";
    }

    return `
        <div class="kl-card-image${compact ? " kl-card-image-small" : ""}">
            <img
                src="${safe(path)}"
                alt=""
                width="256"
                height="192"
                loading="lazy"
                decoding="async">
        </div>
    `;
}

function bindCardImages() {
    root()?.querySelectorAll(
        ".kl-card-image img"
    ).forEach(img => {

        function remove() {
            img.closest(".kl-card-image")?.remove();
        }

        img.addEventListener(
            "error",
            remove,
            { once: true }
        );

        if (img.complete && img.naturalWidth === 0) {
            remove();
        }
    });
}

/* Only cards saved in Firebase are counted. Never count clicks/replays. */
function learningStarStats() {
    const levels = { n5:0, n4:0, n3:0, n2:0, n1:0 };
    const cards = userData?.learning?.cards || {};
    for (const [id, data] of Object.entries(cards)) {
        const levelId = /^n[1-5](?=-)/i.exec(id)?.[0]?.toLowerCase();
        if (levelId) {
            levels[levelId] += Math.max(0, Math.min(5, Number(data?.stars) || 0));
        }
    }
    return { levels, totalStars:Object.values(levels).reduce((a,b)=>a+b,0) };
}

/* ==========================================
   COMMON RENDER
========================================== */

function render(title, html) {

    if ($("learningTitle")) {
        $("learningTitle").textContent = title;
    }

    if (root()) {
        const stats = learningStarStats();
        const activeLevel = course?.id || "n5";
        const levelStars = stats.levels[activeLevel] || 0;
        root().innerHTML = `
            <div class="kl-stars-summary" aria-label="Learning stars">
                <span>${safe(activeLevel.toUpperCase())}: <strong>${levelStars} ★</strong></span>
                <span>ACCOUNT: <strong>${stats.totalStars} ★</strong></span>
            </div>
        ` + html;
    }

    bindAudio();
    bindCardImages();
}

function mascot(message) {

    const id = userData?.mascot?.id || "";

    const mascotName = id.toLowerCase().includes("monkey")
        ? "monkey"
        : "buffalo";

    const level = userData?.progress?.level || 1;
    const exp = userData?.progress?.exp || 0;

    const avatar = id
        ? `<img
              src="assets/mascot/${mascotName}.png"
              alt="Mascot"
              onerror="this.style.display='none'">`
        : `<span class="kl-mascot-emoji">🐃</span>`;

    return `
        <div class="kl-mascot">
            ${avatar}
            <div>
                ${logo()}
                <p>${safe(message)}</p>
            </div>
            <small>LV.${level} · ${exp} EXP</small>
        </div>
    `;
}

function expToast(value) {

    if (!value) return;

    const node = $("learningExpToast");

    if (!node) return;

    node.textContent = `✨ +${value}★`;

    node.classList.remove("kl-exp-show");

    void node.offsetWidth;

    node.classList.add("kl-exp-show");
}

function showError(error) {

    render("LEARNING", `
        <div class="learn-card">
            <h3>Có lỗi xảy ra</h3>
            <p>${safe(error.message || error)}</p>
            <button id="klRetry" class="learn-btn">
                Về khóa học
            </button>
        </div>
    `);

    on("klRetry", showCourses);
}

/* ==========================================
   FIREBASE EXP / CARD STARS
========================================== */

function sync(result) {

    if (result?.userData) {
        userData = result.userData;
    }

    // Learning no longer displays EXP animation; stars are animated at commit.

}


/* ==========================================
   LEARNING - SAVE STAR AND EXP
========================================== */

async function earn(item, targetStars) {

    if (busy) {
        return false;
    }

    if (rating(item.id) >= targetStars) {
        return true;
    }

    busy = true;
    const previousStars = rating(item.id);

    try {

        console.log("[LEARNING] Saving star:", {
            cardId: item.id,
            targetStars,
            currentStars: rating(item.id)
        });

        const result = await grantLearningStar(
            item.id,
            targetStars,
            targetStars === 5 ? chapter?.id : undefined
        );

        if (!result?.committed) {

            throw new Error(
                "Firebase không ghi nhận lần nâng sao này. " +
                "Hãy kiểm tra tiến độ hiện tại và quyền Firebase."
            );
        }

        sync(result);

        const newStars = rating(item.id);
        if (newStars > previousStars) expToast(newStars - previousStars);

        console.log("[LEARNING] Saved:", {
            cardId: item.id,
            stars: newStars,
            exp: result.awardedExp
        });

        if (newStars < targetStars) {

            throw new Error(
                "Đã lưu nhưng số sao chưa đạt yêu cầu."
            );
        }

        return true;

    } catch (error) {

        console.error(
            "[LEARNING] Save star failed:",
            error
        );

        feedback =
            "Không lưu được sao: " +
            (error?.message || String(error));

        renderQuest();

        return false;

    } finally {

        busy = false;
    }
}

/* ==========================================
   LESSON DATA
========================================== */

function typeColor(kind) {
    return ["kanji", "grammar"].includes(kind)
        ? kind
        : "vocabulary";
}

async function lessonDataFor(item) {

    if (!cache.has(item.file)) {
        cache.set(
            item.file,
            await getJSON(item.file)
        );
    }

    return cache.get(item.file);
}

async function lessonReady(item) {

    const data = await lessonDataFor(item);

    return Boolean(data.items?.length) &&
        data.items.every(x => rating(x.id) >= 3);
}

async function readyMap(ch) {

    const result = [];

    for (const item of ch.lessons) {
        result.push(await lessonReady(item));
    }

    return result;
}

/* ==========================================
   ENTRY / HOME
========================================== */

export function initLearning() {

    on("batHomeLearningBtn", openLearning);
    on("learningBackBtn", closeLearning);
}

export async function openLearning() {

    $("setupScreen")?.classList.add("hidden");
    $("learningScreen")?.classList.remove("hidden");

    render(
        "LEARNING",
        `<div class="learn-card">
            Đang tải tiến độ Firebase...
        </div>`
    );

    try {
        userData = await loadLearningProgress();
        await showCourses();
    } catch (error) {
        showError(error);
    }
}

export function closeLearning() {

    stopLearningSpeech();

    $("learningScreen")?.classList.add("hidden");
    $("setupScreen")?.classList.remove("hidden");
    $("homeScreen")?.classList.remove("hidden");
    $("configScreen")?.classList.add("hidden");
}

/* ==========================================
   COURSE SELECTION
========================================== */

async function showCourses() {

    stopLearningSpeech();

    try {

        const data = await getJSON(
            "data/learning/courses.json"
        );

        courses = data.courses || [];

        render("LEARNING", `
            

            <div class="learn-grid">
                ${courses.map(c => `
                    <button
                        class="learn-course"
                        data-course="${safe(c.id)}"
                        ${c.available ? "" : "disabled"}>
                        <strong>${safe(c.title)}</strong>
                        <span>${safe(c.description)}</span>
                    </button>
                `).join("")}
            </div>
        `);

        root().querySelectorAll("[data-course]").forEach(button => {
            button.onclick = () => {
                showChapters(button.dataset.course);
            };
        });

    } catch (error) {
        showError(error);
    }
}

/* ==========================================
   CHAPTER / LESSON PATH
========================================== */

async function showChapters(courseId) {

    stopLearningSpeech();

    course = courses.find(c => c.id === courseId);

    if (!course) return;

    render(
        course.title,
        `<div class="learn-card">Đang tải lộ trình...</div>`
    );

    try {

        manifest = await getJSON(course.manifest);

        let html = `
            <button class="learn-btn" id="klToCourses">
                ← Khóa học
            </button>

            
        `;

        for (
            let i = 0;
            i < manifest.chapters.length;
            i++
        ) {

            const ch = manifest.chapters[i];

            const previousChapter =
                manifest.chapters[i - 1];

            const locked = i > 0 &&
                !userData.learning?.tests?.[
                    previousChapter.id
                ]?.passed;

            const ready = await readyMap(ch);

            html += `
                <section class="learn-card">

                    <h2>
                        ${safe(ch.title)}
                        ${locked ? "🔒" : ""}
                    </h2>

                    <p class="learn-muted">
                        ${safe(ch.description)}
                    </p>

                    <div class="learn-grid">
            `;

            ch.lessons.forEach((l, j) => {

                const restricted =
                    locked || (j > 0 && !ready[j - 1]);

                html += `
                    <button
                        class="learn-course"
                        data-lesson="${safe(l.id)}"
                        ${restricted ? "disabled" : ""}>

                        <strong>${safe(l.title)}</strong>

                        <small>
                            ${
                                ready[j]
                                    ? "✓ Đã đạt 3★"
                                    : restricted
                                        ? "🔒 Chưa đủ sao"
                                        : "Mở bài →"
                            }
                        </small>
                    </button>
                `;
            });

            html += `
                    </div>

                    <button
                        class="learn-btn kl-chapter-test"
                        data-test="${safe(ch.id)}"
                        ${
                            locked || !ready.every(Boolean)
                                ? "disabled"
                                : ""
                        }>
                        🏆 Test chương
                        ${
                            userData.learning?.tests?.[ch.id]?.passed
                                ? "✓"
                                : ""
                        }
                    </button>

                </section>
            `;
        }

        render(course.title, html);

        on("klToCourses", showCourses);

        root().querySelectorAll("[data-lesson]").forEach(button => {
            button.onclick = () => {
                openLesson(button.dataset.lesson);
            };
        });

        root().querySelectorAll("[data-test]").forEach(button => {
            button.onclick = () => {
                openTest(button.dataset.test);
            };
        });

    } catch (error) {
        showError(error);
    }
}

/* ==========================================
   START LESSON
========================================== */


function resetCard() {
    guess = "";
    hint = 0;
    answer = "";
    chosen = [];
    feedback = "";
    manualHint = false;

    discoveryResult = null;
    practiceResult = null;
    reverseResult = null;
    vocabSelected = "";
    vocabChecked = false;
    vocabCorrect = false;
    vocabTiles = [];
    vocabChosen = [];
    vocabOptions = null;
    vocabReplay = false;
    builderState = null;
}


function startPhase() {

    const item = lessonData.items[itemIndex];
    const s = rating(item.id);

    // Vocabulary: recognition is a free learning step; then 1..4★ tests.
    if (typeOf() === "vocabulary") {
        return s >= 4 ? "complete" :
               ["recognize", "meaning", "listening", "hiragana", "sentence"][s];
    }

    if (s >= 4) return "complete";
    if (s === 3) return "reverse";
    if (s === 2) return "practice";
    if (s === 1) return "learn";

    return "discover";
}

async function openLesson(id) {

    lesson = manifest.chapters
        .flatMap(c => c.lessons)
        .find(l => l.id === id);

    if (!lesson) return;

    try {

        lessonData = await lessonDataFor(lesson);

        itemIndex = 0;

        resetCard();

        phase = startPhase();

        renderQuest();

    } catch (error) {
        showError(error);
    }
}

/* ==========================================
   DISCOVERY OPTIONS
========================================== */

function hash(value) {

    let h = 0;

    for (const ch of value) {
        h = (h * 31 + ch.charCodeAt(0)) | 0;
    }

    return h;
}

function optionList(item, kind, pool) {

    const correct = item.meaning;

    const distractors =
        kind === "grammar"
            ? (
                item.discovery?.distractors?.length
                    ? item.discovery.distractors
                    : [
                        "Diễn tả điều kiện giả định",
                        "Diễn tả sự việc vừa hoàn tất",
                        "Diễn tả dự định trong tương lai"
                    ]
            )
            : pool
                .filter(x => x.id !== item.id)
                .map(x => x.meaning);

    const options = [
        correct,
        ...distractors
    ].filter(
        (x, i, arr) =>
            x && arr.indexOf(x) === i
    ).slice(0, 4);

    return options.sort(
        (a, b) =>
            hash(item.id + a) - hash(item.id + b)
    );
}

/* ==========================================
   DISCOVERY EVIDENCE
========================================== */


function evidence(item, kind) {

    if (kind === "vocabulary") {

        const beginner =
            course?.id === "n5" ||
            course?.id === "n4";

        return `
            <div class="kl-giant">
                ${safe(item.word)}

                ${
                    beginner && item.reading
                        ? `<small class="kl-beginner-reading">
                            ${safe(item.reading)}
                           </small>`
                        : ""
                }

                ${audioButton(
                    item.reading || item.word,
                    "Nghe từ vựng"
                )}
            </div>

            <div class="kl-evidence kl-example-evidence">

                <div class="kl-example-audio-line">
                    <b>${safe(item.example?.sentence || "")}</b>
                    ${audioButton(
                        item.example?.sentence,
                        "Nghe câu ví dụ"
                    )}
                </div>

                <small>
                    ${safe(item.example?.reading || "")}
                </small>

            </div>

            <p class="learn-muted">
                Bạn chưa biết từ này?
                Hãy thử đoán hoặc chọn
                "Tôi chưa biết" để khám phá.
            </p>
        `;
    }

    if (kind === "kanji") {

        return `
            <div class="kl-giant">
                ${safe(item.character)}
            </div>

            <p class="learn-muted">
                Quan sát các từ ghép và thử tìm nghĩa chung.
            </p>

            ${(item.relatedWords || [])
                .slice(0, 3)
                .map(w => `
                    <div class="kl-evidence kl-example-evidence">

                        <div class="kl-example-audio-line">
                            <b>${safe(w.word)}</b>
                            ${audioButton(w.reading || w.word)}
                        </div>

                        <small>${safe(w.reading || "")}</small>
                        <small>${safe(w.meaning || "")}</small>

                    </div>
                `).join("")}
        `;
    }

    return `
        <div class="kl-giant">
            ${safe(item.grammar)}
        </div>

        <p class="learn-muted">
            Đọc các câu ví dụ.
            Bạn nhận thấy mẫu ngữ pháp này
            có ý nghĩa gì?
        </p>

        ${(item.examples || [])
            .slice(0, 3)
            .map(e => `
                <div class="kl-evidence kl-example-evidence">

                    <div class="kl-example-audio-line">
                        <b>${safe(e.sentence)}</b>
                        ${audioButton(e.sentence)}
                    </div>

                    <small>${safe(e.translation)}</small>

                </div>
            `).join("")}
    `;
}


/* ==========================================
   EXAMPLE CARD
========================================== */


function exampleHTML(ex, allowHint = true) {

    if (!ex) return "";

    return `
        <div class="kl-evidence kl-example-evidence">

            <div class="kl-example-audio-line">

                <b>${safe(ex.sentence || "")}</b>

                ${audioButton(
                    ex.sentence,
                    "Nghe câu ví dụ"
                )}

            </div>

            ${
                allowHint
                    ? `
                        <small>
                            ${safe(ex.reading || "")}
                        </small>

                        <small>
                            ${safe(ex.translation || "")}
                        </small>
                    `
                    : ""
            }

        </div>
    `;
}


/* ==========================================
   LEARN CONTENT
========================================== */

function learnHTML(item, kind) {

    let html = `
        <div class="kl-stage-label">
            📖 LEARN — Học sau khi suy luận
        </div>

        ${cardImageHTML(item, kind)}

        <div class="kl-giant">
            ${safe(titleOf(item))}

            ${
                kind === "vocabulary"
                    ? audioButton(item.reading || item.word)
                    : ""
            }
        </div>

        <p class="kl-hv">
            ${safe(item.hanViet || "")}
            ·
            ${safe(item.meaning)}
        </p>
    `;

    if (kind === "vocabulary") {

        html += `
            <p>${safe(item.reading)}</p>
            <p>${safe(item.explanation || "")}</p>
            ${exampleHTML(item.example)}
        `;
    }

    if (kind === "kanji") {

        const onRead =
            item.readings?.on || item.onyomi || [];

        const kunRead =
            item.readings?.kun || item.kunyomi || [];

        html += `
            <div class="kl-evidence">
                <b>音読み · ON</b>
                ${onRead.map(x => `
                    ${safe(x)}
                    ${audioButton(x)}
                `).join(" ") || "—"}

                <b>訓読み · KUN</b>
                ${kunRead.map(x => `
                    ${safe(x)}
                    ${audioButton(x)}
                `).join(" ") || "—"}
            </div>

            <p>${safe(item.explanation || "")}</p>
        `;

        html += (item.relatedWords || [])
            .map(w => `
                <div class="kl-evidence">
                    <div class="kl-audio-line">
                        <b>${safe(w.word)}</b>
                        ${audioButton(w.reading || w.word)}
                    </div>

                    <small>${safe(w.reading)}</small>
                    <small>${safe(w.hanViet || "")}</small>
                    <small>${safe(w.meaning)}</small>
                </div>
            `).join("");
    }

    if (kind === "grammar") {

        html += `
            <p>
                <b>Độ ưu tiên:</b>
                ${stars(item.priorityStars || 0)}
            </p>

            <p>
                <b>Cách chia / Cấu trúc:</b>
                ${safe(item.formation || "")}
            </p>

            <p>${safe(item.explanation || "")}</p>
        `;

        html += (item.usageDetails || [])
            .map(detail => `
                <div class="kl-evidence">
                    <b>${safe(detail.title)}</b>
                    <small>${safe(detail.text)}</small>
                </div>
            `).join("");

        if (item.commonMistakes?.length) {

            html += `
                <h3>Lỗi thường gặp</h3>

                <ul>
                    ${item.commonMistakes.map(x => `
                        <li>${safe(x)}</li>
                    `).join("")}
                </ul>
            `;
        }

        html += `
            <h3>Ba ví dụ ngữ pháp</h3>
            ${(item.examples || [])
                .map(e => exampleHTML(e))
                .join("")}
        `;
    }

    return html;
}

/* ==========================================
   PRACTICE
========================================== */

/* =========================================================
   BATLINGO LEARNING V6 - TAP TO ARRANGE (NO KEYBOARD)
   Stable tile ids allow repeated Japanese characters/words.
   This state is session-only; Firebase receives only earned stars.
========================================================= */
let builderState = null;

function cardTier(id) {
    return "kl-rarity-" + Math.max(0, Math.min(5, rating(id)));
}

function builderTextParts(text, reading = false) {
    const original = String(text || "").normalize("NFC");
    if (!original) return [];
    const chars = Array.from(original);
    if (reading) {
        // Kana chunks rather than keyboard input; preserve small kana/long vowel.
        const parts = [];
        for (let i = 0; i < chars.length; i++) {
            const c = chars[i];
            if (/[ゃゅょぁぃぅぇぉっャュョァィゥェォー]/u.test(c) && parts.length) {
                parts[parts.length - 1] += c;
            } else {
                parts.push(c);
            }
        }
        if (parts.length > 9) {
            const merged = [];
            for (let i = 0; i < parts.length; i += 2) merged.push(parts.slice(i, i + 2).join(""));
            return merged;
        }
        return parts;
    }
    // Prefer linguistically-aware Japanese word segmentation when available.
    let units;
    if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
        units = [...new Intl.Segmenter("ja", { granularity:"word" }).segment(original)]
            .map(x => x.segment);
    } else {
        units = chars;
    }
    const parts = [];
    const targetSize = Math.max(2, Math.ceil(units.length / 6));
    for (let i = 0; i < units.length; i += targetSize) {
        parts.push(units.slice(i, i + targetSize).join(""));
    }
    return parts;
}

function builderConfig(item, kind, currentPhase) {
    if (kind === "grammar") {
        const ex = currentPhase === "reverse"
            ? (item.examples?.find(e => e.chunks?.length &&
                e.chunks.join("") === e.sentence && !e.excludeFromAssessment) ||
                item.examples?.find(e => !e.excludeFromAssessment) || item.examples?.[0])
            : (item.examples?.find(e => e.answer && !e.excludeFromAssessment) || item.examples?.[0]);
        if (!ex) return null;
        if (currentPhase === "practice") {
            const target = String(ex.answer || "");
            if (!target) return null;
            return { key:item.id+":practice", target,
                parts:builderTextParts(target, true),
                prompt:"Ghép mẫu ngữ pháp còn thiếu", context:ex.blank || "",
                translation:ex.translation || "", reason:ex.reason || item.explanation || "",
                wrongReason:ex.wrongReason || ex.reason || "" };
        }
        const target = String(ex.sentence || "");
        const chunks = Array.isArray(ex.chunks) && ex.chunks.length > 1 &&
            ex.chunks.join("") === target ? ex.chunks : builderTextParts(target);
        return {key:item.id+":reverse",target,parts:chunks,
            prompt:"Sắp xếp các cụm thành câu tiếng Nhật",context:"",
            translation:ex.translation || "",reason:ex.reason || item.explanation || "",
            wrongReason:ex.wrongReason || ex.reason || ""};
    }
    if (kind === "kanji") {
        const w = item.relatedWords?.[currentPhase === "reverse" ? 1 : 0] ||
            item.relatedWords?.[0];
        const target = String(w?.reading || item.readings?.kun?.[0] || item.readings?.on?.[0] || "");
        if (!target) return null;
        return {key:item.id+":"+currentPhase,target,parts:builderTextParts(target,true),
            prompt:"Ghép đúng cách đọc Hiragana",context:w?.word || item.character || "",
            translation:w?.meaning || item.meaning || "",reason:`${w?.word || item.character}: ${target}`,
            wrongReason:"Hãy quan sát âm đọc của từng ký tự và ghép lại theo thứ tự."};
    }
    if (kind === "vocabulary" && currentPhase === "hiragana") {
        const target = String(item.reading || "").normalize("NFC");
        if (!target) return null;
        return {key:item.id+":hiragana",target,parts:builderTextParts(target,true),
            prompt:"Ghép đúng cách đọc Hiragana",context:item.word || "",
            translation:item.meaning || "",reason:`${item.word}: ${target}`,
            wrongReason:"Hãy nghe phát âm và xem lại thứ tự các chữ Hiragana."};
    }
    if (kind === "vocabulary" && currentPhase === "sentence") {
        const ex = item.example || {};
        const filled = ex.blank?.includes("____")
            ? ex.blank.replace("____",ex.answer || item.word || "") : "";
        const target = String(ex.sentence || filled || "");
        if (!target) return null;
        const parts = Array.isArray(ex.chunks) && ex.chunks.length > 1 &&
            ex.chunks.join("") === target ? ex.chunks : builderTextParts(target);
        return {key:item.id+":sentence",target,parts,
            prompt:"Ghép câu tiếng Nhật theo nghĩa",context:"",
            translation:ex.translation || item.meaning || "",reason:ex.reason || "",
            wrongReason:ex.wrongReason || "Hãy xem lại từ vựng trong câu."};
    }
    return null;
}

function prepareBuilder(item, kind, currentPhase) {
    const config = builderConfig(item,kind,currentPhase);
    if (!config || !config.parts?.length || config.parts.join("") !== config.target) {
        return null;
    }
    if (builderState?.key !== config.key) {
        const tiles = config.parts.map((text,id) => ({id,text}));
        const shuffled = vocabShuffle(tiles);
        if (shuffled.length > 1 && shuffled.every((x,i) => x.id === i)) shuffled.reverse();
        builderState = {key:config.key, config, tiles:shuffled, chosen:[],
            hintShown:false, attempts:0};
    }
    return builderState;
}

function builderBuilt() {
    if (!builderState) return "";
    return builderState.chosen.map(id => builderState.tiles.find(x=>x.id===id)?.text || "").join("");
}

function builderHTML(item,kind,currentPhase) {
    const b = prepareBuilder(item,kind,currentPhase);
    if (!b) return `<div class="kl-feedback">Dữ liệu bài tập chưa đủ để ghép mảnh. Hãy kiểm tra reading / examples / chunks của JSON.</div>`;
    const cfg = b.config;
    const remaining = b.tiles.filter(x => !b.chosen.includes(x.id));
    const next = cfg.parts[b.chosen.length] || "";
    return `
       <div class="kl-builder" aria-label="Ghép mảnh tiếng Nhật">
           <p class="kl-builder-prompt">🧩 ${safe(cfg.prompt)}</p>
           ${cfg.translation ? `<div class="kl-builder-translation">${safe(cfg.translation)}</div>` : ""}
           ${cfg.context ? `<div class="kl-builder-context">${safe(cfg.context)}</div>` : ""}
           <div class="kl-builder-label">Câu trả lời · ${b.chosen.length}/${b.tiles.length} mảnh</div>
           <div class="kl-builder-answer" aria-label="Mảnh đã chọn">
               ${b.chosen.length ? b.chosen.map((id,i)=>{
                   const tile=b.tiles.find(x=>x.id===id);
                   return `<button type="button" class="kl-builder-tile chosen" data-builder-remove="${i}" ${busy?'disabled':''}>${safe(tile?.text)} <span aria-hidden="true">×</span></button>`;
               }).join("") : `<span class="kl-builder-placeholder">Chạm các mảnh phía dưới để ghép đáp án</span>`}
           </div>
           <div class="kl-builder-label">Các mảnh có sẵn</div>
           <div class="kl-builder-tray" aria-label="Mảnh chưa chọn">
               ${remaining.map(t=>`<button type="button" class="kl-builder-tile" data-builder-pick="${t.id}" ${busy?'disabled':''}>${safe(t.text)}</button>`).join("") || `<span class="kl-builder-placeholder">Đã chọn tất cả các mảnh</span>`}
           </div>
           <div class="kl-builder-tools">
               <button type="button" class="learn-btn" id="klBuilderUndo" ${!b.chosen.length||busy?'disabled':''}>↶ Hoàn tác</button>
               <button type="button" class="learn-btn" id="klBuilderReset" ${!b.chosen.length||busy?'disabled':''}>↻ Làm lại</button>
               <button type="button" class="learn-btn" id="klBuilderHint" ${busy?'disabled':''}>💡 Gợi ý</button>
           </div>
           ${b.hintShown ? `<div class="kl-builder-hint">Mảnh tiếp theo bắt đầu bằng: <strong>${safe(Array.from(next)[0] || 'Đã hoàn tất')}</strong></div>` : ''}
       </div>`;
}

function bindBuilderEvents() {
    if (!builderState) return;
    root()?.querySelectorAll('[data-builder-pick]').forEach(button=>{
        button.onclick=()=>{
            if (busy) return;
            const id=Number(button.dataset.builderPick);
            if (!builderState.chosen.includes(id)) builderState.chosen.push(id);
            builderState.hintShown=false;
            renderQuest();
        };
    });
    root()?.querySelectorAll('[data-builder-remove]').forEach(button=>{
        button.onclick=()=>{
            if (busy) return;
            builderState.chosen.splice(Number(button.dataset.builderRemove),1);
            builderState.hintShown=false;
            renderQuest();
        };
    });
    on('klBuilderUndo',()=>{
        if (busy) return;
        builderState.chosen.pop();builderState.hintShown=false;renderQuest();
    });
    on('klBuilderReset',()=>{
        if (busy) return;
        builderState.chosen=[];builderState.hintShown=false;renderQuest();
    });
    on('klBuilderHint',()=>{
        if (busy) return;
        // Correct next tile after the already selected prefix, never inject answers.
        builderState.hintShown=true;renderQuest();
    });
}

function practiceHTML(item, kind) {
    return builderHTML(item,kind,"practice");
}

function reverseHTML(item, kind) {
    return builderHTML(item,kind,"reverse");
}

/* ==========================================
   COMPLETE KNOWLEDGE CARD
========================================== */

function knowledgeCard(
    item,
    kind,
    { hinted = true, embedded = false } = {}
) {

    let body = `
        <div class="kl-giant">
            ${safe(titleOf(item))}

            ${
                kind === "vocabulary"
                    ? audioButton(item.reading || item.word)
                    : ""
            }
        </div>
    `;

    if (kind === "vocabulary") {

        if (hinted) {
            body += `
                <p>
                    ${safe(item.reading)}
                    ·
                    ${safe(item.hanViet)}
                </p>

                <p>${safe(item.meaning)}</p>
            `;
        }

        body += exampleHTML(item.example, hinted);
    }

    if (kind === "kanji") {

        if (hinted) {
            body += `
                <p>
                    Âm Hán Việt: ${safe(item.hanViet)}
                    · ${safe(item.meaning)}
                </p>

                <p>
                    ON:
                    ${(item.readings?.on || [])
                        .map(r => `
                            ${safe(r)}
                            ${audioButton(r)}
                        `).join(" ") || "—"}
                </p>

                <p>
                    KUN:
                    ${(item.readings?.kun || [])
                        .map(r => `
                            ${safe(r)}
                            ${audioButton(r)}
                        `).join(" ") || "—"}
                </p>
            `;
        }

        body += (item.relatedWords || [])
            .map(w => `
                <div class="kl-evidence">
                    ${safe(w.word)}
                    ${audioButton(w.reading || w.word)}

                    ${
                        hinted
                            ? `
                                <small>
                                    ${safe(w.reading)}
                                    · ${safe(w.hanViet || "")}
                                    · ${safe(w.meaning)}
                                </small>
                            `
                            : ""
                    }
                </div>
            `).join("");
    }

    if (kind === "grammar") {

        if (hinted) {

            body += `
                <p>${safe(item.meaning)}</p>

                <p>
                    <b>Cấu trúc:</b>
                    ${safe(item.formation)}
                </p>

                <p>${safe(item.explanation)}</p>
            `;

            body += (item.usageDetails || [])
                .map(detail => `
                    <div class="kl-evidence">
                        <b>${safe(detail.title)}</b>
                        <small>${safe(detail.text)}</small>
                    </div>
                `).join("");
        }

        body += (item.examples || [])
            .map(e => exampleHTML(e, hinted))
            .join("");
    }

    
    const content = `
        ${cardImageHTML(item, kind)}
        ${body}
    `;

    // Đang nằm trong khung thẻ chính:
    // Không thêm logo và khung thẻ lần hai.
    if (embedded) {
        return content;
    }

    // Dùng trong Review hoặc Card Detail:
    // Hiển thị thẻ hoàn chỉnh.
    return `
        <section
            class="kl-quest-card kl-type-${typeColor(kind)} ${cardTier(item.id)}">

            <div class="learn-row kl-card-topline">
                ${logo()}
                ${stars(rating(item.id))}
            </div>

            ${content}

        </section>
    `;
}


/* =========================================================
   VOCABULARY V5: RECOGNIZE -> 1★ -> 2★ -> 3★ -> 4★
   5★ is granted ONLY after Chapter Test.
========================================================= */

function vocabShuffle(array) {
    const a = [...array];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i],a[j]] = [a[j],a[i]];
    }
    return a;
}

function vocabChoices(item, mode) {
    const correct = mode === "sentence"
        ? item.example?.answer || item.word
        : item.meaning;
    const keys = mode === "sentence"
        ? (item.choices?.sentence || [])
        : (item.choices?.meaning || []);
    const source = lessonData.items.map(x => mode === "sentence" ? x.word : x.meaning);
    const fallbacks = mode === "sentence"
        ? ["先生", "学生", "大学", "学校", "日本", "時間", "仕事"]
        : ["Học sinh, sinh viên", "Giáo viên, thầy cô", "Trường đại học", "Nhật Bản", "Thời gian", "Công việc"];
    const distractors = [...new Set([...keys,...source,...fallbacks]
        .filter(x => x && x !== correct))];
    return vocabShuffle([correct,...vocabShuffle(distractors).slice(0,2)]);
}

function vocabGetOptions(item) {
    if (!vocabOptions || vocabOptions.phase !== phase || vocabOptions.id !== item.id) {
        vocabOptions = { id:item.id, phase, values:vocabChoices(item, phase) };
    }
    return vocabOptions.values;
}

function vocabPrepareTiles(item) {
    if (vocabTiles.length) return;
    const chars = Array.from(String(item.reading || "").normalize("NFC"));
    vocabTiles = vocabShuffle(chars.map((char,id) => ({ id,char })));
    if (chars.length > 1 && vocabTiles.map(x=>x.char).join("") === chars.join("")) {
        vocabTiles.reverse();
    }
    vocabChosen = [];
}

function vocabBuilt() {
    return vocabChosen.map(id => vocabTiles.find(t=>t.id===id)?.char || "").join("").normalize("NFC");
}

function vocabStageName() {
    return ({recognize:"NHẬN DIỆN · KHÔNG SAO", meaning:"CHỌN NGHĨA · 1★",
        listening:"NGHE & HIỂU · 2★", hiragana:"GHÉP HIRAGANA · 3★",
        sentence:"ĐIỀN TỪ VÀO CÂU · 4★", complete:"HOÀN THÀNH · CHỜ TEST 5★"})[phase] || "VOCABULARY";
}

function renderVocabularyQuest(item) {
    const currentStars = rating(item.id);
    const recognized = phase === "recognize";
    const isComplete = phase === "complete";
    const question = !recognized && !isComplete;
    const opts = (phase === "meaning" || phase === "listening")
        ? vocabGetOptions(item) : [];
    if (phase === "hiragana" || phase === "sentence") prepareBuilder(item,"vocabulary",phase);
    const expected = (phase === "sentence" || phase === "hiragana")
        ? (builderState?.config?.target || "") : item.meaning;
    let content = "";
    const showCard = phase !== "listening";
    if (recognized) {
        content = `
            <div class="kl-vocab-hero"><div class="kl-vocab-word">${safe(item.word)}</div>
                <div class="kl-vocab-reading">${safe(item.reading)}</div>
                <div class="kl-vocab-meaning">${safe(item.meaning)}</div>
                ${audioButton(item.reading || item.word,"Nghe từ")}
            </div>
            ${exampleHTML(item.example)}
            <p class="learn-muted">Hãy nhìn, nghe và hiểu từ mới. Bạn chưa cần đoán hay gõ tiếng Nhật.</p>
            <button class="learn-btn primary kl-vocab-wide" id="klVocabRecognized">Mình đã hiểu · Bắt đầu →</button>`;
    } else if (phase === "meaning") {
        content = `<div class="kl-vocab-hero"><div class="kl-vocab-word">${safe(item.word)}</div>
            <div class="kl-vocab-reading">${safe(item.reading)}</div></div>
            <p class="kl-vocab-prompt">Chọn nghĩa tiếng Việt của từ này</p>`;
    } else if (phase === "listening") {
        content = `<div class="kl-vocab-hero"><div class="kl-vocab-headphone">🎧</div>
            <p>Nghe từ tiếng Nhật rồi chọn nghĩa</p>
            <button id="klVocabListen" class="learn-btn">🔊 Nghe từ · có thể nghe lại</button></div>`;
    } else if (phase === "hiragana" || phase === "sentence") {
        content = builderHTML(item,"vocabulary",phase);
    } else {
        content = `<div class="kl-vocab-hero"><div class="kl-vocab-word">${safe(item.word)}</div>
            <div class="kl-vocab-reading">${safe(item.reading)}</div>
            <div class="kl-vocab-meaning">${safe(item.meaning)}</div></div>
            ${exampleHTML(item.example)}
            <p class="learn-muted">${currentStars===5?'🏆 MASTER CARD 5★':'Đã đạt 4★. Chỉ Chapter Test mới mở khóa 5★.'}</p>
            <div class="learn-actions"><button class="learn-btn" id="klVocabReplay">↺ Học lại (không cộng sao)</button></div>`;
    }
    if (opts.length) {
        content += `<div class="kl-options">${opts.map((option,i)=>`
            <button type="button" class="kl-option${vocabSelected===option?' selected':''}${vocabChecked&&option===expected?' kl-vocab-right':''}${vocabChecked&&vocabSelected===option&&!vocabCorrect?' kl-vocab-wrong':''}"
            data-vocab-choice="${i}" ${vocabChecked?'disabled':''}>${safe(option)}</button>`).join('')}</div>`;
    }
    if (question) {
        if (vocabChecked) {
            content += `<div role="status" class="kl-vocab-result ${vocabCorrect?'correct':'wrong'}">
                <b>${vocabCorrect?'🎉 Chính xác! Bạn đã mở khóa một sao mới.':'💪 Chưa đúng, nhưng bạn đang tiến bộ. Hãy thử lại!'}</b>
                ${!vocabCorrect?`<p>Đáp án: <strong>${safe(expected)}</strong></p>`:''}
            </div><div class="learn-actions"><button class="learn-btn primary" id="klVocabAfter">
                ${vocabCorrect?'Tiếp tục →':'↺ Thử lại'}</button></div>`;
        } else {
            const disabled = busy || ((phase==='hiragana' || phase==='sentence')
                ? !builderState || builderState.chosen.length!==builderState.tiles.length : !vocabSelected);
            content += `<div class="learn-actions"><button class="learn-btn primary" id="klVocabCheck" ${disabled?'disabled':''}>Kiểm tra đáp án</button></div>`;
        }
    }
    render(lesson.title, `
        <div class="learn-row kl-quest-toolbar"><button id="klPath" class="learn-btn">← Lộ trình</button>
            <button id="klCollection" class="learn-btn">▦ Collection</button>
            <span class="learn-muted">Thẻ ${itemIndex+1}/${lessonData.items.length}</span></div>
        <section class="kl-quest-card kl-type-vocabulary ${cardTier(item.id)}">
            <div class="learn-row kl-card-topline">${logo()} ${stars(currentStars)}</div>
            <div class="kl-stage-label">${vocabStageName()}</div>${content}
            <div class="learn-actions">
                <button class="learn-btn" id="klPrev" ${itemIndex===0?'disabled':''}>← Trước</button>
                <button class="learn-btn primary" id="klNext" ${currentStars<3?'disabled':''}>
                    ${itemIndex===lessonData.items.length-1?'Kết thúc bài':'Thẻ tiếp →'}</button>
            </div>
            ${feedback?`<div class="kl-feedback">${safe(feedback)}</div>`:''}
        </section>`);
    on("klPath", ()=>showChapters(course.id));
    on("klCollection", ()=>openCollection("quest"));
    on("klPrev", ()=>moveCard(-1));
    on("klNext", ()=>moveCard(1));
    bindBuilderEvents();
    on("klVocabRecognized", ()=> { phase="meaning"; renderQuest(); });
    on("klVocabListen", ()=>speakJapanese(item.reading || item.word));
    on("klVocabReplay", ()=>{
        vocabReplay=true;
        phase="recognize";
        vocabOptions=null;
        renderQuest();
    });
    root()?.querySelectorAll('[data-vocab-choice]').forEach(button=>{
        button.onclick=()=>{
            if(vocabChecked||busy)return;
            vocabSelected=opts[Number(button.dataset.vocabChoice)];
            renderQuest();
        };
    });
    root()?.querySelectorAll('[data-vocab-pick]').forEach(button=>{
        button.onclick=()=>{
            if(vocabChecked||busy)return;
            const id=Number(button.dataset.vocabPick);
            if(!vocabChosen.includes(id))vocabChosen.push(id);
            renderQuest();
        };
    });
    root()?.querySelectorAll('[data-vocab-remove]').forEach(button=>{
        button.onclick=()=>{
            if(vocabChecked||busy)return;
            const id=Number(button.dataset.vocabRemove);
            vocabChosen=vocabChosen.filter(x=>x!==id);
            renderQuest();
        };
    });
    on("klVocabCheck",async()=>{
        if(vocabChecked||busy)return;
        const currentPhase=phase;
        const actual=(phase==='hiragana'||phase==='sentence') ? builderBuilt() : vocabSelected;
        const ok=normalize(actual)===normalize(expected);
        if(ok) {
            const target={meaning:1,listening:2,hiragana:3,sentence:4}[currentPhase];
            if(rating(item.id)<target) {
                if(!(await earn(item,target)))return;
            }
        }
        vocabChecked=true;
        vocabCorrect=ok;
        renderQuest();
    });
    on("klVocabAfter",()=>{
        if(vocabCorrect){
            phase=({meaning:'listening',listening:'hiragana',hiragana:'sentence',sentence:'complete'})[phase];
        }
        vocabSelected="";
        vocabChecked=false;
        vocabCorrect=false;
        vocabChosen=[];
        vocabOptions=null;
        builderState=null;
        if(phase==='hiragana')vocabTiles=[];
        feedback="";
        renderQuest();
    });
}

/* ==========================================
   QUEST SCREEN
========================================== */

function renderQuest() {

    const item = lessonData?.items?.[itemIndex];

    if (!item) return;

    const kind = typeOf();
    if (kind === "vocabulary") {
        renderVocabularyQuest(item);
        return;
    }
    const s = rating(item.id);

    
let html = `
    <div class="learn-row kl-quest-toolbar">

        <button
            id="klPath"
            class="learn-btn">
            ← Lộ trình
        </button>

        <button
            id="klCollection"
            class="learn-btn">
            ▦ Collection
        </button>

        <span class="learn-muted">
            ${itemIndex + 1}/${lessonData.items.length}
        </span>

    </div>

    <section
        class="kl-quest-card kl-type-${typeColor(kind)} ${cardTier(item.id)}">

        <div class="learn-row kl-card-topline">
            ${logo()}
            ${stars(s)}
        </div>
`;


    
if (phase === "discover") {

    const options = optionList(
        item,
        kind,
        lessonData.items
    );

    const completed = discoveryResult !== null;

    html += `
        <div class="kl-stage-label">
            🔍 DISCOVER · Khám phá kiến thức
        </div>

        <p class="learn-muted">
            Không cần biết trước.
            Hãy thử suy luận hoặc khám phá đáp án.
        </p>

        ${evidence(item, kind)}
    `;

    if (!completed) {

        html += `
            <div class="kl-options">

                ${options.map((option, i) => `
                    <button
                        class="kl-option ${
                            guess === option ? "selected" : ""
                        }"
                        data-choice="${i}">

                        ${safe(option)}

                    </button>
                `).join("")}

            </div>
        `;

        if (hint > 0) {

            let hintText = "";

            if (kind === "vocabulary") {

                hintText =
                    item.example?.reading ||
                    "Hãy quan sát vị trí từ trong câu.";

            } else if (kind === "kanji") {

                hintText =
                    "Nhìn các từ ghép và tìm điểm chung.";

            } else {

                hintText =
                    item.examples?.[0]?.reading ||
                    "Hãy so sánh các câu ví dụ.";
            }

            html += `
                <div class="kl-hint">
                    💡 ${safe(hintText)}
                </div>
            `;
        }

        html += `
            <div class="learn-actions">

                <button
                    id="klHint"
                    class="learn-btn">
                    💡 Gợi ý
                </button>

                <button
                    id="klGuess"
                    class="learn-btn primary"
                    ${!guess ? "disabled" : ""}>
                    Kiểm tra đáp án
                </button>

            </div>

            <button
                id="klDiscoverUnknown"
                class="learn-btn kl-discover-unknown">

                Tôi chưa biết · Xem đáp án

            </button>
        `;

    } else {

        const correct = discoveryResult.correct;
        const unknown = discoveryResult.unknown;

        const message = unknown
            ? "Bạn vừa khám phá được một kiến thức mới!"
            : correct
                ? "🎉 Chính xác! Suy luận tốt lắm!"
                : "💪 Chưa đúng, nhưng bạn đã tiến thêm một bước!";

        html += `
            <div
                class="kl-discovery-result ${
                    correct ? "correct" : "wrong"
                }"
                role="status">

                <h3>${safe(message)}</h3>

                <p class="kl-result-answer">

                    <strong>${safe(titleOf(item))}</strong>

                    ${
                        kind === "vocabulary"
                            ? `（${safe(item.reading)}）`
                            : ""
                    }

                    — ${safe(item.meaning)}

                </p>

                <p>
                    ${safe(
                        item.explanation ||
                        "Xem tiếp phần Learn để hiểu cách sử dụng."
                    )}
                </p>

                <p class="kl-result-reward">
                    ★ 1 sao đã mở khóa
                </p>

            </div>

            <div class="learn-actions">

                <button
                    id="klContinueLearn"
                    class="learn-btn primary">

                    📖 Tiếp tục học →

                </button>

            </div>
        `;
    }

}else if (phase === "learn") {

        html += `
            ${learnHTML(item, kind)}

            <div class="learn-actions">
                <button
                    id="klLearnDone"
                    class="learn-btn primary">
                    Đã học → 2★
                </button>
            </div>
        `;

    
} else if (phase === "practice") {

    html += `
        <div class="kl-stage-label">
            🎯 PRACTICE · 3★
        </div>

        ${
            practiceResult?.correct
                ? ""
                : practiceHTML(item, kind)
        }

        ${
            practiceResult
                ? `
                    <div
                        class="kl-discovery-result ${
                            practiceResult.correct
                                ? "correct"
                                : "wrong"
                        }">

                        <h3>
                            ${
                                practiceResult.correct
                                    ? "🎉 Làm tốt lắm! Bạn đã ghi nhớ kiến thức."
                                    : "💪 Chưa đúng, cứ luyện thêm nhé!"
                            }
                        </h3>

                        <p>
                            ${safe(practiceResult.message)}
                        </p>

                    </div>
                `
                : ""
        }

        <div class="learn-actions">

            ${
                practiceResult?.correct
                    ? `
                        <button
                            id="klPracticeContinue"
                            class="learn-btn primary">
                            Tiếp tục thử thách →
                        </button>
                    `
                    : `
                        <button
                            id="klCheck"
                            class="learn-btn primary" ${busy || !builderState || builderState.chosen.length !== builderState.tiles.length ? "disabled" : ""}>
                            Kiểm tra
                        </button>
                    `
            }

        </div>
    `;


    
} else if (phase === "reverse") {

    html += `
        <div class="kl-stage-label">
            🧩 REVERSE CHALLENGE · 4★
        </div>

        ${
            reverseResult?.correct
                ? ""
                : reverseHTML(item, kind)
        }

        ${
            reverseResult
                ? `
                    <div
                        class="kl-discovery-result ${
                            reverseResult.correct
                                ? "correct"
                                : "wrong"
                        }">

                        <h3>
                            ${
                                reverseResult.correct
                                    ? "🏆 Tuyệt vời! Bạn đã vận dụng đúng."
                                    : "💪 Thử lại nào, bạn đang tiến bộ!"
                            }
                        </h3>

                        <p>
                            ${safe(reverseResult.message)}
                        </p>

                    </div>
                `
                : ""
        }

        <div class="learn-actions">

            ${
                reverseResult?.correct
                    ? `
                        <button
                            id="klReverseContinue"
                            class="learn-btn primary">
                            Xem thẻ 4★ →
                        </button>
                    `
                    : `
                        <button
                            id="klReverseCheck"
                            class="learn-btn primary" ${busy || !builderState || builderState.chosen.length !== builderState.tiles.length ? "disabled" : ""}>
                            Kiểm tra thử thách
                        </button>
                    `
            }

        </div>
    `;


    } else {

        html += `
            <div class="kl-stage-label">
                ${
                    s === 5
                        ? "🏆 MASTER CARD 5★"
                        : "✓ Đạt 4★ · Chờ Chapter Test"
                }
            </div>

            ${knowledgeCard(item, kind, { embedded: true })}

            <p class="learn-muted">
                ${
                    s === 5
                        ? "Thẻ đã hoàn thiện!"
                        : "Đạt 5★ khi trả lời đúng thẻ trong Chapter Test."
                }
            </p>
        `;
    }

    if (feedback) {
        html += `
            <div class="kl-feedback">
                ${safe(feedback)}
            </div>
        `;
    }

    html += `
        <div class="learn-actions">

            <button
                id="klPrev"
                class="learn-btn"
                ${itemIndex === 0 ? "disabled" : ""}>
                ← Trước
            </button>

            <button
                id="klNext"
                class="learn-btn primary"
                ${s < 3 ? "disabled" : ""}>
                ${
                    itemIndex === lessonData.items.length - 1
                        ? "Kết thúc"
                        : "Next →"
                }
            </button>

        </div>

        </section>
    `;

    render(lesson.title, html);

    on("klPath", () => showChapters(course.id));
    on("klCollection", () => openCollection("quest"));
    on("klPrev", () => moveCard(-1));
    on("klNext", () => moveCard(1));

    root().querySelectorAll("[data-jump]").forEach(button => {
        button.onclick = () => {
            itemIndex = Number(button.dataset.jump);
            resetCard();
            phase = startPhase();
            renderQuest();
        };
    });

    
/* ==========================================
   DISCOVERY EVENTS
========================================== */

if (phase === "discover") {

    const options = optionList(
        item,
        kind,
        lessonData.items
    );

    if (!discoveryResult) {

        root()
            .querySelectorAll("[data-choice]")
            .forEach(button => {

                button.onclick = () => {

                    if (busy) return;

                    guess = options[
                        Number(button.dataset.choice)
                    ];

                    renderQuest();
                };
            });

        on("klHint", () => {

            hint++;

            renderQuest();
        });

        async function finishDiscovery(unknown) {

            if (busy || discoveryResult) return;

            if (!unknown && !guess) return;

            const correct =
                !unknown && guess === item.meaning;

            const button = $(
                unknown
                    ? "klDiscoverUnknown"
                    : "klGuess"
            );

            if (button) {
                button.disabled = true;
                button.textContent = "⏳ Đang lưu sao...";
            }

            // Lưu sao thật vào Firebase.
            const success = await earn(item, 1);

            if (!success) {

                if (button?.isConnected) {
                    button.disabled = false;

                    button.textContent = unknown
                        ? "Tôi chưa biết · Xem đáp án"
                        : "Kiểm tra đáp án";
                }

                return;
            }

            feedback = "";

            discoveryResult = {
                correct,
                unknown
            };

            // Dừng ở màn phản hồi.
            // Không chuyển thẳng sang Learn.
            renderQuest();
        }

        on("klGuess", () => {
            finishDiscovery(false);
        });

        on("klDiscoverUnknown", () => {
            finishDiscovery(true);
        });

    } else {

        on("klContinueLearn", () => {

            discoveryResult = null;
            feedback = "";

            phase = "learn";

            renderQuest();
        });
    }
}


    /* LEARN */

    if (phase === "learn") {

        on("klLearnDone", async () => {

            if (!(await earn(item, 2))) return;

            feedback = "";
            phase = "practice";

            renderQuest();
        });
    }

    /* PRACTICE */
    if (phase === "practice") {
        bindBuilderEvents();
        on("klCheck", async () => {
            if (busy || practiceResult?.correct || !builderState ||
                builderState.chosen.length !== builderState.tiles.length) return;
            const correct = normalize(builderBuilt()) === normalize(builderState.config.target);
            if (correct) {
                if (!(await earn(item,3))) return;
                feedback = "";
                practiceResult = {correct:true, message:"Bạn đã đạt 3★. Tiếp theo hãy ghép câu hoặc cách đọc mà không nhập bàn phím."};
            } else {
                builderState.attempts++;
                practiceResult = {correct:false, message:
                    (builderState.config.wrongReason || "Chưa đúng thứ tự.") +
                    " Chạm vào mảnh đã chọn để sửa, hoặc dùng nút Hoàn tác."};
            }
            renderQuest();
        });
        on("klPracticeContinue",()=>{
            practiceResult=null;builderState=null;feedback="";
            phase="reverse";renderQuest();
        });
    }

    /* REVERSE */
    if (phase === "reverse") {
        bindBuilderEvents();
        on("klReverseCheck", async () => {
            if (busy || reverseResult?.correct || !builderState ||
                builderState.chosen.length !== builderState.tiles.length) return;
            const correct = normalize(builderBuilt()) === normalize(builderState.config.target);
            if (correct) {
                if (!(await earn(item,4))) return;
                feedback = "";
                reverseResult = {correct:true, message:"Đã đạt 4★. Chapter Test sẽ mở khóa 5★!"};
            } else {
                builderState.attempts++;
                reverseResult = {correct:false, message:
                    (builderState.config.wrongReason || "Thứ tự chưa đúng.") +
                    " Bạn có thể sửa từng mảnh hoặc thử gợi ý."};
            }
            renderQuest();
        });
        on("klReverseContinue",()=>{
            reverseResult=null;builderState=null;feedback="";
            phase="complete";renderQuest();
        });
    }
}

function normalize(value) {

    return String(value || "")
        .trim()
        .replace(/[\s　]/g, "")
        .replace(/[。．]+$/g, "");
}

/* ==========================================
   NEXT / PREVIOUS
========================================== */

function moveCard(delta) {

    stopLearningSpeech();

    const next = itemIndex + delta;

    if (next >= lessonData.items.length) {
        completeLesson();
        return;
    }

    if (next < 0) return;

    itemIndex = next;

    resetCard();

    phase = startPhase();

    renderQuest();
}

/* ==========================================
   LESSON COMPLETE / ALBUM
========================================== */

async function completeLesson() {

    const ready = await lessonReady(lesson);

    render("KẾT THÚC BÀI", `

        <div class="learn-card">

            <h2>${safe(lesson.title)}</h2>

            <div class="kl-album">

                ${lessonData.items.map(item => `
                    
                    <button
                        class="kl-mini-card ${cardTier(item.id)}"
                        type="button"
                        data-card-id="${safe(item.id)}"
                        ${rating(item.id) ? "" : "disabled"}>


                        ${logo()}

                        ${
                            rating(item.id)
                                ? cardImageHTML(item, typeOf(), true)
                                : ""
                        }

                        <b>
                            ${
                                rating(item.id)
                                    ? safe(titleOf(item))
                                    : "?"
                            }
                        </b>

                        ${stars(rating(item.id))}

                    </button>
                `).join("")}

            </div>

            <p>
                ${
                    ready
                        ? "✓ Đủ điều kiện mở bài tiếp theo"
                        : "Chưa đủ điều kiện 3★"
                }
            </p>

            <div class="learn-actions">

                <button
                    id="klReturn"
                    class="learn-btn primary">
                    Về lộ trình
                </button>

                <button
                    id="klReview"
                    class="learn-btn">
                    Review thẻ bài
                </button>

            </div>

        </div>
    `);

    on("klReturn", () => showChapters(course.id));

    on("klReview", () => {
        openReview(lessonData.items, typeOf());
    });

        
    root()?.querySelectorAll("[data-card-id]").forEach(button => {
    
        button.onclick = () => {
    
            openCardDetail(
                button.dataset.cardId,
                "complete"
            );
        };
    });

}

/* ==========================================
   CARD REVIEW
========================================== */

function openReview(items, kind) {

    reviewItems = items.filter(
        item => rating(item.id) > 0
    );

    reviewKind = kind;
    reviewIndex = 0;
    manualHint = false;

    renderReview(true);
}

function renderReview(autoRead = false) {

    stopLearningSpeech();

    const item = reviewItems[reviewIndex];

    if (!item) {

        render(
            "CARD REVIEW",
            `<div class="learn-card">
                Chưa có thẻ để ôn.
            </div>`
        );

        return;
    }

    const showHint =
        preferences.autoHint || manualHint;

    render("CARD REVIEW", `
        <div class="kl-review-options">

            <label>
                🔊 Auto Speak
                <input
                    id="klAutoSpeak"
                    type="checkbox"
                    ${preferences.autoSpeak ? "checked" : ""}>
            </label>

            <label>
                💡 Auto Hint
                <input
                    id="klAutoHint"
                    type="checkbox"
                    ${preferences.autoHint ? "checked" : ""}>
            </label>

        </div>

        <p class="learn-muted">
            Thẻ ${reviewIndex + 1}/${reviewItems.length}
        </p>

        ${knowledgeCard(item, reviewKind, {
            hinted: showHint
        })}

        <div class="learn-actions">

            ${
                !preferences.autoHint
                    ? `
                        <button
                            id="klManualHint"
                            class="learn-btn">
                            ${
                                manualHint
                                    ? "Ẩn Hint"
                                    : "💡 Hiện Hint"
                            }
                        </button>
                    `
                    : ""
            }

            <button id="klSpeak" class="learn-btn">
                🔊 Đọc thẻ
            </button>

        </div>

        <div class="learn-actions">

            <button
                id="klReviewPrev"
                class="learn-btn"
                ${reviewIndex === 0 ? "disabled" : ""}>
                ← Previous
            </button>

            <button
                id="klReviewNext"
                class="learn-btn primary">
                ${
                    reviewIndex === reviewItems.length - 1
                        ? "Hoàn thành"
                        : "Next →"
                }
            </button>

            <button
                id="klReviewExit"
                class="learn-btn">
                Đóng Review
            </button>

        </div>
    `);

    function bindToggle(id, key) {

        const node = $(id);

        if (!node) return;

        node.onchange = () => {

            preferences[key] = node.checked;

            savePreferences();

            if (key === "autoSpeak" && !node.checked) {
                stopLearningSpeech();
            }

            if (key === "autoHint") {
                manualHint = false;
                renderReview(false);
            }
        };
    }

    bindToggle("klAutoSpeak", "autoSpeak");
    bindToggle("klAutoHint", "autoHint");

    on("klManualHint", () => {
        manualHint = !manualHint;
        renderReview(false);
    });

    on("klSpeak", () => {
        speakCard(item, reviewKind);
    });

    on("klReviewPrev", () => {

        reviewIndex--;
        manualHint = false;

        renderReview(true);
    });

    on("klReviewNext", () => {

        if (reviewIndex === reviewItems.length - 1) {

            stopLearningSpeech();
            completeLesson();
            return;
        }

        reviewIndex++;
        manualHint = false;

        renderReview(true);
    });

    on("klReviewExit", () => {
        stopLearningSpeech();
        completeLesson();
    });

    if (autoRead && preferences.autoSpeak) {
        speakCard(item, reviewKind);
    }
}


/* =========================================================
   BATLINGO COLLECTION
   OPEN CARDS ANYTIME
========================================================= */

function openCollection(returnTo = "quest") {

    stopLearningSpeech();

    collectionReturn = returnTo;

    if (!lessonData?.items?.length) {
        return;
    }

    const items = lessonData.items;

    const collected = items.filter(
        item => rating(item.id) > 0
    ).length;

    render("MY COLLECTION", `

        <div class="learn-row kl-quest-toolbar">

            <button
                id="klCollectionBack"
                class="learn-btn">
                ← Quay lại
            </button>

            <span class="learn-muted">
                ${collected}/${items.length} thẻ
            </span>

        </div>

        <p class="learn-muted">
            Bấm vào bất kỳ thẻ đã mở khóa nào
            để xem thông tin chi tiết.
        </p>

        <div class="kl-album kl-collection-grid">

            ${items.map(item => `

                <button
                    class="kl-mini-card ${cardTier(item.id)}"
                    type="button"
                    data-card-id="${safe(item.id)}"
                    ${rating(item.id) ? "" : "disabled"}>

                    ${logo()}

                    ${
                        rating(item.id)
                            ? cardImageHTML(
                                item,
                                typeOf(),
                                true
                              )
                            : ""
                    }

                    <b>
                        ${
                            rating(item.id)
                                ? safe(titleOf(item))
                                : "?"
                        }
                    </b>

                    ${stars(rating(item.id))}

                </button>

            `).join("")}

        </div>
    `);

    on("klCollectionBack", returnFromCollection);

    root()
        ?.querySelectorAll("[data-card-id]")
        .forEach(button => {

            button.onclick = () => {

                openCardDetail(
                    button.dataset.cardId,
                    "collection"
                );
            };
        });
}


/* =========================================================
   RETURN TO PREVIOUS SCREEN
========================================================= */

function returnFromCollection() {

    if (collectionReturn === "complete") {

        completeLesson();

    } else {

        renderQuest();
    }
}


/* =========================================================
   OPEN SINGLE KNOWLEDGE CARD
========================================================= */

function openCardDetail(
    cardId,
    from = "collection"
) {

    stopLearningSpeech();

    const item = lessonData?.items?.find(
        x => x.id === cardId
    );

    if (!item || rating(item.id) < 1) {
        return;
    }

    const level = rating(cardId);

    const description = level >= 2
        ? "Bạn có thể xem lại thẻ và nghe phát âm bất cứ lúc nào."
        : "Bạn đã khám phá đáp án. Hãy học tiếp để mở phần giải thích đầy đủ ở 2★.";

    let content = "";

    if (level >= 2) {

        content = knowledgeCard(
            item,
            typeOf(),
            { hinted: true }
        );

    } else {

        content = `
            <section
                class="kl-quest-card kl-type-${typeColor(typeOf())} ${cardTier(item.id)}">

                <div class="learn-row kl-card-topline">
                    ${logo()}
                    ${stars(level)}
                </div>

                <div class="kl-giant">
                    ${safe(titleOf(item))}
                </div>

                <p class="kl-hv">
                    ${safe(item.meaning)}
                </p>

            </section>
        `;
    }

    render("KNOWLEDGE CARD", `

        <div class="learn-row kl-quest-toolbar">

            <button
                id="klDetailBack"
                class="learn-btn">
                ← Quay lại
            </button>

            <span class="learn-muted">
                ${safe(lesson?.title || "Collection")}
            </span>

        </div>

        ${content}

        <p class="learn-muted">
            ${safe(description)}
        </p>

        <div class="learn-actions">

            <button
                id="klDetailSpeak"
                class="learn-btn">
                🔊 Đọc thẻ
            </button>

            <button
                id="klDetailReturnLesson"
                class="learn-btn primary">
                Tiếp tục học
            </button>

        </div>
    `);

    on("klDetailBack", () => {

        if (from === "complete") {

            completeLesson();

        } else {

            openCollection(collectionReturn);
        }
    });

    on("klDetailSpeak", () => {

        speakCard(item, typeOf());
    });

    on("klDetailReturnLesson", () => {

        const index = lessonData.items.findIndex(
            x => x.id === cardId
        );

        if (index >= 0) {
            itemIndex = index;
        }

        resetCard();

        phase = startPhase();

        renderQuest();
    });
}

/* ==========================================
   CHAPTER TEST
========================================== */

async function openTest(chapterId) {

    chapter = manifest.chapters.find(
        c => c.id === chapterId
    );

    if (!chapter) return;

    const ready = await readyMap(chapter);

    if (!ready.every(Boolean)) {
        showChapters(course.id);
        return;
    }

    testItems = [];

    for (const lessonItem of chapter.lessons) {

        const data = await lessonDataFor(lessonItem);

        for (const item of data.items) {

            testItems.push({
                item,
                kind: data.type,
                pool: data.items
            });
        }
    }

    testIndex = 0;
    testCorrect = 0;
    testExplained = false;
    testChoice = "";
    testCorrectIds = [];

    renderTest();
}

function renderTest() {

    if (testIndex >= testItems.length) {
        finishTest();
        return;
    }

    const {
        item,
        kind,
        pool
    } = testItems[testIndex];

    const options = optionList(item, kind, pool);

    render("CHAPTER TEST", `
        

        <div class="kl-quest-card ${cardTier(item.id)}">

            <p>
                ${testIndex + 1}/${testItems.length}
                · Đúng ${testCorrect}
            </p>

            <div class="kl-giant">
                ${safe(titleOf(item))}
            </div>

            <div class="kl-options">

                ${options.map((option, i) => `
                    <button
                        class="kl-option ${
                            testChoice === option ? "selected" : ""
                        }"
                        data-test-choice="${i}"
                        ${testExplained ? "disabled" : ""}>
                        ${safe(option)}
                    </button>
                `).join("")}

            </div>

            ${
                testExplained
                    ? `
                        <div class="kl-feedback">

                            <b>
                                ${
                                    testChoice === item.meaning
                                        ? "✓ Đúng!"
                                        : "Đáp án đúng: " +
                                          safe(item.meaning)
                                }
                            </b>

                            <p>
                                ${safe(
                                    item.explanation ||
                                    item.example?.reason ||
                                    ""
                                )}
                            </p>

                        </div>
                    `
                    : ""
            }

            <div class="learn-actions">

                <button
                    id="klTestExit"
                    class="learn-btn">
                    Thoát Test
                </button>

                <button
                    id="klTestNext"
                    class="learn-btn primary"
                    ${!testChoice ? "disabled" : ""}>
                    ${
                        testExplained
                            ? "Câu tiếp →"
                            : "Kiểm tra"
                    }
                </button>

            </div>

        </div>
    `);

    root().querySelectorAll("[data-test-choice]").forEach(button => {

        button.onclick = () => {

            if (testExplained) return;

            testChoice =
                options[Number(button.dataset.testChoice)];

            renderTest();
        };
    });

    on("klTestExit", () => {
        showChapters(course.id);
    });

    on("klTestNext", () => {

        if (!testExplained) {

            const correct =
                testChoice === item.meaning;

            if (correct) {
                testCorrect++;
                testCorrectIds.push(item.id);
            }

            testExplained = true;
            renderTest();

        } else {

            testIndex++;
            testExplained = false;
            testChoice = "";

            renderTest();
        }
    });
}

async function finishTest() {

    if (testFinishing) return;

    testFinishing = true;

    const total = testItems.length;

    const score = total
        ? Math.round(testCorrect / total * 100)
        : 0;

    const passed = score >= 70;

    render(
        "KẾT QUẢ CHƯƠNG",
        `<div class="learn-card">
            Đang lưu kết quả...
        </div>`
    );

    try {

        if (passed) {

            const result = await grantLearningChapter(
                chapter.id,
                score
            );

            sync(result);

            if (
                !userData?.learning?.tests?.[chapter.id]?.passed
            ) {
                throw Error(
                    "Không lưu được Chapter Test"
                );
            }

            for (const id of testCorrectIds) {

                const item = testItems.find(
                    x => x.item.id === id
                )?.item;

                if (item && rating(id) === 4) {

                    if (!(await earn(item, 5))) {
                        throw Error(
                            "Không nâng được Master Card: " + id
                        );
                    }
                }
            }
        }

        render("KẾT QUẢ CHƯƠNG", `

            <div class="learn-card">

                <h2>
                    ${
                        passed
                            ? "🏆 CHAPTER CLEARED"
                            : "CẦN LUYỆN THÊM"
                    }
                </h2>

                <div class="kl-giant">
                    ${score}%
                </div>

                <p>
                    Đúng ${testCorrect}/${total}
                    · Yêu cầu 70%
                </p>

                <div class="learn-actions">

                    <button
                        id="klRetryTest"
                        class="learn-btn">
                        Làm lại Test
                    </button>

                    <button
                        id="klExitTest"
                        class="learn-btn primary">
                        Về lộ trình
                    </button>

                </div>

            </div>
        `);

        on("klRetryTest", () => {
            openTest(chapter.id);
        });

        on("klExitTest", () => {
            showChapters(course.id);
        });

    } catch (error) {

        render("LỖI LƯU TEST", `
            <div class="learn-card">

                <p>${safe(error.message)}</p>

                <button
                    id="klRetryFinish"
                    class="learn-btn">
                    Thử lưu lại
                </button>

            </div>
        `);

        on("klRetryFinish", finishTest);

    } finally {

        testFinishing = false;
    }
}
