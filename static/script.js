
const passwordInput = document.getElementById("password");
const toggleButton = document.getElementById("toggle");
const clearButton = document.getElementById("clear");
const strengthLabel = document.getElementById("strength");
const meter = document.getElementById("meter");
const meterFill = document.getElementById("meter-fill");
const statusText = document.getElementById("status");
const suggestionsList = document.getElementById("suggestions");

const colors = {
    "Very Weak": "#ef4444",
    "Weak": "#f97316",
    "Moderate": "#eab308",
    "Strong": "#22c55e",
    "Very Strong": "#10b981"
};

let requestNumber = 0;
let debounceTimer;

function showSuggestions(items) {
    suggestionsList.replaceChildren();

    items.forEach((item) => {
        const li = document.createElement("li");
        li.textContent = item;
        suggestionsList.appendChild(li);
    });
}

function resetDisplay() {
    strengthLabel.textContent = "Not rated";
    strengthLabel.style.color = "#a5b4fc";
    meterFill.style.width = "0%";
    meterFill.style.background = "#64748b";
    meter.setAttribute("aria-valuenow", "0");
    statusText.textContent = "Enter a password to begin.";

    showSuggestions([
        "Use a long, unique password.",
        "Avoid predictable words and patterns."
    ]);
}

async function checkPassword() {
    const password = passwordInput.value;
    const thisRequest = ++requestNumber;

    if (!password) {
        resetDisplay();
        return;
    }

    strengthLabel.textContent = "Checking...";
    statusText.textContent = "Analyzing your test password...";

    try {
        const response = await fetch("/api/check", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ password })
        });

        const result = await response.json();

        // Ignore outdated responses if the user has typed again.
        if (thisRequest !== requestNumber) return;

        if (!response.ok) {
            throw new Error(result.error || "Could not check password.");
        }

        const strength = result.strength;
        const color = colors[strength] || "#64748b";
        const percentage = Math.min(
            100,
            Math.round((result.score / 6) * 100)
        );

        strengthLabel.textContent = strength;
        strengthLabel.style.color = color;

        meterFill.style.width = `${percentage}%`;
        meterFill.style.background = color;
        meter.setAttribute("aria-valuenow", String(percentage));

        statusText.textContent =
            strength === "Strong" || strength === "Very Strong"
                ? "Good result, but this is only a basic estimate."
                : "Review the recommendations below to improve your result.";

        showSuggestions(result.suggestions);
    } catch (error) {
        if (thisRequest !== requestNumber) return;

        strengthLabel.textContent = "Check unavailable";
        strengthLabel.style.color = "#f97316";
        meterFill.style.width = "0%";
        meter.setAttribute("aria-valuenow", "0");
        statusText.textContent =
            "Could not reach the local Flask server. Check that it is running.";
        showSuggestions([error.message]);
    }
}

passwordInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(checkPassword, 150);
});

toggleButton.addEventListener("click", () => {
    const shouldShow = passwordInput.type === "password";

    passwordInput.type = shouldShow ? "text" : "password";
    toggleButton.textContent = shouldShow ? "Hide" : "Show";
    toggleButton.setAttribute(
        "aria-label",
        shouldShow ? "Hide password" : "Show password"
    );
});

clearButton.addEventListener("click", () => {
    clearTimeout(debounceTimer);
    requestNumber++;
    passwordInput.value = "";
    passwordInput.type = "password";
    toggleButton.textContent = "Show";
    toggleButton.setAttribute("aria-label", "Show password");
    resetDisplay();
    passwordInput.focus();
});

resetDisplay();

/* ========================================
   SECURE PASSWORD GENERATOR
   ======================================== */

const lengthSlider = document.getElementById("password-length");
const lengthValue = document.getElementById("length-value");
const generateButton = document.getElementById("generate-button");
const generatedResult = document.getElementById("generated-result");
const generatedPassword = document.getElementById("generated-password");
const toggleGenerated = document.getElementById("toggle-generated");
const copyGenerated = document.getElementById("copy-generated");
const generatorStatus = document.getElementById("generator-status");

lengthSlider.addEventListener("input", () => {
    lengthValue.textContent = lengthSlider.value;
});

generateButton.addEventListener("click", async () => {
    const options = {
        length: Number(lengthSlider.value),
        uppercase: document.getElementById("gen-uppercase").checked,
        lowercase: document.getElementById("gen-lowercase").checked,
        numbers: document.getElementById("gen-numbers").checked,
        symbols: document.getElementById("gen-symbols").checked
    };

    generateButton.disabled = true;
    generateButton.textContent = "Generating...";
    generatorStatus.textContent = "";

    try {
        const response = await fetch("/api/generate", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(options)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Unable to generate password.");
        }

        generatedPassword.value = result.password;
        generatedPassword.type = "password";
        toggleGenerated.textContent = "Show";
        toggleGenerated.setAttribute("aria-label", "Show generated password");

        generatedResult.hidden = false;
        generatorStatus.textContent =
            "Password generated locally by your Flask application.";

        // Also update the existing strength checker.
        passwordInput.value = result.password;
        checkPassword();
    } catch (error) {
        generatorStatus.textContent = error.message;
        generatedResult.hidden = false;
    } finally {
        generateButton.disabled = false;
        generateButton.textContent = "⚡ Generate Secure Password";
    }
});

toggleGenerated.addEventListener("click", () => {
    const shouldShow = generatedPassword.type === "password";

    generatedPassword.type = shouldShow ? "text" : "password";
    toggleGenerated.textContent = shouldShow ? "Hide" : "Show";
    toggleGenerated.setAttribute(
        "aria-label",
        shouldShow ? "Hide generated password" : "Show generated password"
    );
});

copyGenerated.addEventListener("click", async () => {
    const password = generatedPassword.value;
    if (!password) return;

    try {
        await navigator.clipboard.writeText(password);
        generatorStatus.textContent = "Password copied to clipboard.";
    } catch {
        // Fallback for browsers where Clipboard API is unavailable.
        generatedPassword.type = "text";
        generatedPassword.select();

        const copied = document.execCommand("copy");

        generatedPassword.setSelectionRange(0, 0);
        generatedPassword.type = "password";

        generatorStatus.textContent = copied
            ? "Password copied to clipboard."
            : "Copy failed. Reveal the password and copy it manually.";
    }
});