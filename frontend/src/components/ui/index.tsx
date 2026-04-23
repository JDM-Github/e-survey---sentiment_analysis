import { type CSSProperties, type ReactNode, useRef, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { SENTIMENT_COLORS, type SentimentLabel } from "../../constants";

// ─── Motion presets ────────────────────────────────────────────────────────────
/** Snappy spring — buttons, badges: physical click feel */
const SPRING_SNAP = { type: "spring", stiffness: 600, damping: 38, mass: 0.5 } as const;
/** Settled spring — panels, cards: heavy landing softly */
const SPRING_SETTLE = { type: "spring", stiffness: 340, damping: 32, mass: 0.8 } as const;
/** Bouncy spring — counters, chips */
const SPRING_BOUNCE = { type: "spring", stiffness: 420, damping: 22, mass: 0.6 } as const;
/** Expo ease — page entrances, reveals */
const EXPO = [0.16, 1, 0.3, 1] as const;
/** Smooth ease — subtle transitions */
const SMOOTH = [0.4, 0, 0.2, 1] as const;

export const ANIM = {
    pageEnter: {
        initial: { opacity: 0, y: 14 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.48, ease: EXPO },
    },
    slideRight: {
        initial: { opacity: 0, x: 32 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: 20 },
        transition: { duration: 0.4, ease: EXPO },
    },
    listItem: (i: number) => ({
        initial: { opacity: 0, x: 16, filter: "blur(4px)" },
        animate: { opacity: 1, x: 0, filter: "blur(0px)" },
        transition: { delay: i * 0.06, duration: 0.3, ease: EXPO },
    }),
    pop: {
        initial: { opacity: 0, scale: 0.72 },
        animate: { opacity: 1, scale: 1 },
        exit: { opacity: 0, scale: 0.68 },
        transition: SPRING_BOUNCE,
    },
    fade: {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
        transition: { duration: 0.18, ease: SMOOTH },
    },
    pulseDot: {
        animate: { opacity: [0.3, 1, 0.3], scale: [0.8, 1.15, 0.8] },
        transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" },
    },
};


const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 768px)").matches);
    useState(() => {
        const mq = window.matchMedia("(max-width: 768px)");
        const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
        mq.addEventListener("change", handler);
        return () => mq.removeEventListener("change", handler);
    });
    return isMobile;
};

