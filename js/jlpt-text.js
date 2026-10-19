/* ==========================================
   BATLINGO - JLPT TEXT RENDERER
========================================== */

export function renderJLPTText(element, text) {

    const template = document.createElement("template");
    template.innerHTML = String(text ?? "");

    const allowedTags = new Set([
        "STRONG",
        "U",
        "EM"
    ]);

    function sanitize(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            return document.createTextNode(node.textContent);
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
            return document.createDocumentFragment();
        }

        const tag = allowedTags.has(node.tagName)
            ? node.tagName.toLowerCase()
            : "span";

        const clean = document.createElement(tag);

        node.childNodes.forEach(child => {
            clean.appendChild(sanitize(child));
        });

        return clean;
    }

    const fragment = document.createDocumentFragment();

    template.content.childNodes.forEach(node => {
        fragment.appendChild(sanitize(node));
    });

    element.replaceChildren(fragment);
}