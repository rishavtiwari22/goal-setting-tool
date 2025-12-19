import { useEffect, useRef, useState } from "react";

interface AudioVisualizerProps {
  isActive: boolean;
  size?: number;
}

export default function AudioVisualizer({
  isActive,
  size = 56,
}: AudioVisualizerProps) {
  const [volumes, setVolumes] = useState([6, 6, 6]);
  const animationIdRef = useRef<number | null>(null);
  const timeRef = useRef(0);

  const MIN_HEIGHT = 6;
  const MAX_HEIGHT = 36;
  const MAX_HEIGHT_SIDE = 20;

  useEffect(() => {
    if (isActive) {
      console.log("AudioVisualizer: Starting animation");
      startAnimation();
    } else {
      console.log("AudioVisualizer: Stopping animation");
      stopAnimation();
    }

    return () => {
      stopAnimation();
    };
  }, [isActive]);

  const startAnimation = () => {
    // Reset time when starting
    timeRef.current = 0;
    animate();
  };

  const stopAnimation = () => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
      animationIdRef.current = null;
    }
    // Reset to minimum height
    setVolumes([MIN_HEIGHT, MIN_HEIGHT, MIN_HEIGHT]);
  };

  const animate = () => {
    timeRef.current += 0.03; // Increased speed for more visible movement
    const time = timeRef.current;

    // Create organic, voice-like wave patterns with higher amplitude
    // Use different frequencies and phases for each bar to create natural variation
    const wave1 = Math.sin(time * 2.0) * 0.6 + Math.sin(time * 3.2) * 0.4;
    const wave2 = Math.sin(time * 2.5) * 0.7 + Math.sin(time * 4.1) * 0.5;
    const wave3 = Math.sin(time * 1.8) * 0.6 + Math.sin(time * 3.5) * 0.4;

    // Add more pronounced randomness to make it more natural and visible
    const random1 = Math.sin(time * 7.3) * 0.25;
    const random2 = Math.sin(time * 8.1) * 0.3;
    const random3 = Math.sin(time * 6.7) * 0.25;

    // Combine waves with randomness and convert to height with increased range
    const leftHeight =
      MIN_HEIGHT + Math.abs(wave1 + random1) * (MAX_HEIGHT_SIDE - MIN_HEIGHT);
    const centerHeight =
      MIN_HEIGHT + Math.abs(wave2 + random2) * (MAX_HEIGHT - MIN_HEIGHT);
    const rightHeight =
      MIN_HEIGHT + Math.abs(wave3 + random3) * (MAX_HEIGHT_SIDE - MIN_HEIGHT);

    setVolumes([leftHeight, centerHeight, rightHeight]);

    animationIdRef.current = requestAnimationFrame(animate);
  };

  return (
    <div
      className="bg-white flex items-center justify-center rounded-lg"
      style={{ width: size, height: size }}
    >
      <div className="relative flex items-center justify-center gap-1 z-10">
        {volumes.map((height, index) => (
          <div
            key={index}
            className="bg-amber-600 rounded-full"
            style={{
              width: "4px",
              height: `${height}px`,
              boxShadow: "0 0 8px rgba(255, 255, 255, 0.5)",
              willChange: "height",
            }}
          />
        ))}
      </div>
    </div>
  );
}
