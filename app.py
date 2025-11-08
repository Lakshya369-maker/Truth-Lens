from flask import Flask, request, jsonify
from flask_cors import CORS
from db_operations import add_user, get_user, authenticate, save_news_check, get_news_history, delete_history_item
from database import create_table
import os
import requests
from flask import jsonify
import joblib
from pathlib import Path
import re

app = Flask(__name__, static_folder='.', static_url_path='')

# Enable CORS for same machine requests
CORS(app)

# === Load ML model ===
MODELS_DIR = Path(__file__).resolve().parent / "models"
english_vectorizer = joblib.load(MODELS_DIR / "tfidf_english_vectorizer.joblib")
english_model = joblib.load(MODELS_DIR / "tfidf_english_clf.joblib")
print("✅ English model loaded successfully")


# Initialize database on startup
create_table()
print("✅ Database initialized")

# ============ API Routes ============

# Health Check
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({'status': 'Backend is running', 'message': 'Connected'}), 200

# Sign Up Route
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()

        if not username or not email or not password:
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400

        if len(password) < 4:
            return jsonify({
                'success': False,
                'message': 'Password must be at least 4 characters'
            }), 400

        if add_user(username, email, password):
            return jsonify({
                'success': True,
                'message': '✅ User registered successfully! Please sign in.'
            }), 201
        else:
            return jsonify({
                'success': False,
                'message': 'Username or email already exists'
            }), 400

    except Exception as e:
        print(f"❌ Signup error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Server error: ' + str(e)
        }), 500

# Sign In Route
@app.route('/api/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()

        if not username or not password:
            return jsonify({
                'success': False,
                'message': 'Username and password required'
            }), 400

        if authenticate(username, password):
            return jsonify({
                'success': True,
                'message': '✅ Login successful',
                'username': username
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': '❌ Invalid username or password'
            }), 401

    except Exception as e:
        print(f"❌ Signin error: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Server error: ' + str(e)
        }), 500

# Get User Info
@app.route('/api/user/<username>', methods=['GET'])
def get_user_info(username):
    try:
        user = get_user(username)
        if user:
            return jsonify({
                'success': True,
                'user': {
                    'id': user[0],
                    'username': user[1],
                    'email': user[2]
                }
            }), 200
        else:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404

    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Error: ' + str(e)
        }), 500

# Get user's news history
@app.route('/api/user/<username>/history', methods=['GET'])
def get_user_history_route(username):
    try:
        print(f"📚 Getting history for {username}")
        history = get_news_history(username)
        print(f"✅ Found {len(history)} items")
        
        history_list = [
            {
                'id': item[0],
                'headline': item[1],
                'result': item[2],
                'checked_at': item[3]
            }
            for item in history
        ]
        
        return jsonify({
            'success': True,
            'history': history_list
        }), 200
    except Exception as e:
        print(f"❌ Error getting history: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error: ' + str(e)
        }), 500

# Save news check to history
@app.route('/api/user/<username>/save-check', methods=['POST'])
def save_news_check_route(username):
    try:
        data = request.get_json()
        headline = data.get('headline', '').strip()
        result = data.get('result', '').strip()
        
        print(f"💾 Save check for {username}: '{headline[:30]}...' = {result}")
        
        if not headline or not result:
            return jsonify({
                'success': False,
                'message': 'Headline and result required'
            }), 400
        
        if save_news_check(username, headline, result):
            print(f"✅ Saved successfully")
            return jsonify({
                'success': True,
                'message': 'News check saved to history'
            }), 200
        else:
            print(f"❌ Failed to save")
            return jsonify({
                'success': False,
                'message': 'Failed to save to history'
            }), 400
            
    except Exception as e:
        print(f"❌ Error saving: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error: ' + str(e)
        }), 500

# Delete history item
@app.route('/api/user/<username>/history/<int:history_id>', methods=['DELETE'])
def delete_history_route(username, history_id):
    try:
        print(f"🗑️ Deleting history item {history_id}")
        
        if delete_history_item(history_id):
            print(f"✅ Deleted successfully")
            return jsonify({
                'success': True,
                'message': 'History item deleted'
            }), 200
        else:
            print(f"❌ Item not found")
            return jsonify({
                'success': False,
                'message': 'History item not found'
            }), 404
            
    except Exception as e:
        print(f"❌ Error deleting: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error: ' + str(e)
        }), 500
    
@app.route('/api/news')
def get_news():
    api_key = "6cf1b91669b34cfa90a089173bc32bef"
    url = f"https://newsapi.org/v2/top-headlines?language=en&pageSize=20&apiKey={api_key}"
    response = requests.get(url)
    return jsonify(response.json())

# ============ AI Fake News Detection ============

def preprocess_text(text):
    """Normalize text just like in training"""
    text = text.lower()
    text = re.sub(r"http\S+", "", text)          # remove URLs
    text = re.sub(r"[^a-z\s]", "", text)         # remove special characters and numbers
    text = re.sub(r"\s+", " ", text).strip()     # remove extra spaces
    return text

@app.route('/api/predict', methods=['POST'])
def predict_news():
    try:
        data = request.get_json(force=True)
        text = data.get("text", "").strip()
        if not text:
            return jsonify({"success": False, "message": "No text provided"}), 400

        # ✅ Preprocess the text
        clean_text = preprocess_text(text)

        # ✅ Predict
        X = english_vectorizer.transform([clean_text])
        proba = english_model.predict_proba(X)[0]
        confidence = round(max(proba) * 100, 2)
        pred = english_model.classes_[proba.argmax()]

        print(f"🧠 Raw prediction: {pred} | Confidence: {confidence}% | Text: {clean_text[:80]}...")

        # ✅ Use lowercase check
        if confidence < 55:
            result = "UNCERTAIN"
        else:
            result = "REAL NEWS" if str(pred).lower() == "real" else "FAKE NEWS"

        return jsonify({
            "success": True,
            "prediction": result,
            "confidence": confidence
        }), 200

    except Exception as e:
        print(f"❌ Prediction error: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Server error: " + str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"🚀 Starting Flask server on port {port}...")
    app.run(host='0.0.0.0', port=port)