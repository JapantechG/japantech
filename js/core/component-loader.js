/*
==========================================================
JapanTech Component Loader
==========================================================

Features
---------
✔ Recursive Component
✔ Prevent Duplicate Loading
✔ Async / Await
✔ Development Cache Control
✔ Components Loaded Event
✔ Error Display
✔ Production Ready

Usage
-----

<div data-component="../components/layout/header.html"></div>

Then

document.addEventListener("DOMContentLoaded", async () => {

    await ComponentLoader.init();

});

==========================================================
*/

class ComponentLoader {

    // Development -> disable cache
    static DEV = location.hostname === "localhost"
              || location.hostname === "127.0.0.1";

    static async init(root = document) {

        const elements = root.querySelectorAll("[data-component]");

        for (const element of elements) {

            // Prevent duplicate loading
            if (element.dataset.loaded === "true")
                continue;

            const file = element.dataset.component;

            if (!file)
                continue;

            try {

                const response = await fetch(file, {

                    cache: ComponentLoader.DEV
                        ? "no-cache"
                        : "default"

                });

                if (!response.ok) {

                    throw new Error(
                        `${response.status} ${response.statusText}`
                    );

                }

                element.innerHTML = await response.text();

                // Mark as loaded
                element.dataset.loaded = "true";

                // Load child components
                await ComponentLoader.init(element);

            }

            catch (err) {

                console.error(
                    "[ComponentLoader]",
                    file,
                    err
                );

                element.innerHTML =
                `
                <div class="component-error">

                    <strong>Component Load Error</strong>

                    <br>

                    ${file}

                </div>
                `;

            }

        }

        // Only dispatch once
        if (root === document) {

            document.dispatchEvent(

                new CustomEvent("componentsLoaded")

            );

        }

    }

}