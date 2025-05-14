import React, { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const mediaRecorderRef = useRef(null);
  const audioPlayerRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [matchedRecipe, setMatchedRecipe] = useState(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      const audioChunks = [];

      mediaRecorder.ondataavailable = event => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        const audioURL = URL.createObjectURL(audioBlob);
        audioPlayerRef.current.src = audioURL;

        const formData = new FormData();
        formData.append('audio', audioBlob, 'audio.webm');

        const loadingToast = toast.loading('Uploading and processing audio...');
        try {
          const response = await fetch('http://localhost:5000/upload-audio', {
            method: 'POST',
            body: formData,
          });

          toast.dismiss(loadingToast);
          const data = await response.json();

          if (response.status === 200) {
            const inputValues = data.input_values || {};
            const formattedValues = Object.entries(inputValues)
              .map(([key, val]) => `${key.charAt(0).toUpperCase() + key.slice(1)}: ${val}`)
              .join(', ');

            toast.success(`✅ Recipe matched!\n🍽️ Input Values: ${formattedValues}`);
          } else {
            toast.error(data.message || data.error || 'Could not match recipe.');
          }

          if (data.text) {
            setTranscription(data.text);
            setMatchedRecipe(data.matched_recipe || null);
            audioPlayerRef.current.play();
          } else {
            setTranscription(data.error || 'Transcription failed.');
          }
        } catch (err) {
          toast.dismiss(loadingToast);
          toast.error('Failed to upload audio.');
          setTranscription('Failed to upload audio.');
        }
      };

      mediaRecorder.start();
      toast.success('Recording started!');
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied.');
      setTranscription('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      toast.success('Recording stopped!');
      setIsRecording(false);
    }
  };

  const parseIngredients = (ingredientsStr) => {
    try {
      const formatted = ingredientsStr.replace(/'/g, '"');
      const parsed = JSON.parse(formatted);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    } catch (e) {
      console.error('Invalid JSON in Cleaned_Ingredients:', ingredientsStr);
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 to-indigo-600 text-white px-4 py-8 flex flex-col items-center">
      <Toaster position="top-right" reverseOrder={false} />

      <div className="w-full max-w-2xl space-y-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-center">🎙️ Voice to Recipe Finder</h1>

        {/* Info Box */}
        <div className="bg-white/20 backdrop-blur-md text-white p-4 sm:p-6 rounded-xl shadow-lg flex flex-col sm:flex-row sm:items-start gap-3 border border-white/30">
          <div>
            <h2 className="font-semibold text-lg">🎤 Try Saying:</h2>
            <p className="text-sm ">
              <span className="font-medium sm:text-base text-xs">"10 calories, 12 protein, 5 fat, and 20 sodium"</span>
              <br />to get matching recipes based on your voice input!
            </p>
          </div>
        </div>

        {/* Start/Stop Button */}
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

        {/* Matched Recipe Output */}
        {matchedRecipe && (
          <div className="bg-white text-gray-900 rounded-2xl overflow-hidden shadow-xl">
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

            <div className="p-4 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <h2 className="text-2xl font-bold">{matchedRecipe.title}</h2>
                {matchedRecipe.Image_Name && (
                  <a
                    target="_blank"
                    rel="noopener noreferrer"
                    href={`https://www.google.com/search?hl=en&tbm=isch&q=${encodeURIComponent(
                      matchedRecipe.Image_Name
                    )}`}
                    className="text-blue-600 text-sm underline mt-2 sm:mt-0"
                  >
                    View Image
                  </a>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-1">🧪 Nutrition Info</h3>
                <ul className="text-sm space-y-1">
                  <li>🔥 Calories: {matchedRecipe.calories} kcal</li>
                  <li>🥩 Protein: {matchedRecipe.protein} g</li>
                  <li>🧈 Fat: {matchedRecipe.fat} g</li>
                  <li>🧂 Sodium: {matchedRecipe.sodium} mg</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-1">🍽️ Ingredients</h3>
                <ul className="list-disc list-inside text-sm space-y-1">
                  {parseIngredients(matchedRecipe.Cleaned_Ingredients).map((ingredient, index) => (
                    <li key={index}>{ingredient}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-1">👨‍🍳 Instructions</h3>
                <p className="text-sm">{matchedRecipe.instructions || 'No instructions available.'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
