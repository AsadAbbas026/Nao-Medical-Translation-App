import os
from flask import Flask, render_template, request, jsonify
from flask_talisman import Talisman
from functions.translator import translate_text
from functions.medical_correction import correct_medical_terms, sanitize_input
from faster_whisper import WhisperModel
from pydub import AudioSegment
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
Talisman(app)  # Enforce HTTPS headers

# Fetch API token from .env securely
API_SECRET_TOKEN = os.getenv("API_SECRET_TOKEN")
if not API_SECRET_TOKEN:
    raise RuntimeError("API_SECRET_TOKEN not set in environment variables.")

# Create uploads folder if missing
UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Load Whisper model
try:
    model = WhisperModel("base", device="cpu", compute_type="int8")
except Exception as e:
    raise RuntimeError(f"Failed to load Whisper model: {e}")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/translate', methods=['POST'])
def translate():
    try:
        data = request.get_json(force=True)
        text_to_translate = data.get('text')
        target_lang = data.get('target_lang')

        if not text_to_translate or not target_lang:
            return jsonify({'error': 'Missing text or target language'}), 400

        print(f"[INFO] Text to translate: {text_to_translate}")
        print(f"[INFO] Target language: {target_lang}")

        translated_text = translate_text(text_to_translate, target_lang)
        return jsonify({'translated_text': translated_text})

    except Exception as e:
        return jsonify({'error': f'Translation failed: {str(e)}'}), 500

@app.route('/transcribe', methods=['POST'])
def transcribe():
    try:
        if 'audio' not in request.files:
            return jsonify({'error': 'No audio file uploaded'}), 400

        audio_file = request.files['audio']
        filename = audio_file.filename or 'temp_audio.webm'
        audio_path = os.path.join(UPLOAD_FOLDER, filename)

        try:
            audio_file.save(audio_path)
            print("[INFO] Audio saved to:", audio_path)
        except Exception as e:
            return jsonify({'error': f'Failed to save audio file: {str(e)}'}), 500

        # Convert to .wav if webm
        try:
            if filename.endswith('.webm'):
                wav_path = audio_path.replace('.webm', '.wav')
                audio = AudioSegment.from_file(audio_path, format='webm')
                audio.export(wav_path, format='wav')
                os.remove(audio_path)
                print("[INFO] Converted to WAV:", wav_path)
            else:
                wav_path = audio_path
        except Exception as e:
            return jsonify({'error': f'Audio conversion failed: {str(e)}'}), 500

        # Transcription
        try:
            segments, _ = model.transcribe(wav_path)
            transcription = " ".join(segment.text for segment in segments)
            safe_input = sanitize_input(transcription)
        except Exception as e:
            return jsonify({'error': f'Transcription failed: {str(e)}'}), 500

        # Medical correction
        try:
            corrected_transcription = correct_medical_terms(safe_input)
        except Exception as e:
            return jsonify({'error': f'Medical correction failed: {str(e)}'}), 500

        return jsonify({'transcription': corrected_transcription})

    except Exception as e:
        return jsonify({'error': f'Unexpected error: {str(e)}'}), 500

# Global error handler
@app.errorhandler(Exception)
def handle_global_exception(e):
    return jsonify({'error': f'Server error: {str(e)}'}), 500

if __name__ == '__main__':
    app.run(debug=True)
