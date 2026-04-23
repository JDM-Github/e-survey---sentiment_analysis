import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Sparkles, MessageSquare } from "lucide-react";
import RequestHandler from "../lib/utilities/RequestHandler";
import {
    TwoPanelLayout, SectionTitle, ResultCard, ResultsHeader, ResultList,
    LoadingRow, ErrorMsg, EmptyState, Btn, Card,
    StyledTextarea,
} from "../components/ui";
import { ResultFlash } from "../components/ResultFlash";

interface SingleResult {
    text: string;
    predicted: string;
    elapsed: number;
    timestamp: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "single_classification_state";

export default function Single() {
    const loadInitialState = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    text: parsed.text || "",
                    result: parsed.result || null,
                };
            }
        } catch (e) {
            console.warn("Failed to parse localStorage:", e);
        }
        return { text: "", result: null };
    };

    const initialState = loadInitialState();
    const [text, setText] = useState(initialState.text);
    const [result, setResult] = useState<SingleResult | null>(initialState.result);
    const [flashResult, setFlashResult] = useState<SingleResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        const stateToSave = { text, result };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [text, result]);

    const run = async () => {
        if (!text.trim()) return setError("Please enter some text.");
        setError("");
        setResult(null);
        setLoading(true);
        const data = await RequestHandler.fetchData("POST", "classify", { text: text.trim() });
        setLoading(false);
        if (!data.success) return setError(data.message ?? "Request failed.");
        setResult(data.data);
        setFlashResult({ ...data.data });
    };

    const clear = () => {
        setText("");
        setResult(null);
        setError("");
        // localStorage will update via useEffect automatically
    };

    const charCount = text.length;
    const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

    return (
        <>
            {/* HUD flash — fixed to viewport, above everything */}
            <ResultFlash result={flashResult} />

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
                            transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                                position: "fixed", top: "10%", left: "-5%",
                                width: 340, height: 340, borderRadius: "50%",
                                background: "radial-gradient(circle at 40% 40%, var(--color-accent) 0%, transparent 70%)",
                                filter: "blur(110px)", opacity: 0.07,
                                pointerEvents: "none", zIndex: 0,
                            }}
                        />

                        {/* Page heading */}
                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{
                                fontSize: 11, fontFamily: "var(--font-mono)",
                                color: "var(--color-accent)", marginBottom: 10,
                                letterSpacing: "0.12em", textTransform: "uppercase",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                <MessageSquare size={11} />
                                Single Classification
                            </div>

                            <h2 style={{
                                fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.15,
                                letterSpacing: "-0.02em", margin: "0 0 0.6rem",
                                color: "var(--color-text)",
                            }}>
                                Classify{" "}
                                <span style={{
                                    background: "linear-gradient(135deg, var(--color-accent), #4F6EF7)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}>
                                    one text.
                                </span>
                            </h2>

                            <p style={{
                                fontSize: "0.78rem", color: "var(--color-text-muted)",
                                lineHeight: 1.65, margin: 0, maxWidth: 340,
                            }}>
                                Run a sentiment prediction on a single Filipino or Taglish input.
                            </p>
                        </div>

                        {/* Input card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
                            style={{ position: "relative", zIndex: 1 }}
                        >
                            <Card glow={!!text.trim()}>
                                <SectionTitle>Input Text</SectionTitle>

                                <StyledTextarea
                                    value={text}
                                    onChange={setText}
                                    placeholder="I-type ang text dito… e.g. 'Maganda ang serbisyo nila!'"
                                    rows={6}
                                    stat={charCount ? `${charCount} chars · ${wordCount} words` : undefined}
                                    hint="Ctrl + Enter to run"
                                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run(); }}
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

                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                                    <Btn variant="primary" onClick={run} disabled={loading || !text.trim()}>
                                        {loading
                                            ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} style={{ display: "flex" }}><Sparkles size={11} /></motion.div>
                                            : <Play size={11} strokeWidth={2.5} />
                                        }
                                        {loading ? "Running…" : "Classify"}
                                    </Btn>
                                    <Btn variant="ghost" onClick={clear} disabled={loading || (!text && !result)}>
                                        <RotateCcw size={11} />
                                        Clear
                                    </Btn>

                                    <AnimatePresence>
                                        {charCount > 0 && (
                                            <motion.span
                                                key="pill"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                transition={{ duration: 0.16 }}
                                                style={{
                                                    marginLeft: "auto",
                                                    fontSize: 10, fontFamily: "var(--font-mono)",
                                                    padding: "3px 9px", borderRadius: 5,
                                                    background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
                                                    border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
                                                    color: "var(--color-accent)",
                                                }}
                                            >
                                                {charCount} chars
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </Card>
                        </motion.div>

                        {/* Feature bullets */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.22, duration: 0.4 }}
                            style={{
                                display: "flex", flexDirection: "column", gap: 8,
                                position: "relative", zIndex: 1,
                            }}
                        >
                            {[
                                "Real-time LLM classification",
                                "Filipino & Taglish support",
                                "Latency tracked per request",
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
                                        background: "var(--color-accent)", opacity: 0.5, flexShrink: 0,
                                    }} />
                                    <span style={{
                                        fontSize: "0.68rem", color: "var(--color-text-faint)",
                                        fontFamily: "var(--font-mono)",
                                    }}>
                                        {f}
                                    </span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                }

                results={
                    <>
                        {loading && <LoadingRow message="Classifying" />}

                        {result && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                                style={{ display: "flex", flexDirection: "column", gap: 20 }}
                            >
                                <ResultsHeader count={1} label="Result" />

                                <ResultList>
                                    <ResultCard
                                        text={result.text}
                                        predicted={result.predicted}
                                        elapsed={result.elapsed}
                                        timestamp={result.timestamp}
                                        index={0}
                                    />
                                </ResultList>

                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                                    {[
                                        { label: "Latency", value: `${(result.elapsed * 1000).toFixed(0)} ms` },
                                        { label: "Timestamp", value: result.timestamp },
                                    ].map(({ label, value }, i) => (
                                        <motion.div
                                            key={label}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.07, duration: 0.3, ease: EASE_OUT_EXPO }}
                                            style={{
                                                padding: "12px 14px", borderRadius: 10,
                                                background: "var(--color-surface)",
                                                border: "1px solid var(--color-border)",
                                                display: "flex", flexDirection: "column", gap: 5,
                                            }}
                                        >
                                            <span style={{
                                                fontSize: 9, fontFamily: "var(--font-mono)",
                                                color: "var(--color-text-faint)",
                                                textTransform: "uppercase", letterSpacing: "0.12em",
                                            }}>
                                                {label}
                                            </span>
                                            <span style={{
                                                fontSize: 12, fontFamily: "var(--font-mono)",
                                                color: "var(--color-text)", fontWeight: 500,
                                            }}>
                                                {value}
                                            </span>
                                        </motion.div>
                                    ))}
                                </div>

                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.18, duration: 0.3 }}
                                    style={{
                                        padding: "10px 14px", borderRadius: 9,
                                        background: "color-mix(in srgb, var(--color-accent) 6%, transparent)",
                                        border: "1px solid color-mix(in srgb, var(--color-accent) 18%, transparent)",
                                        fontSize: 11, fontFamily: "var(--font-mono)",
                                        color: "var(--color-text-muted)",
                                        display: "flex", alignItems: "center", gap: 8,
                                    }}
                                >
                                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-accent)", flexShrink: 0 }} />
                                    Edit the text on the left and press{" "}
                                    <kbd style={{
                                        padding: "1px 6px", borderRadius: 4,
                                        border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
                                        background: "color-mix(in srgb, var(--color-accent) 6%, transparent)",
                                        color: "var(--color-accent)", fontSize: 10,
                                    }}>Ctrl+Enter</kbd>{" "}
                                    to re-classify.
                                </motion.div>
                            </motion.div>
                        )}

                        {!loading && !result && (
                            <EmptyState message="Enter a text on the left and press Classify." />
                        )}
                    </>
                }
            />
        </>
    );
}