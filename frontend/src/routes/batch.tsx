import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Layers } from "lucide-react";
import RequestHandler from "../lib/utilities/RequestHandler";
import {
    TwoPanelLayout, SectionTitle, ResultCard, ResultsHeader, ResultList,
    LoadingRow, ErrorMsg, EmptyState, Btn, Card, StyledTextarea, BtnDivider,
} from "../components/ui";
import { FileUpload, DownloadTemplate, DownloadResults } from "../components/file-tools";

interface BatchResult {
    text: string;
    predicted: string;
    elapsed: number;
    timestamp: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "batch_classification_state";

export default function Batch() {
    const loadInitialState = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    raw: parsed.raw || "",
                    results: parsed.results || [],
                };
            }
        } catch (e) {
            console.warn("Failed to parse localStorage:", e);
        }
        return { raw: "", results: [] };
    };

    const initialState = loadInitialState();
    const [raw, setRaw] = useState(initialState.raw);
    const [results, setResults] = useState<BatchResult[]>(initialState.results);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const texts = raw.split("\n").map((t: any) => t.trim()).filter(Boolean);

    useEffect(() => {
        const stateToSave = { raw, results };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [raw, results]);

    const run = async () => {
        if (texts.length === 0) return setError("Enter at least one text, one per line.");
        setError("");
        setResults([]);
        setLoading(true);
        const data = await RequestHandler.fetchData("POST", "classify/batch", { texts });
        setLoading(false);
        if (!data.success) return setError(data.message ?? "Request failed.");
        setResults(data.data.results);
    };

    const clear = () => {
        setRaw("");
        setResults([]);
        setError("");
    };

    return (
        <>
            <TwoPanelLayout
                hasResults={true}
                input={
                    <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                        style={{ display: "flex", flexDirection: "column", gap: 20 }}
                    >
                        {/* Ambient blob */}
                        <motion.div
                            animate={{ x: [0, 20, 0], y: [0, -20, 0] }}
                            transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                                position: "fixed", top: "10%", left: "-5%",
                                width: 340, height: 340, borderRadius: "50%",
                                background: "radial-gradient(circle at 40% 40%, #10B981 0%, transparent 70%)",
                                filter: "blur(110px)", opacity: 0.07,
                                pointerEvents: "none", zIndex: 0,
                            }}
                        />

                        {/* Page heading */}
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{
                                fontSize: 11, fontFamily: "var(--font-mono)",
                                color: "#10B981", marginBottom: 10,
                                letterSpacing: "0.12em", textTransform: "uppercase",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                <Layers size={11} />
                                Batch Classification
                            </div>

                            <h2 style={{
                                fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.15,
                                letterSpacing: "-0.02em", margin: "0 0 0.6rem",
                                color: "var(--color-text)",
                            }}>
                                Classify{" "}
                                <span style={{
                                    background: "linear-gradient(135deg, #10B981, var(--color-accent))",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}>
                                    many texts.
                                </span>
                            </h2>

                            <p style={{
                                fontSize: "0.78rem", color: "var(--color-text-muted)",
                                lineHeight: 1.65, margin: 0, maxWidth: 340,
                            }}>
                                Paste multiple Filipino or Taglish texts, or upload a CSV. All classified concurrently.
                            </p>
                        </div>

                        {/* Input card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
                            style={{ position: "relative", zIndex: 1 }}
                        >
                            <Card glow={texts.length > 0}>
                                <SectionTitle count={texts.length}>Texts</SectionTitle>
                                <StyledTextarea
                                    value={raw}
                                    onChange={setRaw}
                                    placeholder={"Maganda ang produkto\nHindi ako nasatisfy\nOkay naman ang serbisyo\nSobrang bilis ng delivery"}
                                    rows={7}
                                    monospace
                                    stat={texts.length ? `${texts.length} text${texts.length !== 1 ? "s" : ""} detected` : undefined}
                                    hint="One text per line"
                                />

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

                        {/* Actions */}
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.18, duration: 0.4, ease: EASE_OUT_EXPO }}
                            style={{
                                position: "relative", zIndex: 1,
                                display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                                padding: "12px 14px", borderRadius: 10,
                                background: "var(--color-surface)",
                                border: "1px solid var(--color-border)",
                            }}
                        >
                            <Btn variant="primary" onClick={run} disabled={loading || texts.length === 0}>
                                {loading
                                    ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} style={{ display: "flex" }}><Layers size={11} /></motion.div>
                                    : <Play size={11} strokeWidth={2.5} />
                                }
                                {loading ? "Running…" : "Classify All"}
                            </Btn>
                            <Btn variant="ghost" onClick={clear} disabled={loading || (!raw && results.length === 0)}>
                                <RotateCcw size={11} />
                                Clear
                            </Btn>

                            <BtnDivider />

                            <FileUpload onTextsLoaded={(loaded) => setRaw(loaded.join("\n"))} label="Upload CSV / XLSX" />
                            <DownloadTemplate type="batch" />

                            <div style={{ marginLeft: "auto" }}>
                                <DownloadResults results={results} filename="batch_results.csv" />
                            </div>
                        </motion.div>

                        {/* Feature bullets */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.26, duration: 0.4 }}
                            style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative", zIndex: 1 }}
                        >
                            {[
                                "CSV & XLSX upload support",
                                "Concurrent processing via thread pool",
                                "Per-item latency tracking",
                            ].map((f, i) => (
                                <motion.div
                                    key={f}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.3 + i * 0.06, duration: 0.3, ease: EASE_OUT_EXPO }}
                                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                                >
                                    <div style={{
                                        width: 4, height: 4, borderRadius: "50%",
                                        background: "#10B981", opacity: 0.5, flexShrink: 0,
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
                        {loading && <LoadingRow message={`Classifying ${texts.length} texts concurrently…`} />}

                        {!loading && results.length === 0 && !error && (
                            <EmptyState message="Enter texts or upload a CSV, then press Classify All." />
                        )}

                        {results.length > 0 && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                                style={{ display: "flex", flexDirection: "column", gap: 12 }}
                            >
                                <ResultsHeader count={results.length} label="Results" />
                                <ResultList>
                                    {results.map((r, i) => (
                                        <ResultCard
                                            key={i}
                                            text={r.text}
                                            predicted={r.predicted}
                                            elapsed={r.elapsed}
                                            timestamp={r.timestamp}
                                            index={i}
                                        />
                                    ))}
                                </ResultList>
                            </motion.div>
                        )}
                    </>
                }
            />
        </>
    );
}