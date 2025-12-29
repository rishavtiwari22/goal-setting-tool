import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface InterviewFeedbackProps {
  onSubmit: (feedback: {
    questionRelevance: number;
    referralLikelihood: number;
  }) => void;
}

export function InterviewFeedback({ onSubmit }: InterviewFeedbackProps) {
  const [questionRelevance, setQuestionRelevance] = useState<number>(4);
  const [referralLikelihood, setReferralLikelihood] = useState<number>(4);

  const isComplete = questionRelevance !== null && referralLikelihood !== null;

  const handleSubmit = () => {
    if (isComplete) {
      onSubmit({
        questionRelevance: questionRelevance!,
        referralLikelihood: referralLikelihood!,
      });
    }
  };

  const RatingScale = ({
    value,
    onChange,
    label,
    leftLabel,
    rightLabel,
  }: {
    value: number;
    onChange: (value: number) => void;
    label: string;
    leftLabel: string;
    rightLabel: string;
  }) => {
    return (
      <div className="flex flex-col gap-4">
        <label className="text-base font-semibold text-foreground">
          {label}
        </label>
        <div className="flex items-center justify-center gap-3">
          {[1, 2, 3, 4].map((rating) => (
            <button
              key={rating}
              type="button"
              onClick={() => onChange(rating)}
              className={`
                w-12 h-12 rounded-md font-semibold text-base transition-all
                ${
                  value === rating
                    ? "bg-brand-500 text-white shadow-md scale-105"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }
              `}
            >
              {rating}
            </button>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground px-2">
          <span>{leftLabel}</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-background">
      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold mb-2">
            Your Feedback Matters
          </CardTitle>
          <CardDescription className="text-base">
            Help us improve by sharing your experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="border-b border-border pb-6">
            <RatingScale
              value={questionRelevance}
              onChange={setQuestionRelevance}
              label="How helpful were the interview questions for the role or concepts you were practicing?"
              leftLabel="Not useful"
              rightLabel="Very useful"
            />
          </div>

          <div className="pb-6">
            <RatingScale
              value={referralLikelihood}
              onChange={setReferralLikelihood}
              label="Would you recommend this AI interviewer to others preparing for interviews?"
              leftLabel="Unlikely to recommend"
              rightLabel="Likely to recommend"
            />
          </div>

          <div className="flex justify-center pt-4">
            <Button
              onClick={handleSubmit}
              disabled={!isComplete}
              size="lg"
              className="px-8"
            >
              View Results
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

