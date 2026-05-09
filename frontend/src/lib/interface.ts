
export interface AccuracyResult {
    index: number;
    text: string;
    expected: string;
    predicted: string;
    score: number;
    elapsed: number;
    timestamp: string;
}

export interface AccuracyReport {
    total_samples: number;
    total_score: number;
    overall_accuracy: number;
    results: AccuracyResult[];
}
