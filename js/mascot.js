
import { auth, db } from "./firebase.js";

import {
    ref,
    get,
    runTransaction,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-database.js";

// IMPORTANT:
// Firebase SDK version must match firebase.js.

const $ = id => document.getElementById(id);

// ========================================
// MASCOT CONFIGURATION
// ========================================

export const MASCOT_CONFIG = Object.freeze({
    monkey: {
        id: "monkey",
        name: "MONKEY",
        displayName: "MONKEY – KHỈ",
        title: "THE QUICK THINKER",

        description:
            "Thông minh, linh hoạt và nhanh nhẹn. " +
            "Khỉ yêu thích khám phá và luôn tìm ra " +
            "giải pháp bằng sự sáng tạo.",

        traits: [
            "⚡ Nhanh nhẹn",
            "🧠 Thông minh",
            "✨ Sáng tạo"
        ],

        skill: {
            id: "shadow_escape",
            name: "🛡️ Kim Thiền Thoát Xác",
            description:
                "Mỗi 20 rounds, nhận một lượt bảo vệ " +
                "giúp không mất HP khi trả lời sai. " +
                "Chỉ tích trữ tối đa 1 lượt.",
            interval: 20
        },

        image: "assets/mascot/monkey.png",
        emoji: "🐒"
    },

    buffalo: {
        id: "buffalo",
        name: "BUFFALO",
        displayName: "BUFFALO – TRÂU",
        title: "THE IRON WILL",

        description:
            "Mạnh mẽ, bền bỉ và kiên trì. " +
            "Trâu luôn tiến về phía trước bằng " +
            "sự quyết tâm và tinh thần bất khuất.",

        traits: [
            "💪 Mạnh mẽ",
            "🛡️ Bền bỉ",
            "🔥 Kiên trì"
        ],

        skill: {
            id: "indomitable_spirit",
            name: "❤️ Bất Khuất",
            description:
                "Tự động hồi 1 HP sau mỗi 30 rounds " +
                "trong chế độ Solo. Không vượt quá " +
                "giới hạn HP tối đa.",
            interval: 30
        },

        image: "assets/mascot/buffalo.png",
        emoji: "🐃"
    }
});

// ========================================
// INTERNAL STATE
// ========================================

let initialized = false;
let selectedMascot = null;
let activeUid = null;
let saving = false;
let pendingSelection = null;

// ========================================
// IMAGE HANDLING
// ========================================

function initMascotImages() {
    document.querySelectorAll(".mascot-card")
        .forEach(card => {

            const id = card.dataset.mascot;
            const config = MASCOT_CONFIG[id];

            if (!config) return;

            const img = card.querySelector(".mascot-image");
            const fallback = card.querySelector(".mascot-fallback");

            if (!img || !fallback) return;

            const showImage = () => {
                img.hidden = false;
                fallback.hidden = true;
            };

            const showFallback = () => {
                img.hidden = true;
                fallback.hidden = false;
                fallback.textContent = config.emoji;
            };

            img.addEventListener("load", showImage);
            img.addEventListener("error", showFallback);

            // Use the configured image path.
            img.src = config.image;

            if (img.complete) {
                if (img.naturalWidth > 0) {
                    showImage();
                } else {
                    showFallback();
                }
            }
        });
}

// ========================================
// SELECT MASCOT
// ========================================

function selectMascot(id) {
    if (saving || !MASCOT_CONFIG[id]) return;

    selectedMascot = id;

    document.querySelectorAll(".mascot-card")
        .forEach(card => {

            const selected = card.dataset.mascot === id;

            card.classList.toggle("selected", selected);
            card.setAttribute("aria-pressed", String(selected));

            // Restart selection animation.
            card.classList.remove("mascot-pop");

            if (selected) {
                void card.offsetWidth;
                card.classList.add("mascot-pop");
            }
        });

        // Cho phép nhấn OK ngay sau khi chọn Mascot.
        $("mascotOkBtn").disabled = false;
        $("mascotMessage").textContent = "";

        // Hiển thị mô tả, không để lỗi giao diện khóa nút OK.
        try {
            renderMascotDetails(MASCOT_CONFIG[id]);
        } catch (error) {
            console.error("[Mascot] Render details error:", error);
        }
}

// ========================================
// DISPLAY DETAILS
// ========================================

function renderMascotDetails(config) {
    const details = $("mascotDetails");

    $("mascotDetailsTitle").textContent = config.title;
    $("mascotDetailsName").textContent = config.displayName;
    $("mascotDetailsText").textContent = config.description;

    $("mascotSkillName").textContent = config.skill.name;
    $("mascotSkillDescription").textContent =
        config.skill.description;

    const traits = $("mascotDetailsTraits");
    traits.replaceChildren();

    config.traits.forEach(value => {
        const span = document.createElement("span");
        span.className = "mascot-trait";
        span.textContent = value;
        traits.appendChild(span);
    });

    // Restart description animation.
    details.classList.remove("hidden", "show");
    void details.offsetWidth;
    details.classList.add("show");
}

// ========================================
// CONFIRM DIALOG
// ========================================

function showConfirm() {
    if (!selectedMascot || saving) return;

    const config = MASCOT_CONFIG[selectedMascot];

    const icon = $("mascotConfirmIcon");
    if (icon) icon.textContent = config.emoji;

    $("mascotConfirmText").textContent =
        `Bạn chắc chắn muốn chọn ${config.displayName} ` +
        `làm Mascot khởi đầu?`;

    $("mascotConfirm").classList.remove("hidden");
    $("mascotCancelBtn").focus();
}

function hideConfirm() {
    if (saving) return;

    $("mascotConfirm").classList.add("hidden");
    $("mascotOkBtn").focus();
}

// ========================================
// OPEN / CLOSE SCREEN
// ========================================

function openMascotScreen(uid) {
    activeUid = uid;
    selectedMascot = null;
    saving = false;

    document.querySelectorAll(".mascot-card")
        .forEach(card => {
            card.classList.remove("selected", "mascot-pop");
            card.setAttribute("aria-pressed", "false");
        });

    $("mascotDetails")?.classList.add("hidden");
    $("mascotDetails")?.classList.remove("show");

    $("mascotOkBtn").disabled = true;
    $("mascotSaveBtn").disabled = false;
    $("mascotCancelBtn").disabled = false;
    $("mascotSaveBtn").textContent = "XÁC NHẬN";
    $("mascotMessage").textContent = "";

    $("mascotConfirm").classList.add("hidden");
    $("mascotScreen").classList.remove("hidden");

    document.querySelector(".mascot-card")?.focus();
}

function closeMascotScreen() {
    $("mascotConfirm")?.classList.add("hidden");
    $("mascotScreen")?.classList.add("hidden");

    activeUid = null;
    selectedMascot = null;
}

// ========================================
// FIREBASE DATABASE
// ========================================

export async function getUserMascot(uid) {
    if (!uid) return null;

    const snapshot = await get(
        ref(db, `users/${uid}/mascot`)
    );

    return snapshot.exists() ? snapshot.val() : null;
}

// ========================================
// SAVE MASCOT ONCE
// ========================================

async function saveSelectedMascot() {
    if (!selectedMascot || saving || !activeUid) return;

    const uid = activeUid;
    const mascotId = selectedMascot;

    if (auth.currentUser?.uid !== uid) {
        $("mascotMessage").textContent =
            "Phiên đăng nhập đã thay đổi.";
        return;
    }

    saving = true;

    $("mascotSaveBtn").disabled = true;
    $("mascotCancelBtn").disabled = true;
    $("mascotSaveBtn").textContent = "ĐANG LƯU...";

    try {
        const mascotRef = ref(
            db,
            `users/${uid}/mascot`
        );

        const result = await runTransaction(
            mascotRef,
            current => {
                // Existing mascot cannot be overwritten.
                if (current !== null) {
                    return;
                }

                return {
                    id: mascotId,
                    level: 1,
                    exp: 0,
                    evolution: 0,
                    selectedAt: serverTimestamp()
                };
            },
            { applyLocally: false }
        );

        // Reject outdated login session.
        if (
            auth.currentUser?.uid !== uid ||
            activeUid !== uid
        ) {
            return;
        }

        let savedMascot = result.snapshot.val();

        if (!result.committed) {
            // Another device may have selected first.
            savedMascot = await getUserMascot(uid);
        }

        if (!savedMascot ||
            !MASCOT_CONFIG[savedMascot.id]) {
            throw new Error("Invalid mascot data.");
        }

        if (
            auth.currentUser?.uid !== uid ||
            activeUid !== uid
        ) {
            return;
        }

        finishMascotSelection(uid, savedMascot);

    } catch (error) {
        console.error("[Mascot] Save failed:", error);

        if (activeUid === uid) {
            $("mascotMessage").textContent =
                "Không thể lưu Mascot. Vui lòng thử lại.";

            $("mascotConfirm").classList.add("hidden");
        }

    } finally {
        saving = false;

        $("mascotSaveBtn").disabled = false;
        $("mascotCancelBtn").disabled = false;
        $("mascotSaveBtn").textContent = "XÁC NHẬN";
    }
}

// ========================================
// FINISH SELECTION
// ========================================

function finishMascotSelection(uid, mascot) {
    if (
        auth.currentUser?.uid !== uid ||
        activeUid !== uid
    ) {
        return;
    }

    window.currentUserData ??= {};
    window.currentUserData.mascot = mascot;

    const pending = pendingSelection;
    pendingSelection = null;

    closeMascotScreen();

    if (pending) {
        pending.resolve(mascot);
    }

    document.dispatchEvent(
        new CustomEvent("batlingo:mascot-ready", {
            detail: { uid, mascot }
        })
    );
}

// ========================================
// CHECK AFTER LOGIN
// ========================================

export async function ensureMascotSelected(uid) {
    if (!uid || auth.currentUser?.uid !== uid) {
        return null;
    }

    // Reuse current pending selection.
    if (pendingSelection?.uid === uid) {
        return pendingSelection.promise;
    }

    // Cancel previous selection.
    cancelMascotFlow();

    const pending = { uid };

    pending.promise = new Promise(resolve => {
        pending.resolve = resolve;
    });

    pendingSelection = pending;

    try {
        const mascot = await getUserMascot(uid);

        if (
            pendingSelection !== pending ||
            auth.currentUser?.uid !== uid
        ) {
            return null;
        }

        if (mascot !== null) {
            if (!MASCOT_CONFIG[mascot.id]) {
                throw new Error("Invalid saved mascot.");
            }

            window.currentUserData ??= {};
            window.currentUserData.mascot = mascot;

            pendingSelection = null;
            pending.resolve(mascot);

            return mascot;
        }

        // New player: display selection screen.
        openMascotScreen(uid);

    } catch (error) {
        if (pendingSelection === pending) {
            pendingSelection = null;
            pending.resolve(null);
        }

        throw error;
    }

    return pending.promise;
}

// ========================================
// CANCEL ON LOGOUT
// ========================================

export function cancelMascotFlow() {
    const pending = pendingSelection;
    pendingSelection = null;

    if ($("mascotScreen")) {
        closeMascotScreen();
    }

    if (pending) {
        pending.resolve(null);
    }
}

// ========================================
// INITIALIZE EVENTS
// ========================================

export function initMascot() {
    if (initialized) return;

    if (!$("mascotScreen")) {
        throw new Error(
            "mascotScreen not found in index.html"
        );
    }

    initialized = true;

    initMascotImages();

    document.querySelectorAll(".mascot-card")
        .forEach(card => {

            card.addEventListener("click", () => {
                selectMascot(card.dataset.mascot);
            });

            const wrapper = card.querySelector(
                ".mascot-image-wrapper"
            );

            wrapper?.addEventListener(
                "animationend",
                event => {
                    if (event.target === wrapper) {
                        card.classList.remove("mascot-pop");
                    }
                }
            );
        });

    $("mascotOkBtn").addEventListener(
        "click", showConfirm
    );

    $("mascotCancelBtn").addEventListener(
        "click", hideConfirm
    );

    $("mascotSaveBtn").addEventListener(
        "click", saveSelectedMascot
    );

    document.addEventListener("keydown", event => {
        if (event.key !== "Escape") return;

        const confirm = $("mascotConfirm");

        if (!confirm.classList.contains("hidden")) {
            hideConfirm();
        }
    });
}
