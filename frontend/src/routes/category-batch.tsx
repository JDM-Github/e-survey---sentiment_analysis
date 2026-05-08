import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Plus, Tag, History, Trash2, FilterX, BarChart2 } from "lucide-react";
import RequestHandler from "../lib/utilities/RequestHandler";
import {
    TwoPanelLayout, SectionTitle, ResultCard, ResultsHeader, ResultList,
    LoadingRow, ErrorMsg, EmptyState, Btn, Card, StyledTextarea, StyledInput,
    BtnDivider, Chip,
} from "../components/ui";
import { FileUpload, DownloadTemplate, DownloadResults } from "../components/file-tools";
import {BatchAnalysis} from "../components/BatchAnalysis";
import { UploadAnyXlsx } from "../components/UploadAny";

interface CatResult {
    text: string;
    predicted: string;
    category: string;
    elapsed: number;
    timestamp: string;
}

interface StoredRun {
    id: string;
    createdAt: number;
    params: {
        workers: number;
        batchSize: number;
        minCharLength: number;
        categories: string[];
    };
    results: CatResult[];
    textCount: number;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "category_batch_state";

// ---------- IndexedDB ----------
const DB_NAME = "CategoryBatchDB";
const STORE_NAME = "runs";
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
            runs.sort((a, b) => b.createdAt - a.createdAt);
            resolve(runs);
        };
        tx.oncomplete = () => db.close();
    });
}

async function clearAllRuns(): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, "readwrite");
        const store = tx.objectStore(STORE_NAME);
        const req = store.clear();
        req.onerror = () => reject(req.error);
        req.onsuccess = () => resolve();
        tx.oncomplete = () => db.close();
    });
}

