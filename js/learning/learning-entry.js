
/* ==========================================
   BATLINGO LEARNING ENTRY
========================================== */

import {
    initLearning
} from "./learning.js";

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initLearning,
        { once: true }
    );

} else {

    initLearning();

}
