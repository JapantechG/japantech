/* =========================================================
   BATLINGO AUTH
========================================================= */

import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendEmailVerification,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";

import {
    auth
} from "./firebase.js";

import {
    ensureUserProfile
} from "./user.js";

/* =========================================================
   ELEMENTS
========================================================= */
const googleLoginBtn = document.getElementById("googleLoginBtn");

const signupEmail = document.getElementById("signupEmail");

const signupPassword = document.getElementById("signupPassword");

const signupPasswordConfirm = document.getElementById("signupPasswordConfirm");

const signupError = document.getElementById("signupError");

const createAccountBtn = document.getElementById("createAccountBtn");

const loginEmail = document.getElementById("loginEmail");

const loginPassword = document.getElementById("loginPassword");

const loginError = document.getElementById("loginError");

const emailLoginBtn = document.getElementById("emailLoginBtn");

const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");

const verifyEmailAddress = document.getElementById("verifyEmailAddress");

/* =========================================
   GOOGLE PROVIDER
========================================= */

const googleProvider = new GoogleAuthProvider();

googleProvider.setCustomParameters({prompt: "select_account"});

/* =========================================================
   HELPERS
========================================================= */

function showError(element, message) 
{
    if (!element) 
    {
        return;
    }

    element.textContent = message;
    element.classList.remove("hidden");
}

function clearError(element) 
{
    if (!element) 
    {
        return;
    }

    element.textContent = "";
    element.classList.add("hidden");
}

/* =========================================================
   PASSWORD VALIDATION
========================================================= */

function isValidPassword(password) 
{
    return (
        password.length >= 8 &&
        password.length <= 64 &&
        /[A-Z]/.test(password) &&
        /[a-z]/.test(password) &&
        /[0-9]/.test(password)
    );
}

/* =========================================================
   CREATE ACCOUNT
========================================================= */

async function createAccount() 
{
    clearError(signupError);

    const email = signupEmail.value.trim();

    const password = signupPassword.value;

    const confirmPassword =signupPasswordConfirm.value;

    /* -------------------------
       Basic validation
    ------------------------- */

    if (!email) 
    {
        showError(signupError,"Please enter your email.");
        return;
    }

    if (!isValidPassword(password)) 
    {
        showError(signupError,"Password does not meet the requirements.");
        return;
    }

    if (password !== confirmPassword) 
    {
        showError(signupError,"Passwords do not match.");
        return;
    }

    /* -------------------------
       Disable button
    ------------------------- */

    createAccountBtn.disabled = true;

    try {

        /* Create Firebase account */

        const credential = await createUserWithEmailAndPassword(auth,email,password);

        const user = credential.user;

        /* -------------------------
           Send verification email
        ------------------------- */

        await sendEmailVerification(user);

        console.log("[AUTH] Verification email sent:",user.email);

        /* Show email in Verify screen */

        if (verifyEmailAddress) 
        {
            verifyEmailAddress.textContent = user.email;
        }

        /* -------------------------
           Logout until verified
        ------------------------- */

        await signOut(auth);

        /* -------------------------
           Tell Auth UI to show
           verification panel
        ------------------------- */

        window.dispatchEvent(new CustomEvent("batlingo-auth-verify",{detail: {email}}));

    }
    catch (error) 
    {
        console.error("[AUTH] Create account:",error);

        showError(signupError,getAuthErrorMessage(error.code));
    }
    finally 
    {
        createAccountBtn.disabled = false;
    }
}

/* =========================================================
   LOGIN
========================================================= */

async function login() 
{
    clearError(loginError);

    const email = loginEmail.value.trim();

    const password = loginPassword.value;

    if (!email || !password) 
    {
        showError(loginError,"Enter your email and password.");
        return;
    }

    emailLoginBtn.disabled = true;

    try 
    {
        const credential = await signInWithEmailAndPassword(auth,email,password);

        const user = credential.user;

        /* -------------------------
           Email not verified
        ------------------------- */

        if (!user.emailVerified) 
        {
            window.dispatchEvent(new CustomEvent("batlingo-auth-verify",{detail: {email: user.email}}));
            return;
        }

        console.log("[AUTH] Login success:",user.uid);

        /* Notify rest of app */

        window.dispatchEvent(new CustomEvent("batlingo-login-success",{detail: {uid: user.uid,email: user.email}}));

    }
    catch (error) 
    {
        console.error("[AUTH] Login:",error);

        showError(loginError,getAuthErrorMessage(error.code));
    }
    finally 
    {
        emailLoginBtn.disabled = false;
    }
}

/* =========================================================
   FORGOT PASSWORD
========================================================= */

async function forgotPassword() 
{
    clearError(loginError);

    const email = loginEmail.value.trim();

    if (!email) 
    {
        showError(loginError,"Enter your email first.");

        loginEmail.focus();

        return;
    }

    try 
    {
        await sendPasswordResetEmail(auth,email);

        showError(loginError,"Password reset email sent. Please check your inbox.");

        console.log("[AUTH] Password reset sent:",email);
    }
    catch (error) 
    {
        console.error("[AUTH] Password reset:",error);

        showError(loginError,getAuthErrorMessage(error.code));
    }
}

/* =========================================
   GOOGLE LOGIN
========================================= */

