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
import Header from "@/components/Header";
import { InterviewMode } from "@/models/interview";

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
  topStrengths?: Array<{ name: string; description: string }>;
  improvementAreas?: Array<{ name: string; description: string }>;
  topicsToStudy?: Array<{ name: string; description: string }>;
  mode?: InterviewMode;
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
  // Prefer structured data from props, fallback to parsing summary string
  const parsed = parseSummaryContent(testResult.summary);

  // Use structured data from props if available, otherwise use parsed data
  const structuredStrengths = testResult.topStrengths && testResult.topStrengths.length > 0
    ? testResult.topStrengths.map(s => ({ title: s.name, description: s.description }))
    : parsed.topStrengths;

  const structuredImprovements = testResult.improvementAreas && testResult.improvementAreas.length > 0
    ? testResult.improvementAreas.map(a => ({ title: a.name, description: a.description }))
    : parsed.improvementAreas;

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
    topStrengths: structuredStrengths,
    improvementAreas: structuredImprovements,
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
    <div className="min-h-screen w-full overflow-x-hidden bg-[#FBFAF8] flex flex-col">
      <Header />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 lg:px-12 py-4 md:py-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6 min-w-0">
          <div className="flex items-center gap-2 min-w-0">

            <h1 className="text-base md:text-lg lg:text-xl font-bold text-gray-900 break-words">
              {userName ? `Great start, ${userName}!` : "Interview Complete!"}
            </h1>
          </div>
          <Button
            className="bg-[#2B5E2B] text-white font-semibold hover:bg-[#1a3a1b] hover:scale-[1.01] transition-all rounded-lg px-6 h-12 shadow-sm text-sm whitespace-nowrap shrink-0"
            onClick={() => (window.location.href = "/")}
          >
            <img
              src="/assets/Vector (Stroke).svg"
              alt=""
              className="w-5 h-5 mr-2 shrink-0"
            />
            Try Another Interview
          </Button>
        </div>

        {/* Interview Summary Card */}
        <div className="bg-white shadow-none rounded-xl border border-gray-200 p-6 mb-4 md:mb-6 min-w-0">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-3 min-w-0">
            <div className="flex items-center gap-3 min-w-0">
              <img src="/assets/summary.png" alt="" className="w-10 h-10 md:w-12 md:h-12 shrink-0 object-contain" />
              <h2 className="text-base md:text-lg font-bold text-gray-900 break-words">
                Interview Summary
              </h2>
            </div>
            <div className="flex items-center gap-2 bg-slate-50 border border-gray-200 px-3 py-1.5 rounded-lg whitespace-nowrap shrink-0">
              <Clock className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-gray-700">
                {Math.round(testResult.elapse_time)} mins
              </span>
            </div>
          </div>

          <p className="text-sm md:text-base text-gray-700 leading-relaxed break-words">
            {displayData.mainSummary}
          </p>
        </div>

        {/* Topics to Study — mentor mode only, shown prominently above strengths/improvements */}
        {testResult.mode === 'mentor' &&
          Array.isArray(testResult.topicsToStudy) &&
          testResult.topicsToStudy.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-50 to-white shadow-none rounded-xl border-2 border-indigo-200 p-6 hover:shadow-sm transition-all duration-300 mb-6 min-w-0">
              <div className="flex items-center gap-3 mb-3 min-w-0">
                <img
                  src="/assets/assessment.png"
                  alt=""
                  className="w-10 h-10 md:w-12 md:h-12 shrink-0 object-contain"
                />
                <div className="min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-gray-900 break-words">
                    Topics to Study
                  </h2>
                  <p className="text-xs md:text-sm text-gray-600">
                    Review these to perform stronger in your next interview for this role
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                {testResult.topicsToStudy.map((topic, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-lg p-3 border border-indigo-200 min-w-0"
                  >
                    <p className="font-bold text-gray-900 mb-1 text-sm md:text-base break-words">
                      {topic.name.replace(/\*/g, '').trim()}
                    </p>
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed break-words">
                      {topic.description.replace(/\*/g, '').trim()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        {/* Top Strengths and Improvement Areas - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 min-w-0">
          {/* Top Strengths Card */}
          <div className="bg-white shadow-none rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-all duration-300 min-w-0">
            <div className="flex items-center gap-3 mb-4 min-w-0">
              <img src="/assets/assessment.png" alt="" className="w-10 h-10 md:w-12 md:h-12 shrink-0 object-contain" />
              <h2 className="text-base md:text-lg font-bold text-gray-900 break-words">
                Top Strengths
              </h2>
            </div>
            <div className="space-y-3 min-w-0">
              {displayData.topStrengths.length > 0 ? (
                displayData.topStrengths.map((item, i) => (
                  <div key={i} className="bg-[#E6F6EF] rounded-lg p-3 border border-[#2B5E2B]/20 min-w-0">
                    <p className="font-bold text-gray-900 mb-1.5 text-sm md:text-base break-words">
                      {item.title.replace(/\*/g, "").trim()}
                    </p>
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed break-words">
                      {item.description.replace(/\*/g, "").trim()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No specific strengths identified</p>
              )}
            </div>
          </div>

          {/* Improvement Areas Card */}
          <div className="bg-white shadow-none rounded-xl border border-gray-200 p-6 hover:shadow-sm transition-all duration-300 min-w-0">
            <div className="flex items-center gap-3 mb-4 min-w-0">
              <img src="/assets/conclusion.png" alt="" className="w-10 h-10 md:w-12 md:h-12 shrink-0 object-contain" />
              <h2 className="text-base md:text-lg font-bold text-gray-900 break-words">
                Improvement Areas
              </h2>
            </div>
            <div className="space-y-3 min-w-0">
              {displayData.improvementAreas.length > 0 ? (
                displayData.improvementAreas.map((item, i) => (
                  <div key={i} className="bg-amber-50 rounded-lg p-3 border border-amber-200 min-w-0">
                    <p className="font-bold text-gray-900 mb-1.5 text-sm md:text-base break-words">
                      {item.title.replace(/\*/g, "").trim()}
                    </p>
                    <p className="text-xs md:text-sm text-gray-700 leading-relaxed break-words">
                      {item.description.replace(/\*/g, "").trim()}
                    </p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-500 italic">No specific areas identified</p>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-6 bg-slate-200" />

        {/* Session Transcript Accordion */}
        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="border-none"
        >
          <AccordionItem value="item-0" className="border-none">
            <div className="flex justify-center mb-4">
              <AccordionTrigger className="cursor-pointer gap-3 w-auto hover:bg-slate-50 rounded-lg px-6 h-12 border border-[#2B5E2B] bg-white shadow-none hover:shadow-sm transition-all hover:no-underline">
                <img
                  src="/assets/zoe-talking 1.svg"
                  alt="Zoe"
                  className="w-5 h-5 md:w-6 md:h-6 shrink-0 object-contain"
                />
                <span className="font-bold text-sm md:text-base text-gray-900">
                  View Session Transcript
                </span>
              </AccordionTrigger>
            </div>
            <AccordionContent className="pb-4 pt-4">
              <div className="flex flex-col items-stretch gap-5 w-full mx-auto min-w-0">
                {testResult.qa_history.map((qa, index) => (
                  <div
                    key={index}
                    className="flex flex-col items-stretch gap-4 w-full min-w-0"
                  >
                    {/* Zoe's Question */}
                    <div className="flex gap-3 w-full min-w-0">
                      <div className="rounded-full flex items-center justify-center shrink-0">
                        <img
                          src="/assets/zoe-talking 1 (2).svg"
                          alt=""
                          className="w-10 h-10 md:w-12 md:h-12"
                        />
                      </div>
                      <div className="flex-1 bg-[#E6F6EF] border border-[#2B5E2B]/20 p-3 rounded-lg shadow-none min-w-0">
                        <p className="font-bold text-gray-900 mb-1.5 text-xs md:text-sm">
                          Zoe
                        </p>
                        <p className="text-gray-800 text-sm leading-relaxed break-words">
                          {qa.question}
                        </p>
                      </div>
                    </div>

                    {/* User's Answer */}
                    <div className="flex gap-3 justify-end w-full min-w-0">
                      <div className="max-w-[85%] bg-white border border-gray-200 p-3 rounded-lg shadow-none min-w-0">
                        <p className="font-bold text-gray-900 mb-1.5 text-xs md:text-sm">
                          You
                        </p>
                        <p className="text-gray-700 text-sm leading-relaxed break-words">
                          {qa.answer}
                        </p>
                      </div>
                      <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center shrink-0 overflow-hidden">
                        <img src="/assets/avatar.png" alt="User avatar" className="w-full h-full object-cover" />
                      </div>
                    </div>

                    {/* Feedback */}
                    {qa.summary && (
                      <div className="flex justify-center w-full min-w-0">
                        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 px-4 py-3 rounded-lg max-w-[90%] shadow-none min-w-0">
                          <div className="flex items-center gap-2 mb-2 justify-center">
                            <img
                              src="/assets/hand-heart (1).svg"
                              alt=""
                              className="w-4 h-4 shrink-0"
                            />
                            <p className="text-sm font-bold text-green-800">
                              💡 Improvement Tip
                            </p>
                          </div>
                          <p className="text-sm text-gray-800 leading-relaxed text-center break-words">
                            {getFeedbackText(qa.summary)}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Divider between Q&A pairs */}
                    {index < testResult.qa_history.length - 1 && (
                      <Separator className="my-1 bg-slate-200" />
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
