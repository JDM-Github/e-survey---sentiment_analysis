#!/usr/bin/env python
"""
Standalone accuracy test (same as your original script but using the refactored core).
Run: python accuracy_runner.py
"""
import csv
from app.core.classifier import run_accuracy_test
from app.models.samples import SAMPLES

def main():
    print("Running accuracy test with 30 samples...")
    report = run_accuracy_test(SAMPLES)

    with open("accuracy_results.csv", "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=["index", "text", "expected", "predicted", "score", "timestamp"])
        writer.writeheader()
        for res in report["results"]:
            writer.writerow({k: res[k] for k in ["index", "text", "expected", "predicted", "score", "timestamp"]})

    print(f"Overall accuracy: {report['overall_accuracy']:.1f}%")
    print(f"Total score: {report['total_score']:.1f}/{report['total_samples']}")
    print("Detailed results saved to accuracy_results.csv")

if __name__ == "__main__":
    main()
