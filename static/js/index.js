let mediaRecorder;
let audioChunks = [];
let audioBlob;

document.getElementById('startBtn').addEventListener('click', async () => {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            try {
                // Create the Blob from audioChunks
                audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

                // Send the audio for transcription
                const formData = new FormData();
                formData.append('audio', audioBlob, 'recording.webm');

                const response = await fetch('/transcribe', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const errData = await response.json();
                    throw new Error(errData.error || 'Failed to transcribe audio');
                }

                const data = await response.json();
                console.log("Transcription:", data.transcription);

                // Display the transcription in the originalText box
                document.getElementById('originalText').innerText = data.transcription;

                // Translate the transcription
                const outputLang = document.getElementById('outputLang').value;
                if (!outputLang) {
                    throw new Error("No target language selected");
                }

                const translatedResponse = await fetch('/translate', {
                    method: 'POST',
                    body: JSON.stringify({
                        text: data.transcription,
                        target_lang: outputLang
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });

                if (!translatedResponse.ok) {
                    const errTranslated = await translatedResponse.json();
                    throw new Error(errTranslated.error || 'Translation failed');
                }

                const translatedData = await translatedResponse.json();
                console.log("Translated Text:", translatedData.translated_text);

                document.getElementById('translatedText').innerText = translatedData.translated_text;

            } catch (err) {
                console.error("Processing error:", err.message);
                alert("An error occurred: " + err.message);
            }
        };

        // Start recording
        mediaRecorder.start();
        document.getElementById('startBtn').disabled = true;
        document.getElementById('stopBtn').disabled = false;

    } catch (err) {
        console.error("Recording start error:", err.message);
        alert("Microphone access denied or not supported.");
    }
});

document.getElementById('stopBtn').addEventListener('click', () => {
    try {
        if (mediaRecorder && mediaRecorder.state === "recording") {
            mediaRecorder.stop();  // Stop the recording
            document.getElementById('startBtn').disabled = false;
            document.getElementById('stopBtn').disabled = true;

            // Enable the play button once the recording is stopped
            document.getElementById('playBtn').disabled = false;

        }
    } catch (err) {
        console.error("Stop recording error:", err.message);
        alert("Could not stop recording properly.");
    }
});

// Add Play Audio Button functionality
document.getElementById('playBtn').addEventListener('click', () => {
    if (!audioBlob) {
        console.error("No audio to play");
        alert("No audio recorded yet!");
        return;
    }

    const audioUrl = URL.createObjectURL(audioBlob);
    const audioElement = document.getElementById('playback');
    audioElement.src = audioUrl;  // Set the playback URL

    // Play the audio automatically
    audioElement.play();
});

// Disable Play button initially
document.getElementById('playBtn').disabled = true;
