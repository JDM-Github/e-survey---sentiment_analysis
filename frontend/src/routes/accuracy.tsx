import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Play } from "lucide-react";
import RequestHandler from "../lib/utilities/RequestHandler";
import {
    TwoPanelLayout, SectionTitle, SentimentBadge, LoadingRow, ErrorMsg, EmptyState, Btn, Card, StyledInput,
} from "../components/ui";
import { DownloadResults } from "../components/file-tools";

interface AccuracyResult {
    index: number;
    text: string;
    expected: string;
    predicted: string;
    score: number;
    elapsed: number;
    timestamp: string;
}

interface AccuracyReport {
    total_samples: number;
    total_score: number;
    overall_accuracy: number;
    results: AccuracyResult[];
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

function ScoreCell({ score }: { score: number }) {
    const color = score === 1 ? "#10B981" : score === 0.5 ? "#F59E0B" : "#EF4444";
    return (
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, color }}>
            {score.toFixed(1)}
        </span>
    );
}

export default function Accuracy() {
    const [maxWorkers, setMaxWorkers] = useState(4);
    const [report, setReport] = useState<AccuracyReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const run = async () => {
        setError("");
        setReport(null);
        setLoading(true);
        const data = await RequestHandler.fetchData("POST", "accuracy", { max_workers: maxWorkers });
        setLoading(false);
        if (!data.success) return setError(data.message ?? "Request failed.");
        setReport(data.data);
    };

    const pct = report?.overall_accuracy ?? 0;
    const barColor = pct >= 80 ? "#10B981" : pct >= 60 ? "#F59E0B" : "#EF4444";

    return (
        <TwoPanelLayout
            hasResults={true}

            input={
                <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                    style={{ display: "flex", flexDirection: "column", gap: 20 }}
                >
                    {/* ── Ambient blob ── */}
                    <motion.div
                        animate={{ x: [0, 18, 0], y: [0, -18, 0] }}
                        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            position: "fixed", top: "15%", left: "-6%",
                            width: 320, height: 320, borderRadius: "50%",
                            background: "radial-gradient(circle at 40% 40%, #EC4899 0%, transparent 70%)",
                            filter: "blur(110px)", opacity: 0.07,
                            pointerEvents: "none", zIndex: 0,
                        }}
                    />

                    {/* ── Page heading ── */}
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{
                            fontSize: 11, fontFamily: "var(--font-mono)",
                            color: "#EC4899", marginBottom: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            display: "flex", alignItems: "center", gap: 6,
                        }}>
                            <FlaskConical size={11} />
                            Accuracy Test
                        </div>

                        <h2 style={{
                            fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.15,
                            letterSpacing: "-0.02em", margin: "0 0 0.6rem",
                            color: "var(--color-text)",
                        }}>
                            Evaluate{" "}
                            <span style={{
                                background: "linear-gradient(135deg, #EC4899, #F59E0B)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}>
                                model accuracy.
                            </span>
                        </h2>

                        <p style={{
                            fontSize: "0.78rem", color: "var(--color-text-muted)",
                            lineHeight: 1.65, margin: 0, maxWidth: 340,
                        }}>
                            Run the built-in 30-sample labeled test and get per-item scores with an overall accuracy breakdown.
                        </p>
                    </div>

                    {/* ── Config card ── */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
                        style={{ position: "relative", zIndex: 1 }}
                    >
                        <Card>
                            <SectionTitle>Configuration</SectionTitle>

                            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                                <label style={{ fontSize: 12, color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>
                                    Max Workers
                                </label>
                                <StyledInput
                                    value={String(maxWorkers)}
                                    onChange={(v) => setMaxWorkers(Number(v))}
                                    style={{ width: 72, fontFamily: "var(--font-mono)" }}
                                />
                                <span style={{ fontSize: 10, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                                    concurrent threads
                                </span>
                            </div>

                            {/* Info box */}
                            <div style={{
                                borderRadius: 9, padding: "10px 13px", marginBottom: 16,
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                                fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.65,
                            }}>
                                Runs the predefined{" "}
                                <strong style={{ color: "var(--color-text)" }}>30-sample</strong>{" "}
                                accuracy test against labeled Filipino/Taglish samples.
                                Scoring: exact match = 1.0, adjacent class = 0.5, opposite = 0.0.
                            </div>

                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Btn variant="primary" onClick={run} disabled={loading}>
                                    {loading
                                        ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} style={{ display: "flex" }}><FlaskConical size={11} /></motion.div>
                                        : <Play size={11} strokeWidth={2.5} />
                                    }
                                    {loading ? "Running…" : "Run Accuracy Test"}
                                </Btn>
                                {report && <DownloadResults results={report.results} filename="accuracy_results.csv" />}
                            </div>

                            <AnimatePresence>
                                {error && (
                                    <motion.div
                                        key="err"
                                        initial={{ opacity: 0, y: -4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: -4 }}
                                        transition={{ duration: 0.18 }}
                                    >
                                        <ErrorMsg message={error} />
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.div>

                    {/* ── Feature bullets ── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.22, duration: 0.4 }}
                        style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative", zIndex: 1 }}
                    >
                        {[
                            "30 labeled Filipino/Taglish samples",
                            "Partial scoring — adjacent classes = 0.5",
                            "Concurrent thread pool via max_workers",
                        ].map((f, i) => (
                            <motion.div
                                key={f}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.28 + i * 0.06, duration: 0.3, ease: EASE_OUT_EXPO }}
                                style={{ display: "flex", alignItems: "center", gap: 8 }}
                            >
                                <div style={{
                                    width: 4, height: 4, borderRadius: "50%",
                                    background: "#EC4899", opacity: 0.5, flexShrink: 0,
                                }} />
                                <span style={{ fontSize: "0.68rem", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                                    {f}
                                </span>
                            </motion.div>
                        ))}
                    </motion.div>
                </motion.div>
            }

            results={
                <>
                    {loading && <LoadingRow message="Running 30-sample accuracy test… this will take a moment." />}

                    {!loading && !report && !error && (
                        <EmptyState message="Configure workers on the left and press Run Accuracy Test." />
                    )}

                    {report && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                            style={{ display: "flex", flexDirection: "column", gap: 16 }}
                        >
                            {/* ── Stat cards ── */}
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                {/* Accuracy */}
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0, duration: 0.3, ease: EASE_OUT_EXPO }}
                                    style={{
                                        background: "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: 12, padding: "14px 16px",
                                    }}
                                >
                                    <div style={{
                                        fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)",
                                        color: barColor, letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4,
                                    }}>
                                        {pct.toFixed(1)}%
                                    </div>
                                    <div style={{ fontSize: 10, color: "var(--color-text-faint)", marginBottom: 8 }}>
                                        Overall Accuracy
                                    </div>
                                    <div style={{ height: 5, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                                        <motion.div
                                            initial={{ width: 0 }}
                                            animate={{ width: `${pct}%` }}
                                            transition={{ duration: 0.9, ease: "easeOut" }}
                                            style={{ height: "100%", background: `linear-gradient(90deg, var(--color-accent), ${barColor})`, borderRadius: 3 }}
                                        />
                                    </div>
                                </motion.div>

                                {[
                                    { val: report.total_samples, label: "Total Samples" },
                                    { val: report.total_score.toFixed(1), label: "Total Score" },
                                ].map(({ val, label }, i) => (
                                    <motion.div
                                        key={label}
                                        initial={{ opacity: 0, y: 6 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: (i + 1) * 0.07, duration: 0.3, ease: EASE_OUT_EXPO }}
                                        style={{
                                            background: "var(--color-surface)",
                                            border: "1px solid var(--color-border)",
                                            borderRadius: 12, padding: "14px 16px",
                                        }}
                                    >
                                        <div style={{
                                            fontSize: 28, fontWeight: 800, fontFamily: "var(--font-mono)",
                                            color: "var(--color-text)", letterSpacing: "-0.02em", lineHeight: 1, marginBottom: 4,
                                        }}>
                                            {val}
                                        </div>
                                        <div style={{ fontSize: 10, color: "var(--color-text-faint)" }}>{label}</div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* ── Per-sample table ── */}
                            <div>
                                <SectionTitle count={report.results.length}>Per-sample Results</SectionTitle>
                                <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
                                    <div style={{ overflowX: "auto" }}>
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                            <thead>
                                                <tr style={{ background: "var(--color-surface)" }}>
                                                    {["#", "Text", "Expected", "Predicted", "Score", "Time"].map((h) => (
                                                        <th key={h} style={{
                                                            padding: "8px 12px", textAlign: "left",
                                                            fontSize: 9, fontWeight: 700,
                                                            letterSpacing: "0.08em", textTransform: "uppercase",
                                                            color: "var(--color-text-faint)", whiteSpace: "nowrap",
                                                        }}>
                                                            {h}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {report.results.map((r, i) => (
                                                    <motion.tr
                                                        key={r.index}
                                                        initial={{ opacity: 0, x: 10 }}
                                                        animate={{ opacity: 1, x: 0 }}
                                                        transition={{ delay: i * 0.02, duration: 0.2 }}
                                                        style={{ borderTop: "1px solid var(--color-border)", transition: "background 0.12s" }}
                                                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "color-mix(in srgb, var(--color-accent) 3%, transparent)")}
                                                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "transparent")}
                                                    >
                                                        <td style={{ padding: "8px 12px", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                                                            {r.index}
                                                        </td>
                                                        <td style={{
                                                            padding: "8px 12px", maxWidth: 180,
                                                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                                                            color: "var(--color-text-muted)",
                                                        }}>
                                                            {r.text}
                                                        </td>
                                                        <td style={{ padding: "8px 12px" }}><SentimentBadge label={r.expected} /></td>
                                                        <td style={{ padding: "8px 12px" }}><SentimentBadge label={r.predicted} /></td>
                                                        <td style={{ padding: "8px 12px" }}><ScoreCell score={r.score} /></td>
                                                        <td style={{
                                                            padding: "8px 12px", color: "var(--color-text-faint)",
                                                            fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
                                                        }}>
                                                            {(r.elapsed * 1000).toFixed(0)}ms
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </>
            }
        />
    );
}