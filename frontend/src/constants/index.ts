export const SENTIMENT_COLORS = {
    Positive: {
        bg: "rgba(16,185,129,0.10)",
        border: "rgba(16,185,129,0.22)",
        text: "#10B981",
    },
    Negative: {
        bg: "rgba(239,68,68,0.10)",
        border: "rgba(239,68,68,0.22)",
        text: "#EF4444",
    },
    Neutral: {
        bg: "rgba(245,158,11,0.10)",
        border: "rgba(245,158,11,0.22)",
        text: "#F59E0B",
    },
    Error: {
        bg: "rgba(239,68,68,0.06)",
        border: "rgba(239,68,68,0.15)",
        text: "#f87171",
    },
} as const;

export type SentimentLabel = keyof typeof SENTIMENT_COLORS;