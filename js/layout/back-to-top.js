class BackToTop {

    constructor(buttonId = "backToTop") {

        this.button = document.getElementById(buttonId);

        if (!this.button) return;

        this.scrollThreshold = 300;

        this.init();

    }

    init() {

        window.addEventListener(
            "scroll",
            () => this.toggle()
        );

        this.button.addEventListener(
            "click",
            () => this.scrollTop()
        );

        this.toggle();

    }

    toggle() {

        if (window.scrollY > this.scrollThreshold) {

            this.button.classList.add("show");

        }
        else {

            this.button.classList.remove("show");

        }

    }

    scrollTop() {

        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }

}

document.addEventListener("DOMContentLoaded", () => {

    new BackToTop();

});