async function loginWithGoogle() 
{
    clearError(loginError);

    if (googleLoginBtn) 
    {
        googleLoginBtn.disabled = true;
    }
    try 
    {
        const credential = await signInWithPopup(auth,googleProvider);

        const user = credential.user;

        console.log("[AUTH] Google login success:",user.uid);

        console.log("[AUTH] Google user:",user.displayName,user.email);

        window.dispatchEvent(new CustomEvent("batlingo-login-success",
                {
                    detail: {
                        uid: user.uid,
                        email: user.email,
                        displayName: user.displayName,
                        photoURL: user.photoURL,
                        provider: "google"
                    }
                }
            )
        );

    }
    catch (error) 
    {
        /*
         * User tự đóng popup
         * → không cần hiện lỗi.
         */
        if (error.code === "auth/popup-closed-by-user") 
        {
            console.log("[AUTH] Google login cancelled");
            return;
        }

        console.error("[AUTH] Google login:",error.code,error.message);

        showError(loginError,getAuthErrorMessage(error.code));
    }
    finally 
    {
        if (googleLoginBtn) 
        {
            googleLoginBtn.disabled = false;
        }
    }
}

/* =========================================================
   FIREBASE ERROR
========================================================= */

function getAuthErrorMessage(code) 
{
    switch (code) 
    {
        case "auth/email-already-in-use":
            return "This email is already registered.";

        case "auth/invalid-email":
            return "Invalid email address.";

        case "auth/weak-password":
            return "Password is too weak.";

        case "auth/invalid-credential":
            return "Incorrect email or password.";

        case "auth/user-disabled":
            return "This account has been disabled.";

        case "auth/too-many-requests":
            return "Too many attempts. Please try again later.";

        case "auth/network-request-failed":
            return "Network error. Please check your connection.";
        
        case "auth/popup-blocked":
            return "Google login popup was blocked.";

        case "auth/cancelled-popup-request":
            return "Google login was cancelled.";

        case "auth/unauthorized-domain":
            return "This domain is not authorized for Google login.";

        case "auth/account-exists-with-different-credential":
            return "An account already exists with this email using another sign-in method.";

        default:
            return "Something went wrong. Please try again.";
    }
}

/* =========================================================
   AUTH STATE
========================================================= */

onAuthStateChanged(auth,async user => 
   {
        /* =========================================
           LOGGED IN
        ========================================= */

        if (user && user.emailVerified) 
        {
            console.log("[AUTH] Signed in:",user.uid);

            try 
            {
                /* =================================
                   CREATE / LOAD BATLINGO USER

                   New account:
                   → Create users/{uid}
                   → Create BLG ID

                   Existing account:
                   → Load existing data
                   → Keep EXP / ELO / wallet...
                ================================= */

                const userData = await ensureUserProfile(user);

                console.log("[USER] BatLingo ID:",userData.profile.batlingoId);

                /*
                    Global user

                    Sau này game.js / pvp.js /
                    profile UI có thể sử dụng.
                */

                window.currentUser = user;

                window.currentUserData = userData;

                /* =================================
                   NOTIFY UI
                ================================= */

                window.dispatchEvent(new CustomEvent("batlingo-auth-state",
                        {
                            detail: {
                                loggedIn: true,

                                uid:
                                    user.uid,

                                batlingoId:
                                    userData
                                        .profile
                                        .batlingoId,

                                email:
                                    user.email,

                                displayName:
                                    userData
                                        .profile
                                        .displayName,

                                photoURL:
                                    userData
                                        .profile
                                        .photoURL,

                                userData:
                                    userData
                            }
                        }
                    )
                );

            }
            catch (error) 
            {
                console.error("[USER] Failed to load user:",error);

                /*
                    Auth thành công nhưng
                    BatLingo database lỗi.

                    Không cho app hiểu nhầm
                    user đã sẵn sàng.
                */

                window.currentUser = null;

                window.currentUserData = null;

                window.dispatchEvent( new CustomEvent("batlingo-auth-state",
                        {
                            detail: {
                                loggedIn: false,
                                databaseError: true
                            }
                        }
                    )
                );
            }

            return;
        }

        /* =========================================
           LOGGED OUT
        ========================================= */

        console.log("[AUTH] Signed out");

        window.currentUser = null;

        window.currentUserData = null;

        window.dispatchEvent(new CustomEvent("batlingo-auth-state",
                {
                    detail: {
                        loggedIn: false
                    }
                }
            )
        );
    }
);

async function resendVerificationEmail() 
{
    const user = auth.currentUser;

    if (!user) 
    {
        console.log("[AUTH] No current user");

        return;
    }

    try 
    {
        await sendEmailVerification(user);

        console.log("[AUTH] Verification email resent:",user.email);
    }
    catch (error)
    {
        console.error("[AUTH] Resend verification:",error.code,error.message);
    }
}

/* =========================================
   LOGOUT
========================================= */

export async function logout() 
{
    try 
    {
        await signOut(auth);

        console.log("[AUTH] Logout success");
    }
    catch (error) 
    {
        console.error("[AUTH] Logout:",error);
    }
}

/* =========================================
   AUTH CHECK
========================================= */

export function isLoggedIn() 
{
    const user = auth.currentUser;

    return Boolean(user && user.emailVerified);
}

/* =========================================================
   EVENTS
========================================================= */

createAccountBtn?.addEventListener("click",createAccount);

emailLoginBtn?.addEventListener("click",login);

forgotPasswordBtn?.addEventListener("click",forgotPassword);

document.getElementById("resendVerifyBtn")?.addEventListener("click",resendVerificationEmail);

googleLoginBtn?.addEventListener("click",loginWithGoogle);
