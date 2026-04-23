import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MessageSquare, Layers, Tag, FlaskConical, ArrowRight } from "lucide-react";

const TOOLS = [
	{
		path: "/single",
		icon: MessageSquare,
		title: "Single",
		subtitle: "One text at a time",
		description: "Classify a single Filipino/Taglish text into Positive, Negative, or Neutral sentiment.",
		accent: "#4F6EF7",
		endpoint: "POST /classify",
		keyFeatures: ["Real-time classification", "Filipino & Taglish support", "Latency tracking", "Ctrl+Enter shortcut"],
	},
	{
		path: "/batch",
		icon: Layers,
		title: "Batch",
		subtitle: "Multiple texts, concurrent",
		description: "Paste many texts or upload a CSV. All classified concurrently via the LLM.",
		accent: "#10B981",
		endpoint: "POST /classify/batch",
		keyFeatures: ["CSV upload support", "Concurrent processing", "Bulk result export", "Per-item latency"],
	},
	{
		path: "/category",
		icon: Tag,
		title: "With Category",
		subtitle: "Sentiment + topic detection",
		description: "AI classifies both sentiment and the best matching category from your defined list.",
		accent: "#F59E0B",
		endpoint: "POST /classify_category/batch",
		keyFeatures: ["Custom category list", "Dual classification", "Batch support", "Category confidence"],
	},
	{
		path: "/accuracy",
		icon: FlaskConical,
		title: "Accuracy Test",
		subtitle: "Evaluate model performance",
		description: "Run the built-in 30-sample labeled test. Get per-item scores and overall accuracy.",
		accent: "#EC4899",
		endpoint: "POST /accuracy",
		keyFeatures: ["30 labeled samples", "Per-item scoring", "Overall accuracy %", "Confusion breakdown"],
	},
];

const STATS = [
	{ val: "3", label: "Sentiment classes", sub: "Positive · Negative · Neutral" },
	{ val: "30", label: "Test samples", sub: "Built-in accuracy benchmark" },
	{ val: "∞", label: "Batch size", sub: "Concurrent thread pool" },
	{ val: "0°", label: "Temperature", sub: "Deterministic outputs" },
];

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

