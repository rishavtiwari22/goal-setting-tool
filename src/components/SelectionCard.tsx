import React from "react";
import { Card } from "@/components/ui/card";
import { truncateText } from "@/lib/utils";

interface SelectionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  isSelected?: boolean;
  onClick?: () => void;
  estimatedTime?: string;
}

export default function SelectionCard({
  icon,
  title,
  description,
  isSelected = false,
  onClick,
  estimatedTime,
}: SelectionCardProps) {
  return (
    <Card
      onClick={onClick}
      className={`
        group relative cursor-pointer transition-all duration-200 p-6 pb-8
        hover:shadow-md hover:scale-[1.01] overflow-hidden
        ${
          isSelected
            ? "border-2 border-[#6AEDAA] shadow-md"
            : "border border-gray-200"
        }
      `}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-start  gap-3">
          <h3 className="text-base font-bold text-[#2C5F2D]">{title}</h3>
        </div>

        <div className="flex-1">
          <p className="text-sm text-gray-600 leading-relaxed">
            {truncateText(description, 100)}
          </p>
        </div>
      </div>
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
