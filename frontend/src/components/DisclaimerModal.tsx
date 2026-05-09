import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { ShieldCheck, FlaskConical, ChevronRight } from "lucide-react";

const STORAGE_KEY = "esurvey_disclaimer_accepted";

export function DisclaimerModal() {
    const [open, setOpen] = useState(false);

    useEffect(() => {
        const accepted = localStorage.getItem(STORAGE_KEY);
        if (!accepted) setOpen(true);
    }, []);

    const handleAccept = () => {
        localStorage.setItem(STORAGE_KEY, "1");
        setOpen(false);
    };

    if (!open) return null;

    return createPortal(
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.72)",
                backdropFilter: "blur(6px)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "1rem",
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 16 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
                style={{
                    width: "min(520px, 96vw)",
                    background: "#080a11",
                    border: "1px solid var(--color-border, #222)",
                    borderRadius: 16,
                    overflow: "hidden",
                    boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
                }}
            >
                <div style={{
                    height: 3,
                    background: "linear-gradient(90deg, #4F6EF7, #7C3AED, #10B981)",
                }} />

                <div style={{ padding: "28px 28px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                        <div style={{
                            width: 38, height: 38, borderRadius: 10,
                            background: "rgba(79,110,247,0.12)",
                            border: "1px solid rgba(79,110,247,0.25)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            flexShrink: 0,
                        }}>
                            <ShieldCheck size={18} color="#4F6EF7" strokeWidth={1.75} />
                        </div>
                        <div>
                            <div style={{
                                fontSize: 10, fontFamily: "var(--font-mono)",
                                color: "#4F6EF7", letterSpacing: "0.1em",
                                textTransform: "uppercase", marginBottom: 2,
                            }}>
                                Before you continue
                            </div>
                            <div style={{
                                fontSize: "1.05rem", fontWeight: 800,
                                color: "var(--color-text)", letterSpacing: "-0.02em",
                            }}>
                                Research Use Disclaimer
                            </div>
                        </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                        <p style={{
                            fontSize: 12.5, color: "var(--color-text-muted)",
                            lineHeight: 1.7, margin: 0,
                        }}>
                            <strong style={{ color: "var(--color-text)" }}>e-SURVEY</strong> is a research prototype built to explore
                            Filipino and Taglish sentiment classification.
                            It is developed as part of an academic study and is <strong style={{ color: "var(--color-text)" }}>not intended for
                                production or commercial use</strong>.
                        </p>

                        {[
                            {
                                icon: <FlaskConical size={13} color="#F59E0B" />,
                                accent: "#F59E0B",
                                title: "Experimental accuracy",
                                body: "Classification results are generated and may contain errors. Do not rely on outputs for critical decisions.",
                            },
                            {
                                icon: <ShieldCheck size={13} color="#10B981" />,
                                accent: "#10B981",
                                title: "No data retention",
                                body: "Submitted texts are processed in real-time and are not stored or logged by this application.",
                            },
                        ].map(({ icon, accent, title, body }) => (
                            <div key={title} style={{
                                display: "flex", gap: 10,
                                padding: "10px 12px", borderRadius: 9,
                                background: `rgba(${accent === "#F59E0B" ? "245,158,11" : "16,185,129"},0.07)`,
                                border: `1px solid ${accent}28`,
                            }}>
                                <div style={{ marginTop: 1, flexShrink: 0 }}>{icon}</div>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, color: accent, marginBottom: 2 }}>{title}</div>
                                    <div style={{ fontSize: 11, color: "var(--color-text-muted)", lineHeight: 1.55 }}>{body}</div>
                                </div>
                            </div>
                        ))}

                        <p style={{
                            fontSize: 11, color: "var(--color-text-faint)",
                            fontFamily: "var(--font-mono)", lineHeight: 1.6, margin: 0,
                        }}>
                            By continuing, you acknowledge that this tool is for research and evaluation
                            purposes only.
                        </p>
                    </div>

                    {/* Action */}
                    <div style={{ marginTop: 22 }}>
                        <button
                            onClick={handleAccept}
                            style={{
                                width: "100%",
                                padding: "11px 18px",
                                background: "linear-gradient(135deg, #4F6EF7, #7C3AED)",
                                border: "none", borderRadius: 9,
                                color: "#fff", fontWeight: 700, fontSize: 13,
                                cursor: "pointer", fontFamily: "var(--font-sans)",
                                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                letterSpacing: "-0.01em",
                            }}
                        >
                            I understand — Continue to e-SURVEY
                            <ChevronRight size={14} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </motion.div>
        </motion.div>,
        document.body
    );
}