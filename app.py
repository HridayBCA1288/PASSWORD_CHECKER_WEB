
from flask import Flask, render_template, request, jsonify
import secrets
import string
import re

app = Flask(__name__)

COMMON_PASSWORDS = {
    "password", "password123", "12345678",
    "qwerty123", "admin123", "iloveyou"
}


def check_password_strength(password):
    score = 0
    suggestions = []

    if not password:
        return {
            "score": 0,
            "strength": "Not Rated",
            "suggestions": ["Enter a test password."]
        }

    if password.lower() in COMMON_PASSWORDS:
        return {
            "score": 0,
            "strength": "Very Weak",
            "suggestions": [
                "This is a common password. Choose a unique one."
            ]
        }

    if len(password) >= 12:
        score += 2
    elif len(password) >= 8:
        score += 1
    else:
        suggestions.append(
            "Use at least 8 characters; 12 or more is better."
        )

    checks = [
        (r"[A-Z]", "Add an uppercase letter (A-Z)."),
        (r"[a-z]", "Add a lowercase letter (a-z)."),
        (r"\d", "Add a number (0-9)."),
        (r"[^A-Za-z0-9]", "Add a special character.")
    ]

    for pattern, message in checks:
        if re.search(pattern, password):
            score += 1
        else:
            suggestions.append(message)

    if len(password) >= 4 and len(set(password)) == 1:
        score = 0
        suggestions.append(
            "Avoid passwords made from one repeated character."
        )

    if len(password) < 8 or score <= 2:
        strength = "Very Weak"
    elif score <= 3:
        strength = "Weak"
    elif score <= 4:
        strength = "Moderate"
    elif score <= 5:
        strength = "Strong"
    else:
        strength = "Very Strong"

    if not suggestions:
        suggestions.append(
            "All basic checks passed. Consider using a unique passphrase."
        )

    return {
        "score": score,
        "strength": strength,
        "suggestions": suggestions
    }


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/api/check", methods=["POST"])
def check_password():
    data = request.get_json(silent=True) or {}
    password = data.get("password", "")

    if not isinstance(password, str):
        return jsonify({"error": "Password must be text."}), 400

    if len(password) > 1024:
        return jsonify({
            "error": "Please enter a password under 1025 characters."
        }), 400

    return jsonify(check_password_strength(password))

@app.route("/api/generate", methods=["POST"])
def generate_password():
    data = request.get_json(silent=True) or {}

    try:
        length = int(data.get("length", 16))
    except (ValueError, TypeError):
        return jsonify({"error": "Password length must be a number."}), 400

    if not 8 <= length <= 64:
        return jsonify({
            "error": "Choose a length between 8 and 64."
        }), 400

    options = [
        (data.get("uppercase", True), string.ascii_uppercase),
        (data.get("lowercase", True), string.ascii_lowercase),
        (data.get("numbers", True), string.digits),
        (data.get("symbols", True), "!@#$%^&*()-_=+?")
    ]

    selected = [chars for enabled, chars in options if enabled]

    if not selected:
        return jsonify({
            "error": "Select at least one character type."
        }), 400

    if len(selected) > length:
        return jsonify({
            "error": "Password length is too short for these options."
        }), 400

    # Guarantee at least one character from every selected group.
    password_chars = [secrets.choice(chars) for chars in selected]
    all_chars = "".join(selected)

    password_chars.extend(
        secrets.choice(all_chars)
        for _ in range(length - len(password_chars))
    )

    # Cryptographically secure shuffle.
    secrets.SystemRandom().shuffle(password_chars)

    return jsonify({"password": "".join(password_chars)})


if __name__ == "__main__":
    app.run(debug=True)
