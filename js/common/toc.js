class TOC {

    static init() {

        this.links = document.querySelectorAll(".article-toc a");

        if (!this.links.length) return;

        this.sections = [];

        this.links.forEach(link => {

            const id = link.getAttribute("href");

            const section = document.querySelector(id);

            if (section) {

                this.sections.push({

                    link,

                    section

                });

            }

            link.addEventListener("click", e => {

                e.preventDefault();

                document.querySelector(id).scrollIntoView({

                    behavior: "smooth",

                    block: "start"

                });

            });

        });

        window.addEventListener("scroll", () => {

            TOC.update();

        });

        TOC.update();

    }

    static update() {

        let current = null;

        const offset = 120;

        this.sections.forEach(item => {

            if (window.scrollY >= item.section.offsetTop - offset) {

                current = item;

            }

        });

        this.links.forEach(link => {

            link.classList.remove("active");

        });

        if (current) {

            current.link.classList.add("active");

        }

    }

}

document.addEventListener("DOMContentLoaded", () => {

    TOC.init();

});