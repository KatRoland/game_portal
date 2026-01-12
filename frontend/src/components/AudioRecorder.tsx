"use client";

import { useMic } from "@/contexts/MicContext";
import { useState, useRef, useEffect } from "react";
import { getAccessToken } from '@/lib/api'


type RecordingStatus = "inactive" | "recording";

const AudioRecorder = ({ recording, recordCallBack, hidden }: { recording: boolean, recordCallBack: (fileUrl: string) => void, hidden: boolean },) => {
  const { permission, stream } = useMic();
  const [recordingStatus, setRecordingStatus] =
    useState<RecordingStatus>("inactive");
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);

  const mediaRecorder = useRef<MediaRecorder | null>(null);

  const mimeType = "audio/mpeg";

  useEffect(() => {
    const handleStateChange = async () => {
      if (recording) {
        if (recordingStatus == "recording") return;
        await startRecording();
      } else {
        if (recordingStatus == "inactive") return;
        await stopRecording();
      }
    }

    handleStateChange();

  }, [recording])

  const startRecording = async () => {
    if (!stream) {
      alert("Could not get mic stream");
      return;
    }

    setRecordingStatus("recording");

    const media = new MediaRecorder(stream, { mimeType: mimeType });

    mediaRecorder.current = media;
    mediaRecorder.current.start();

    let localAudioChunks: Blob[] = [];

    mediaRecorder.current.ondataavailable = (event: BlobEvent) => {
      if (typeof event.data === "undefined") return;
      if (event.data.size === 0) return;
      localAudioChunks.push(event.data);
    };

    setAudioChunks(localAudioChunks);
  };

  const stopRecording = async () => {
    if (!mediaRecorder.current) {
      alert("MediaRecorder is not initialized.");
      return;
    }

    setRecordingStatus("inactive");

    mediaRecorder.current.stop();

    mediaRecorder.current.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: mimeType });
      const audioUrl = URL.createObjectURL(audioBlob);
      setAudioChunks([]);

      const formData = new FormData();

      formData.append("music", audioBlob, "recording.mp3");

      try {
        const response = await fetch('https://gameapi.katroland.hu/karaoke/record', {
          method: "POST",
          headers: {
            'Authorization': `Bearer ${getAccessToken()}`
          },
          body: formData,
        });
        const responseData = await response.json();

        if (response.ok) {
          console.log("Upload successful!", responseData);
          console.log("CALLING CALLBACK")
          recordCallBack(responseData.tracks[0].filename)
        } else {
          console.error("Upload failed:", responseData);
        }
      } catch (error) {
        console.error("Error during fetch operation:", error);
      }

    };
  };

  if (hidden) {
    return (
      <></>
    )
  }

  return (
    <div>
      <h2>Audio Recorder</h2>
      <main>
        <div className="audio-controls">
          {!permission ? (
            <button onClick={() => { console.log('Get Mic Permission'); }} type="button">
              Get Mic Permission
            </button>
          ) : null}

          {permission && recordingStatus === "inactive" ? (
            <button onClick={startRecording} type="button">
              Start Recording
            </button>
          ) : null}

          {recordingStatus === "recording" ? (
            <button onClick={stopRecording} type="button">
              Stop Recording
            </button>
          ) : null}
        </div>


      </main>
    </div>
  );
};

export default AudioRecorder;