export function TwoPanelLayout({
    input,
    results,
    hasResults = false,
}: {
    input: ReactNode;
    results: ReactNode;
    hasResults?: boolean;
}) {
    const isMobile = useIsMobile();

    return (
        <div style={{
            display: "flex",
            // Stack vertically on mobile, side-by-side on desktop
            flexDirection: isMobile ? "column" : "row",
            height: "100%",
            // Mobile needs to scroll the whole page; desktop clips to panel
            overflowY: isMobile ? "auto" : "hidden",
            overflowX: "hidden",
            background: "var(--color-bg)",
            fontFamily: "var(--font-sans)",
            position: "relative",
        }}>
            {/* Dot-matrix grid */}
            <div style={{
                position: "absolute", inset: 0, zIndex: 0, pointerEvents: "none",
                backgroundImage: `radial-gradient(circle, var(--color-grid-line) 1px, transparent 1px)`,
                backgroundSize: "22px 22px",
                opacity: 0.5,
            }} />

            {/* ── Input panel ── */}
            <motion.div
                layout
                transition={{ ...SPRING_SETTLE }}
                style={{
                    position: "relative", zIndex: 1,
                    // Desktop: fixed 44% width with centering when no results
                    // Mobile: full width, natural height
                    ...(isMobile ? {
                        width: "100%",
                        flexShrink: 0,
                        padding: "24px 20px 32px",
                        borderBottom: hasResults ? "1px solid var(--color-border)" : "none",
                    } : {
                        width: hasResults ? "44%" : "600px",
                        maxWidth: hasResults ? "44%" : "100%",
                        margin: hasResults ? "0" : "0 auto",
                        flexShrink: 0,
                        height: "100%",
                        overflowY: "auto",
                        padding: "32px 30px 56px",
                        borderRight: hasResults ? "1px solid var(--color-border)" : "none",
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--scrollbar-thumb) transparent",
                    }),
                }}
            >
                {input}
            </motion.div>

            {/* ── Results panel ── */}
            <AnimatePresence>
                {hasResults && (
                    <motion.div
                        key="results-panel"
                        initial={isMobile
                            ? { opacity: 0, y: 24 }
                            : { opacity: 0, x: 48 }
                        }
                        animate={isMobile
                            ? { opacity: 1, y: 0 }
                            : { opacity: 1, x: 0 }
                        }
                        exit={isMobile
                            ? { opacity: 0, y: 16 }
                            : { opacity: 0, x: 32 }
                        }
                        transition={{ duration: 0.42, ease: EXPO }}
                        style={{
                            position: "relative", zIndex: 1,
                            background: "var(--color-surface)",
                            ...(isMobile ? {
                                width: "100%",
                                flexShrink: 0,
                                padding: "24px 20px 48px",
                            } : {
                                flex: 1,
                                height: "100%",
                                overflowY: "auto",
                                padding: "32px 30px 56px",
                                scrollbarWidth: "thin",
                                scrollbarColor: "var(--scrollbar-thumb) transparent",
                            }),
                        }}
                    >
                        {/* Faint gradient rule — top edge on mobile, left edge on desktop */}
                        <div style={isMobile ? {
                            position: "absolute", top: 0, left: "8%", right: "8%", height: 1,
                            background: "linear-gradient(to right, transparent, var(--color-border) 30%, var(--color-border) 70%, transparent)",
                            pointerEvents: "none",
                        } : {
                            position: "absolute", left: 0, top: "8%", bottom: "8%", width: 1,
                            background: "linear-gradient(to bottom, transparent, var(--color-border) 30%, var(--color-border) 70%, transparent)",
                            pointerEvents: "none",
                        }} />

                        {results}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


// ─── PageShell ─────────────────────────────────────────────────────────────────
export function PageShell({ children }: { children: ReactNode }) {
    return (
        <div style={{
            height: "100%",
            overflowY: "auto",
            padding: "32px 30px 56px",
            background: "var(--color-bg)",
            fontFamily: "var(--font-sans)",
            scrollbarWidth: "thin",
            scrollbarColor: "var(--scrollbar-thumb) transparent",
        }}>
            {children}
        </div>
    );
}


// ─── Card ──────────────────────────────────────────────────────────────────────
// Layered border system: outer border + inset inner highlight = tangible depth
export function Card({
    children,
    style,
    glow,
}: {
    children: ReactNode;
    style?: CSSProperties;
    glow?: boolean;
}) {
    return (
        <motion.div
            layout
            style={{
                background: "var(--color-surface)",
                border: `1px solid ${glow
                    ? "color-mix(in srgb, var(--color-accent) 38%, var(--color-border))"
                    : "var(--color-border)"}`,
                borderRadius: 16,
                padding: "22px 20px",
                position: "relative",
                overflow: "hidden",
                boxShadow: glow
                    ? `inset 0 1px 0 color-mix(in srgb, var(--color-accent) 20%, transparent),
                       0 4px 24px color-mix(in srgb, var(--color-accent) 8%, transparent)`
                    : `inset 0 1px 0 color-mix(in srgb, #fff 4%, transparent)`,
                transition: "border-color 0.3s, box-shadow 0.3s",
                ...style,
            }}
        >
            {/* Top shimmer edge */}
            <div style={{
                position: "absolute", top: 0, left: "10%", right: "10%", height: 1,
                background: glow
                    ? "linear-gradient(90deg, transparent, color-mix(in srgb, var(--color-accent) 60%, transparent) 50%, transparent)"
                    : "linear-gradient(90deg, transparent, color-mix(in srgb, #fff 8%, transparent) 50%, transparent)",
                transition: "background 0.4s",
                pointerEvents: "none",
            }} />

            {/* Active corner indicator */}
            <AnimatePresence>
                {glow && (
                    <motion.div
                        key="corner-dot"
                        initial={{ opacity: 0, scale: 0, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0, rotate: 45 }}
                        transition={SPRING_SNAP}
                        style={{
                            position: "absolute", top: 14, right: 14,
                            width: 6, height: 6, borderRadius: "50%",
                            background: "var(--color-accent)",
                            boxShadow: "0 0 10px 2px color-mix(in srgb, var(--color-accent) 50%, transparent)",
                        }}
                    />
                )}
            </AnimatePresence>

            {children}
        </motion.div>
    );
}


// ─── SectionTitle ──────────────────────────────────────────────────────────────
export function SectionTitle({ children, count }: { children: ReactNode; count?: number }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            {/* Accent tick */}
            <div style={{
                width: 3, height: 12, borderRadius: 2,
                background: "var(--color-accent)",
                opacity: 0.55, flexShrink: 0,
            }} />
            <span style={{
                fontSize: 9, fontWeight: 700,
                color: "var(--color-text-faint)",
                letterSpacing: "0.2em", textTransform: "uppercase",
                fontFamily: "var(--font-mono)", whiteSpace: "nowrap",
            }}>
                {children}
            </span>
            <AnimatePresence mode="wait">
                {count !== undefined && (
                    <motion.span
                        key={count}
                        initial={{ opacity: 0, scale: 0.7, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.7, y: 4 }}
                        transition={SPRING_BOUNCE}
                        style={{
                            fontSize: 9, fontFamily: "var(--font-mono)",
                            background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
                            border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
                            color: "var(--color-accent)",
                            padding: "1px 7px", borderRadius: 4,
                        }}
                    >
                        {count}
                    </motion.span>
                )}
            </AnimatePresence>
            {/* Fading rule */}
            <div style={{ flex: 1, height: 1, background: "linear-gradient(to right, var(--color-border), transparent)" }} />
        </div>
    );
}


// ─── StyledTextarea ────────────────────────────────────────────────────────────
export function StyledTextarea({
    value,
    onChange,
    placeholder,
    rows = 5,
    monospace = false,
    onKeyDown,
    hint,
    stat,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    rows?: number;
    monospace?: boolean;
    onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
    hint?: string;
    stat?: string;
}) {
    const [focused, setFocused] = useState(false);

    return (
        <div style={{ position: "relative" }}>
            <motion.div
                transition={{ duration: 0.22, ease: SMOOTH }}
                style={{ borderRadius: 12, position: "relative" }}
            >
                <textarea
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    onKeyDown={onKeyDown}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    style={{
                        width: "100%",
                        background: focused
                            ? "color-mix(in srgb, var(--color-accent) 3%, var(--color-surface))"
                            : "var(--color-surface)",
                        border: `1px solid ${focused
                            ? "color-mix(in srgb, var(--color-accent) 55%, var(--color-border))"
                            : "var(--color-border)"}`,
                        boxShadow: "inset 0 1px 0 color-mix(in srgb, #fff 4%, transparent), inset 0 -1px 0 rgba(0,0,0,0.08)",
                        borderRadius: 12,
                        color: "var(--color-text)",
                        fontFamily: monospace ? "var(--font-mono)" : "var(--font-sans)",
                        fontSize: monospace ? 12 : 13,
                        padding: "13px 15px",
                        resize: "vertical",
                        outline: "none",
                        lineHeight: 1.7,
                        minHeight: rows * 26,
                        transition: "border-color 0.2s, background 0.22s",
                        boxSizing: "border-box",
                        scrollbarWidth: "thin",
                        scrollbarColor: "var(--scrollbar-thumb) transparent",
                    }}
                />
                {/* Character fill bar */}
                {focused && value.length > 0 && (
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: Math.min(value.length / 500, 1) }}
                        transition={{ duration: 0.1 }}
                        style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            height: 2, borderRadius: "0 0 12px 12px",
                            background: "linear-gradient(90deg, var(--color-accent), color-mix(in srgb, var(--color-accent) 55%, #7C3AED))",
                            transformOrigin: "left",
                            pointerEvents: "none",
                        }}
                    />
                )}
            </motion.div>

            <AnimatePresence>
                {(hint || stat) && (
                    <motion.div
                        key="meta"
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.18, ease: SMOOTH }}
                        style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            marginTop: 8, fontSize: 10,
                            color: "var(--color-text-faint)", fontFamily: "var(--font-mono)",
                        }}
                    >
                        <motion.span
                            animate={{ color: value ? "var(--color-accent)" : "var(--color-text-faint)" }}
                            transition={{ duration: 0.25 }}
                        >
                            {stat}
                        </motion.span>
                        <span style={{ opacity: 0.55, display: "flex", alignItems: "center", gap: 5 }}>
                            <kbd style={{
                                padding: "1px 6px", borderRadius: 4,
                                border: "1px solid var(--color-border)",
                                background: "var(--color-bg)",
                                fontSize: 9, fontFamily: "var(--font-mono)",
                                color: "var(--color-text-faint)",
                            }}>
                                ⌃↵
                            </kbd>
                            <span style={{ fontSize: 9 }}>to run</span>
                        </span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}


