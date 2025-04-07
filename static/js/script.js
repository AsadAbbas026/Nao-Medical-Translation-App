let recorder;
let audioStream;

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
    alert("Your browser does not support speech recognition. Please use Chrome or Edge.");
}

const recognition = new SpeechRecognition();
recognition.continuous = true;
recognition.lang = 'en-US';
recognition.interimResults = true;

recognition.onstart = () => console.log("Speech recognition started");
recognition.onerror = (event) => {
    console.error("Speech recognition error", event.error);
    alert("Error with speech recognition: " + event.error);
};
recognition.onend = () => console.log("Speech recognition ended");

recognition.onresult = function(event) {
    let transcript = '';
    let isFinal = false;

    for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
        if (event.results[i].isFinal) isFinal = true;
    }

    document.getElementById('originalText').innerText = transcript;
    if (isFinal) sendToBackendForTranslation(transcript);
};

function requestMicrophoneAccess() {
    return navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            audioStream = stream;
            console.log("Microphone access granted");
        })
        .catch(error => {
            console.error("Microphone access denied", error);
            throw new Error("Microphone access denied.");
        });
}

function startRecording() {
    const inputLang = document.getElementById('inputLang').value;
    recognition.lang = inputLang; // 👈 Dynamically set recognition language

    document.getElementById('startRecognition').disabled = true;
    document.getElementById('stopRecognition').disabled = false;

    requestMicrophoneAccess()
        .then(() => recognition.start())
        .catch(alert);
}

function stopRecording() {
    recognition.stop();
    document.getElementById('startRecognition').disabled = false;
    document.getElementById('stopRecognition').disabled = true;
}

async function sendToBackendForTranslation(text) {
    const inputLang = document.getElementById('inputLang').value;
    const outputLang = document.getElementById('outputLang').value;

    try {
        const response = await fetch('/translate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, target_lang: outputLang })
        });

        const data = await response.json();
        document.getElementById('translatedText').innerText = data.translated_text;
    } catch (error) {
        console.error("Error during translation:", error);
    }
}

function speakTranslatedText() {
    const translatedText = document.getElementById('translatedText').innerText;
    const selectedLang = document.getElementById('outputLang').value;

    if (!translatedText) return;

    const synth = window.speechSynthesis;
    let voices = synth.getVoices();

    if (!voices.length) {
        synth.onvoiceschanged = () => speakTranslatedText();
        return;
    }

    const matchingVoice = voices.find(voice => voice.lang.startsWith(selectedLang));
    const utterance = new SpeechSynthesisUtterance(translatedText);

    if (matchingVoice) {
        utterance.voice = matchingVoice;
        utterance.lang = matchingVoice.lang;
    } else {
        utterance.lang = selectedLang;
        alert(`No exact voice found for "${selectedLang}". Using default voice.`);
    }

    synth.speak(utterance);
}

// Event Listeners
document.getElementById('startRecognition').addEventListener('click', startRecording);
document.getElementById('stopRecognition').addEventListener('click', stopRecording);
document.getElementById('speakTranslation').addEventListener('click', speakTranslatedText);

// Disable Stop button initially
document.getElementById('stopRecognition').disabled = true;
