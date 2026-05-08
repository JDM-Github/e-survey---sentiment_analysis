import { useMemo } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, GripHorizontal, TrendingUp, Zap, Hash } from "lucide-react";
import { PieChart, Pie, ResponsiveContainer, Sector } from "recharts";

interface ResultItem {
    text: string;
    predicted: string;
    elapsed: number;
    timestamp?: string;
    category?: string;
}

interface BatchAnalysisProps {
    results: ResultItem[];
    hasCategory?: boolean;
    open: boolean;
    onClose: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

const SENTIMENT: Record<string, { color: string; rgb: string }> = {
    Positive: { color: "#10b981", rgb: "16,185,129" },
    Negative: { color: "#f43f5e", rgb: "244,63,94" },
    Neutral: { color: "#64748b", rgb: "100,116,139" },
    Error: { color: "#f59e0b", rgb: "245,158,11" },
};

const CAT_COLORS = [
    "#818cf8", "#38bdf8", "#fb923c", "#34d399",
    "#f472b6", "#a78bfa", "#facc15", "#4ade80",
];

const fmt = (s: number) => `${(s * 1000).toFixed(0)}ms`;

// ─── SectionCard ───────────────────────────────────────────────────────────────

function SectionCard({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.35, ease: EASE }}
            style={{
                background: "var(--color-surface3)",
                border: "1px solid var(--color-border)",
                borderRadius: 14,
                padding: "14px 16px",
            }}
        >
            {children}
        </motion.div>
    );
}

// ─── Label ─────────────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 7,
            marginBottom: 14,
        }}>
            <div style={{
                width: 16, height: 1,
                background: "linear-gradient(90deg, #4F6EF7, transparent)",
            }} />
            <span style={{
                fontSize: 9, fontWeight: 700, letterSpacing: "0.13em",
                textTransform: "uppercase", color: "var(--color-text-faint)",
                fontFamily: "var(--font-mono)",
            }}>
                {children}
            </span>
        </div>
    );
}

// ─── Stats ─────────────────────────────────────────────────────────────────────

function Stats({ total, avgMs, dominant }: { total: number; avgMs: string; dominant: string }) {
    const sc = SENTIMENT[dominant];
    const items = [
        { icon: Hash, value: String(total), sub: "analyzed", color: "#a1a1aa" },
        { icon: Zap, value: avgMs, sub: "avg latency", color: "#818cf8" },
        { icon: TrendingUp, value: dominant, sub: "dominant", color: sc?.color ?? "#a1a1aa" },
    ];
    return (
        <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.04, duration: 0.32, ease: EASE }}
            style={{ display: "flex", gap: 8 }}
        >
            {items.map(({ icon: Icon, value, sub, color }) => (
                <div key={sub} style={{
                    flex: 1,
                    background: "var(--color-surface3, rgba(255,255,255,0.03))",
                    border: "1px solid var(--color-border)",
                    borderRadius: 12,
                    padding: "12px 12px 10px",
                    display: "flex", flexDirection: "column", gap: 7,
                }}>
                    <Icon size={12} color={color} strokeWidth={2} style={{ opacity: 0.75 }} />
                    <div style={{
                        fontSize: 17, fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "-0.04em",
                        color, lineHeight: 1,
                    }}>
                        {value}
                    </div>
                    <div style={{
                        fontSize: 8.5, color: "var(--color-text-faint)",
                        fontFamily: "var(--font-mono)",
                        letterSpacing: "0.07em", textTransform: "uppercase",
                    }}>
                        {sub}
                    </div>
                </div>
            ))}
        </motion.div>
    );
}

// ─── Sentiment Donut ───────────────────────────────────────────────────────────

