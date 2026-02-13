import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, CheckCircle2, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";

interface MediaDeviceInfo {
  deviceId: string;
  label: string;
  kind: "audioinput" | "audiooutput";
}

const AudioVisualizer = ({ volume }: { volume: number }) => {
  const totalDots = 8;
  const activeDots = Math.round((volume / 100) * totalDots);

  const dots = Array.from({ length: totalDots }, (_, i) => {
    let bgColor = "bg-gray-200";
    if (i < activeDots) {
      if (i < 5) {
        bgColor = "bg-[#2B5E2B]";
      } else if (i < 7) {
        bgColor = "bg-[#FF9900]";
      } else {
        bgColor = "bg-[#FF9900]";
      }
    }
    return (
      <span key={i} className={`w-2.5 h-2.5 ${bgColor} rounded-full transition-colors duration-150`}></span>
    );
  });

  return <div className="flex gap-1.5 mt-4">{dots}</div>;
};

// Custom Select Component with better styling
const CustomSelect = ({ 
  value, 
  onChange, 
  options, 
  disabled = false,
  placeholder = "Select an option",
  icon: Icon
}: { 
  value: string; 
  onChange: (value: string) => void; 
  options: { value: string; label: string }[];
  disabled?: boolean;
  placeholder?: string;
  icon?: React.ComponentType<{ className?: string }>;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full px-4 py-3 rounded-xl text-left text-sm font-medium
          border-2 transition-all duration-200 outline-none
          flex items-center justify-between gap-3
          ${disabled 
            ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed' 
            : isOpen
              ? 'bg-white border-[#2B5E2B] ring-2 ring-[#E6F6EF] text-gray-900'
              : 'bg-white border-slate-200 text-gray-900 hover:border-[#2B5E2B] hover:shadow-sm'
          }
        `}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {Icon && (
            <Icon className={`w-4 h-4 shrink-0 ${disabled ? 'text-slate-400' : 'text-[#2B5E2B]'}`} />
          )}
          <span className="truncate">
            {selectedOption?.label || placeholder}
          </span>
        </div>
        <ChevronDown 
          className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          } ${disabled ? 'text-slate-400' : 'text-gray-600'}`} 
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white border-2 border-[#2B5E2B] rounded-xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="max-h-60 overflow-y-auto custom-scrollbar">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`
                  w-full px-4 py-3 text-left text-sm font-medium transition-colors duration-150
                  flex items-center gap-3
                  ${option.value === value
                    ? 'bg-[#E6F6EF] text-[#2B5E2B]'
                    : 'text-gray-700 hover:bg-slate-50 hover:text-gray-900'
                  }
                `}
              >
                {Icon && (
                  <Icon className={`w-4 h-4 shrink-0 ${
                    option.value === value ? 'text-[#2B5E2B]' : 'text-gray-400'
                  }`} />
                )}
                <span className="truncate flex-1">{option.label}</span>
                {option.value === value && (
                  <CheckCircle2 className="w-4 h-4 text-[#2B5E2B] shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
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

  const isMicReady = micPermission === "granted" && selectedMic && audioInputDevices.length > 0;
  const isSpeakerReady = selectedSpeaker && audioOutputDevices.length > 0;
  const isReadyToStart = isMicReady && isSpeakerReady;

  // Check if user is on Chrome
  const isChrome = /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor);

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center px-4 py-6 md:py-0">
      {/* Header Section */}
      <div className="mb-6 md:mb-8 text-center">
        <div className="relative inline-block mb-3 md:mb-4 custom-float">
          <div className="absolute inset-0 bg-green-100 blur-3xl rounded-full opacity-40"></div>
          <img 
            src="/assets/zoe-talking 1.svg" 
            alt="Zoe" 
            className="relative w-20 h-20 md:w-24 md:h-24 lg:w-28 lg:h-28" 
          />
        </div>
       
        {/* <p className="text-slate-500 text-sm md:text-base font-medium">
          Make sure Zoe can hear and speak with you clearly
        </p> */}
         <h2 className="text-xl md:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mb-2 px-2">
            Before you start, please test your mic and speaker
        </h2>
      </div>
      

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 w-full mb-6 md:mb-8">
        {/* Microphone Card */}
        <div className={`
          group relative p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all duration-300
          flex flex-col min-h-[260px] md:min-h-[280px] bg-white
          ${isMicReady 
            ? "border-[#2B5E2B] ring-4 ring-[#E6F6EF] shadow-lg" 
            : "border-slate-200 hover:border-[#2B5E2B] shadow-sm hover:shadow-lg"
          }
        `}>
          {/* Icon and Title */}
          <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
            <img 
              src="/assets/testmic.png" 
              alt="Microphone"
              className="w-12 h-14 md:w-14 md:h-16 shrink-0 object-contain"
            />
            <div className="flex-1">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">Test mic</h3>
              <p className="text-xs text-slate-500 font-medium">
                {micPermission === "denied" 
                  ? "We need your permission" 
                  : isMicReady 
                    ? "Ready to record" 
                    : "Select your microphone"
                }
              </p>
            </div>
            {/* {isMicReady && (
              <CheckCircle2 className="w-6 h-6 text-[#2B5E2B] animate-in fade-in duration-500" />
            )} */}
          </div>

          {/* Content */}
          <div className="flex-1">
            {micPermission === "denied" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-900 mb-1">
                      Microphone access needed
                    </p>
                    <p className="text-xs text-amber-700">
                      Please enable microphone access in your browser settings to continue
                    </p>
                  </div>
                </div>
                <Button
                  onClick={checkDevicesAndPermissions}
                  className="w-full bg-[#2B5E2B] hover:bg-[#1a3a1b] text-white font-semibold rounded-xl transition-all duration-200 hover:scale-[1.02]"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry Access
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-2">
                    Select Microphone
                  </label>
                  <CustomSelect
                    value={selectedMic}
                    onChange={setSelectedMic}
                    options={audioInputDevices.length === 0 
                      ? [{ value: "", label: "No microphones detected" }]
                      : audioInputDevices.map((device) => ({
                          value: device.deviceId,
                          label: device.label || `Microphone ${audioInputDevices.indexOf(device) + 1}`
                        }))
                    }
                    disabled={isTestingMic || audioInputDevices.length === 0}
                    placeholder="Choose a microphone"
                    icon={Mic}
                  />
                </div>
                {isTestingMic && (
                  <div>
                    <p className="text-xs font-semibold text-gray-700 mb-2">
                      Speak now to test
                    </p>
                    <AudioVisualizer volume={micVolume} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Speaker Card */}
        <div className={`
          group relative p-5 md:p-6 rounded-2xl md:rounded-3xl border-2 transition-all duration-300
          flex flex-col min-h-[260px] md:min-h-[280px] bg-white
          ${isSpeakerReady 
            ? "border-[#2B5E2B] ring-4 ring-[#E6F6EF] shadow-lg" 
            : "border-slate-200 hover:border-[#2B5E2B] shadow-sm hover:shadow-lg"
          }
        `}>
          {/* Icon and Title */}
          <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
            <img 
              src="/assets/testspeakers.png" 
              alt="Speaker"
              className="w-12 h-14 md:w-14 md:h-16 shrink-0 object-contain"
            />
            <div className="flex-1">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-1">Test speaker</h3>
              <p className="text-xs text-slate-500 font-medium">
                {isSpeakerReady 
                  ? "Ready to play audio" 
                  : audioOutputDevices.length === 0 
                    ? "No speakers found" 
                    : "Select your speaker"
                }
              </p>
            </div>
            {/* {isSpeakerReady && (
              <CheckCircle2 className="w-6 h-6 text-[#2B5E2B] animate-in fade-in duration-500" />
            )} */}
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-2">
                  Select Speaker
                </label>
                <CustomSelect
                  value={selectedSpeaker}
                  onChange={setSelectedSpeaker}
                  options={audioOutputDevices.length === 0 
                    ? [{ value: "", label: "No speakers detected" }]
                    : audioOutputDevices.map((device) => ({
                        value: device.deviceId,
                        label: device.label || `Speaker ${audioOutputDevices.indexOf(device) + 1}`
                      }))
                  }
                  disabled={audioOutputDevices.length === 0}
                  placeholder="Choose a speaker"
                  icon={Volume2}
                />
              </div>
              {audioOutputDevices.length === 0 && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <AlertCircle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">
                    No audio output devices found. You can still continue using your system's default speaker.
                  </p>
                </div>
              )}
              {/* {selectedSpeaker && (
                <p className="text-xs text-slate-500 italic">
                  💡 A test tone plays automatically when you select a speaker
                </p>
              )} */}
            </div>
          </div>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="text-center w-full max-w-md px-2 md:px-0">
        <Button
          onClick={onStartInterview}
          disabled={!isReadyToStart}
          className={`
            w-full py-4 md:py-6 px-4 md:px-8 rounded-2xl font-bold text-xs md:text-base shadow-lg
            transition-all duration-300 flex items-center justify-center gap-2 md:gap-3
            ${isReadyToStart
              ? "bg-[#2B5E2B] hover:bg-[#1a3a1b] text-white hover:scale-[1.02] hover:shadow-xl active:scale-95"
              : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }
          `}
        >
           <img
            src="/assets/bot-message-square (4).svg"
            className="w-4 h-4 md:w-6 md:h-6 shrink-0"
            alt="Start Interview"
          />
          <span className="whitespace-nowrap">Start Practice Interview</span>
        </Button>

        {!isReadyToStart && (
          <p className="text-xs text-slate-500 mt-3 font-medium px-2">
            Please enable both microphone and speaker to continue
          </p>
        )}
      </div>

      {/* Footer Note */}
      {!isChrome && (
        <div className="mt-8 text-center opacity-0 animate-in fade-in duration-700" style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
          <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            Best experience on Google Chrome
          </p>
        </div>
      )}
    </div>
  );
};

export default DeviceTester;
