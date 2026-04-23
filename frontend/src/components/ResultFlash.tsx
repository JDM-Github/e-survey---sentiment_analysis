import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SENTIMENT_COLORS, type SentimentLabel } from "../constants";

// ─── ResultFlash ──────────────────────────────────────────────────────────────
// Terminal HUD scan box: slides up, flickers, then dissolves line by line upward
export function ResultFlash({ result }: { result: { predicted: string; elapsed: number; text: string } | null }) {
    const [visible, setVisible] = useState(false);
    const [phase, setPhase] = useState<"enter" | "hold" | "exit">("enter");
    const [scanLine, setScanLine] = useState(0);
    const [glitch, setGlitch] = useState(false);

    const colors = SENTIMENT_COLORS[(result?.predicted ?? "") as SentimentLabel] ?? SENTIMENT_COLORS.Error;

    useEffect(() => {
        if (!result) return;

        setVisible(true);
        setPhase("enter");
        setScanLine(0);
        setGlitch(false);

        // Glitch flicker shortly after appearing
        const glitchTimer = setTimeout(() => {
            setGlitch(true);
            setTimeout(() => setGlitch(false), 120);
        }, 400);

        // Hold phase
        const holdTimer = setTimeout(() => setPhase("hold"), 600);

        // Start exit — scan line sweeps upward erasing rows
        const exitTimer = setTimeout(() => setPhase("exit"), 2600);

        // Fully unmount
        const doneTimer = setTimeout(() => {
            setVisible(false);
            setPhase("enter");
        }, 3400);

        return () => {
            clearTimeout(glitchTimer);
            clearTimeout(holdTimer);
            clearTimeout(exitTimer);
            clearTimeout(doneTimer);
        };
    }, [result]);

    // Animate scanLine index during exit
    useEffect(() => {
        if (phase !== "exit") return;
        let i = 0;
        const iv = setInterval(() => {
            i++;
            setScanLine(i);
            if (i >= 6) clearInterval(iv);
        }, 110);
        return () => clearInterval(iv);
    }, [phase]);

    const rows = [
        { label: "STATUS", value: "CLASSIFIED" },
        { label: "RESULT", value: result?.predicted?.toUpperCase() ?? "—" },
        { label: "LATENCY", value: result ? `${(result.elapsed * 1000).toFixed(0)} MS` : "—" },
        { label: "INPUT", value: result ? result.text.slice(0, 28) + (result.text.length > 28 ? "…" : "") : "—" },
        { label: "MODEL", value: "FILIPINO/TAGLISH LLM" },
        { label: "CONF", value: "HIGH" },
    ];

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: 40, scaleY: 0.6 }}
                    animate={{ opacity: 1, y: 0, scaleY: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ type: "spring", stiffness: 460, damping: 34, mass: 0.6 }}
                    style={{
                        position: "fixed",
                        bottom: 32,
                        right: 32,
                        zIndex: 999,
                        width: 260,
                        fontFamily: "var(--font-mono)",
                        pointerEvents: "none",
                        transformOrigin: "bottom center",
                    }}
                >
                    {/* Corner brackets */}
                    {[
                        { top: -1, left: -1, borderTop: "1px solid", borderLeft: "1px solid" },
                        { top: -1, right: -1, borderTop: "1px solid", borderRight: "1px solid" },
                        { bottom: -1, left: -1, borderBottom: "1px solid", borderLeft: "1px solid" },
                        { bottom: -1, right: -1, borderBottom: "1px solid", borderRight: "1px solid" },
                    ].map((s, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, scale: 1.4 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04, duration: 0.2 }}
                            style={{
                                position: "absolute",
                                width: 10, height: 10,
                                borderColor: colors.text,
                                opacity: 0.7,
                                ...s,
                            }}
                        />
                    ))}

                    {/* Main box */}
                    <div style={{
                        background: "rgba(10, 11, 16, 0.92)",
                        backdropFilter: "blur(12px)",
                        border: `1px solid color-mix(in srgb, ${colors.text} 22%, transparent)`,
                        padding: "14px 16px",
                        position: "relative",
                        overflow: "hidden",
                        filter: glitch ? "brightness(1.6) saturate(1.4)" : "none",
                        transition: "filter 0.05s",
                    }}>
                        {/* Scan-line sweep overlay */}
                        {phase === "enter" && (
                            <motion.div
                                initial={{ top: "100%" }}
                                animate={{ top: "-10%" }}
                                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                                style={{
                                    position: "absolute",
                                    left: 0, right: 0, height: "30%",
                                    background: `linear-gradient(to bottom, transparent, color-mix(in srgb, ${colors.text} 14%, transparent), transparent)`,
                                    pointerEvents: "none",
                                    zIndex: 10,
                                }}
                            />
                        )}

                        {/* Header */}
                        <div style={{
                            display: "flex", alignItems: "center", gap: 8,
                            marginBottom: 10,
                            paddingBottom: 8,
                            borderBottom: `1px solid color-mix(in srgb, ${colors.text} 15%, transparent)`,
                        }}>
                            <motion.div
                                animate={{ opacity: [0.4, 1, 0.4] }}
                                transition={{ duration: 1.2, repeat: Infinity }}
                                style={{
                                    width: 6, height: 6, borderRadius: "50%",
                                    background: colors.text,
                                    boxShadow: `0 0 8px 2px ${colors.text}`,
                                }}
                            />
                            <span style={{
                                fontSize: 9, letterSpacing: "0.22em",
                                color: colors.text, fontWeight: 700,
                                textTransform: "uppercase",
                            }}>
                                ANALYSIS OUTPUT
                            </span>
                            <span style={{
                                marginLeft: "auto", fontSize: 8,
                                color: "var(--color-text-faint)",
                                letterSpacing: "0.1em",
                            }}>
                                {new Date().toLocaleTimeString("en-US", { hour12: false })}
                            </span>
                        </div>

                        {/* Data rows — dissolve upward one by one on exit */}
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {rows.map((row, i) => {
                                const dissolved = phase === "exit" && i < scanLine;
                                const isResult = row.label === "RESULT";
                                return (
                                    <motion.div
                                        key={row.label}
                                        animate={dissolved
                                            ? { opacity: 0, y: -10, filter: "blur(4px)" }
                                            : { opacity: 1, y: 0, filter: "blur(0px)" }
                                        }
                                        transition={{ duration: 0.18, ease: "easeIn" }}
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            gap: 8,
                                        }}
                                    >
                                        <span style={{
                                            fontSize: 8, letterSpacing: "0.14em",
                                            color: "var(--color-text-faint)",
                                            textTransform: "uppercase", flexShrink: 0,
                                        }}>
                                            {row.label}
                                        </span>
                                        <div style={{
                                            flex: 1, height: 1,
                                            background: `color-mix(in srgb, ${colors.text} 8%, transparent)`,
                                        }} />
                                        <span style={{
                                            fontSize: isResult ? 10 : 9,
                                            fontWeight: isResult ? 700 : 400,
                                            letterSpacing: "0.08em",
                                            color: isResult ? colors.text : "var(--color-text-muted)",
                                            textTransform: "uppercase",
                                            textShadow: isResult ? `0 0 12px ${colors.text}` : "none",
                                        }}>
                                            {row.value}
                                        </span>
                                    </motion.div>
                                );
                            })}
                        </div>

                        {/* Bottom progress drain */}
                        <motion.div
                            initial={{ scaleX: 1 }}
                            animate={{ scaleX: 0 }}
                            transition={{ duration: 2.6, ease: "linear", delay: 0.5 }}
                            style={{
                                position: "absolute",
                                bottom: 0, left: 0, right: 0,
                                height: 1,
                                background: `linear-gradient(90deg, ${colors.text}, transparent)`,
                                transformOrigin: "left",
                                opacity: 0.6,
                            }}
                        />

                        {/* Glitch horizontal slice */}
                        {glitch && (
                            <div style={{
                                position: "absolute",
                                top: "35%", left: 0, right: 0,
                                height: 3,
                                background: colors.text,
                                opacity: 0.15,
                                mixBlendMode: "screen",
                            }} />
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}