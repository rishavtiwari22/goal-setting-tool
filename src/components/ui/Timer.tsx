interface TimerProps {
  remainingMinutes: number;
  isWarning?: boolean;
}

export function Timer({ remainingMinutes, isWarning }: TimerProps) {
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;
  const displayMinutes = Math.floor(minutes);
  const displaySeconds = Math.floor((minutes - displayMinutes) * 60);

  const formatTime = () => {
    if (hours > 0) {
      return `${hours}:${displayMinutes
        .toString()
        .padStart(2, "0")}:${displaySeconds.toString().padStart(2, "0")}`;
    }
    return `${displayMinutes}:${displaySeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="text-center">
      <p className="text-sm font-bold text-gray-600">Time Remaining</p>
      <p
        className={`text-lg font-bold ${
          isWarning ? "text-red-500" : "text-gray-800"
        }`}
      >
        {formatTime()}
      </p>
    </div>
  );
}
