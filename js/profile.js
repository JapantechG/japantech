import {
    updateUserProfile
}
from "./user.js";

/* =========================================================
   BATLINGO PROFILE
========================================================= */

const profileScreen =
    document.getElementById(
        "profileScreen"
    );


const profileDisplayName =
    document.getElementById(
        "profileDisplayName"
    );


const profileBatlingoId =
    document.getElementById(
        "profileBatlingoId"
    );


const profileNameInput =
    document.getElementById(
        "profileNameInput"
    );


const profileBioInput =
    document.getElementById(
        "profileBioInput"
    );


const profileEmail =
    document.getElementById(
        "profileEmail"
    );


const profileIdReadonly =
    document.getElementById(
        "profileIdReadonly"
    );


const profileAvatar =
    document.getElementById(
        "profileAvatar"
    );


const profileNameCounter =
    document.getElementById(
        "profileNameCounter"
    );


const profileBioCounter =
    document.getElementById(
        "profileBioCounter"
    );

const profileSaveBtn =
    document.getElementById(
        "profileSaveBtn"
    );


const profileMessage =
    document.getElementById(
        "profileMessage"
    );

/* =========================================================
   OPEN
========================================================= */

export function openProfile()
{
    const user =
        window.currentUser;


    const userData =
        window.currentUserData;


    if (
        !user ||
        !userData?.profile
    ) {
        return;
    }


    const profile =
        userData.profile;


    const displayName =
        profile.displayName ||
        "Player";


    const batlingoId =
        profile.batlingoId ||
        "-";


    /* NAME */

    profileDisplayName.textContent =
        displayName;


    profileNameInput.value =
        displayName;


    /* ID */

    profileBatlingoId.textContent =
        batlingoId;


    profileIdReadonly.textContent =
        batlingoId;


    /* EMAIL */

    profileEmail.textContent =
        user.email || "-";


    /* BIO */

    profileBioInput.value =
        profile.bio || "";


    /* AVATAR */

    renderProfileAvatar(
        profile.photoURL,
        displayName
    );


    updateCounters();


    profileScreen.classList.remove(
        "hidden"
    );
}


/* =========================================================
   CLOSE
========================================================= */

export function closeProfile()
{
    profileScreen.classList.add(
        "hidden"
    );
}


/* =========================================================
   AVATAR
========================================================= */

function renderProfileAvatar(
    photoURL,
    displayName
)
{
    profileAvatar.innerHTML = "";


    if (photoURL) {

        const img =
            document.createElement(
                "img"
            );


        img.src =
            photoURL;


        img.alt =
            displayName;


        profileAvatar.appendChild(
            img
        );


        return;
    }


    profileAvatar.textContent =
        displayName
            .charAt(0)
            .toUpperCase();
}


/* =========================================================
   COUNTER
========================================================= */

function updateCounters()
{
    profileNameCounter.textContent =
        `${profileNameInput.value.length} / 20`;


    profileBioCounter.textContent =
        `${profileBioInput.value.length} / 100`;
}


profileNameInput?.addEventListener(
    "input",
    updateCounters
);

/* =========================================================
   MESSAGE
========================================================= */

function showProfileMessage(
    message,
    type = "success"
)
{
    if (!profileMessage) {
        return;
    }


    profileMessage.textContent =
        message;


    profileMessage.classList.remove(
        "hidden",
        "success",
        "error"
    );


    profileMessage.classList.add(
        type
    );
}


/* =========================================================
   SAVE PROFILE
========================================================= */

profileSaveBtn?.addEventListener(
    "click",

    async () => {

        const displayName =
            profileNameInput.value;


        const bio =
            profileBioInput.value;


        profileSaveBtn.disabled =
            true;


        profileSaveBtn.textContent =
            "SAVING...";


        profileMessage?.classList.add(
            "hidden"
        );


        try {

            const result =
                await updateUserProfile({
                    displayName,
                    bio
                });


            /* =================================
               UPDATE PROFILE SCREEN
            ================================= */

            profileDisplayName.textContent =
                result.displayName;


            renderProfileAvatar(
                window.currentUserData
                    ?.profile
                    ?.photoURL,
                result.displayName
            );


            /* =================================
               TELL OTHER UI

               Home / PvP / etc.
            ================================= */

            window.dispatchEvent(
                new CustomEvent(
                    "batlingo-profile-updated",
                    {
                        detail: {
                            displayName:
                                result.displayName,

                            bio:
                                result.bio
                        }
                    }
                )
            );


            showProfileMessage(
                "Profile saved.",
                "success"
            );

        }
        catch (error) {

            console.error(
                "[PROFILE] Save:",
                error
            );


            switch (error.message) {

                case "INVALID_DISPLAY_NAME":

                    showProfileMessage(
                        "Name must be 2–20 characters.",
                        "error"
                    );

                    break;


                case "BIO_TOO_LONG":

                    showProfileMessage(
                        "Bio must be 100 characters or less.",
                        "error"
                    );

                    break;


                default:

                    showProfileMessage(
                        "Could not save profile.",
                        "error"
                    );
            }

        }
        finally {

            profileSaveBtn.disabled =
                false;


            profileSaveBtn.textContent =
                "SAVE PROFILE";

        }

    }
);

profileBioInput?.addEventListener(
    "input",
    updateCounters
);
