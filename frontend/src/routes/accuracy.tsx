import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FlaskConical, Play, CheckCircle2, AlertTriangle, XCircle, History, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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

interface StoredRun {
    id: string;
    createdAt: number;
    params: { size: number; workers: number; batchSize: number };
    report: AccuracyReport;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const DB_NAME = "AccuracyDB";
const STORE_NAME = "testResults";
const DB_VERSION = 1;
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "id" });
            }
        };
    });
}

async function saveRun(run: StoredRun): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(run);
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
        tx.oncomplete = () => db.close();
    });
}

async function getAllRuns(): Promise<StoredRun[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readonly");
        const store = tx.objectStore(STORE_NAME);
        const req = store.getAll();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
            const runs = req.result as StoredRun[];
            runs.sort((a, b) => b.createdAt - a.createdAt); // newest first
            resolve(runs);
        };
        tx.oncomplete = () => db.close();
    });
}

interface TooltipState {
    visible: boolean;
    text: string;
    x: number;
    y: number;
}

function FloatingTooltip({ state }: { state: TooltipState }) {
    if (!state.visible) return null;
    return (
        <div
            style={{
                position: "fixed",
                top: state.y,
                left: state.x,
                transform: "translate(-50%, -100%)",
                marginTop: -10,
                zIndex: 9999,
                pointerEvents: "none",
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.97 }}
                transition={{ duration: 0.14, ease: "easeOut" }}
                style={{
                    background: "var(--color-bg-inverse, #18181b)",
                    color: "var(--color-text-inverse, #f4f4f5)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 9,
                    padding: "8px 12px",
                    fontSize: 12,
                    fontFamily: "var(--font-sans)",
                    lineHeight: 1.55,
                    maxWidth: 300,
                    wordBreak: "break-word",
                    boxShadow: "0 8px 24px rgba(0,0,0,0.22), 0 2px 8px rgba(0,0,0,0.12)",
                }}
            >
                {state.text}
                <div style={{
                    position: "absolute",
                    bottom: -5,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 0, height: 0,
                    borderLeft: "5px solid transparent",
                    borderRight: "5px solid transparent",
                    borderTop: "5px solid var(--color-bg-inverse, #18181b)",
                }} />
            </motion.div>
        </div>
    );
}

function useFloatingTooltip() {
    const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, text: "", x: 0, y: 0 });
    const showTooltip = useCallback((text: string, e: React.MouseEvent<HTMLElement>) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTooltip({ visible: true, text, x: rect.left + rect.width / 2, y: rect.top - 4 });
    }, []);
    const hideTooltip = useCallback(() => setTooltip(t => ({ ...t, visible: false })), []);
    return { tooltip, showTooltip, hideTooltip };
}

// ---------- Score cell (unchanged) ----------
function ScoreCell({ score }: { score: number }) {
    if (score === 1) return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#10b981", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>
            <CheckCircle2 size={12} />1.0
        </span>
    );
    if (score === 0.5) return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#f59e0b", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>
            <AlertTriangle size={12} />0.5
        </span>
    );
    return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#ef4444", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700 }}>
            <XCircle size={12} />0.0
        </span>
    );
}

