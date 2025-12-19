import { Spinner } from "@/components/ui/spinner";

interface PiperLoaderProps {
  status: string;
  progress?: number;
}

export function PiperLoader({ status, progress }: PiperLoaderProps) {
  return (
    <div
      className="fixed top-0 left-0 right-0 bottom-0 bg-black/70 flex items-center justify-center z-[9999]"
    >
      <div
        className="bg-white p-8 rounded-lg shadow-xl gap-4 min-w-[300px] flex flex-col items-center"
      >
        <Spinner size="lg" />
        <p className="text-lg font-semibold text-center">
          {status}
        </p>
        {progress !== undefined && (
          <div className="w-full">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-600 text-center mt-2">
              {progress}%
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