export default function Dashboard() {
	const navigate = useNavigate();

	return (
		<div style={{
			height: "100%",
			overflowY: "auto",
			background: "var(--color-bg)",
			color: "var(--color-text)",
			fontFamily: "var(--font-sans)",
			position: "relative",
		}}>

			{/* ── Ambient blobs ─────────────────────────────────────────────── */}
			<motion.div
				animate={{ x: [0, -180, 0], y: [0, 60, 0] }}
				transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
				style={{
					position: "fixed", top: "-15%", left: "-8%",
					width: 560, height: 560, borderRadius: "50%",
					background: "radial-gradient(circle at 30% 30%, #4F6EF7 0%, transparent 70%)",
					filter: "blur(140px)", zIndex: 0, opacity: 0.1, pointerEvents: "none",
				}}
			/>
			<motion.div
				animate={{ x: [0, 140, 0], y: [0, -90, 0] }}
				transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
				style={{
					position: "fixed", bottom: "0%", right: "0%",
					width: 480, height: 480, borderRadius: "50%",
					background: "radial-gradient(circle at 70% 70%, #10B981 0%, transparent 80%)",
					filter: "blur(120px)", zIndex: 0, opacity: 0.09, pointerEvents: "none",
				}}
			/>

			{/* ── Content ───────────────────────────────────────────────────── */}
			<div style={{ position: "relative", zIndex: 1, maxWidth: 1200, margin: "0 auto", padding: "2rem 2rem 4rem" }}>

				{/* Header */}
				<motion.div
					initial={{ opacity: 0, y: 15 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
					style={{ marginBottom: "3rem" }}
				>
					<div style={{
						fontSize: 11, fontFamily: "var(--font-mono)",
						color: "var(--color-accent)", marginBottom: 14,
						letterSpacing: "0.12em", textTransform: "uppercase",
					}}>
						Sentiment Analysis · Filipino / Taglish
					</div>

					<h1 style={{
						fontSize: "2.75rem", fontWeight: 800, lineHeight: 1.1,
						letterSpacing: "-0.03em", margin: "0 0 1rem",
						color: "var(--color-text)",
					}}>
						Classify text with{" "}
						<span style={{
							background: "linear-gradient(135deg, #4F6EF7, #7C3AED)",
							WebkitBackgroundClip: "text",
							WebkitTextFillColor: "transparent",
						}}>
							AI precision.
						</span>
					</h1>

					<p style={{
						fontSize: "0.9rem", color: "var(--color-text-muted)",
						lineHeight: 1.65, maxWidth: 480, margin: 0,
					}}>
						Four tools covering single, batch, categorized classification
						and accuracy evaluation — all powered by LLM inference.
					</p>
				</motion.div>

				{/* Tool cards */}
				<div style={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
					gap: "1rem",
					marginBottom: "3rem",
				}}>
					{TOOLS.map((tool, index) => {
						const Icon = tool.icon;
						return (
							<motion.button
								key={tool.path}
								onClick={() => navigate(tool.path)}
								initial={{ opacity: 0, y: 20 }}
								animate={{ opacity: 1, y: 0 }}
								transition={{ delay: 0.08 * index, duration: 0.42, ease: EASE_OUT_EXPO }}
								whileHover={{ scale: 1.02, y: -3 }}
								whileTap={{ scale: 0.985 }}
								style={{
									background: "rgba(27,55,105,0.08)",
									border: `1px solid ${tool.accent}25`,
									borderRadius: "1rem",
									padding: "1.5rem",
									textAlign: "left",
									cursor: "pointer",
									fontFamily: "var(--font-sans)",
									transition: "border-color 0.2s, box-shadow 0.2s",
								}}
								onMouseEnter={e => {
									const el = e.currentTarget as HTMLButtonElement;
									el.style.borderColor = `${tool.accent}50`;
									el.style.boxShadow = `0 0 0 1px ${tool.accent}18, 0 8px 24px ${tool.accent}10`;
								}}
								onMouseLeave={e => {
									const el = e.currentTarget as HTMLButtonElement;
									el.style.borderColor = `${tool.accent}25`;
									el.style.boxShadow = "none";
								}}
							>
								{/* Icon + endpoint row */}
								<div style={{
									display: "flex", alignItems: "flex-start",
									justifyContent: "space-between", marginBottom: "1.25rem",
								}}>
									<div style={{
										width: 46, height: 46, borderRadius: "0.75rem",
										background: `${tool.accent}14`,
										border: `1px solid ${tool.accent}28`,
										display: "flex", alignItems: "center", justifyContent: "center",
									}}>
										<Icon size={20} color={tool.accent} strokeWidth={1.75} />
									</div>
									<span style={{
										fontSize: 9, fontFamily: "var(--font-mono)",
										color: "var(--color-text-faint)",
										background: "var(--color-bg)",
										border: "1px solid var(--color-border)",
										padding: "2px 8px", borderRadius: 4,
										letterSpacing: "0.04em",
									}}>
										{tool.endpoint}
									</span>
								</div>

								{/* Title */}
								<div style={{ fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text)", marginBottom: 3 }}>
									{tool.title}
								</div>
								<div style={{ fontSize: "0.68rem", fontWeight: 700, color: tool.accent, marginBottom: "0.75rem", letterSpacing: "0.04em" }}>
									{tool.subtitle}
								</div>

								{/* Description */}
								<p style={{
									fontSize: "0.78rem", color: "var(--color-text-muted)",
									lineHeight: 1.55, margin: "0 0 1rem",
								}}>
									{tool.description}
								</p>

								{/* Feature bullets */}
								<div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", marginBottom: "1.25rem" }}>
									{tool.keyFeatures.map(f => (
										<div key={f} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
											<div style={{
												width: 4, height: 4, borderRadius: "50%",
												background: tool.accent, opacity: 0.55, flexShrink: 0,
											}} />
											<span style={{ fontSize: "0.68rem", color: "var(--color-text-faint)" }}>{f}</span>
										</div>
									))}
								</div>

								{/* CTA */}
								<div style={{
									paddingTop: "0.75rem",
									borderTop: "1px solid var(--color-border)",
									display: "flex", alignItems: "center", gap: "0.5rem",
									color: tool.accent, fontSize: "0.72rem", fontWeight: 700,
									letterSpacing: "0.02em",
								}}>
									Open tool
									<ArrowRight size={11} strokeWidth={2.5} />
								</div>
							</motion.button>
						);
					})}
				</div>

				{/* Stats strip */}
				<motion.div
					initial={{ opacity: 0, y: 10 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.32, duration: 0.4, ease: EASE_OUT_EXPO }}
					style={{
						display: "flex",
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
						borderRadius: "1rem",
						overflow: "hidden",
					}}
				>
					{STATS.map((s, i) => (
						<div
							key={s.label}
							style={{
								flex: 1, padding: "1.25rem 1.5rem",
								borderRight: i < STATS.length - 1 ? "1px solid var(--color-border)" : "none",
							}}
						>
							<div style={{
								fontSize: "1.75rem", fontWeight: 800,
								fontFamily: "var(--font-mono)",
								color: "var(--color-text)",
								letterSpacing: "-0.02em", marginBottom: 4,
							}}>
								{s.val}
							</div>
							<div style={{ fontSize: "0.68rem", fontWeight: 600, color: "var(--color-text-muted)", marginBottom: 3 }}>
								{s.label}
							</div>
							<div style={{ fontSize: "0.6rem", color: "var(--color-text-faint)", fontFamily: "var(--font-mono)" }}>
								{s.sub}
							</div>
						</div>
					))}
				</motion.div>

				{/* Footer hint */}
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.44, duration: 0.35 }}
					style={{
						marginTop: "2rem",
						textAlign: "center",
						fontSize: "0.68rem",
						color: "var(--color-text-faint)",
						fontFamily: "var(--font-mono)",
						borderTop: "1px solid var(--color-border)",
						paddingTop: "1.5rem",
					}}
				>
					Filipino Sentiment Classifier · LLM-powered inference
				</motion.div>

			</div>
		</div>
	);
}