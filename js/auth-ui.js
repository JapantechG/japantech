/* =========================================
   ELEMENTS
========================================= */

const authScreen =
    document.getElementById("authScreen");

const loginPanel =
    document.getElementById("loginPanel");

const signupPanel =
    document.getElementById("signupPanel");

const verifyPanel =
    document.getElementById("verifyPanel");

const verifyEmailAddress =
    document.getElementById("verifyEmailAddress");


/* =========================================
   PANEL
========================================= */

function showAuthPanel(panelName) {

    loginPanel.classList.add("hidden");
    signupPanel.classList.add("hidden");
    verifyPanel.classList.add("hidden");


    switch (panelName) {

        case "signup":

            signupPanel.classList.remove("hidden");

            break;


        case "verify":

            verifyPanel.classList.remove("hidden");

            break;


        default:

            loginPanel.classList.remove("hidden");

    }

}


/* =========================================
   OPEN / CLOSE
========================================= */

function openAuth() {

    authScreen.classList.remove("hidden");

    showAuthPanel("login");

}


function closeAuth() {

    authScreen.classList.add("hidden");

}


/* =========================================
   LOGIN ↔ SIGN UP
========================================= */

document
    .getElementById("openSignupBtn")
    ?.addEventListener(
        "click",
        () => {

            showAuthPanel("signup");

        }
    );


document
    .getElementById("backLoginBtn")
    ?.addEventListener(
        "click",
        () => {

            showAuthPanel("login");

        }
    );


document
    .getElementById("verifyBackLoginBtn")
    ?.addEventListener(
        "click",
        () => {

            showAuthPanel("login");

        }
    );


document
    .getElementById("authBackBtn")
    ?.addEventListener(
        "click",
        closeAuth
    );


/* =========================================
   SHOW / HIDE PASSWORD
========================================= */

document
    .querySelectorAll(".auth-eye")
    .forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetId =
                    button.dataset.passwordTarget;

                const input =
                    document.getElementById(
                        targetId
                    );


                if (!input) {
                    return;
                }


                input.type =
                    input.type === "password"
                        ? "text"
                        : "password";

            }
        );

    });


/* =========================================
   PASSWORD RULE
========================================= */

const signupPassword =
    document.getElementById(
        "signupPassword"
    );


function setPasswordRule(
    id,
    valid
) {

    const rule =
        document.getElementById(id);


    if (!rule) {
        return;
    }


    rule.classList.toggle(
        "valid",
        valid
    );

}


function updatePasswordRules() {

    if (!signupPassword) {
        return;
    }


    const password =
        signupPassword.value;


    setPasswordRule(
        "passwordRuleLength",
        password.length >= 8 &&
        password.length <= 64
    );


    setPasswordRule(
        "passwordRuleUpper",
        /[A-Z]/.test(password)
    );


    setPasswordRule(
        "passwordRuleLower",
        /[a-z]/.test(password)
    );


    setPasswordRule(
        "passwordRuleNumber",
        /[0-9]/.test(password)
    );

}


signupPassword?.addEventListener(
    "input",
    updatePasswordRules
);


/* =========================================
   FIREBASE VERIFY EVENT
========================================= */

window.addEventListener(
    "batlingo-auth-verify",
    event => {

        const email =
            event.detail?.email;


        if (verifyEmailAddress) {

            verifyEmailAddress.textContent =
                email || "";

        }


        showAuthPanel("verify");

    }
);


/* =========================================
   EXPORT
========================================= */

window.BatLingoAuthUI = {

    open: openAuth,

    close: closeAuth,

    showPanel: showAuthPanel

};

/* =========================================
   LOGIN SUCCESS
========================================= */

window.addEventListener(
    "batlingo-login-success",
    () => {

        closeAuth();

    }
);

window.addEventListener(
    "batlingo-login-success",
    () => {

        closeAuth();

    }
);