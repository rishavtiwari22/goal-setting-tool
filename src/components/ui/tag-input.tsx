import React, { useState, KeyboardEvent, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface TagInputProps {
    placeholder?: string;
    tags: string[];
    setTags: (tags: string[]) => void;
    suggestions?: string[];
    className?: string;
}

export function TagInput({
    placeholder,
    tags,
    setTags,
    suggestions = [],
    className,
}: TagInputProps) {
    const [inputValue, setInputValue] = useState("");
    const [isFocused, setIsFocused] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTag(inputValue);
        } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = (tag: string) => {
        const trimmedTag = tag.trim();
        if (trimmedTag && !tags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) {
            setTags([...tags, trimmedTag]);
            setInputValue("");
        }
    };

    const removeTag = (index: number) => {
        setTags(tags.filter((_, i) => i !== index));
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    const filteredSuggestions = suggestions
        .filter(
            (s) =>
                s.toLowerCase().includes(inputValue.toLowerCase()) &&
                !tags.some(t => t.toLowerCase() === s.toLowerCase())
        )
        .slice(0, 8);

    const showCreateOption = inputValue && !tags.some(t => t.toLowerCase() === inputValue.trim().toLowerCase()) && !filteredSuggestions.includes(inputValue);

    return (
        <div className="space-y-2 relative" ref={containerRef}>
            <div
                onClick={handleContainerClick}
                className={cn(
                    "flex flex-wrap gap-2 p-2 min-h-[42px] rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors cursor-text items-center relative pr-8",
                    isFocused ? "ring-1 ring-ring" : "",
                    className
                )}
            >
                {tags.map((tag, index) => (
                    <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1 pl-3 py-1 bg-[#E6F4EA] text-gray-800 hover:bg-[#d6ecdb] border-transparent rounded-full whitespace-normal break-all h-auto text-left text-sm font-normal"
                    >
                        {tag}
                        <button
                            type="button"
                            aria-label={`Remove ${tag}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="rounded-full p-0.5 hover:bg-black/10 focus:outline-none"
                        >
                            <X className="h-3 w-3 text-gray-500" />
                        </button>
                    </Badge>
                ))}
                <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => setIsFocused(true)}
                    /* 
                       Auto-save feature:
                       When the user clicks away (onBlur), any text currently typed 
                       is automatically converted into a tag/chip.
                    */
                    onBlur={() => {
                        // Delay blur to allow click event on suggestions to fire
                        setTimeout(() => {
                            setIsFocused(false);
                            addTag(inputValue);
                        }, 200);
                    }}
                    className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground min-w-[120px]"
                    placeholder={tags.length === 0 ? placeholder : ""}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                </div>
            </div>

            {/* Suggestions Dropdown */}
            {(filteredSuggestions.length > 0 || showCreateOption) && isFocused && (
                <div className="absolute top-full left-0 w-full z-50 mt-1 max-h-60 overflow-auto rounded-lg bg-white shadow-lg border border-gray-200">
                    <ul className="p-1">
                        {filteredSuggestions.map((suggestion) => (
                            <li
                                key={suggestion}
                                className="cursor-pointer px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                                onMouseDown={(e) => {
                                    e.preventDefault(); // Prevent input blur
                                    addTag(suggestion);
                                }}
                            >
                                {suggestion}
                            </li>
                        ))}
                        {showCreateOption && (
                            <li
                                className="cursor-pointer px-3 py-2 text-sm text-[#386641] hover:bg-green-50 font-medium rounded-md transition-colors border-t border-gray-100 mt-1"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(inputValue);
                                }}
                            >
                                + Create "{inputValue}"
                            </li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
