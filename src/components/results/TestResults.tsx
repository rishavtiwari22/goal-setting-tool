import React from "react";
import { XCircle, Clock, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { useNavigate } from "react-router-dom";

interface TestResult {
  id: string;
  test_id: string;
  user_id: string;
  summary: string;
  score: number;
  question_number: number;
  correct_number: number;
  elapse_time: number;
  qa_history: {
    question: string;
    answer: string;
    summary: string;
  }[];
  created_at: string;
  updated_at: string;
}

interface TestResultsProps {
  testResult: TestResult;
  userName?: string;
}

interface ParsedSummary {
  mainSummary: string;
  resultsOverview: Array<{ text: string; color: string }>;
  topStrengths: Array<{ title: string; description: string }>;
  improvementAreas: Array<{ title: string; description: string }>;
  nextSteps: Array<{ title: string; description: string }>;
}

const parseSummaryContent = (summary: string): ParsedSummary => {
  const result: ParsedSummary = {
    mainSummary: "",
    resultsOverview: [],
    topStrengths: [],
    improvementAreas: [],
    nextSteps: [],
  };

  if (!summary) return result;

  const lines = summary.split("\n");

  const overallIndex = lines.findIndex((line) =>
    line.includes("**Overall Assessment:**")
  );
  if (overallIndex !== -1) {
    let assessmentText = "";
    for (let i = overallIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      if (
        line.startsWith("**") || 
        !line ||
        lowerLine.includes("top strengths") ||
        lowerLine.includes("improvement areas") ||
        lowerLine.includes("**strengths:**")
      ) break;
      assessmentText += line + " ";
    }
    result.mainSummary = assessmentText.trim();
  } else {
    let summaryText = "";
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      if (
        lowerLine.includes("top strengths") ||
        lowerLine.includes("improvement areas") ||
        lowerLine.includes("**strengths:**") ||
        lowerLine.includes("**improvement areas:**")
      ) break;
      if (line && !line.startsWith("**")) {
        summaryText += line + " ";
      }
      if (summaryText.length > 200) break;
    }
    if (summaryText.trim()) {
      result.mainSummary = summaryText.trim();
    }
  }

  const strengthsIndex = lines.findIndex((line) => {
    const lowerLine = line.toLowerCase();
    return lowerLine.includes("top strengths") ||
           lowerLine.includes("**strengths:**") ||
           lowerLine.includes("key strengths") ||
           lowerLine.includes("performance breakdown");
  });
  
  if (strengthsIndex !== -1) {
    let currentLine = lines[strengthsIndex];
    const headerMatch = currentLine.match(/\*\*[^:]*top\s+strengths[^:]*:\*\*/i);
    if (headerMatch) {
      const afterHeader = currentLine.substring(headerMatch.index! + headerMatch[0].length).trim();
      if (afterHeader) {
        const bulletPattern = /\*\s+\*\*([^:]+?):\*\*\s*(.+?)(?:\.\*\s*(?:\*\s+\*\*|$)|$)/g;
        let match;
        while ((match = bulletPattern.exec(afterHeader)) !== null && result.topStrengths.length < 2) {
          const title = match[1].replace(/\*\*/g, "").trim();
          let description = match[2].replace(/\*\*/g, "").trim();
          if (description.endsWith(".*")) {
            description = description.slice(0, -2).trim();
          }
          if (title && description && description.length > 5) {
            result.topStrengths.push({ title, description });
          }
        }
      }
    }
    
    for (let i = strengthsIndex + 1; i < lines.length && result.topStrengths.length < 2; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (
        line.includes("**Interview Conclusion:**") ||
        line.includes("**Improvement Areas:**") ||
        line.includes("**Score:**") ||
        line.includes("**Recommendation:**") ||
        line.toLowerCase().includes("**weaknesses:**") ||
        line.toLowerCase().includes("improvement areas")
      )
        break;

      const bulletMatch = line.match(/^\*\s+\*\*(.+?):\*\*\s*(.+)/) || 
                         line.match(/^\*\s+(.+?):\s+(.+)/) ||
                         line.match(/^[-•]\s+\*\*(.+?):\*\*\s*(.+)/) ||
                         line.match(/^[-•]\s+(.+?):\s+(.+)/) ||
                         line.match(/^\d+\.\s+\*\*(.+?):\*\*\s*(.+)/) ||
                         line.match(/^\d+\.\s+(.+?):\s+(.+)/) ||
                         line.match(/^\*\*\s*(.+?):\s*\*\*\s*(.+)/);
      
      if (bulletMatch) {
        const title = bulletMatch[1].replace(/\*\*/g, "").trim();
        let description = bulletMatch[2].replace(/\*\*/g, "").trim();
        if (description.endsWith(".*")) {
          description = description.slice(0, -2).trim();
        }
        
        if (title && description && description.length > 5) {
          result.topStrengths.push({ title, description });
        }
      } else if (line && !line.startsWith("**") && line.length > 20) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0 && colonIndex < 50) {
          const title = line.substring(0, colonIndex).replace(/^\*\s*/, "").replace(/\*\*/g, "").trim();
          let description = line.substring(colonIndex + 1).trim().replace(/\*\*/g, "");
          if (description.endsWith(".*")) {
            description = description.slice(0, -2).trim();
          }
          if (title && description && description.length > 5) {
            result.topStrengths.push({ title, description });
          }
        }
      }
    }
  }

  const improvementIndex = lines.findIndex((line) => {
    const lowerLine = line.toLowerCase();
    return lowerLine.includes("improvement areas") ||
           lowerLine.includes("**improvement areas:**") ||
           lowerLine.includes("areas for improvement");
  });
  
  if (improvementIndex !== -1) {
    let currentLine = lines[improvementIndex];
    const headerMatch = currentLine.match(/\*\*[^:]*improvement\s+areas[^:]*:\*\*/i);
    if (headerMatch) {
      const afterHeader = currentLine.substring(headerMatch.index! + headerMatch[0].length).trim();
      if (afterHeader) {
        const bulletPattern = /\*\s+\*\*([^:]+?):\*\*\s*(.+?)(?:\.\*\s*(?:\*\s+\*\*|$)|$)/g;
        let match;
        while ((match = bulletPattern.exec(afterHeader)) !== null && result.improvementAreas.length < 2) {
          const title = match[1].replace(/\*\*/g, "").trim();
          let description = match[2].replace(/\*\*/g, "").trim();
          if (description.endsWith(".*")) {
            description = description.slice(0, -2).trim();
          }
          if (title && description && description.length > 5) {
            result.improvementAreas.push({ title, description });
          }
        }
      }
    }
    
    for (let i = improvementIndex + 1; i < lines.length && result.improvementAreas.length < 2; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      if (
        line.includes("**Interview Conclusion:**") ||
        line.includes("**Top Strengths:**") ||
        line.includes("**Score:**") ||
        line.includes("**Recommendation:**") ||
        line.toLowerCase().includes("top strengths")
      )
        break;

      const bulletMatch = line.match(/^\*\s+\*\*(.+?):\*\*\s*(.+)/) || 
                         line.match(/^\*\s+(.+?):\s+(.+)/) ||
                         line.match(/^[-•]\s+\*\*(.+?):\*\*\s*(.+)/) ||
                         line.match(/^[-•]\s+(.+?):\s+(.+)/) ||
                         line.match(/^\d+\.\s+\*\*(.+?):\*\*\s*(.+)/) ||
                         line.match(/^\d+\.\s+(.+?):\s+(.+)/) ||
                         line.match(/^\*\*\s*(.+?):\s*\*\*\s*(.+)/);
      
      if (bulletMatch) {
        const title = bulletMatch[1].replace(/\*\*/g, "").trim();
        let description = bulletMatch[2].replace(/\*\*/g, "").trim();
        if (description.endsWith(".*")) {
          description = description.slice(0, -2).trim();
        }
        
        if (title && description && description.length > 5) {
          result.improvementAreas.push({ title, description });
        }
      } else if (line && !line.startsWith("**") && line.length > 20) {
        const colonIndex = line.indexOf(":");
        if (colonIndex > 0 && colonIndex < 50) {
          const title = line.substring(0, colonIndex).replace(/^\*\s*/, "").replace(/\*\*/g, "").trim();
          let description = line.substring(colonIndex + 1).trim().replace(/\*\*/g, "");
          if (description.endsWith(".*")) {
            description = description.slice(0, -2).trim();
          }
          if (title && description && description.length > 5) {
            result.improvementAreas.push({ title, description });
          }
        }
      }
    }
  }

  const breakdownIndex = lines.findIndex((line) =>
    line.includes("**Performance Breakdown:**")
  );
  if (breakdownIndex !== -1 && result.topStrengths.length < 2) {
    for (let i = breakdownIndex + 1; i < lines.length && result.topStrengths.length < 2; i++) {
      const line = lines[i].trim();

      if (
        line.includes("**Interview Conclusion:**") ||
        line.includes("**Score:**") ||
        line.includes("**Recommendation:**")
      )
        break;

      const bulletMatch = line.match(/^\*\s+\*\*(.+?):\*\*\s+(.+)/) ||
                         line.match(/^\*\s+(.+?):\s+(.+)/);
      if (bulletMatch) {
        const [, title, description] = bulletMatch;
        const cleanDesc = description.replace(/\*\*/g, "").trim();
        const cleanTitle = title.replace(/\*\*/g, "").trim();

        if (
          title.toLowerCase().includes("technical") ||
          title.toLowerCase().includes("coding") ||
          title.toLowerCase().includes("problem") ||
          title.toLowerCase().includes("strength") ||
          (cleanDesc.length > 10 && !title.toLowerCase().includes("communication") && 
           !title.toLowerCase().includes("improvement") && !title.toLowerCase().includes("weakness"))
        ) {
          if (result.topStrengths.length < 2) {
            result.topStrengths.push({ title: cleanTitle, description: cleanDesc });
          }
        } else if (
          title.toLowerCase().includes("communication") ||
          title.toLowerCase().includes("professionalism") ||
          title.toLowerCase().includes("experience")
        ) {
          result.improvementAreas.push({ title: cleanTitle, description: cleanDesc });
        }
      }
    }
  }

  const recommendationIndex = lines.findIndex((line) =>
    line.includes("**Recommendation:**")
  );
  if (recommendationIndex !== -1) {
    let recommendationText = "";
    for (let i = recommendationIndex + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      recommendationText += line.replace(/\*\*/g, "") + " ";
    }
    if (recommendationText.trim()) {
      result.nextSteps.push({
        title: "Recommendation",
        description: recommendationText.trim(),
      });
    }
  }

  if (result.topStrengths.length === 0) {
    const summaryText = summary.toLowerCase();
    const positivePhrases = [
      { pattern: /(?:demonstrated|showed|exhibited|displayed)\s+(?:strong|excellent|good|solid|impressive)\s+([^.]+)/gi, extract: true },
      { pattern: /(?:strength|strong point|key strength)[^:]*:\s*([^.]+)/gi, extract: true },
    ];
    
    for (const phrase of positivePhrases) {
      const matches = [...summaryText.matchAll(phrase.pattern)];
      for (const match of matches.slice(0, 2)) {
        if (result.topStrengths.length >= 2) break;
        const text = match[1] || match[0];
        if (text && text.length > 15 && text.length < 200) {
          const cleanText = text.trim().charAt(0).toUpperCase() + text.trim().slice(1);
          const colonIndex = cleanText.indexOf(":");
          if (colonIndex > 0) {
            result.topStrengths.push({
              title: cleanText.substring(0, colonIndex).trim(),
              description: cleanText.substring(colonIndex + 1).trim(),
            });
          } else {
            result.topStrengths.push({
              title: "Key Strength",
              description: cleanText,
            });
          }
        }
      }
      if (result.topStrengths.length >= 2) break;
    }
  }

  return result;
};

