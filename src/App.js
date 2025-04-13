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
        console.log("FormData:", formData);

        const loadingToast = toast.loading('Uploading and processing audio...');
        console.log("⏳ Uploading audio to server...");

        try {
          // const response = await fetch('https://recipe-backend-tcrn.onrender.com//upload-audio', {
          //   method: 'POST',
          //   body: formData,
          // });
          const response = await fetch('http://localhost:5000/upload-audio', {
            method: 'POST',
            body: formData,
          });

          toast.dismiss(loadingToast);
          const data = await response.json();
          console.log("📩 Server responded:", data);

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

  <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-600 text-white px-4 py-8 flex flex-col items-center">
  <Toaster position="top-right" reverseOrder={false} />

  <div className="w-full max-w-md space-y-6">
    <h1 className="text-3xl font-extrabold text-center">🎙️ Voice to Recipe Finder</h1>

    {/* Start/Stop Recording Button */}
    <div className="flex justify-center">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`${
          isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
        } text-white font-bold py-2 px-6 rounded-full text-lg shadow-md transition-transform transform hover:scale-105`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
    </div>

    {/* Audio Player */}
    <audio ref={audioPlayerRef} controls className="w-full mt-4 rounded-md" />

    {/* Transcription Output */}
    {transcription && (
      <div className="bg-white text-gray-900 p-4 rounded-2xl shadow-lg">
        <h3 className="text-xl font-semibold mb-2">📝 Transcription</h3>
        <p className="text-base">{transcription}</p>
      </div>
    )}

    {/* Recipe Match Output */}
    {matchedRecipe && (
      <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-xl">
        {/* Image */}
        <div className="w-full h-48 bg-gray-200">
          {matchedRecipe.Image_Name ? (
            <img 
              src="/phone.jpg" 
              alt="Recipe" 
              className="w-full h-full object-cover"
            />
        ) : (
            <div className="flex items-center justify-center h-full text-gray-500">No Image</div>
        )}
        </div>
    
        <div className="p-4 space-y-4">
          {/* Title */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">{matchedRecipe.title}</h2>
            {matchedRecipe.Image_Name && (
              <a
                target="_blank"
                rel="noopener noreferrer"
                href={`https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(
                  matchedRecipe.Image_Name
                )}`}
                className="text-blue-600 text-sm underline"
              >
                View Image
              </a>
            )}
          </div>

          {/* Nutrition */}
          <div>
            <h3 className="text-lg font-semibold mb-1">🧪 Nutrition Info</h3>
            <ul className="text-sm space-y-1">
              <li>🔥 Calories: {matchedRecipe.calories}kcal</li>
              <li>🥩 Protein: {matchedRecipe.protein}g</li>
              <li>🧈 Fat: {matchedRecipe.fat}g</li>
              <li>🧂 Sodium: {matchedRecipe.sodium}mg</li>
            </ul>
          </div>

          {/* Ingredients */}
          <div>
            <h3 className="text-lg font-semibold mb-1">🍽️ Ingredients</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              {JSON.parse(matchedRecipe.Cleaned_Ingredients.replace(/'/g, '"')).map(
                (ingredient, index) => (
                  <li key={index}>{ingredient}</li>
                )
              )}
            </ul>
          </div>

          {/* Instructions */}
          <div>
            <h3 className="text-lg font-semibold mb-1">👨‍🍳 Instructions</h3>
            <ol className="list-decimal list-inside text-sm space-y-1">
              {matchedRecipe.Instructions.split(/\.\s+|\n/).map((step, index) => {
                const trimmed = step.trim();
                return trimmed && <li key={index}>{trimmed}.</li>;
              })}
            </ol>
          </div>

          
        </div>
      </div>
    )}

    
  </div>
</div>

  );
}

export default App;