// ─── StyledInput ───────────────────────────────────────────────────────────────
export function StyledInput({
    value,
    onChange,
    placeholder,
    onKeyDown,
    inputRef,
    style,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
    inputRef?: React.RefObject<HTMLInputElement | null>;
    style?: CSSProperties;
}) {
    const [focused, setFocused] = useState(false);
    return (
        <motion.div
            animate={{
                boxShadow: focused
                    ? "0 0 0 3px color-mix(in srgb, var(--color-accent) 18%, transparent)"
                    : "0 0 0 0px transparent",
            }}
            transition={{ duration: 0.2, ease: SMOOTH }}
            style={{ borderRadius: 10, display: "inline-block", ...style }}
        >
            <input
                ref={inputRef}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                onKeyDown={onKeyDown}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    background: "var(--color-surface)",
                    border: `1px solid ${focused
                        ? "color-mix(in srgb, var(--color-accent) 55%, var(--color-border))"
                        : "var(--color-border)"}`,
                    boxShadow: "inset 0 1px 0 color-mix(in srgb, #fff 4%, transparent)",
                    borderRadius: 10,
                    color: "var(--color-text)",
                    fontFamily: "var(--font-sans)",
                    fontSize: 13,
                    padding: "9px 13px",
                    outline: "none",
                    transition: "border-color 0.2s",
                    width: "100%",
                    boxSizing: "border-box",
                }}
            />
        </motion.div>
    );
}


