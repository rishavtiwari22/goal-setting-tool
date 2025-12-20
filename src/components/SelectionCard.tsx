import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { truncateText } from "@/lib/utils";
import { AlarmClock } from "lucide-react";
import { Separator } from "@radix-ui/react-separator";

interface SelectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected?: boolean;
  onClick?: () => void;
  estimatedTime?: string;
  comingSoon?: boolean;
  showEstimatedTime?: boolean;
}

export default function SelectionCard({
  icon,
  title,
  description,
  isSelected = false,
  onClick,
  estimatedTime,
  comingSoon = false,
  showEstimatedTime = true,
}: SelectionCardProps) {
  return (
    <Card
      onClick={comingSoon ? undefined : onClick}
      className={`
        group relative transition-all duration-200 p-6 pb-8
        overflow-hidden flex flex-col
        ${
          comingSoon
            ? "cursor-not-allowed"
            : "cursor-pointer hover:shadow-md hover:scale-[1.01]"
        }
        ${
          isSelected
            ? "border-2 border-[#6AEDAA] shadow-md"
            : "border border-gray-200"
        }
      `}
    >
      <div className="flex flex-col gap-4 flex-1">
        <div className="flex gap-1">
          {/* <img src={icon} alt="" className="size-6 items-center" /> */}
          <div className="flex items-start justify-start  gap-3">
            <h3 className="text-sm font-bold text-[#2C5F2D]">{title}</h3>
          </div>
        </div>
        {comingSoon && (
          <Badge className="bg-amber-500 text-xs px-2 py-0.5 rounded-sm font-semibold">
            Coming Soon
          </Badge>
        )}

        <div className="flex-1">
          <p className="text-sm text-gray-600 leading-relaxed">
            {truncateText(description, 100)}
          </p>
        </div>
      </div>
      {showEstimatedTime && (
        <div className="mt-auto">
          <Separator className="mb-3 border-1 mt-5" />

          <div className="flex items-center gap-2 text-base text-gray-500 ">
            {estimatedTime && (
              <div className="flex items-center gap-1 font-semibold">
                <AlarmClock />
                <span>{estimatedTime}</span>
              </div>
            )}
          </div>
        </div>
      )}
      <div
        className={`
          absolute bottom-0 left-0 right-0 h-1.5
          bg-gradient-to-r from-[#FF8C42] via-[#FF9F5A] to-[#FFA500]
          rounded-b-lg
          transition-opacity duration-200
          ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
      />
    </Card>
  );
}
