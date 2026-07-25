/*
==========================================================
Navigation
==========================================================
*/

class Navigation {

    /*
    ==========================================
    Initialize
    ==========================================
    */

    static init() {

        this.buildLinks();

        this.mobileMenu();

        this.activeMenu();

    }

    /*
    ==========================================
    Build Links
    ==========================================
    */

    static buildLinks() {

        const root = document.documentElement.dataset.root || "";

        const routes = {

            home: "index.html",

            knowledge: "knowledge/",

            japanese: "japanese/",

            software: "software/",

            life: "life-in-japan/",

            tools: "tools/",

            about: "about/"

        };

        Object.entries(routes).forEach(([key, path]) => {

            document.querySelectorAll(`[data-link="${key}"]`)
                .forEach(link => {

                    link.href = root + path;

                });

        });

    }

    /*
    ==========================================
    Mobile Menu
    ==========================================
    */

    static mobileMenu() {

        const button = document.getElementById("btnMenu");

        const menu = document.getElementById("mobileMenu");

        if (!button || !menu) return;

        button.addEventListener("click", () => {

            menu.classList.toggle("is-open");

            button.classList.toggle("is-active");

        });

    }

    /*
    ==========================================
    Active Menu
    ==========================================
    */

    static activeMenu() {

        const current = window.location.pathname
            .replace(/index\.html$/, "");

        document
            .querySelectorAll(".header__menu a")
            .forEach(link => {

                const href = new URL(link.href).pathname
                    .replace(/index\.html$/, "");

                if (href === current) {

                    link.classList.add("is-active");

                }

            });

    }

}