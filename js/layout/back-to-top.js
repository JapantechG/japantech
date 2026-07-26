class BackToTop {

    constructor() {

        this.button = document.getElementById("backToTop");

        if (!this.button) return;

        this.showOffset = 400;

        this.ticking = false;

        this.init();

    }

    init() {

        this.handleScroll();

        window.addEventListener("scroll", () => {

            if (!this.ticking) {

                window.requestAnimationFrame(() => {

                    this.handleScroll();

                    this.ticking = false;

                });

                this.ticking = true;

            }

        });

        this.button.addEventListener("click", () => {

            window.scrollTo({

                top: 0,

                behavior: "smooth"

            });

        });

    }

    handleScroll() {

        if (window.scrollY > this.showOffset) {

            this.button.classList.add("show");

        } else {

            this.button.classList.remove("show");

        }

    }

}

document.addEventListener("DOMContentLoaded", () => {

    new BackToTop();

});