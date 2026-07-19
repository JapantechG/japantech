"use strict";

/*=========================================================
    JapanTech V1
=========================================================*/

document.addEventListener(

    "DOMContentLoaded",

    initialize

);

function initialize(){

    initHeader();

    initBackTop();

    initMobileMenu();

    initFadeAnimation();

    initActiveMenu();
	
	initSidebarSearch();
	
	initTree();

}
/*=========================================================
    HEADER
=========================================================*/

function initHeader(){

    const header =

        document.querySelector(".header");

    if(!header) return;

    window.addEventListener(

        "scroll",

        ()=>{

            if(window.scrollY>30){

                header.classList.add(

                    "scrolled"

                );

            }

            else{

                header.classList.remove(

                    "scrolled"

                );

            }

        }

    );

}
/*=========================================================
    BACK TO TOP
=========================================================*/

function initBackTop(){

    const button =

        document.querySelector(

            ".back-top"

        );

    if(!button) return;

    window.addEventListener(

        "scroll",

        ()=>{

            if(window.scrollY>500){

                button.style.display="flex";

            }

            else{

                button.style.display="none";

            }

        }

    );

    button.addEventListener(

        "click",

        ()=>{

            window.scrollTo({

                top:0,

                behavior:"smooth"

            });

        }

    );

}
/*=========================================================
    MOBILE MENU
=========================================================*/

function initMobileMenu(){

    const menuButton=

        document.querySelector(

            ".menu-button"

        );

    const menu=

        document.querySelector(

            ".mobile-menu"

        );

    const overlay=

        document.querySelector(

            ".overlay"

        );

    const closeButton=

        document.querySelector(

            ".mobile-menu-close"

        );

    if(!menuButton) return;

    menuButton.onclick=function(){

        menu.classList.add("show");

        overlay.classList.add("show");

    }

    closeButton.onclick=function(){

        menu.classList.remove("show");

        overlay.classList.remove("show");

    }

    overlay.onclick=function(){

        menu.classList.remove("show");

        overlay.classList.remove("show");

    }

}
/*=========================================================
    ACTIVE MENU
=========================================================*/

function initActiveMenu(){

    const current=

        location.pathname;

    const links=

        document.querySelectorAll(

            ".menu a"

        );

    links.forEach(

        link=>{

            if(

                current.endsWith(

                    link.getAttribute("href")

                )

            ){

                link.classList.add(

                    "active"

                );

            }

        }

    );

}
/*=========================================================
    FADE
=========================================================*/

function initFadeAnimation(){

    const items=

        document.querySelectorAll(

            ".fade"

        );

    if(items.length===0)

        return;

    const observer=

        new IntersectionObserver(

            entries=>{

                entries.forEach(

                    item=>{

                        if(

                            item.isIntersecting

                        ){

                            item.target.classList.add(

                                "show"

                            );

                        }

                    }

                );

            },

            {

                threshold:.15

            }

        );

    items.forEach(

        item=>observer.observe(item)

    );

}
/*=========================================================
    SEARCH
=========================================================*/

function openSearch(){

    document

        .querySelector(

            ".search-panel"

        )

        .classList.add(

            "show"

        );

}

function closeSearch(){

    document

        .querySelector(

            ".search-panel"

        )

        .classList.remove(

            "show"

        );

}
/*=========================================================
    ESC CLOSE
=========================================================*/

document.addEventListener(

    "keydown",

    function(e){

        if(e.key==="Escape"){

            const panel=

                document.querySelector(

                    ".search-panel"

                );

            if(panel)

                panel.classList.remove(

                    "show"

                );

        }

    }

);
/*=========================================================
    IMAGE LAZY
=========================================================*/

document

.querySelectorAll("img")

.forEach(

img=>{

img.loading="lazy";

}
);
/*=========================================================
    CONSOLE
=========================================================*/

console.log(

"JapanTech V1"

);
/*==================================================
SIDEBAR SEARCH
==================================================*/

function initSidebarSearch(){

    const input=document.getElementById("sidebarSearch");

    if(!input) return;

    input.addEventListener("keyup",function(){

        const keyword=this.value.toLowerCase();

        document
        .querySelectorAll(".sidebar-tree li")
        .forEach(li=>{

            const text=li.innerText.toLowerCase();

            li.style.display=

                text.includes(keyword)

                ? ""

                : "none";

        });

    });

}
/*==================================================
TREE
==================================================*/

function initTree(){

    document

    .querySelectorAll(".tree-folder")

    .forEach(folder=>{

        folder.onclick=function(){

            this.classList.toggle("open");

        };

    });

}