// ─── Btn ───────────────────────────────────────────────────────────────────────
type BtnVariant = "primary" | "ghost" | "danger" | "outline";

export function Btn({
    children,
    onClick,
    disabled,
    variant = "ghost",
    style,
}: {
    children: ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    variant?: BtnVariant;
    style?: CSSProperties;
}) {
    const base: CSSProperties = {
        display: "inline-flex", alignItems: "center", gap: 7,
        padding: "8px 17px", borderRadius: 10,
        fontSize: 12, fontWeight: 600,
        cursor: disabled ? "not-allowed" : "pointer",
        fontFamily: "var(--font-sans)",
        whiteSpace: "nowrap",
        opacity: disabled ? 0.32 : 1,
        transition: "box-shadow 0.18s, background 0.15s",
    };

    const variants: Record<BtnVariant, CSSProperties> = {
        primary: {
            background: "var(--color-accent)",
            color: "var(--color-bg)",
            border: "none",
            boxShadow: `0 1px 0 color-mix(in srgb, #fff 20%, transparent) inset,
                        0 4px 14px color-mix(in srgb, var(--color-accent) 32%, transparent),
                        0 1px 3px rgba(0,0,0,0.25)`,
        },
        ghost: {
            background: "var(--color-surface)",
            color: "var(--color-text-muted)",
            border: "1px solid var(--color-border)",
            boxShadow: "inset 0 1px 0 color-mix(in srgb, #fff 5%, transparent), 0 1px 3px rgba(0,0,0,0.12)",
        },
        danger: {
            background: "color-mix(in srgb, #ff4d6d 10%, var(--color-surface))",
            color: "#ff4d6d",
            border: "1px solid color-mix(in srgb, #ff4d6d 25%, transparent)",
            boxShadow: "inset 0 1px 0 color-mix(in srgb, #ff4d6d 12%, transparent)",
        },
        outline: {
            background: "transparent",
            color: "var(--color-accent)",
            border: "1px solid color-mix(in srgb, var(--color-accent) 30%, transparent)",
        },
    };

    return (
        <motion.button
            whileHover={disabled ? {} : {
                scale: 1.04, y: -1.5,
                ...(variant === "primary" && {
                    boxShadow: `0 1px 0 color-mix(in srgb, #fff 20%, transparent) inset,
                                0 8px 22px color-mix(in srgb, var(--color-accent) 42%, transparent),
                                0 2px 6px rgba(0,0,0,0.3)`,
                }),
            }}
            whileTap={disabled ? {} : { scale: 0.96, y: 0 }}
            transition={SPRING_SNAP}
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{ ...base, ...variants[variant], ...style }}
        >
            {children}
        </motion.button>
    );
}


