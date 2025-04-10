import React, { useRef, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';

function App() {
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [matchedRecipe, setMatchedRecipe] = useState(null);
  const audioPlayerRef = useRef(null);

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

          // Show toast based on status code
          if (response.status === 200) {
            toast.success(data.message || 'Recipe matched successfully!');
          } else if (response.status === 400) {
            toast.error(data.message || 'Could not match recipe.');
          } else {
            toast.error(data.message || 'Unexpected server response.');
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
          console.error('Upload error:', err);
          setTranscription('Failed to upload audio.');
        }
      };

      mediaRecorder.start();
      toast.success('Recording started!');
      setIsRecording(true);
    } catch (err) {
      toast.error('Microphone access denied.');
      console.error('Microphone access error:', err);
      setTranscription('Microphone access denied.');
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    toast.success('Recording stopped!');
    setIsRecording(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-r from-blue-400 to-indigo-600 text-white p-6">
      <Toaster position="top-right" reverseOrder={false} />
      <div className="text-center space-y-6">
        <h1 className="text-3xl font-bold mb-4">Voice to Recipe Finder</h1>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-full text-lg transition duration-300 ease-in-out transform hover:scale-105"
        >
          {isRecording ? 'Stop Recording' : 'Start Recording'}
        </button>

        {transcription && (
          <div className="bg-white text-gray-900 p-4 rounded-lg shadow-lg max-w-xl mx-auto mt-6">
            <h3 className="text-xl font-semibold mb-2">Transcription:</h3>
            <p className="text-lg">{transcription}</p>
          </div>
        )}

        {matchedRecipe && (
          <div className="bg-white text-gray-800 p-4 rounded-lg shadow-lg max-w-xl mx-auto mt-4">
            <h3 className="text-xl font-semibold mb-2">Closest Recipe Match:</h3>
            <ul className="text-left space-y-1">
              {Object.entries(matchedRecipe).map(([key, value]) => (
                <li key={key}><strong>{key}:</strong> {value}</li>
              ))}
            </ul>
          </div>
        )}

        <audio ref={audioPlayerRef} controls className="mt-4" />
      </div>
    </div>
  );
}

export default App;
