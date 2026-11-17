
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

/* ==========================================
   COMMON RENDER
========================================== */

function render(title, html) {

    if ($("learningTitle")) {
        $("learningTitle").textContent = title;
    }

    if (root()) {
        root().innerHTML = html;
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

    node.textContent = `✨ +${value} EXP`;

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

    expToast(result?.awardedExp || 0);
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

    try {

        console.log("[LEARNING] Saving star:", {
            cardId: item.id,
            targetStars,
            currentStars: rating(item.id)
        });

        const result = await grantLearningStar(
            item.id,
            targetStars
        );

        if (!result?.committed) {

            throw new Error(
                "Firebase không ghi nhận lần nâng sao này. " +
                "Hãy kiểm tra tiến độ hiện tại và quyền Firebase."
            );
        }

        sync(result);

        const newStars = rating(item.id);

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
            ${mascot("Hãy suy luận, học và thu thập các thẻ kiến thức!")}

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

            ${mascot("Đạt ít nhất 3★ mỗi thẻ để mở bài kế tiếp.")}
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
}


function startPhase() {

    const item = lessonData.items[itemIndex];
    const s = rating(item.id);

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

function practiceHTML(item, kind) {

    const ex = exampleOf(item, kind);

    if (kind === "kanji") {

        return `
            <p>Nhập cách đọc Hiragana:</p>

            <div class="kl-giant">
                ${safe(
                    item.relatedWords?.[0]?.word ||
                    item.character
                )}
            </div>

            <input
                id="klInput"
                class="learn-input"
                value="${safe(answer)}"
                placeholder="Hiragana">
        `;
    }

    return `
        <p>Điền chỗ trống:</p>

        <div class="kl-evidence">
            <b>${safe(ex?.blank || ex?.sentence || "")}</b>
            <small>${safe(ex?.translation || "")}</small>
        </div>

        <input
            id="klInput"
            class="learn-input"
            value="${safe(answer)}"
            placeholder="Nhập đáp án">
    `;
}

/* ==========================================
   REVERSE CHALLENGE
========================================== */

function reverseHTML(item, kind) {

    if (kind === "grammar") {

        const ex =
            item.examples?.find(
                e => Array.isArray(e.chunks) && e.chunks.length
            ) || item.examples?.[0];

        if (!ex?.chunks?.length) {
            return "<p>Chưa có chunks để sắp xếp câu.</p>";
        }

        const remaining = ex.chunks
            .map((_, i) => i)
            .filter(i => !chosen.includes(i))
            .reverse();

        return `
            <p>Sắp xếp câu:</p>
            <p>${safe(ex.translation)}</p>

            <div class="kl-chunks">
                ${chosen.map((i, j) => `
                    <button
                        class="learn-chip"
                        data-remove="${j}">
                        ${safe(ex.chunks[i])} ×
                    </button>
                `).join("")}
            </div>

            <div class="kl-chunks">
                ${remaining.map(i => `
                    <button
                        class="learn-chip"
                        data-pick="${i}">
                        ${safe(ex.chunks[i])}
                    </button>
                `).join("")}
            </div>
        `;
    }

    const word =
        kind === "kanji"
            ? item.relatedWords?.[1]
            : item;

    return `
        <p>Nhập cách đọc Hiragana của từ:</p>

        <div class="kl-giant">
            ${safe(word?.word)}
        </div>

        <input
            id="klReverseInput"
            class="learn-input"
            value="${safe(answer)}"
            placeholder="Hiragana">
    `;
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
            class="kl-quest-card kl-type-${typeColor(kind)}">

            <div class="learn-row kl-card-topline">
                ${logo()}
                ${stars(rating(item.id))}
            </div>

            ${content}

        </section>
    `;
}


/* ==========================================
   QUEST SCREEN
========================================== */

function renderQuest() {

    const item = lessonData?.items?.[itemIndex];

    if (!item) return;

    const kind = typeOf();
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
        class="kl-quest-card kl-type-${typeColor(kind)}">

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
                            class="learn-btn primary">
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
                            class="learn-btn primary">
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

        const input = $("klInput");

        if (input) {

            input.oninput = () => {
                answer = input.value;
            };

            input.onkeydown = event => {
                if (event.key === "Enter") {
                    $("klCheck")?.click();
                }
            };
        }

        
        on("klCheck", async () => {
        
            if (busy || practiceResult?.correct) return;
        
            const ex = exampleOf(item, kind);
        
            const expected =
                kind === "kanji"
                    ? item.relatedWords?.[0]?.reading
                    : ex?.answer;
        
            answer = $("klInput")?.value || "";
        
            const correct = Boolean(expected) &&
                normalize(answer) === normalize(expected);
        
            if (correct) {
        
                if (!(await earn(item, 3))) return;
        
                feedback = "";
        
                practiceResult = {
                    correct: true,
                    message:
                        "Bạn đã nhận 3★. " +
                        "Giờ hãy thử vận dụng kiến thức theo chiều ngược lại!"
                };
        
            } else {
        
                practiceResult = {
                    correct: false,
                    message:
                        `Đáp án: ${expected || "Chưa có"}. ` +
                        (
                            ex?.wrongReason ||
                            ex?.reason ||
                            item.explanation ||
                            "Hãy xem lại ví dụ."
                        )
                };
            }
        
            renderQuest();
        });
        
        on("klPracticeContinue", () => {
        
            practiceResult = null;
            answer = "";
            feedback = "";
        
            phase = "reverse";
        
            renderQuest();
        });

    }

    /* REVERSE */

    if (phase === "reverse") {

        if (kind === "grammar") {

            root().querySelectorAll("[data-pick]").forEach(button => {

                button.onclick = () => {
                    chosen.push(Number(button.dataset.pick));
                    renderQuest();
                };
            });

            root().querySelectorAll("[data-remove]").forEach(button => {

                button.onclick = () => {
                    chosen.splice(
                        Number(button.dataset.remove),
                        1
                    );

                    renderQuest();
                };
            });

        } else {

            const input = $("klReverseInput");

            if (input) {

                input.oninput = () => {
                    answer = input.value;
                };

                input.onkeydown = event => {
                    if (event.key === "Enter") {
                        $("klReverseCheck")?.click();
                    }
                };
            }
        }

        on("klReverseCheck", async () => {
            if (busy || reverseResult?.correct) return;
            const ex =
                kind === "grammar"
                    ? (
                        item.examples?.find(e => e.chunks?.length) ||
                        item.examples?.[0]
                    )
                    : null;

            const expected =
                kind === "grammar"
                    ? ""
                    : kind === "kanji"
                        ? item.relatedWords?.[1]?.reading
                        : item.reading;

            const correct =
                kind === "grammar"
                    ? (
                        Boolean(ex?.chunks?.length) &&
                        chosen.length === ex.chunks.length &&
                        chosen.every((value, i) => value === i)
                    )
                    : (
                        normalize(
                            $("klReverseInput")?.value
                        ) === normalize(expected)
                    );

            
            if (correct) {
            
                if (!(await earn(item, 4))) return;
            
                feedback = "";
            
                reverseResult = {
                    correct: true,
                    message:
                        "Đã nhận 4★. " +
                        "Chapter Test sẽ giúp bạn đạt 5★!"
                };
            
            } else {
            
                reverseResult = {
                    correct: false,
                    message:
                        ex?.reason ||
                        ("Cách đọc đúng: " + expected)
                };
            }
            
            renderQuest();

        });

        
        on("klReverseContinue", () => {
        
            reverseResult = null;
            feedback = "";
        
            phase = "complete";
        
            renderQuest();
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
        ${mascot(
            ready
                ? "Đã đủ 3★ để đi tiếp!"
                : "Hãy hoàn thành thêm các thẻ chưa đạt 3★."
        )}

        <div class="learn-card">

            <h2>${safe(lesson.title)}</h2>

            <div class="kl-album">

                ${lessonData.items.map(item => `
                    
                    <button
                        class="kl-mini-card"
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
                    class="kl-mini-card"
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
                class="kl-quest-card kl-type-${typeColor(typeOf())}">

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
        ${mascot("Chọn nghĩa chính xác để tăng sao của thẻ!")}

        <div class="kl-quest-card">

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
            ${mascot(
                passed
                    ? "Hoàn thành chương!"
                    : "Hãy luyện thêm để vượt qua thử thách."
            )}

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