// ---------- Main component ----------
export default function CategoryBatch() {
    const loadInitialState = () => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                return {
                    raw: parsed.raw || "",
                    categories: parsed.categories || [],
                    results: parsed.results || [],
                };
            }
        } catch (e) {
            console.warn("Failed to parse localStorage:", e);
        }
        return { raw: "", categories: [], results: [] };
    };

    const initialState = loadInitialState();
    const [raw, setRaw] = useState(initialState.raw);
    const [categories, setCategories] = useState<string[]>(initialState.categories);
    const [catInput, setCatInput] = useState("");
    const [results, setResults] = useState<CatResult[]>(initialState.results);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    // New params
    const [maxWorkers, setMaxWorkers] = useState(4);
    const [batchSize, setBatchSize] = useState(5);
    const [minCharLength, setMinCharLength] = useState(0);

    // History
    const [savedRuns, setSavedRuns] = useState<StoredRun[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [showAnalysis, setShowAnalysis] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    const texts = raw.split("\n").map((t: string) => t.trim()).filter(Boolean);

    // Texts that would be ignored based on minCharLength
    const ignoredCount = minCharLength > 0
        ? texts.filter((t: any) => t.length <= minCharLength).length
        : 0;
    const effectiveTexts = minCharLength > 0
        ? texts.filter((t: any) => t.length > minCharLength)
        : texts;

    useEffect(() => {
        const stateToSave = { raw, categories, results };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [raw, categories, results]);

    useEffect(() => {
        getAllRuns().then(setSavedRuns).catch(console.error);
    }, []);

    const clamp = (val: number, min: number, max: number) => Math.min(max, Math.max(min, val));

    const addCategory = () => {
        const val = catInput.trim();
        if (!val || categories.includes(val)) return;
        setCategories((prev) => [...prev, val]);
        setCatInput("");
        inputRef.current?.focus();
    };

    const removeCategory = (cat: string) => setCategories((prev) => prev.filter((c) => c !== cat));

    const run = async () => {
        if (texts.length === 0) return setError("Enter at least one text.");
        if (categories.length === 0) return setError("Add at least one category.");
        setError("");
        setResults([]);
        setLoading(true);
        const data = await RequestHandler.fetchData("POST", "classify_category/batch", {
            texts,
            categories,
            max_workers: maxWorkers,
            batch_size: batchSize,
            min_char_length: minCharLength,
        });
        setLoading(false);
        if (!data.success) return setError(data.message ?? "Request failed.");
        setResults(data.data.results);

        const run: StoredRun = {
            id: Date.now().toString(),
            createdAt: Date.now(),
            params: { workers: maxWorkers, batchSize, minCharLength, categories },
            results: data.data.results,
            textCount: texts.length,
        };
        await saveRun(run);
        const updated = await getAllRuns();
        setSavedRuns(updated);
    };

    const loadRun = (runId: string) => {
        const run = savedRuns.find(r => r.id === runId);
        if (!run) return;
        setResults(run.results);
        setMaxWorkers(run.params.workers);
        setBatchSize(run.params.batchSize);
        setMinCharLength(run.params.minCharLength);
        setCategories(run.params.categories);
    };

    const handleClearHistory = async () => {
        await clearAllRuns();
        setSavedRuns([]);
    };

    const clear = () => {
        setRaw("");
        setResults([]);
        setError("");
    };

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
                    {/* Ambient blob */}
                    <motion.div
                        animate={{ x: [0, 18, 0], y: [0, -22, 0] }}
                        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            position: "fixed", top: "8%", left: "-6%",
                            width: 340, height: 340, borderRadius: "50%",
                            background: "radial-gradient(circle at 40% 40%, #F59E0B 0%, transparent 70%)",
                            filter: "blur(110px)", opacity: 0.07,
                            pointerEvents: "none", zIndex: 0,
                        }}
                    />

                    {/* Page heading */}
                    <div style={{ position: "relative", zIndex: 1 }}>
                        <div style={{
                            fontSize: 11, fontFamily: "var(--font-mono)",
                            color: "#F59E0B", marginBottom: 10,
                            letterSpacing: "0.12em", textTransform: "uppercase",
                            display: "flex", alignItems: "center", gap: 6,
                        }}>
                            <Tag size={11} />
                            Category Batch
                        </div>

                        <h2 style={{
                            fontSize: "1.75rem", fontWeight: 800, lineHeight: 1.15,
                            letterSpacing: "-0.02em", margin: "0 0 0.6rem",
                            color: "var(--color-text)",
                        }}>
                            Classify{" "}
                            <span style={{
                                background: "linear-gradient(135deg, #F59E0B, #EC4899)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                            }}>
                                with categories.
                            </span>
                        </h2>

                        <p style={{
                            fontSize: "0.78rem", color: "var(--color-text-muted)",
                            lineHeight: 1.65, margin: 0, maxWidth: 340,
                        }}>
                            Classifies both sentiment and the best matching category from your defined list.
                        </p>
                    </div>

                    {/* Texts card */}
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
                                placeholder={"Maganda ang mukha niya\nHindi masarap ang pagkain\nMahal pero sulit"}
                                rows={5}
                                monospace
                                stat={texts.length ? `${texts.length} text${texts.length !== 1 ? "s" : ""} detected` : undefined}
                                hint="One text per line"
                            />
                            {/* Ignored texts warning */}
                            <AnimatePresence>
                                {ignoredCount > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                                        animate={{ opacity: 1, height: "auto", marginTop: 8 }}
                                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                                        transition={{ duration: 0.2 }}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 6,
                                            padding: "7px 10px", borderRadius: 7,
                                            background: "rgba(245, 158, 11, 0.08)",
                                            border: "1px solid rgba(245, 158, 11, 0.2)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <FilterX size={11} style={{ color: "#F59E0B", flexShrink: 0 }} />
                                        <span style={{ fontSize: 10.5, color: "#F59E0B", fontFamily: "var(--font-mono)" }}>
                                            {ignoredCount} text{ignoredCount !== 1 ? "s" : ""} will be ignored
                                            {" "}(≤ {minCharLength} chars) · {effectiveTexts.length} will be processed
                                        </span>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </Card>
                    </motion.div>

                    {/* Categories card */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.15, duration: 0.4, ease: EASE_OUT_EXPO }}
                        style={{ position: "relative", zIndex: 1 }}
                    >
                        <Card glow={categories.length > 0}>
                            <SectionTitle count={categories.length}>Categories</SectionTitle>

                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                                <StyledInput
                                    value={catInput}
                                    onChange={setCatInput}
                                    placeholder="Add category, press Enter…"
                                    inputRef={inputRef}
                                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                                    style={{ flex: 1 }}
                                />
                                <Btn variant="outline" onClick={addCategory} disabled={!catInput.trim()}>
                                    <Plus size={11} />
                                    Add
                                </Btn>
                            </div>

                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, minHeight: 28 }}>
                                <AnimatePresence>
                                    {categories.map((cat) => (
                                        <Chip key={cat} label={cat} onRemove={() => removeCategory(cat)} />
                                    ))}
                                </AnimatePresence>
                                {categories.length === 0 && (
                                    <span style={{ fontSize: 11, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                                        No categories yet…
                                    </span>
                                )}
                            </div>
                        </Card>
                    </motion.div>

                    {/* Config card — workers, batch, min char */}
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.18, duration: 0.4, ease: EASE_OUT_EXPO }}
                        style={{ position: "relative", zIndex: 1 }}
                    >
                        <Card>
                            <SectionTitle>Configuration</SectionTitle>
                            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 14 }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", minWidth: 96 }}>Workers</label>
                                    <StyledInput
                                        value={String(maxWorkers)}
                                        onChange={(val) => setMaxWorkers(clamp(Number(val) || 1, 1, 4))}
                                        style={{ width: 72, fontFamily: "var(--font-mono)", fontSize: 12 }}
                                    />
                                    <span style={{ fontSize: 9.5, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>threads (1-4)</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", minWidth: 96 }}>Batch size</label>
                                    <StyledInput
                                        value={String(batchSize)}
                                        onChange={(val) => setBatchSize(clamp(Number(val) || 1, 1, 20))}
                                        style={{ width: 72, fontFamily: "var(--font-mono)", fontSize: 12 }}
                                    />
                                    <span style={{ fontSize: 9.5, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>texts per API call (1-20)</span>
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <label style={{ fontSize: 11, color: "var(--color-text-muted)", whiteSpace: "nowrap", minWidth: 96 }}>Min char length</label>
                                    <StyledInput
                                        value={String(minCharLength)}
                                        onChange={(val) => setMinCharLength(clamp(Number(val) || 0, 0, 9999))}
                                        style={{ width: 72, fontFamily: "var(--font-mono)", fontSize: 12 }}
                                    />
                                    <span style={{ fontSize: 9.5, color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
                                        ignore texts ≤ this length
                                    </span>
                                </div>
                            </div>

                            {/* History toggle + panel */}
                            <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: 12, marginTop: 4 }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showHistory ? 10 : 0 }}>
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        style={{
                                            background: "transparent", border: "1px solid var(--color-border)", borderRadius: 8,
                                            padding: "5px 10px", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 6,
                                            color: "var(--color-text-muted)", cursor: "pointer",
                                        }}
                                    >
                                        <History size={11} />
                                        {showHistory ? "Hide history" : `History${savedRuns.length > 0 ? ` (${savedRuns.length})` : ""}`}
                                    </button>
                                    {showHistory && savedRuns.length > 0 && (
                                        <button
                                            onClick={handleClearHistory}
                                            style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 10, display: "flex", alignItems: "center", gap: 4 }}
                                        >
                                            <Trash2 size={10} /> Clear all
                                        </button>
                                    )}
                                </div>

                                <AnimatePresence>
                                    {showHistory && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: "auto" }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.2 }}
                                            style={{ overflow: "hidden" }}
                                        >
                                            {savedRuns.length === 0 ? (
                                                <div style={{ fontSize: 10, color: "var(--color-text-faint)", padding: "6px 0", fontFamily: "var(--font-mono)" }}>
                                                    No saved runs yet.
                                                </div>
                                            ) : (
                                                <select
                                                    onChange={(e) => loadRun(e.target.value)}
                                                    defaultValue=""
                                                    style={{
                                                        width: "100%", padding: "6px 8px",
                                                        background: "var(--color-surface)",
                                                        border: "1px solid var(--color-border)", borderRadius: 8,
                                                        fontFamily: "var(--font-mono)", fontSize: 10,
                                                        color: "var(--color-text)",
                                                    }}
                                                >
                                                    <option value="" disabled>— Load a previous run —</option>
                                                    {savedRuns.map(run => (
                                                        <option key={run.id} value={run.id}>
                                                            {new Date(run.createdAt).toLocaleString()}
                                                            {" · "}{run.textCount} texts
                                                            {" · "}{run.params.categories.length} cats
                                                            {" · "}{run.results.length} results
                                                        </option>
                                                    ))}
                                                </select>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </Card>
                    </motion.div>

                    {/* Error */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                key="err"
                                initial={{ opacity: 0, y: -4 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -4 }}
                                transition={{ duration: 0.18 }}
                                style={{ position: "relative", zIndex: 1 }}
                            >
                                <ErrorMsg message={error} />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Actions */}
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22, duration: 0.4, ease: EASE_OUT_EXPO }}
                        style={{
                            position: "relative", zIndex: 1,
                            display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap",
                            padding: "12px 14px", borderRadius: 10,
                            background: "var(--color-surface)",
                            border: "1px solid var(--color-border)",
                        }}
                    >
                        <Btn
                            variant="primary"
                            onClick={run}
                            disabled={loading || texts.length === 0 || categories.length === 0}
                        >
                            {loading
                                ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} style={{ display: "flex" }}><Tag size={11} /></motion.div>
                                : <Play size={11} strokeWidth={2.5} />
                            }
                            {loading ? "Running…" : "Classify + Categorize"}
                        </Btn>
                        <Btn variant="ghost" onClick={clear} disabled={loading || (!raw && results.length === 0)}>
                            <RotateCcw size={11} />
                            Clear
                        </Btn>

                        <BtnDivider />

                        <FileUpload
                            onTextsLoaded={(loaded) => setRaw(loaded.join("\n"))}
                            onCategoriesLoaded={(loadedCategories) => {
                                setCategories(prev => {
                                    const newCats = loadedCategories.filter(c => !prev.includes(c));
                                    return [...prev, ...newCats];
                                });
                            }}
                        />
                        <DownloadTemplate type="batch" />
                        <UploadAnyXlsx onTextsLoaded={(loaded) => setRaw(loaded.join("\n"))} />

                        <div style={{ marginLeft: "auto" }}>
                            <DownloadResults results={results} filename="category_results.csv" />
                        </div>
                    </motion.div>

                    {/* Feature bullets */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3, duration: 0.4 }}
                        style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative", zIndex: 1 }}
                    >
                        {[
                            "Custom category list — define your own topics",
                            "Dual classification — sentiment + category",
                            "Batch support with concurrent processing",
                            "Min char filter — skip noise & short entries",
                        ].map((f, i) => (
                            <motion.div
                                key={f}
                                initial={{ opacity: 0, x: -8 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.34 + i * 0.06, duration: 0.3, ease: EASE_OUT_EXPO }}
                                style={{ display: "flex", alignItems: "center", gap: 8 }}
                            >
                                <div style={{
                                    width: 4, height: 4, borderRadius: "50%",
                                    background: "#F59E0B", opacity: 0.5, flexShrink: 0,
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
                    {loading && <LoadingRow message="Classifying sentiment & picking categories…" />}

                    {!loading && results.length === 0 && !error && (
                        <EmptyState message="Fill in texts and categories, then press Classify + Categorize." />
                    )}

                    {results.length > 0 && !loading && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
                            style={{ display: "flex", flexDirection: "column", gap: 12 }}
                        >
                            <div className="flex justify-between">
                                <ResultsHeader count={results.length} label="Results" />
                                <button
                                    onClick={() => setShowAnalysis(v => !v)}
                                    style={{
                                        alignSelf: "flex-start",
                                        background: showAnalysis
                                            ? "color-mix(in srgb, var(--color-accent) 12%, transparent)"
                                            : "var(--color-surface)",
                                        border: "1px solid var(--color-border)",
                                        borderRadius: 8, padding: "6px 12px",
                                        fontSize: 11, cursor: "pointer",
                                        color: showAnalysis ? "var(--color-accent)" : "var(--color-text-muted)",
                                        display: "flex", alignItems: "center", gap: 6,
                                        transition: "all 0.15s",
                                    }}
                                >
                                    <BarChart2 size={11} />
                                    {showAnalysis ? "Hide Analysis" : "Show Analysis"}
                                </button>
                            </div>
                            <ResultList>
                                {results.map((r, i) => (
                                    <ResultCard
                                        key={i}
                                        text={r.text}
                                        predicted={r.predicted}
                                        elapsed={r.elapsed}
                                        timestamp={r.timestamp}
                                        category={r.category}
                                        index={i}
                                    />
                                ))}
                            </ResultList>
                        </motion.div>
                    )}

                    <BatchAnalysis
                        results={results}
                        hasCategory
                        open={showAnalysis}
                        onClose={() => setShowAnalysis(false)}
                    />
                </>
            }
            
        />
    );
}