// ─── SentimentBadge ────────────────────────────────────────────────────────────
export function SentimentBadge({ label }: { label: string }) {
    const colors = SENTIMENT_COLORS[label as SentimentLabel] ?? SENTIMENT_COLORS.Error;

    return (
        <motion.span
            key={label}
            initial={{ opacity: 0, scale: 0.65, filter: "blur(6px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={SPRING_BOUNCE}
            style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "5px 11px", borderRadius: 7,
                fontSize: 9, fontFamily: "var(--font-mono)",
                fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                color: colors.text,
                minWidth: 88, justifyContent: "center", flexShrink: 0,
                boxShadow: `0 0 12px color-mix(in srgb, ${colors.text} 16%, transparent),
                            inset 0 1px 0 color-mix(in srgb, ${colors.text} 14%, transparent)`,
            }}
        >
            <motion.span
                animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.15, 0.9] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    width: 5, height: 5, borderRadius: "50%",
                    background: colors.text,
                    boxShadow: `0 0 6px ${colors.text}`,
                    flexShrink: 0, display: "inline-block",
                }}
            />
            {label}
        </motion.span>
    );
}


// ─── ResultCard ────────────────────────────────────────────────────────────────
export function ResultCard({
    text,
    predicted,
    elapsed,
    timestamp,
    category,
    index = 0,
    extra,
}: {
    text: string;
    predicted: string;
    elapsed?: number;
    timestamp?: string;
    category?: string;
    index?: number;
    extra?: ReactNode;
}) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "0px 0px -24px 0px" });
    const colors = SENTIMENT_COLORS[predicted as SentimentLabel] ?? SENTIMENT_COLORS.Error;

    return (
        <motion.div
            ref={ref}
            initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
            transition={{ delay: index * 0.055, duration: 0.32, ease: EXPO }}
            whileHover={{ y: -2 }}
            style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px 12px 16px",
                borderRadius: 12,
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                // Tinted left inset shadow — sentiment color identity without overwhelming
                boxShadow: `inset 3px 0 0 color-mix(in srgb, ${colors.text} 40%, transparent),
                            inset 0 1px 0 color-mix(in srgb, #fff 4%, transparent),
                            0 1px 4px rgba(0,0,0,0.1)`,
                cursor: "default",
                transition: "border-color 0.15s",
                position: "relative", overflow: "hidden",
            }}
        >
            <SentimentBadge label={predicted} />

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                    fontSize: 13, fontWeight: 500, color: "var(--color-text)",
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    lineHeight: 1.5,
                }}>
                    {text}
                </div>
                <div style={{
                    fontSize: 10, color: "var(--color-text-faint)",
                    fontFamily: "var(--font-mono)", marginTop: 3,
                    display: "flex", alignItems: "center", gap: 7,
                }}>
                    {timestamp && <span>{timestamp}</span>}
                    {elapsed !== undefined && (
                        <>
                            {timestamp && <span style={{ opacity: 0.25, fontSize: 8 }}>◆</span>}
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.85 }}
                                transition={{ delay: index * 0.055 + 0.2 }}
                                style={{ color: "var(--color-accent)", fontVariantNumeric: "tabular-nums" }}
                            >
                                {(elapsed * 1000).toFixed(0)}ms
                            </motion.span>
                        </>
                    )}
                </div>
            </div>

            {category && (
                <motion.span
                    {...ANIM.pop}
                    style={{
                        fontSize: 9, fontFamily: "var(--font-mono)",
                        color: "var(--color-accent)",
                        background: "color-mix(in srgb, var(--color-accent) 9%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
                        padding: "3px 10px", borderRadius: 5,
                        flexShrink: 0, letterSpacing: "0.08em", textTransform: "uppercase",
                    }}
                >
                    {category}
                </motion.span>
            )}
            {extra}
        </motion.div>
    );
}