// ---------- Score distribution (unchanged) ----------
function ScoreDistribution({ results }: { results: AccuracyResult[] }) {
    const perfect = results.filter(r => r.score === 1).length;
    const partial = results.filter(r => r.score === 0.5).length;
    const wrong = results.filter(r => r.score === 0).length;
    const total = results.length;
    const pct = (n: number) => ((n / total) * 100).toFixed(1);

    return (
        <div style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
            borderRadius: 12, padding: "14px 16px",
        }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--color-text-faint)", marginBottom: 12 }}>
                Score Distribution
            </div>
            <div style={{ display: "flex", gap: 2, borderRadius: 6, overflow: "hidden", height: 8, marginBottom: 12 }}>
                <motion.div initial={{ flex: 0 }} animate={{ flex: perfect }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                    style={{ background: "#10b981", minWidth: perfect ? 2 : 0 }} />
                <motion.div initial={{ flex: 0 }} animate={{ flex: partial }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                    style={{ background: "#f59e0b", minWidth: partial ? 2 : 0 }} />
                <motion.div initial={{ flex: 0 }} animate={{ flex: wrong }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    style={{ background: "#ef4444", minWidth: wrong ? 2 : 0 }} />
            </div>
            <div style={{ display: "flex", gap: 14 }}>
                {[
                    { label: "Exact", count: perfect, pct: pct(perfect), color: "#10b981" },
                    { label: "Partial", count: partial, pct: pct(partial), color: "#f59e0b" },
                    { label: "Wrong", count: wrong, pct: pct(wrong), color: "#ef4444" },
                ].map(({ label, count, pct: p, color }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: 10, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                            {label} <strong style={{ color: "var(--color-text-muted)" }}>{count}</strong>
                            <span style={{ color }}> {p}%</span>
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ---------- Main component ----------
export default function Accuracy() {
    const [sampleSize, setSampleSize] = useState(30);
    const [maxWorkers, setMaxWorkers] = useState(4);
    const [batchSize, setBatchSize] = useState(5);
    const [report, setReport] = useState<AccuracyReport | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const { tooltip, showTooltip, hideTooltip } = useFloatingTooltip();

    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [savedRuns, setSavedRuns] = useState<StoredRun[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        const loadRuns = async () => {
            try {
                const runs = await getAllRuns();
                setSavedRuns(runs);
            } catch (err) {
                console.error("Failed to load runs:", err);
            }
        };
        loadRuns();
    }, []);

    const storeRun = async (sampleSize: number, maxWorkers: number, batchSize: number, newReport: AccuracyReport) => {
        const run: StoredRun = {
            id: Date.now().toString(),
            createdAt: Date.now(),
            params: { size: sampleSize, workers: maxWorkers, batchSize },
            report: newReport,
        };
        await saveRun(run);
        const updated = await getAllRuns();
        setSavedRuns(updated);
    };

    const loadRun = async (runId: string) => {
        const run = savedRuns.find(r => r.id === runId);
        if (run) {
            setReport(run.report);
            setSampleSize(run.params.size);
            setMaxWorkers(run.params.workers);
            setBatchSize(run.params.batchSize);
            setPage(1);
        }
    };

    const clearHistory = async () => {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        store.clear();
        tx.oncomplete = async () => {
            const runs = await getAllRuns();
            setSavedRuns(runs);
        };
    };

    const run = async () => {
        setError("");
        setReport(null);
        setLoading(true);
        const data = await RequestHandler.fetchData("POST", "accuracy", {
            size: sampleSize,
            max_workers: maxWorkers,
            batch_size: batchSize,
        });
        setLoading(false);
        if (!data.success) return setError(data.message ?? "Request failed.");
        setReport(data.data);
        setPage(1);
        storeRun(sampleSize, maxWorkers, batchSize, data.data);
    };

    const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));
    const handleSampleSizeChange = (val: string) => {
        const num = Number(val);
        setSampleSize(isNaN(num) ? 30 : clamp(num, 1, 2000));
    };
    const handleMaxWorkersChange = (val: string) => {
        const num = Number(val);
        setMaxWorkers(isNaN(num) ? 4 : clamp(num, 1, 4));
    };
    const handleBatchSizeChange = (val: string) => {
        const num = Number(val);
        setBatchSize(isNaN(num) ? 1 : clamp(num, 1, 20));
    };

    const pct = report?.overall_accuracy ?? 0;
    const barColor = pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : "#ef4444";
    const accuracyLabel = pct >= 80 ? "Good" : pct >= 60 ? "Fair" : "Poor";

    const totalResults = report?.results.length ?? 0;
    const totalPages = Math.ceil(totalResults / pageSize);
    const startIdx = (page - 1) * pageSize;
    const paginatedResults = report?.results.slice(startIdx, startIdx + pageSize) ?? [];

    const goToPage = (newPage: number) => {
        setPage(Math.min(Math.max(1, newPage), totalPages));
    };

    return (
        <>
            <AnimatePresence>
                {tooltip.visible && <FloatingTooltip state={tooltip} />}
            </AnimatePresence>

            <TwoPanelLayout
                hasResults={true}
                input={
                    <motion.div
                        initial={{ opacity: 0, y: 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
                        style={{ display: "flex", flexDirection: "column", gap: 20 }}
                    >
                        {/* Ambient blob (unchanged) */}
                        <motion.div
                            animate={{ x: [0, 18, 0], y: [0, -18, 0] }}
                            transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                            style={{
                                position: "fixed", top: "15%", left: "-6%",
                                width: 300, height: 300, borderRadius: "50%",
                                background: "radial-gradient(circle at 40% 40%, #EC4899 0%, transparent 70%)",
                                filter: "blur(100px)", opacity: 0.06,
                                pointerEvents: "none", zIndex: 0,
                            }}
                        />

                        <div style={{ position: "relative", zIndex: 1 }}>
                            <div style={{
                                fontSize: 10, fontFamily: "var(--font-mono)",
                                color: "#EC4899", marginBottom: 10,
                                letterSpacing: "0.14em", textTransform: "uppercase",
                                display: "flex", alignItems: "center", gap: 6,
                            }}>
                                <FlaskConical size={10} />
                                Accuracy Test
                            </div>
                            <h2 style={{
                                fontSize: "1.65rem", fontWeight: 800, lineHeight: 1.15,
                                letterSpacing: "-0.025em", margin: "0 0 0.55rem",
                                color: "var(--color-text)",
                            }}>
                                Evaluate{" "}
                                <span style={{
                                    background: "linear-gradient(135deg, #EC4899 20%, #F59E0B 100%)",
                                    WebkitBackgroundClip: "text",
                                    WebkitTextFillColor: "transparent",
                                }}>
                                    model accuracy.
                                </span>
                            </h2>
                            <p style={{
                                fontSize: "0.775rem", color: "var(--color-text-muted)",
                                lineHeight: 1.7, margin: 0, maxWidth: 330,
                            }}>
                                Run an accuracy test using randomly selected labeled samples from our dataset. Get overall accuracy and a per-item breakdown.
                            </p>
                        </div>

                        {/* Config card */}
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.4, ease: EASE_OUT_EXPO }}
                            style={{ position: "relative", zIndex: 1 }}
                        >
                            <Card>
                                <SectionTitle>Configuration</SectionTitle>
                                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", minWidth: 82 }}>Sample size</label>
                                        <StyledInput value={String(sampleSize)} onChange={handleSampleSizeChange} style={{ width: 72, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                                        <span style={{ fontSize: 9.5, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>/ 2000 max</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", minWidth: 82 }}>Workers</label>
                                        <StyledInput value={String(maxWorkers)} onChange={handleMaxWorkersChange} style={{ width: 72, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                                        <span style={{ fontSize: 9.5, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>threads (1-4)</span>
                                    </div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                        <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", minWidth: 82 }}>Batch size</label>
                                        <StyledInput value={String(batchSize)} onChange={handleBatchSizeChange} style={{ width: 72, fontFamily: "var(--font-mono)", fontSize: 12 }} />
                                        <span style={{ fontSize: 9.5, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>texts per API call (1-20)</span>
                                    </div>
                                </div>
                                <div style={{
                                    borderRadius: 9, padding: "10px 13px", marginBottom: 16,
                                    background: "var(--color-surface)", border: "1px solid var(--color-border)",
                                    fontSize: 10.5, color: "var(--color-text-muted)", lineHeight: 1.7,
                                }}>
                                    Scoring: <span style={{ color: "#10b981", fontWeight: 600 }}>exact match = 1.0</span>
                                    {" · "}
                                    <span style={{ color: "#f59e0b", fontWeight: 600 }}>adjacent class = 0.5</span>
                                    {" · "}
                                    <span style={{ color: "#ef4444", fontWeight: 600 }}>opposite = 0.0</span>
                                    <br />Batch size {">"} 1 sends multiple texts per API call (faster). No duplicate samples.
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <Btn variant="primary" onClick={run} disabled={loading}>
                                        {loading ? (
                                            <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.85, repeat: Infinity, ease: "linear" }} style={{ display: "flex" }}>
                                                <FlaskConical size={11} />
                                            </motion.div>
                                        ) : (
                                            <Play size={11} strokeWidth={2.5} />
                                        )}
                                        {loading ? "Running…" : "Run Accuracy Test"}
                                    </Btn>
                                    {report && <DownloadResults results={report.results} filename="accuracy_results.csv" />}
                                    {/* History button */}
                                    <button onClick={() => setShowHistory(!showHistory)} style={{
                                        background: "transparent", border: "1px solid var(--color-border)", borderRadius: 8,
                                        padding: "6px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6,
                                        color: "var(--color-text-muted)", cursor: "pointer",
                                    }}>
                                        <History size={12} /> {showHistory ? "Hide" : "History"}
                                    </button>
                                </div>
                                <AnimatePresence>
                                    {error && (
                                        <motion.div key="err" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                                            <ErrorMsg message={error} />
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                {/* History panel */}
                                <AnimatePresence>
                                    {showHistory && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ marginTop: 16, overflow: "hidden" }}
                                        >
                                            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12 }}>
                                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                    <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", color: "var(--color-text-faint)" }}>Saved runs</span>
                                                    <button onClick={clearHistory} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}>
                                                        <Trash2 size={10} /> Clear all
                                                    </button>
                                                </div>
                                                {savedRuns.length === 0 ? (
                                                    <div style={{ fontSize: 10, color: "var(--color-text-faint)", padding: "8px 0" }}>No saved results yet.</div>
                                                ) : (
                                                    <select
                                                        onChange={(e) => loadRun(e.target.value)}
                                                        style={{
                                                            width: "100%", padding: "6px 8px", background: "var(--color-surface)",
                                                            border: "1px solid var(--color-border)", borderRadius: 8,
                                                            fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--color-text)",
                                                        }}
                                                    >
                                                        <option value="">-- Load a previous run --</option>
                                                        {savedRuns.map(run => (
                                                            <option key={run.id} value={run.id}>
                                                                {new Date(run.createdAt).toLocaleString()} - samples: {run.report.total_samples}, acc: {run.report.overall_accuracy.toFixed(1)}%
                                                            </option>
                                                        ))}
                                                    </select>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </Card>
                        </motion.div>

                        {/* Feature bullets (unchanged) */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.22, duration: 0.4 }}
                            style={{ display: "flex", flexDirection: "column", gap: 7, position: "relative", zIndex: 1 }}
                        >
                            {[
                                "5000+ labeled Filipino / Taglish samples, no duplicates",
                                "Up to 2000 samples per run — stress-test your classifier",
                                "Partial scoring — adjacent classes score 0.5",
                                "Concurrent thread pool (1-4 workers) for speed",
                                "Batch inference reduces API calls when batch size > 1",
                            ].map((f, i) => (
                                <motion.div
                                    key={f}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.28 + i * 0.055, duration: 0.28, ease: EASE_OUT_EXPO }}
                                    style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                                >
                                    <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#EC4899", opacity: 0.45, flexShrink: 0, marginTop: 5 }} />
                                    <span style={{ fontSize: "0.67rem", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>{f}</span>
                                </motion.div>
                            ))}
                        </motion.div>
                    </motion.div>
                }
                results={
                    <>
                        {loading && <LoadingRow message={`Running accuracy test on ${sampleSize} samples (batch size ${batchSize})… this may take a moment.`} />}
                        {!loading && !report && !error && <EmptyState message="Configure sample size, workers, and batch size on the left, then press Run Accuracy Test." />}
                        {report && !loading && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                                style={{ display: "flex", flexDirection: "column", gap: 14 }}
                            >
                                {/* Stat cards */}
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0, duration: 0.28 }}
                                        style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "14px 16px", position: "relative", overflow: "hidden" }}>
                                        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: barColor, opacity: 0.06, filter: "blur(20px)", pointerEvents: "none" }} />
                                        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 2 }}>
                                            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "var(--font-mono)", color: barColor, letterSpacing: "-0.03em", lineHeight: 1 }}>{pct.toFixed(1)}%</div>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: barColor, background: `${barColor}18`, border: `1px solid ${barColor}30`, borderRadius: 5, padding: "1px 5px", fontFamily: "var(--font-mono)" }}>{accuracyLabel}</span>
                                        </div>
                                        <div style={{ fontSize: 9.5, color: "var(--color-text-faint)", marginBottom: 9 }}>Overall Accuracy</div>
                                        <div style={{ height: 4, background: "var(--color-border)", borderRadius: 3, overflow: "hidden" }}>
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 1, ease: "easeOut", delay: 0.1 }} style={{ height: "100%", background: `linear-gradient(90deg, var(--color-accent) 0%, ${barColor} 100%)`, borderRadius: 3 }} />
                                        </div>
                                    </motion.div>
                                    {[
                                        { val: report.total_samples, label: "Total Samples", mono: true },
                                        { val: report.total_score.toFixed(1), label: "Total Score", mono: true },
                                    ].map(({ val, label, mono }, i) => (
                                        <motion.div key={label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.07, duration: 0.28 }}
                                            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 12, padding: "14px 16px" }}>
                                            <div style={{ fontSize: 26, fontWeight: 800, fontFamily: mono ? "var(--font-mono)" : undefined, color: "var(--color-text)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>{val}</div>
                                            <div style={{ fontSize: 9.5, color: "var(--color-text-faint)" }}>{label}</div>
                                        </motion.div>
                                    ))}
                                </div>

                                <ScoreDistribution results={report.results} />

                                {/* Table with pagination */}
                                <div>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                        <SectionTitle count={report.results.length}>Per-sample Results</SectionTitle>
                                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                            <label style={{ fontSize: 10, color: "var(--color-text-faint)" }}>Show</label>
                                            <select
                                                value={pageSize}
                                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                                style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 6px", fontSize: 10, fontFamily: "var(--font-mono)" }}
                                            >
                                                {[10, 25, 50, 100].map(ps => <option key={ps} value={ps}>{ps}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, overflow: "hidden" }}>
                                        <div style={{ overflowX: "auto" }}>
                                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                                                <thead>
                                                    <tr style={{ background: "var(--color-surface)" }}>
                                                        {["#", "Text", "Expected", "Predicted", "Score", "Time"].map(h => (
                                                            <th key={h} style={{ padding: "9px 12px", textAlign: "left", fontSize: 9, fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--color-text-faint)", whiteSpace: "nowrap", borderBottom: "1px solid var(--color-border)" }}>
                                                                {h}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedResults.map((r, i) => (
                                                        <motion.tr
                                                            key={r.index}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            transition={{ delay: Math.min(i * 0.015, 0.4), duration: 0.18 }}
                                                            style={{ borderTop: "1px solid var(--color-border)", transition: "background 0.1s" }}
                                                            onMouseEnter={(e) => (e.currentTarget.style.background = "color-mix(in srgb, var(--color-accent) 4%, transparent)")}
                                                            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                                                        >
                                                            <td style={{ padding: "8px 12px", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)", fontSize: 10 }}>{r.index}</td>
                                                            <td style={{ padding: "8px 12px", maxWidth: 190 }}>
                                                                <div onMouseEnter={(e) => showTooltip(r.text, e)} onMouseLeave={hideTooltip}
                                                                    style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--color-text-muted)", cursor: "default", maxWidth: 190 }}>
                                                                    {r.text}
                                                                </div>
                                                            </td>
                                                            <td style={{ padding: "8px 12px" }}><SentimentBadge label={r.expected} /></td>
                                                            <td style={{ padding: "8px 12px" }}><SentimentBadge label={r.predicted} /></td>
                                                            <td style={{ padding: "8px 12px" }}><ScoreCell score={r.score} /></td>
                                                            <td style={{ padding: "8px 12px", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)", whiteSpace: "nowrap", fontSize: 10 }}>{(r.elapsed * 1000).toFixed(0)}ms</td>
                                                        </motion.tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                    {/* Pagination controls */}
                                    {totalPages > 1 && (
                                        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 16 }}>
                                            <button onClick={() => goToPage(page - 1)} disabled={page === 1}
                                                style={{ background: "transparent", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 10px", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1 }}>
                                                <ChevronLeft size={14} />
                                            </button>
                                            <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--color-text-muted)" }}>
                                                Page {page} of {totalPages}
                                            </span>
                                            <button onClick={() => goToPage(page + 1)} disabled={page === totalPages}
                                                style={{ background: "transparent", border: "1px solid var(--color-border)", borderRadius: 6, padding: "4px 10px", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1 }}>
                                                <ChevronRight size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </>
                }
            />
        </>
    );
}