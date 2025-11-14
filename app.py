from flask import Flask, request, jsonify
from flask_cors import CORS
from db_operations import add_user, get_user, authenticate, save_news_check, get_news_history, delete_history_item, get_user_by_email
from database import create_table
import os
import requests
import re
import joblib
from pathlib import Path
from sentence_transformers import SentenceTransformer
import random
import time
import fasttext



# temporary in-memory stores (for dev only)
pending_users = {}   # email -> {username, email, password}
otp_store = {}       # email -> {otp, expires_at_timestamp}

OTP_TTL_SECONDS = 10 * 60  # 10 minutes

# === Flask App Setup ===
app = Flask(__name__, static_folder='.', static_url_path='')

CORS(app, origins=[
    "https://truth-lens-ruby.vercel.app",  # your frontend
    "http://localhost:5173"                # for local testing
], supports_credentials=True)

# === Initialize Database ===
create_table()
print("✅ Database initialized")

# === Load ALL Models (English + Hindi) ===
BASE_DIR = Path(__file__).resolve().parent         # -> E:/Minor Project
MODELS_DIR = BASE_DIR / "models"                   # -> E:/Minor Project/models

print("📁 Loading models from:", MODELS_DIR)

# --- Language Detector ---
print("🔤 Loading language detection model...")
lid_model = fasttext.load_model(str(MODELS_DIR / "lid.176.bin"))

# --- English Model ---
print("🇬🇧 Loading English model...")
en_encoder = SentenceTransformer(str(MODELS_DIR / "english_sentence_encoder"))
en_clf = joblib.load(str(MODELS_DIR / "english_semantic_clf.joblib"))

# --- Hindi Model ---
print("🇮🇳 Loading Hindi model...")
hi_encoder = SentenceTransformer(str(MODELS_DIR / "hindi_embedding_model"))
hi_clf = joblib.load(str(MODELS_DIR / "hindi_semantic_clf.joblib"))

print("✅ All Models Loaded Successfully!")