// ─── ResultsHeader ─────────────────────────────────────────────────────────────
export function ResultsHeader({ count, label = "Results" }: { count: number; label?: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <motion.div
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                transition={{ duration: 0.3, ease: EXPO }}
                style={{
                    height: 20, width: 3, borderRadius: 2,
                    background: "linear-gradient(to bottom, var(--color-accent), color-mix(in srgb, var(--color-accent) 40%, transparent))",
                    flexShrink: 0, transformOrigin: "center",
                    boxShadow: "0 0 10px 1px color-mix(in srgb, var(--color-accent) 40%, transparent)",
                }}
            />
            <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08, duration: 0.28, ease: EXPO }}
                style={{
                    fontSize: 9, fontWeight: 700,
                    color: "var(--color-text-faint)",
                    letterSpacing: "0.2em", textTransform: "uppercase",
                    fontFamily: "var(--font-mono)",
                }}
            >
                {label}
            </motion.span>
            <AnimatePresence mode="wait">
                <motion.span
                    key={count}
                    initial={{ opacity: 0, scale: 0.55, y: -6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.55, y: 6 }}
                    transition={{ delay: 0.14, ...SPRING_BOUNCE }}
                    style={{
                        fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700,
                        background: "color-mix(in srgb, var(--color-accent) 10%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--color-accent) 25%, transparent)",
                        color: "var(--color-accent)",
                        padding: "2px 9px", borderRadius: 5,
                    }}
                >
                    {count}
                </motion.span>
            </AnimatePresence>
            <div style={{
                flex: 1, height: 1,
                background: "linear-gradient(to right, var(--color-border), transparent)",
            }} />
        </div>
    );
}


// ─── ResultList ────────────────────────────────────────────────────────────────
export function ResultList({ children }: { children: ReactNode }) {
    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {children}
        </div>
    );
}


// ─── Spinner ───────────────────────────────────────────────────────────────────
// Two-tone arc — outer track + spinning gradient arc
export function Spinner({ size = 14 }: { size?: number }) {
    return (
        <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
            <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                border: "1.5px solid var(--color-border)",
            }} />
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 0.75, repeat: Infinity, ease: "linear" }}
                style={{
                    position: "absolute", inset: 0, borderRadius: "50%",
                    border: "1.5px solid transparent",
                    borderTopColor: "var(--color-accent)",
                    borderRightColor: "color-mix(in srgb, var(--color-accent) 40%, transparent)",
                }}
            />
        </div>
    );
}


// ─── LoadingRow ────────────────────────────────────────────────────────────────
export function LoadingRow({ message = "Processing…" }: { message?: string }) {
    return (
        <motion.div
            {...ANIM.pageEnter}
            style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "24px 0", fontSize: 12,
                color: "var(--color-text-muted)", fontFamily: "var(--font-mono)",
            }}
        >
            <Spinner size={16} />
            <span>{message}</span>
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                    <motion.div
                        key={i}
                        animate={{ y: [0, -4, 0], opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }}
                        style={{
                            width: 3, height: 3, borderRadius: "50%",
                            background: "var(--color-accent)",
                        }}
                    />
                ))}
            </div>
        </motion.div>
    );
}


// ─── ErrorMsg ─────────────────────────────────────────────────────────────────
export function ErrorMsg({ message }: { message: string }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.24, ease: EXPO }}
            style={{
                marginTop: 10, padding: "11px 14px", borderRadius: 10,
                background: "color-mix(in srgb, #ff4d6d 8%, var(--color-surface))",
                border: "1px solid color-mix(in srgb, #ff4d6d 25%, transparent)",
                // Inset left bar — matches ResultCard pattern
                boxShadow: "inset 3px 0 0 #ff4d6d, inset 0 1px 0 color-mix(in srgb, #ff4d6d 12%, transparent)",
                color: "#ff4d6d", fontSize: 12, fontFamily: "var(--font-mono)",
                display: "flex", alignItems: "flex-start", gap: 10,
            }}
        >
            <motion.span
                animate={{ x: [0, -3, 3, -2, 2, 0] }}
                transition={{ duration: 0.35, delay: 0.1 }}
                style={{ fontSize: 13, lineHeight: 1, flexShrink: 0, marginTop: 1 }}
            >
                ⚠
            </motion.span>
            <span style={{ lineHeight: 1.5 }}>{message}</span>
        </motion.div>
    );
}


