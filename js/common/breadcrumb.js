class Breadcrumb {

    static init() {

        const nav = document.querySelector(".breadcrumb");
        if (!nav) return;

        const root = document.documentElement.dataset.root || "";

        const items = [];

        // Home
        items.push({
            text: "Home",
            href: root + "index.html"
        });

        // Knowledge
        items.push({
            text: "Knowledge",
            href: root + "knowledge/"
        });

        // Category
        const category = document.body.dataset.category;
        const categoryUrl = document.body.dataset.categoryUrl;

        if (category && categoryUrl) {

            items.push({
                text: category,
                href: categoryUrl
            });

        }

        // Current Page
        const page = document.body.dataset.page;

        if (page) {

            items.push({
                text: page
            });

        }

        nav.innerHTML = items.map((item, index) => {

            const last = index === items.length - 1;

            if (last) {
                return `<span class="current">${item.text}</span>`;
            }

            return `<a href="${item.href}">${item.text}</a> <span class="separator">/</span>`;

        }).join("");

    }

}

document.addEventListener("componentsLoaded", () => {

    Breadcrumb.init();

});