# === Text Cleaning Function ===
# For English model only
def clean_text(text):
    text = text.lower()
    text = re.sub(r"http\S+", "", text)
    # keep hindi characters safe
    text = re.sub(r"[^a-zA-Z0-9\s]", "", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def detect_language(text):
    label, prob = lid_model.predict(text, k=1)
    lang = label[0].replace("__label__", "")
    return lang

# ============ ROUTES ============

# Health Check
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Backend is running', 'message': 'Connected'}), 200


# ========== SIGNUP ==========

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.get_json()
    username = data.get('username', '').strip()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not username or not email or not password:
        return jsonify({'success': False, 'message': 'All fields are required'}), 400
    
    if len(password) < 4:
        return jsonify({'success': False, 'message': 'Password must be at least 4 characters'}), 400

    # check duplicate username
    if get_user(username):
        return jsonify({'success': False, 'message': 'Username already exists'}), 400

    if get_user_by_email(email):
        return jsonify({'success': False, 'message': 'Email already exists'}), 400

    pending_users[email] = {
        "username": username,
        "email": email,
        "password": password
    }

    return jsonify({
        'success': True,
        'message': 'OTP verification required',
        'email': email
    }), 200


# Sign In Route
@app.route('/api/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return jsonify({'success': False, 'message': 'Username and password required'}), 400

        if authenticate(username, password):
            return jsonify({'success': True, 'message': '✅ Login successful', 'username': username}), 200
        else:
            return jsonify({'success': False, 'message': '❌ Invalid username or password'}), 401

    except Exception as e:
        print(f"❌ Signin error: {str(e)}")
        return jsonify({'success': False, 'message': 'Server error: ' + str(e)}), 500


# Get User Info
@app.route('/api/user/<username>', methods=['GET'])
def get_user_info(username):
    try:
        user = get_user(username)
        if user:
            return jsonify({'success': True, 'user': {'id': user[0], 'username': user[1], 'email': user[2]}}), 200
        else:
            return jsonify({'success': False, 'message': 'User not found'}), 404
    except Exception as e:
        return jsonify({'success': False, 'message': 'Error: ' + str(e)}), 500


# Get user's news history
@app.route('/api/user/<username>/history', methods=['GET'])
def get_user_history_route(username):
    try:
        print(f"📚 Getting history for {username}")
        history = get_news_history(username)
        print(f"✅ Found {len(history)} items")

        history_list = [
            {'id': item[0], 'headline': item[1], 'result': item[2], 'checked_at': item[3]}
            for item in history
        ]
        return jsonify({'success': True, 'history': history_list}), 200
    except Exception as e:
        print(f"❌ Error getting history: {str(e)}")
        return jsonify({'success': False, 'message': 'Error: ' + str(e)}), 500


# Save news check to history
@app.route('/api/user/<username>/save-check', methods=['POST'])
def save_news_check_route(username):
    try:
        data = request.get_json()
        headline = data.get('headline', '').strip()
        result = data.get('result', '').strip()

        print(f"💾 Save check for {username}: '{headline[:30]}...' = {result}")

        if not headline or not result:
            return jsonify({'success': False, 'message': 'Headline and result required'}), 400

        if save_news_check(username, headline, result):
            print("✅ Saved successfully")
            return jsonify({'success': True, 'message': 'News check saved to history'}), 200
        else:
            print("❌ Failed to save")
            return jsonify({'success': False, 'message': 'Failed to save to history'}), 400

    except Exception as e:
        print(f"❌ Error saving: {str(e)}")
        return jsonify({'success': False, 'message': 'Error: ' + str(e)}), 500


# Delete history item
@app.route('/api/user/<username>/history/<int:history_id>', methods=['DELETE'])
def delete_history_route(username, history_id):
    try:
        print(f"🗑️ Deleting history item {history_id}")

        if delete_history_item(history_id):
            print("✅ Deleted successfully")
            return jsonify({'success': True, 'message': 'History item deleted'}), 200
        else:
            print("❌ Item not found")
            return jsonify({'success': False, 'message': 'History item not found'}), 404

    except Exception as e:
        print(f"❌ Error deleting: {str(e)}")
        return jsonify({'success': False, 'message': 'Error: ' + str(e)}), 500


# Get News API
@app.route('/api/news')
def get_news():
    api_key = "6cf1b91669b34cfa90a089173bc32bef"
    url = f"https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey={api_key}"
    response = requests.get(url)
    return jsonify(response.json())


# === Transformer-based Fake News Prediction ===
@app.route('/api/predict', methods=['POST'])
def predict_news():
    try:
        data = request.get_json(force=True)
        text = data.get("text", "").strip()

        if not text:
            return jsonify({"success": False, "message": "No text provided"}), 400

        # --- Detect Language ---
        lang = detect_language(text)
        print(f"🌐 Detected Language: {lang}")

        # Clean English only
        cleaned = clean_text(text)

        # ======================================
        # 🇮🇳 HINDI MODEL
        # ======================================
        if lang == "hi":
            emb = hi_encoder.encode([text])
            pred = hi_clf.predict(emb)[0]
            proba = hi_clf.predict_proba(emb)[0]

            confidence = proba[pred] * 100  # convert to %
            confidence_str = f"{confidence:.2f}%"

            result = "REAL NEWS" if pred == 1 else "FAKE NEWS"

            print(f"🧠 [Hindi Model] => {result} | Confidence={confidence_str}")

            return jsonify({
                "success": True,
                "prediction": result,
                "language": "hindi",
                "used_model": "hindi",
                "confidence": confidence_str
            }), 200

        # ======================================
        # 🇬🇧 ENGLISH MODEL
        # ======================================
        else:
            emb = en_encoder.encode([cleaned])
            pred = en_clf.predict(emb)[0]
            proba = en_clf.predict_proba(emb)[0]

            confidence = proba[pred] * 100  # convert to %
            confidence_str = f"{confidence:.2f}%"

            result = "REAL NEWS" if pred == 1 else "FAKE NEWS"

            print(f"🧠 [English Model] => {result} | Confidence={confidence_str}")

            return jsonify({
                "success": True,
                "prediction": result,
                "language": "english",
                "used_model": "english",
                "confidence": confidence_str
            }), 200

    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500


# ========== OTP GENERATION & EMAIL SENDING ==========
@app.route('/api/send-otp', methods=['POST'])
def send_otp():
    data = request.get_json()
    recipient_email = data.get('email')

    if not recipient_email:
        return jsonify({"success": False, "message": "Email required"}), 400

    if recipient_email not in pending_users:
        return jsonify({"success": False, "message": "No pending signup for this email"}), 400

    otp = str(random.randint(100000, 999999))
    expiry = int(time.time()) + OTP_TTL_SECONDS
    otp_store[recipient_email] = {'otp': otp, 'expires_at': expiry}

    # DEV MODE → return OTP immediately (handy for local dev)
    if os.getenv("DEV_RETURN_OTP", "false").lower() == "true":
        print(f"[DEV_RETURN_OTP] OTP for {recipient_email}: {otp}")
        return jsonify({"success": True, "otp": otp}), 200

    # Ensure BREVO API key exists
    brevo_key = os.getenv("BREVO_API_KEY")
    if not brevo_key:
        print("❌ BREVO_API_KEY missing in environment")
        return jsonify({"success": False, "message": "Server misconfigured: BREVO_API_KEY missing"}), 500

    headers = {
        "accept": "application/json",
        "api-key": brevo_key,
        "content-type": "application/json"
    }

    email_data = {
        "sender": {"name": "Truth Lens", "email": "projects.planeta@gmail.com"},  # must be verified
        "to": [{"email": recipient_email}],
        "subject": "Your OTP code",
        "htmlContent": f"<h2>Your OTP is: <b>{otp}</b></h2><p>This code expires in 10 minutes.</p>"
    }

    try:
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers=headers,
            json=email_data,
            timeout=15
        )
    except Exception as ex:
        print("❌ Exception sending to Brevo:", str(ex))
        return jsonify({"success": False, "message": "Exception when contacting Brevo: " + str(ex)}), 500

    # log Brevo response for debugging
    print(f"Brevo status: {resp.status_code} | body: {resp.text}")

    if resp.status_code in (200, 201, 202):
        return jsonify({"success": True, "message": "OTP sent"}), 200
    else:
        # include Brevo body so you can see the exact error in the frontend dev console
        return jsonify({"success": False, "message": "Failed to send OTP", "brevo_status": resp.status_code, "brevo_body": resp.text}), 500


@app.route('/api/verify-otp', methods=['POST'])
def verify_otp():
    data = request.get_json()
    email = data.get('email')
    entered = data.get('otp')  # otp typed by user

    if not email or not entered:
        return jsonify({"success": False, "message": "Email and OTP required"}), 400

    rec = otp_store.get(email)
    if not rec:
        return jsonify({"success": False, "message": "OTP not found or expired"}), 400

    if int(time.time()) > rec['expires_at']:
        del otp_store[email]
        return jsonify({"success": False, "message": "OTP expired"}), 400

    if entered != rec['otp']:
        return jsonify({"success": False, "message": "Invalid OTP"}), 400

    # OTP correct → finalize registration
    user = pending_users.get(email)
    if not user:
        return jsonify({"success": False, "message": "Pending signup not found"}), 400

    added = add_user(user["username"], user["email"], user["password"])
    if not added:
        return jsonify({"success": False, "message": "Failed to add user to DB"}), 500

    # cleanup
    del pending_users[email]
    del otp_store[email]

    return jsonify({"success": True, "message": "Account verified and created", "username": user["username"]}), 200


@app.route('/api/reset-db', methods=['POST'])
def reset_database():
    import sqlite3, os
    db_path = "users.db"
    if os.path.exists(db_path):
        try:
            conn = sqlite3.connect(db_path)
            c = conn.cursor()
            # Remove history first to avoid FK issues (if any)
            c.execute("DELETE FROM news_history;")
            c.execute("DELETE FROM users;")
            conn.commit()
            conn.close()
            return jsonify({"success": True, "message": "✅ All user and history data deleted."})
        except Exception as e:
            return jsonify({"success": False, "message": "❌ Error resetting DB: " + str(e)}), 500
    else:
        return jsonify({"success": False, "message": "❌ Database not found."}), 404


# === Run Server ===
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting Flask server on port {port}...")
    app.run(host='0.0.0.0', port=port)