// ─── EmptyState ────────────────────────────────────────────────────────────────
// Radar scope — thematic to a classifier, memorable
export function EmptyState({ message }: { message: string }) {
    return (
        <motion.div
            {...ANIM.pageEnter}
            style={{
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                padding: "68px 24px", gap: 20,
                color: "var(--color-text-faint)", textAlign: "center",
            }}
        >
            <div style={{ position: "relative", width: 56, height: 56 }}>
                {/* Outer dashed orbit */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: "absolute", inset: 0, borderRadius: "50%",
                        border: "1px dashed var(--color-border)",
                    }}
                />
                {/* Mid orbit — counter */}
                <motion.div
                    animate={{ rotate: -360 }}
                    transition={{ duration: 7, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: "absolute", inset: 10, borderRadius: "50%",
                        border: "1px solid var(--color-border)",
                    }}
                />
                {/* Inner ring */}
                <div style={{
                    position: "absolute", inset: 20, borderRadius: "50%",
                    border: "1px solid var(--color-border)",
                }} />
                {/* Sweep arm */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", inset: 0, transformOrigin: "center" }}
                >
                    <div style={{
                        position: "absolute", top: "50%", left: "50%",
                        width: "50%", height: 1, transformOrigin: "left center",
                        background: "linear-gradient(to right, var(--color-accent), transparent)",
                        opacity: 0.6,
                    }} />
                </motion.div>
                {/* Center pulse */}
                <motion.div
                    animate={ANIM.pulseDot.animate}
                    transition={ANIM.pulseDot.transition}
                    style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: "translate(-50%, -50%)",
                        width: 5, height: 5, borderRadius: "50%",
                        background: "var(--color-accent)",
                        boxShadow: "0 0 10px 2px color-mix(in srgb, var(--color-accent) 50%, transparent)",
                    }}
                />
            </div>

            <span style={{
                fontSize: 11, maxWidth: 240, lineHeight: 1.7,
                fontFamily: "var(--font-mono)", color: "var(--color-text-faint)",
            }}>
                {message}
            </span>
        </motion.div>
    );
}


// ─── BtnDivider ────────────────────────────────────────────────────────────────
export function BtnDivider() {
    return (
        <div style={{
            width: 1, height: 20,
            background: "linear-gradient(to bottom, transparent, var(--color-border), transparent)",
            margin: "0 4px", flexShrink: 0,
        }} />
    );
}


// ─── Chip ──────────────────────────────────────────────────────────────────────
export function Chip({ label, onRemove }: { label: string; onRemove?: () => void }) {
    return (
        <motion.span
            layout
            initial={{ opacity: 0, scale: 0.72, filter: "blur(3px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.68, filter: "blur(3px)" }}
            transition={SPRING_BOUNCE}
            style={{
                display: "inline-flex", alignItems: "center", gap: 7,
                padding: "4px 10px", borderRadius: 7,
                fontSize: 11, fontFamily: "var(--font-mono)",
                background: "color-mix(in srgb, var(--color-accent) 9%, transparent)",
                border: "1px solid color-mix(in srgb, var(--color-accent) 22%, transparent)",
                boxShadow: "inset 0 1px 0 color-mix(in srgb, var(--color-accent) 12%, transparent)",
                color: "var(--color-accent)",
            }}
        >
            {label}
            {onRemove && (
                <motion.button
                    whileHover={{ opacity: 1, scale: 1.25, rotate: 90 }}
                    whileTap={{ scale: 0.85 }}
                    transition={{ duration: 0.14, ease: SMOOTH }}
                    onClick={onRemove}
                    style={{
                        background: "none", border: "none",
                        color: "inherit", cursor: "pointer",
                        padding: 0, display: "flex", alignItems: "center",
                        opacity: 0.4, fontSize: 10, lineHeight: 1,
                    }}
                >
                    ✕
                </motion.button>
            )}
        </motion.span>
    );
}