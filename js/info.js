const infoScreen = document.getElementById("infoScreen");
const infoTitle = document.getElementById("infoTitle");
const infoContent = document.getElementById("infoContent");

const infoPages = {
    about: {
        title: "ABOUT BATLINGO",
        content: `
            <h2>Learn. Battle. Improve.</h2>

            <p>
                BatLingo is a language learning platform that combines
                study, review and competitive gameplay.
            </p>

            <p>
                Our goal is to make language learning more engaging
                through Solo Battle, 1 VS 1, Flashcards and Review.
            </p>

            <p>
                BatLingo currently focuses on Japanese learning and
                JLPT vocabulary and grammar.
            </p>
        `
    },

    contact: {
        title: "CONTACT",
        content: `
            <h2>Contact BatLingo</h2>

            <p>
                Have a question, suggestion or business inquiry?
            </p>

            <p>
                Email:<br>
                <strong>batlingo.contact@gmail.com</strong>
            </p>

            <p>
                We will try to respond as soon as possible.
            </p>
        `
    },

    support: {
        title: "SUPPORT",
        content: `
            <h2>Need help?</h2>

            <p>
                If you experience a bug, account problem or gameplay
                issue, please contact BatLingo Support.
            </p>

            <p>
                Support email:<br>
                <strong>batlingo.support@gmail.com</strong>
            </p>

            <p>
                When reporting a problem, please include information
                about your device, browser and what happened.
            </p>
        `
    },

    terms: {
        title: "TERMS OF SERVICE",
        content: `
            <h2>Terms of Service</h2>

            <p>
                By using BatLingo, you agree to use the service
                responsibly and in accordance with these terms.
            </p>

            <h3>Account</h3>
            <p>
                You are responsible for maintaining the security of
                your account and for activity performed through it.
            </p>

            <h3>Service</h3>
            <p>
                BatLingo features may be changed, updated or removed
                as the service develops.
            </p>

            <h3>Prohibited Use</h3>
            <p>
                Users must not abuse, disrupt, exploit or attempt to
                gain unauthorized access to BatLingo systems.
            </p>
        `
    },

    privacy: {
        title: "PRIVACY POLICY",
        content: `
            <h2>Privacy Policy</h2>

            <p>
                BatLingo may store information required to provide
                account and learning features.
            </p>

            <h3>Account Information</h3>
            <p>
                This may include your email address, display name,
                BatLingo ID and profile information.
            </p>

            <h3>Learning Data</h3>
            <p>
                BatLingo may store gameplay results, scores, learning
                progress and review information.
            </p>

            <h3>Authentication</h3>
            <p>
                Account authentication is provided using Firebase
                Authentication.
            </p>

            <h3>Contact</h3>
            <p>
                For privacy questions, contact:
                <strong>batlingo.contact@gmail.com</strong>
            </p>
        `
    },

    community: {
        title: "COMMUNITY GUIDELINES",
        content: `
            <h2>Community Guidelines</h2>

            <p>
                BatLingo is designed to provide a friendly and fair
                environment for language learners.
            </p>

            <h3>Be Respectful</h3>
            <p>
                Do not harass, threaten or intentionally offend other users.
            </p>

            <h3>Play Fair</h3>
            <p>
                Do not cheat, exploit bugs or manipulate game results.
            </p>

            <h3>Keep Profiles Appropriate</h3>
            <p>
                Do not use inappropriate names, profile information
                or content.
            </p>

            <h3>Protect the Community</h3>
            <p>
                Accounts that seriously or repeatedly violate these
                guidelines may be restricted or suspended.
            </p>
        `
    }
};

export function openInfoPage(page) {
    const data = infoPages[page];

    if (!data) return;

    infoTitle.textContent = data.title;
    infoContent.innerHTML = data.content;

    document.getElementById("setupScreen")?.classList.add("hidden");
    document.getElementById("sideMenu")?.classList.remove("open");
    document.getElementById("menuOverlay")?.classList.remove("active");

    infoScreen.classList.remove("hidden");

    window.scrollTo(0, 0);
}

export function closeInfoPage() {
    infoScreen.classList.add("hidden");
    document.getElementById("setupScreen")?.classList.remove("hidden");
}

document.getElementById("menuAboutBtn")?.addEventListener("click", () => openInfoPage("about"));
document.getElementById("menuContactBtn")?.addEventListener("click", () => openInfoPage("contact"));
document.getElementById("menuSupportBtn")?.addEventListener("click", () => openInfoPage("support"));
document.getElementById("menuTermsBtn")?.addEventListener("click", () => openInfoPage("terms"));
document.getElementById("menuPrivacyBtn")?.addEventListener("click", () => openInfoPage("privacy"));
document.getElementById("menuCommunityBtn")?.addEventListener("click", () => openInfoPage("community"));

document.getElementById("infoBackButton")?.addEventListener("click", closeInfoPage);
