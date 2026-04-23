import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import RequestHandler from "../lib/utilities/RequestHandler";

const ROUTE_META: Record<string, { title: string }> = {
    "/": { title: "Dashboard" },
    "/single": { title: "Single Classification" },
    "/batch": { title: "Batch Classification" },
    "/category": { title: "Category + Sentiment" },
    "/accuracy": { title: "Accuracy Evaluation" },
};

type HealthStatus = "checking" | "online" | "offline";

const STATUS_CFG: Record<HealthStatus, { label: string; color: string; ping: boolean }> = {
    checking: { label: "CHECKING", color: "var(--color-neu)", ping: true },
    online: { label: "API ONLINE", color: "var(--color-pos)", ping: true },
    offline: { label: "API OFFLINE", color: "var(--color-neg)", ping: false },
};

const POLL_MS = 20_000;

function useHealthCheck() {
    const [status, setStatus] = useState<HealthStatus>("checking");
    const timer = useRef<ReturnType<typeof setInterval> | null>(null);

    const check = async () => {
        try {
            const data = await RequestHandler.fetchData("GET", "health");
            setStatus(data?.success === false ? "offline" : "online");
        } catch {
            setStatus("offline");
        }
    };

    useEffect(() => {
        check();
        timer.current = setInterval(check, POLL_MS);
        return () => { if (timer.current) clearInterval(timer.current); };
    }, []);

    return status;
}

function StatusDot({ color, ping }: { color: string; ping: boolean }) {
    return (
        <span style={{ position: "relative", display: "inline-flex", width: 6, height: 6 }}>
            {ping && (
                <span style={{
                    position: "absolute", inset: 0,
                    borderRadius: "50%",
                    background: color,
                    opacity: 0.45,
                    animation: "healthPing 1.4s ease-out infinite",
                }} />
            )}
            <span style={{
                position: "relative", display: "inline-block",
                width: 6, height: 6, borderRadius: "50%",
                background: color,
            }} />
        </span>
    );
}

export default function Header() {
    const { pathname } = useLocation();
    const meta = ROUTE_META[pathname] ?? { title: "SentiLens" };
    const status = useHealthCheck();
    const cfg = STATUS_CFG[status];

    return (
        <motion.header
            initial={{ y: -12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.25, delay: 0.05 }}
            className="flex items-center justify-between px-6 flex-shrink-0 z-100"
            style={{
                height: 50,
                background: "var(--color-surface)",
                borderBottom: "1px solid var(--color-border)",
            }}
        >
            {/* Left — route label */}
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--color-text-muted)", lineHeight: 1 }}>
                SENTIMENT ANALYSIS |{" "}
                <span style={{ color: "var(--color-text)" }}>{meta.title.toUpperCase()}</span>
            </div>

            {/* Right — health pill + version */}
            <div className="flex items-center gap-2">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={status}
                        initial={{ opacity: 0, scale: 0.88 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.88 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-1.5 px-2 py-0.5 rounded"
                        style={{
                            fontSize: 9,
                            fontFamily: "var(--font-mono)",
                            background: "var(--color-surface2)",
                            border: "1px solid var(--color-border)",
                            color: cfg.color,
                        }}
                    >
                        <StatusDot color={cfg.color} ping={cfg.ping} />
                        {cfg.label}
                    </motion.div>
                </AnimatePresence>

                <span
                    className="px-2 py-0.5 rounded"
                    style={{
                        fontSize: 9,
                        fontFamily: "var(--font-mono)",
                        background: "var(--color-surface2)",
                        color: "var(--color-text-faint)",
                        border: "1px solid var(--color-border)",
                    }}
                >
                    v1.0.0
                </span>
            </div>
        </motion.header>
    );
}