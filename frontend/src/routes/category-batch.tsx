import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, RotateCcw, Plus, Tag } from "lucide-react";
import RequestHandler from "../lib/utilities/RequestHandler";
import {
    TwoPanelLayout, SectionTitle, ResultCard, ResultsHeader, ResultList,
    LoadingRow, ErrorMsg, EmptyState, Btn, Card, StyledTextarea, StyledInput,
    BtnDivider, Chip,
} from "../components/ui";
import { FileUpload, DownloadTemplate, DownloadResults } from "../components/file-tools";

interface CatResult {
    text: string;
    predicted: string;
    category: string;
    elapsed: number;
    timestamp: string;
}

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
const STORAGE_KEY = "category_batch_state";

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
    const inputRef = useRef<HTMLInputElement>(null);

    const texts = raw.split("\n").map((t: any) => t.trim()).filter(Boolean);

    useEffect(() => {
        const stateToSave = { raw, categories, results };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
    }, [raw, categories, results]);

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
        const data = await RequestHandler.fetchData("POST", "classify_category/batch", { texts, categories });
        setLoading(false);
        if (!data.success) return setError(data.message ?? "Request failed.");
        setResults(data.data.results);
    };

    const clear = () => {
        setRaw("");
        setResults([]);
        setError("");
        // categories remain (intentional, but you could also reset them if desired)
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
                            AI classifies both sentiment and the best matching category from your defined list.
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
                        </Card>
                    </motion.div>

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
                            hasCategory
                        />
                        <DownloadTemplate type="category" />

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
                    {loading && <LoadingRow message="AI is classifying sentiment & picking categories…" />}

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
                            <ResultsHeader count={results.length} label="Results" />
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
                </>
            }
        />
    );
}