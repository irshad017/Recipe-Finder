import React, { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  // This holds the recorder so we can start/stop recording later.
  const mediaRecorderRef = useRef(null);

  // State to keep track if we're recording
  const [isRecording, setIsRecording] = useState(false);

  // Holds the transcription text from the server
  const [transcription, setTranscription] = useState('');

  // Holds the recipe matched by the server
  const [matchedRecipe, setMatchedRecipe] = useState(null);

  // Ref to play the recorded audio
  const audioPlayerRef = useRef(null);

  // 🔴 Start recording audio
  const startRecording = async () => {
    try {
      console.log("🔄 Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("✅ Microphone access granted.");

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks = [];

      console.log("🎙️ MediaRecorder created and ready.");

      // Every time audio data is ready, we collect it into an array
      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
        console.log("📦 Collected audio chunk:", event.data);
      };

      // 🔁 When recording stops, we send audio to the server
      mediaRecorder.onstop = async () => {
        console.log("🛑 Recording stopped.");

        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        console.log("🎧 Created audio Blob:", audioBlob);

        const audioURL = URL.createObjectURL(audioBlob);
        audioPlayerRef.current.src = audioURL;

        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');
        console.log("FormData:",formData)

        const loadingToast = toast.loading('Uploading and processing audio...');
        console.log("⏳ Uploading audio to server...");

        try {
          const response = await fetch('https://recipe-backend-tcrn.onrender.com/upload-audio', {
            method: 'POST',
            body: formData,
          });

          toast.dismiss(loadingToast);
          const data = await response.json();
          console.log("📩 Server responded:", data);

          // Show toast based on response status
          if (response.status === 200) {
            toast.success(data.message || 'Recipe matched successfully!');
          } else if (response.status === 400) {
            toast.error(data.message || data.error || 'Could not match recipe.');
          } else {
            toast.error(data.message || data.error || 'Unexpected server response.');
          }

          if (data.text) {
            setTranscription(data.text);
            console.log("📝 Transcription received:", data.text);

            setMatchedRecipe(data.matched_recipe || null);
            console.log("🍲 Matched Recipe:", data.matched_recipe);

            audioPlayerRef.current.play();
          } else {
            setTranscription(data.error || 'Transcription failed.');
            console.warn("⚠️ No transcription text found.");
          }
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Failed to upload audio.');
          console.error("❌ Upload error:", err);
          setTranscription('Failed to upload audio.');
        }
      };

      mediaRecorder.start();
      toast.success('Recording started!');
      console.log("🔴 Recording started...");
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied.');
      console.error('❌ Microphone access error:', err);
      setTranscription('Microphone access denied.');
    }
  };

  // 🟢 Stop recording audio
  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      toast.success('Recording stopped!');
      console.log("🟢 Stop called on MediaRecorder.");
      setIsRecording(false);
    } else {
      console.warn("⚠️ MediaRecorder was not available to stop.");
    }
  };

  console.log("🧪 mediaRecorderRef:", mediaRecorderRef);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-400 to-indigo-600 text-white p-6">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold mb-4">🎙️ Voice to Recipe Finder</h1>

        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full text-lg transition duration-300 ease-in-out transform hover:scale-105"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {/* Transcription output */}
        {transcription && (
          <div className="bg-white text-gray-900 p-4 rounded-lg shadow-lg max-w-xl mx-auto mt-6">
            <h3 className="text-xl font-semibold mb-2">📝 Transcription:</h3>
            <p className="text-lg">{transcription}</p>
          </div>
        )}

        {/* Recipe match output */}
        {matchedRecipe && (
          <div className="bg-white text-gray-800 p-4 rounded-lg shadow-lg max-w-xl mx-auto mt-4">
            <h3 className="text-xl font-semibold mb-2">🍽️ Closest Recipe Match:</h3>
            <ul className="text-left space-y-1">
              {Object.entries(matchedRecipe).map(([key, value]) => (
                <li key={key}><strong>{key}:</strong> {value}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Audio player to listen to your recorded voice */}
        <audio ref={audioPlayerRef} controls className="mt-4" />
      </div>
    </div>
  );
}

export default App;
