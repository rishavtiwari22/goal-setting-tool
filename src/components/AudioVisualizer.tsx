import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  size?: number;
}

export default function AudioVisualizer({
  isActive,
  size = 56,
}: AudioVisualizerProps) {
  const [volumes, setVolumes] = useState([0, 0, 0]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const animationIdRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const MIN_HEIGHT = 6;
  const MAX_HEIGHT = 40;
  const MAX_HEIGHT_SIDE = 24;
  const SENSITIVITY = 1;

  useEffect(() => {
    if (isActive) {
      startVisualizer();
    } else {
      stopVisualizer();
    }

    return () => {
      stopVisualizer();
    };
  }, [isActive]);

  const startVisualizer = async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.5;

      microphoneRef.current =
        audioContextRef.current.createMediaStreamSource(stream);
      microphoneRef.current.connect(analyserRef.current);

      visualize();
    } catch (err) {
      console.error("Error accessing microphone for visualizer:", err);
    }
  };

  const stopVisualizer = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
      microphoneRef.current = null;
    }

    setVolumes([0, 0, 0]);
  };

  const visualize = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    const binCount = dataArray.length / 2;

    for (let i = 0; i < binCount; i++) {
      sum += dataArray[i];
    }
    const average = sum / binCount;

    let volume = Math.min(100, average * SENSITIVITY);

    if (volume < 5) volume = 0;

    updateBars(volume);

    animationIdRef.current = requestAnimationFrame(visualize);
  };

  const updateBars = (volume: number) => {
    const centerHeight = Math.max(MIN_HEIGHT, (volume / 100) * MAX_HEIGHT);
    const sideHeight = Math.max(MIN_HEIGHT, (volume / 100) * MAX_HEIGHT_SIDE);

    setVolumes([sideHeight, centerHeight, sideHeight]);
  };

  return (
    <div
      className="bg-white flex items-center justify-center rounded-lg"
      style={{ width: size, height: size }}
    >
      <div
        className="relative flex items-center justify-center gap-1 z-10"
      >
        {volumes.map((height, index) => (
          <div
            key={index}
            className="bg-amber-600 rounded-full transition-all duration-75 ease-out"
            style={{
              width: "4px",
              height: `${height}px`,
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)",
            }}
          />
        ))}
      </div>
    </div>
  );
}