function SentimentDonut({ results }: { results: ResultItem[] }) {
    const data = useMemo(() => {
        const c: Record<string, number> = {};
        for (const r of results) c[r.predicted] = (c[r.predicted] ?? 0) + 1;
        return Object.entries(c)
            .map(([name, value]) => ({ name, value, pct: Math.round((value / results.length) * 100) }))
            .sort((a, b) => b.value - a.value);
    }, [results]);

    const top = data[0];

    return (
        <SectionCard delay={0.08}>
            <Label>Sentiment Distribution</Label>
            <div style={{ display: "flex", gap: 18, alignItems: "center" }}>

                <div style={{ position: "relative", width: 120, height: 120, flexShrink: 0 }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={56}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                                animationBegin={0}
                                animationDuration={550}
                                shape={(props: any) => {
                                    const fill = SENTIMENT[props.payload.name]?.color ?? "#64748b";
                                    return <Sector {...props} fill={fill} />;
                                }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {top && (
                        <div style={{
                            position: "absolute", inset: 0,
                            display: "flex", flexDirection: "column",
                            alignItems: "center", justifyContent: "center",
                            pointerEvents: "none",
                        }}>
                            <div style={{
                                fontSize: 17, fontWeight: 800,
                                fontFamily: "var(--font-mono)",
                                color: SENTIMENT[top.name]?.color, lineHeight: 1,
                            }}>
                                {top.pct}%
                            </div>
                            <div style={{
                                fontSize: 7.5, color: "var(--color-text-faint)",
                                fontFamily: "var(--font-mono)", marginTop: 2,
                                letterSpacing: "0.04em",
                            }}>
                                {top.name}
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress bars legend */}
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 9 }}>
                    {data.map(d => {
                        const c = SENTIMENT[d.name]?.color ?? "#64748b";
                        return (
                            <div key={d.name}>
                                <div style={{
                                    display: "flex", justifyContent: "space-between",
                                    alignItems: "baseline", marginBottom: 4,
                                }}>
                                    <span style={{
                                        fontSize: 10, fontFamily: "var(--font-mono)",
                                        color: c, fontWeight: 700,
                                    }}>
                                        {d.name}
                                    </span>
                                    <span style={{
                                        fontSize: 9, fontFamily: "var(--font-mono)",
                                        color: "var(--color-text-faint)",
                                    }}>
                                        {d.value} · {d.pct}%
                                    </span>
                                </div>
                                <div style={{
                                    height: 4, borderRadius: 99,
                                    background: "rgba(255,255,255,0.06)",
                                    overflow: "hidden",
                                }}>
                                    <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${d.pct}%` }}
                                        transition={{ delay: 0.25, duration: 0.55, ease: EASE }}
                                        style={{
                                            height: "100%", borderRadius: 99,
                                            background: c,
                                            boxShadow: `0 0 6px ${c}80`,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </SectionCard>
    );
}

// ─── Category Bars ─────────────────────────────────────────────────────────────

function CategoryBars({ results }: { results: ResultItem[] }) {
    const data = useMemo(() => {
        const c: Record<string, number> = {};
        for (const r of results) if (r.category) c[r.category] = (c[r.category] ?? 0) + 1;
        return Object.entries(c).sort((a, b) => b[1] - a[1]);
    }, [results]);

    if (!data.length) return null;
    const max = data[0][1];

    return (
        <SectionCard delay={0.14}>
            <Label>Category Breakdown</Label>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                {data.map(([name, count], i) => {
                    const pct = Math.round((count / results.length) * 100);
                    const color = CAT_COLORS[i % CAT_COLORS.length];
                    return (
                        <div key={name}>
                            <div style={{
                                display: "flex", justifyContent: "space-between",
                                alignItems: "center", marginBottom: 5,
                            }}>
                                <span style={{
                                    fontSize: 10, fontFamily: "var(--font-mono)",
                                    color: "var(--color-text-muted)", fontWeight: 600,
                                    maxWidth: "60%", overflow: "hidden",
                                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                                }}>
                                    {name}
                                </span>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                    <span style={{
                                        fontSize: 9, fontFamily: "var(--font-mono)",
                                        color: "var(--color-text-faint)",
                                    }}>
                                        {pct}%
                                    </span>
                                    <span style={{
                                        fontSize: 10, fontFamily: "var(--font-mono)",
                                        color, fontWeight: 700,
                                        background: `${color}18`,
                                        border: `1px solid ${color}35`,
                                        borderRadius: 4, padding: "1px 6px",
                                    }}>
                                        {count}
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                height: 5, borderRadius: 99,
                                background: "rgba(255,255,255,0.06)",
                                overflow: "hidden",
                            }}>
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(count / max) * 100}%` }}
                                    transition={{ delay: 0.1 + i * 0.04, duration: 0.5, ease: EASE }}
                                    style={{
                                        height: "100%", borderRadius: 99,
                                        background: `linear-gradient(90deg, ${color}bb, ${color})`,
                                        boxShadow: `0 0 8px ${color}55`,
                                    }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </SectionCard>
    );
}

// ─── Cross Heatmap ─────────────────────────────────────────────────────────────

function CrossHeatmap({ results }: { results: ResultItem[] }) {
    const { categories, matrix, maxVal } = useMemo(() => {
        const catSet = new Set<string>();
        const m: Record<string, Record<string, number>> = {};
        let mx = 0;
        for (const r of results) {
            if (!r.category) continue;
            catSet.add(r.category);
            if (!m[r.predicted]) m[r.predicted] = {};
            m[r.predicted][r.category] = (m[r.predicted][r.category] ?? 0) + 1;
            mx = Math.max(mx, m[r.predicted][r.category]);
        }
        return { categories: [...catSet], matrix: m, maxVal: mx };
    }, [results]);

    if (!categories.length) return null;

    const sentiments = ["Positive", "Negative", "Neutral"].filter(
        s => Object.keys(matrix[s] ?? {}).length > 0
    );

    return (
        <SectionCard delay={0.2}>
            <Label>Sentiment × Category</Label>
            <div style={{ overflowX: "auto" }}>
                <table style={{
                    width: "100%", borderCollapse: "separate",
                    borderSpacing: "3px",
                }}>
                    <thead>
                        <tr>
                            <th style={{
                                padding: "0 6px 8px 0", textAlign: "left",
                                fontFamily: "var(--font-mono)", fontSize: 8,
                                color: "var(--color-text-faint)", fontWeight: 600,
                                textTransform: "uppercase", letterSpacing: "0.08em",
                            }} />
                            {categories.map(cat => (
                                <th key={cat} style={{
                                    padding: "0 3px 8px", textAlign: "center",
                                    fontFamily: "var(--font-mono)", fontSize: 8,
                                    color: "var(--color-text-faint)", fontWeight: 600,
                                    textTransform: "uppercase", letterSpacing: "0.07em",
                                    whiteSpace: "nowrap",
                                }}>
                                    {cat.length > 7 ? cat.slice(0, 7) + "…" : cat}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sentiments.map(s => {
                            const sc = SENTIMENT[s] ?? SENTIMENT.Neutral;
                            return (
                                <tr key={s}>
                                    <td style={{
                                        padding: "4px 8px 4px 0",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: 9, fontWeight: 700,
                                        color: sc.color, whiteSpace: "nowrap",
                                    }}>
                                        {s}
                                    </td>
                                    {categories.map(cat => {
                                        const val = matrix[s]?.[cat] ?? 0;
                                        const alpha = maxVal > 0 ? val / maxVal : 0;
                                        return (
                                            <td key={cat} style={{
                                                padding: "5px 6px",
                                                textAlign: "center",
                                                fontFamily: "var(--font-mono)",
                                                fontSize: 11,
                                                fontWeight: val > 0 ? 700 : 400,
                                                color: val > 0 ? sc.color : "rgba(255,255,255,0.1)",
                                                background: val > 0
                                                    ? `rgba(${sc.rgb}, ${0.06 + alpha * 0.16})`
                                                    : "transparent",
                                                borderRadius: 7,
                                                border: val > 0
                                                    ? `1px solid rgba(${sc.rgb}, ${0.14 + alpha * 0.18})`
                                                    : "1px solid transparent",
                                                minWidth: 28,
                                            }}>
                                                {val > 0 ? val : "·"}
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </SectionCard>
    );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

export function BatchAnalysis({ results, hasCategory = false, open, onClose }: BatchAnalysisProps) {
    const stats = useMemo(() => {
        if (!results.length) return null;
        const elapsed = results.map(r => r.elapsed).filter(Boolean);
        const avg = elapsed.length ? elapsed.reduce((a, b) => a + b, 0) / elapsed.length : 0;
        const counts: Record<string, number> = {};
        for (const r of results) counts[r.predicted] = (counts[r.predicted] ?? 0) + 1;
        const dominant = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";
        return { avgMs: fmt(avg), dominant };
    }, [results]);

    if (!stats || !results.length) return null;

    const panel = (
        <AnimatePresence>
            {open && (
                <motion.div
                    drag dragMomentum={false} dragElastic={0}
                    initial={{ opacity: 0, scale: 0.93, y: 12 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.93, y: 10 }}
                    transition={{ duration: 0.26, ease: EASE }}
                    style={{
                        position: "fixed", top: 72, right: 20,
                        zIndex: 99999,
                        width: 480,
                        height: "min(84vh, 800px)",
                        overflow: "hidden",           // panel itself: NO scroll
                        display: "flex",
                        flexDirection: "column",
                        background: "var(--color-bg)",
                        border: "1px solid var(--color-border)",
                        borderRadius: 18,
                        boxShadow: "0 0 0 1px rgba(79,110,247,0.07), 0 40px 100px rgba(0,0,0,0.5), 0 8px 30px rgba(0,0,0,0.3)",
                        userSelect: "none",
                    }}
                >
                    <motion.div
                        animate={{ x: [0, -30, 0], y: [0, 100, 0] }}
                        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            position: "absolute", top: "-20%", left: "-10%",
                            width: 400, height: 400, borderRadius: "50%",
                            background: "radial-gradient(circle at 30% 30%, #4F6EF7 0%, transparent 70%)",
                            filter: "blur(80px)", opacity: 0.09,
                            pointerEvents: "none", zIndex: 0,
                        }}
                    />
                    <motion.div
                        animate={{ x: [0, 25, 0], y: [0, 0, 0] }}
                        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            position: "absolute", bottom: "-15%", right: "-10%",
                            width: 360, height: 360, borderRadius: "50%",
                            background: "radial-gradient(circle at 70% 70%, #10B981 0%, transparent 80%)",
                            filter: "blur(70px)", opacity: 0.08,
                            pointerEvents: "none", zIndex: 0,
                        }}
                    />

                    <div style={{
                        position: "relative", zIndex: 2, flexShrink: 0,
                        display: "flex", alignItems: "center", gap: 8,
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--color-border)",
                        background: "var(--color-surface)",
                        borderRadius: "18px 18px 0 0",
                        cursor: "grab",
                    }}>
                        <GripHorizontal size={12} color="var(--color-text-faint)" />
                        <span style={{
                            flex: 1, fontSize: 10, fontWeight: 800,
                            fontFamily: "var(--font-mono)",
                            letterSpacing: "0.1em", textTransform: "uppercase",
                            background: "linear-gradient(135deg, #4F6EF7, #7C3AED)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                        }}>
                            Batch Analysis
                        </span>
                        <span style={{
                            fontSize: 9, fontFamily: "var(--font-mono)",
                            color: "var(--color-text-faint)",
                            background: "var(--color-bg)",
                            border: "1px solid var(--color-border)",
                            padding: "2px 8px", borderRadius: 4, letterSpacing: "0.04em",
                        }}>
                            {results.length} results
                        </span>
                        <button
                            onClick={onClose}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                padding: 5, borderRadius: 7, display: "flex",
                                alignItems: "center", justifyContent: "center",
                                color: "var(--color-text-faint)", transition: "all 0.15s",
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.color = "var(--color-text)";
                                e.currentTarget.style.background = "var(--color-border)";
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.color = "var(--color-text-faint)";
                                e.currentTarget.style.background = "none";
                            }}
                        >
                            <X size={12} />
                        </button>
                    </div>

                    <div style={{
                        position: "relative", zIndex: 1,
                        flex: 1, minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        padding: "12px 14px 16px",
                        display: "flex", flexDirection: "column", gap: 10,
                        userSelect: "text",
                    }}>
                        <Stats
                            total={results.length}
                            avgMs={stats.avgMs}
                            dominant={stats.dominant}
                        />
                        <SentimentDonut results={results} />
                        {hasCategory && <CategoryBars results={results} />}
                        {hasCategory && <CrossHeatmap results={results} />}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return createPortal(panel, document.body);
}