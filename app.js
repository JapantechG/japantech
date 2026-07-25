document.addEventListener("DOMContentLoaded", async () => {

    await ComponentLoader.init();

    if (typeof Navigation !== "undefined") {

        Navigation.init();

    }

});

