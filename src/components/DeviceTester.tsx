import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { CircleAlert, Mic } from "lucide-react";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

const AudioVisualizer = ({ volume }: { volume: number }) => {
  const totalDots = 8;
  const activeDots = Math.round((volume / 100) * totalDots);

  const dots = Array.from({ length: totalDots }, (_, i) => {
    let bgColor = "bg-gray-300";
    if (i < activeDots) {
      if (i < 5) {
        bgColor = "bg-green-500";
      } else {
        bgColor = "bg-red-500";
      }
    }
    return (
      <span key={i} className={`w-3 h-3 ${bgColor} rounded-full mr-1`}></span>
    );
  });

  return <div className="flex mt-4">{dots}</div>;
};

const DeviceTester = ({
  onStartInterview,
}: {
  onStartInterview: () => void;
}) => {
  const [micPermission, setMicPermission] = useState<
    "prompt" | "granted" | "denied"
  >("prompt");
  const [audioInputDevices, setAudioInputDevices] = useState<MediaDeviceInfo[]>(
    []
  );
  const [audioOutputDevices, setAudioOutputDevices] = useState<
    MediaDeviceInfo[]
  >([]);
  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");

  const [isTestingMic, setIsTestingMic] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const checkDevicesAndPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      setMicPermission("granted");
      stream.getTracks().forEach((track) => track.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const audioInputs = devices.filter(
        (device) => device.kind === "audioinput"
      ) as MediaDeviceInfo[];
      const audioOutputs = devices.filter(
        (device) => device.kind === "audiooutput"
      ) as MediaDeviceInfo[];

      setAudioInputDevices(audioInputs);
      setAudioOutputDevices(audioOutputs);

      if (audioInputs.length > 0 && !selectedMic) {
        const defaultDevice =
          audioInputs.find((d) => d.deviceId === "default") || audioInputs[0];
        setSelectedMic(defaultDevice.deviceId);
      }
      if (audioOutputs.length > 0 && !selectedSpeaker) {
        const defaultDevice =
          audioOutputs.find((d) => d.deviceId === "default") || audioOutputs[0];
        setSelectedSpeaker(defaultDevice.deviceId);
      }
    } catch (error) {
      console.error("Error getting media devices:", error);
      setMicPermission("denied");
    }
  };

  useEffect(() => {
    checkDevicesAndPermissions();

    const handleDeviceChange = () => {
      checkDevicesAndPermissions();
    };

    if (navigator.mediaDevices) {
      navigator.mediaDevices.addEventListener(
        "devicechange",
        handleDeviceChange
      );
    }

    return () => {
      stopMicTest();
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (navigator.mediaDevices) {
        navigator.mediaDevices.removeEventListener(
          "devicechange",
          handleDeviceChange
        );
      }
    };
  }, []);

  useEffect(() => {
    if (micPermission === "granted" && selectedMic) {
      startMicTest();
    }
    return () => {
      stopMicTest();
    };
  }, [selectedMic, micPermission]);

  useEffect(() => {
    if (selectedSpeaker) {
      playTestSound();
    }
  }, [selectedSpeaker]);

  const startMicTest = async () => {
    if (isTestingMic) {
      await stopMicTest();
    }
    if (micPermission !== "granted") return;

    setIsTestingMic(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: selectedMic } },
      });
      streamRef.current = stream;

      const AudioContextClass = ((window as any).AudioContext ||
        (window as any).webkitAudioContext) as { new (): AudioContext };
      const audioContext = new AudioContextClass();
      audioContextRef.current = audioContext;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioContext.createMediaStreamSource(stream);
      sourceRef.current = source;
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const draw = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setMicVolume(average);
          animationFrameRef.current = requestAnimationFrame(draw);
        }
      };
      draw();
    } catch (error) {
      console.error("Error starting mic test:", error);
      setIsTestingMic(false);
    }
  };

  const stopMicTest = async () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      await audioContextRef.current.close();
    }
    setIsTestingMic(false);
    setMicVolume(0);
  };

  const playTestSound = async () => {
    if (audioRef.current) {
      audioRef.current.pause();
    }

    try {
      const AudioContextClass = ((window as any).AudioContext ||
        (window as any).webkitAudioContext) as { new (): AudioContext };
      const audioContext = new AudioContextClass();

      if (
        "setSinkId" in audioContext &&
        selectedSpeaker &&
        selectedSpeaker !== "default"
      ) {
        try {
          await (audioContext as any).setSinkId(selectedSpeaker);
        } catch (sinkError) {
          console.warn("Could not set audio output device:", sinkError);
        }
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 440;
      gainNode.gain.value = 0.3;

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 1);

      setTimeout(() => {
        audioContext.close();
      }, 1100);
    } catch (error) {
      console.error("Error playing test sound:", error);
    }
  };

  return (
    <div className="p-8 rounded-lg max-w-4xl mx-auto">
      <h3 className="text-lg font-bold text-center mb-4">
        Before you start, test your mic and speaker
      </h3>
      <p className=" flex items-center justify-center text-gray-800 font-semibold">
        <CircleAlert className="inline-block mr-2" size={20} />
        <span>
          Pro tip: Be 5 minutes early to your interview. This helps you settle
          in and form a good first impression.
        </span>
      </p>

      <div className="grid md:grid-cols-2 gap-8 mt-4">
        <div
          className="
          group relative bg-white p-5 rounded-lg border border-gray-200
          transition-all duration-200
          hover:shadow-md hover:scale-[1.01]
          hover:border-2 hover:border-[#6AEDAA]
          "
        >
          <div className="flex items-center mb-4">
            <Mic className="w-5 h-5 mr-2 text-[var(--text-primary)]" />
            <h3 className="text-lg text-[var(--text-primary)] font-semibold">
              Test mic
            </h3>
          </div>
          {micPermission === "denied" ? (
            <div>
              <p className="text-red-500 mb-3">
                Microphone access denied. Please enable it in your browser
                settings.
              </p>
              <Button
                onClick={checkDevicesAndPermissions}
                className="w-full bg-[#2C5F2D] hover:bg-[#2C5F2D]/90 text-white"
              >
                Retry Microphone Access
              </Button>
            </div>
          ) : (
            <>
              <div>
                <select
                  value={selectedMic}
                  onChange={(e) => {
                    setSelectedMic(e.target.value);
                  }}
                  className="w-full p-2 border rounded-md"
                  disabled={isTestingMic}
                >
                  {audioInputDevices.length === 0 ? (
                    <option value="">No microphones detected</option>
                  ) : (
                    audioInputDevices.map((device) => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label ||
                          `Microphone ${audioInputDevices.indexOf(device) + 1}`}
                      </option>
                    ))
                  )}
                </select>
              </div>
              <AudioVisualizer volume={micVolume} />
              {isTestingMic && (
                <p className="text-sm text-gray-500 mt-2">
                  Testing microphone...
                </p>
              )}
            </>
          )}
          <div
            className="
            absolute bottom-0 left-0 right-0 h-1.5
            bg-gradient-to-r from-[#FF8C42] via-[#FF9F5A] to-[#FFA500]
            rounded-b-lg
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            "
          />
        </div>

        <div
          className="
          group relative bg-white p-6 rounded-lg border border-gray-200
          transition-all duration-200
          hover:shadow-md hover:scale-[1.01]
          hover:border-2 hover:border-[#6AEDAA]
          "
        >
          <div className="flex items-center mb-4">
            <img className="w-5 h-5 mr-2" src={"/assets/volume-2.svg"} alt="Speaker" />
            <h3 className="text-lg text-[var(--text-primary)] font-semibold">
              Test speaker
            </h3>
          </div>
          <div>
            <select
              value={selectedSpeaker}
              onChange={(e) => {
                setSelectedSpeaker(e.target.value);
              }}
              className="w-full p-2 border rounded-md"
            >
              {audioOutputDevices.length === 0 ? (
                <option value="">No speakers detected</option>
              ) : (
                audioOutputDevices.map((device) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label ||
                      `Speaker ${audioOutputDevices.indexOf(device) + 1}`}
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="flex mt-4 h-3">
          </div>
          <p className="text-sm text-gray-500 mt-2">
            A test sound will play when you select a speaker.
          </p>
          <div
            className="
            absolute bottom-0 left-0 right-0 h-1.5
            bg-gradient-to-r from-[#FF8C42] via-[#FF9F5A] to-[#FFA500]
            rounded-b-lg
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
            "
          />
        </div>
      </div>

      <p className="text-base font-normal text-center my-4">
        Or, you can start right away
      </p>

      <div className="text-center">
        <Button
          className="mt-3 bg-[#2C5F2D] hover:bg-[#2C5F2D]/90 text-white"
          size="lg"
          onClick={onStartInterview}
        >
          <img
            src="/assets/bot-message-square (4).svg"
            className="text-white mr-3"
            alt="Start Interview"
            width={24}
            height={24}
          />
          Start practice interview
        </Button>
      </div>
    </div>
  );
};

export default DeviceTester;