const ResultOverviewItem = ({ color, children }: any) => (
  <div className="flex items-center gap-2">
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    <p className="text-sm text-gray-600">{children}</p>
  </div>
);

export const TestResults: React.FC<TestResultsProps> = ({
  testResult,
  userName,
}) => {
  const parsed = parseSummaryContent(testResult.summary);

  const navigate = useNavigate();

  const getCleanSummary = (summary: string): string => {
    if (!summary) return "Interview performance summary";
    let cleanSummary = summary;
    const strengthsMatch = cleanSummary.match(/\*\*[^:]*top\s+strengths[^:]*:\*\*/i);
    if (strengthsMatch) {
      cleanSummary = cleanSummary.substring(0, strengthsMatch.index).trim();
    }
    const improvementMatch = cleanSummary.match(/\*\*[^:]*improvement\s+areas[^:]*:\*\*/i);
    if (improvementMatch) {
      cleanSummary = cleanSummary.substring(0, improvementMatch.index).trim();
    }
    return cleanSummary.split("\n\n")[0] || "Interview performance summary";
  };

  const displayData = {
    mainSummary:
      parsed.mainSummary ||
      getCleanSummary(testResult.summary) ||
      "Interview performance summary",
    topStrengths: parsed.topStrengths,
    improvementAreas: parsed.improvementAreas,
    nextSteps: parsed.nextSteps,
  };

  const getFeedbackText = (summary: any): string => {
    try {
      if (typeof summary === "string") return summary;
      if (Array.isArray(summary)) {
        const answerArray = summary.find((item) => item[0] === "answer");
        if (answerArray) {
          const feedbackArray = answerArray[1].find(
            (item: any) => item[0] === "feedback"
          );
          if (feedbackArray) {
            return feedbackArray[1];
          }
        }
      }
      return "No feedback available.";
    } catch (error) {
      console.error("Error parsing feedback:", error);
      return "Could not parse feedback.";
    }
  };

  return (
    <div className="min-h-screen w-screen ">
      <header className="mb-8">
        <div className="relative w-full px-6 py-4 flex items-center justify-center">
          <button
            onClick={() => navigate("/")}
            className="cursor-pointer absolute left-6 text-gray-600 hover:text-gray-900"
          >
            <X />
          </button>
          {/* <div className="flex gap-3 items-center"> */}
          <h1 className="text-base font-semibold ">
            Zoe: Your Learning Assistant
          </h1>
          {/* <Badge className="px-1 bg-green-400 rounded-sm font-semibold">
                    Beta
                  </Badge> */}
          {/* </div> */}
        </div>
      </header>
      <div className="w-full px-20">
        <div className="flex justify-end items-center mb-5">
          <h1>{userName ? `Great start, ${userName}!` : ""}</h1>
          <Button
            className="bg-[#2C5F2D] text-white font-semibold hover:bg-[#1F4420] hover:scale-[1.01] transition-all"
            onClick={() => (window.location.href = "/")}
          >
            <img
              src="/assets/Vector (Stroke).svg"
              alt=""
              className="w-4 h-4 mr-2"
            />
            Try another interview
          </Button>
        </div>

        <div className="shadow-sm rounded-md  p-6 ">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <img src="/assets/summary.png" alt="" className="w-10 h-10" />
              <h1 className="text-normal font-bold text-gray-800">
                Interview Summary
              </h1>
            </div>
            <div className="flex items-center gap-2 border px-3 py-1.5 rounded-md">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">
                {Math.round(testResult.elapse_time)} mins
              </span>
            </div>
          </div>

          <p className="text-gray-700 mb-6 leading-relaxed">
            {displayData.mainSummary}
          </p>
        </div>

        {/* <div className="flex items-center gap-6 mb-8 flex-wrap">
            <span className="font-semibold text-gray-800">
              Results overview
            </span>
            <ResultOverviewItem color="#22c55e">
              Technical: Exceeds Expectations
            </ResultOverviewItem>
            <ResultOverviewItem color="#22c55e">
              Problem Solving: Strong
            </ResultOverviewItem>
            <ResultOverviewItem color="#ef4444">
              Communication: Development Needed
            </ResultOverviewItem>
          </div> */}

        <Separator className="my-8" />

        {/* Detailed Assessment and Interview Conclusion Side by Side */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* Detailed Assessment */}
          <div className="bg-white shadow-sm p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-6">
              <img src="/assets/assessment.png" alt="" className="w-10 h-10" />
              <h2 className="text-normal text-gray-800 font-semibold">
                Detailed Assessment
              </h2>
            </div>
            <div className="flex flex-col items-stretch gap-6">
              {displayData.topStrengths.length > 0 ? (
                displayData.topStrengths.map((item, i) => (
                  <div key={i}>
                    <p className="font-semibold text-gray-800 mb-2 text-base">
                      {item.title.replace(/\*/g, "").trim()}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.description.replace(/\*/g, "").trim()}
                    </p>
                  </div>
                ))
              ) : (
                <div>
                  {/* <p className="font-semibold text-gray-800 mb-2 text-base">-</p> */}
                  <p className="text-sm text-gray-600 leading-relaxed">-</p>
                </div>
              )}
            </div>
          </div>

          {/* Interview Conclusion */}
          <div className="bg-white shadow-sm p-6 rounded-lg">
            <div className="flex items-center gap-3 mb-6">
              <img src="/assets/conclusion.png" alt="" className="w-10 h-10" />
              <h2 className="text-normal text-gray-800 font-semibold">
                Interview Conclusion
              </h2>
            </div>
            <div className="flex flex-col items-stretch gap-6">
              {displayData.improvementAreas.length > 0 ? (
                displayData.improvementAreas.map((item, i) => (
                  <div key={i}>
                    <p className="font-semibold text-gray-800 mb-2 text-base">
                      {item.title.replace(/\*/g, "").trim()}
                    </p>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {item.description.replace(/\*/g, "").trim()}
                    </p>
                  </div>
                ))
              ) : (
                <div>
                  {/* <p className="font-semibold text-gray-800 mb-2 text-base">-</p> */}
                  <p className="text-sm text-gray-600 leading-relaxed">-</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="border-none"
        >
          <AccordionItem value="item-0" className="border-none">
            <div className="flex justify-center">
              <AccordionTrigger className="cursor-pointer gap-2 w-auto hover:bg-gray-50 rounded-full px-3 py-2.5 border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all hover:no-underline">
                <span className="font-semibold text-sm">
                  Session Transcript
                </span>
              </AccordionTrigger>
            </div>
            <AccordionContent className="pb-4 pt-6">
              <div className="flex flex-col items-stretch gap-4 max-w-[900px] mx-auto">
                {testResult.qa_history.map((qa, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-stretch gap-4"
                  >
                    <div className="flex gap-3">
                      <div className="rounded-full flex items-center justify-center shrink-0">
                        <img
                          src="/assets/zoe-talking 1 (2).svg"
                          alt=""
                          className="w-[46px] h-[46px]"
                        />
                      </div>
                      <div className="flex-1 bg-emerald-50 p-2 rounded-md">
                        <p className="font-semibold text-gray-800 mb-1 text-sm">
                          Zoe
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed ">
                          {qa.question}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3 justify-end ">
                      <div className="px-3 shadow-md max-w-fit bg-white p-2 rounded-sm">
                        <p className="font-semibold text-gray-800 mb-1 text-sm">
                          You
                        </p>
                        <p className="text-[#5A615F] text-sm leading-relaxed">
                          "{qa.answer}"
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0">
                        <img src="/assets/Frame 56.svg" alt="" />
                      </div>
                    </div>

                    {qa.summary && (
                      <div className="flex justify-center">
                        <div
                          className="px-4 py-3 rounded-md border border-green-200 max-w-[85%]"
                          style={{
                            backgroundImage:
                              "url('/assets/Rectangle 5 (2).svg')",
                            backgroundSize: "cover",
                            backgroundPosition: "center",
                            backgroundRepeat: "no-repeat",
                          }}
                        >
                          <div className="flex items-center gap-2 mb-6 justify-center">
                            <img
                              src="/assets/hand-heart (1).svg"
                              alt=""
                              className="w-4 h-4"
                            />
                            <p className="text-sm font-semibold text-green-800">
                              Improvement area
                            </p>
                          </div>
                          <p className="text-sm text-gray-700 leading-relaxed">
                            {getFeedbackText(qa.summary)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
};
