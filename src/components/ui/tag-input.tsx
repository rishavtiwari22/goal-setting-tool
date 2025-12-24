import React, { useState, KeyboardEvent, useRef, useEffect } from "react";
import { X } from "lucide-react";
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
        if (trimmedTag && !tags.includes(trimmedTag)) {
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

    return (
        <div className="space-y-2">
            <div
                onClick={handleContainerClick}
                className={cn(
                    "flex flex-wrap gap-2 p-2 min-h-[42px] rounded-md border border-input bg-transparent text-sm shadow-sm transition-colors cursor-text",
                    isFocused ? "ring-1 ring-ring" : "",
                    className
                )}
            >
                {tags.map((tag, index) => (
                    <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1 pr-1 bg-gray-100 text-gray-800 hover:bg-gray-200 whitespace-normal break-all h-auto text-left"
                    >
                        {tag}
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                removeTag(index);
                            }}
                            className="rounded-full p-0.5 hover:bg-gray-300 focus:outline-none"
                        >
                            <X className="h-3 w-3" />
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
                        setIsFocused(false);
                        addTag(inputValue);
                    }}
                    className="flex-1 bg-transparent border-none outline-none placeholder:text-muted-foreground min-w-[120px]"
                    placeholder={tags.length === 0 ? placeholder : ""}
                />
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && inputValue && (
                <div className="flex flex-wrap gap-1.5">
                    {suggestions
                        .filter(
                            (s) =>
                                s.toLowerCase().includes(inputValue.toLowerCase()) &&
                                !tags.includes(s)
                        )
                        .slice(0, 5)
                        .map((suggestion) => (
                            <Badge
                                key={suggestion}
                                variant="outline"
                                className="cursor-pointer hover:bg-gray-100"
                                onMouseDown={(e) => {
                                    e.preventDefault();
                                    addTag(suggestion);
                                }}
                            >
                                + {suggestion}
                            </Badge>
                        ))}
                </div>
            )}
        </div>
    );
}
