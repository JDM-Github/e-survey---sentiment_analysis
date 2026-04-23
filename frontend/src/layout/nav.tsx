import { useState } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
	LayoutDashboard,
	MessageSquare,
	Layers,
	Tag,
	FlaskConical,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";

// Custom hook for media queries
const useMediaQuery = (query: string) => {
	const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
	useState(() => {
		const media = window.matchMedia(query);
		const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
		media.addEventListener("change", listener);
		return () => media.removeEventListener("change", listener);
	});
	return matches;
};

const NAV_ITEMS = [
	{ to: "/", label: "Dashboard", icon: LayoutDashboard, group: "overview" },
	{ to: "/single", label: "Single", icon: MessageSquare, group: "classify" },
	{ to: "/batch", label: "Batch", icon: Layers, group: "classify" },
	{ to: "/category", label: "With Category", icon: Tag, group: "classify" },
	{ to: "/accuracy", label: "Accuracy Test", icon: FlaskConical, group: "evaluate" },
];

const GROUPS = ["overview", "classify", "evaluate"] as const;
const GROUP_LABELS: Record<string, string> = {
	overview: "Overview",
	classify: "Classify",
	evaluate: "Evaluate",
};

// Tight spring — snappy but not jarring
const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.8 } as const;
const SPRING_NAV = { type: "spring", stiffness: 500, damping: 30 } as const;

export default function Nav() {
	const isMobile = useMediaQuery("(max-width: 768px)");
	const [isCollapsed, setIsCollapsed] = useState(isMobile);

	const effectiveCollapsed = isMobile ? true : isCollapsed;
	const sidebarWidth = effectiveCollapsed ? 100 : 220;

	const toggleCollapse = () => setIsCollapsed((prev) => !prev);

	return (
		<motion.aside
			initial={{ x: -24, opacity: 0 }}
			animate={{ x: 0, opacity: 1, width: sidebarWidth }}
			transition={SPRING}
			style={{
				flexShrink: 0,
				display: "flex",
				flexDirection: "column",
				background: "var(--color-surface)",
				borderRight: "1px solid var(--color-border)",
				zIndex: 100,
				position: "relative",
				overflow: "hidden",
			}}
		>
			{/* ── Logo ────────────────────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0, y: -10 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1, duration: 0.3 }}
				style={{
					padding: effectiveCollapsed ? "20px 8px 16px" : "20px 16px 16px",
					borderBottom: "1px solid var(--color-border)",
					display: "flex",
					justifyContent: effectiveCollapsed ? "center" : "flex-start",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						gap: effectiveCollapsed ? 0 : 12,
						justifyContent: effectiveCollapsed ? "center" : "flex-start",
						minHeight: "55px"
					}}
				>
					<img
						src={effectiveCollapsed ? "/icon2.png" : "/icon.png"}
						alt="Logo"
						style={{
							width: effectiveCollapsed ? 40 : 55,
							height: effectiveCollapsed ? 40 : 55,
							objectFit: "cover",
							transition: "width 0.22s ease, height 0.22s ease",
						}}
					/>

					{/* Fade the text in/out so it doesn't flash or overlap */}
					<AnimatePresence initial={false}>
						{!effectiveCollapsed && (
							<motion.div
								key="logo-text"
								initial={{ opacity: 0, x: -6 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -6 }}
								transition={{ duration: 0.18, ease: "easeOut" }}
							>
								<div
									style={{
										marginTop: "6px",
										fontSize: 14,
										fontWeight: 700,
										color: "var(--color-text)",
										lineHeight: 1.2,
										whiteSpace: "nowrap",
									}}
								>
									e-SURVEY
								</div>
								<div
									style={{
										fontSize: 9,
										color: "var(--color-text-faint)",
										fontFamily: "var(--font-mono)",
										marginTop: 2,
										letterSpacing: "0.04em",
										whiteSpace: "nowrap",
									}}
								>
									Filipino / Taglish AI
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</div>
			</motion.div>

			{/* ── Nav groups ──────────────────────────────────────────────────── */}
			<nav
				style={{
					flex: 1,
					padding: effectiveCollapsed ? "12px 4px" : "12px 8px",
					display: "flex",
					flexDirection: "column",
					gap: effectiveCollapsed ? 12 : 20,
					overflowY: "auto",
					overflowX: "hidden",
					scrollbarWidth: "none",
					transition: "padding 0.22s ease, gap 0.22s ease",
				}}
			>
				{GROUPS.map((group, gi) => {
					const items = NAV_ITEMS.filter((n) => n.group === group);
					return (
						<motion.div
							key={group}
							initial={{ opacity: 0, y: 8 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{
								delay: 0.12 + gi * 0.06,
								duration: 0.3,
								ease: [0.16, 1, 0.3, 1],
							}}
						>
							{/* Group label — fade in/out cleanly */}
							<AnimatePresence initial={false}>
								{!effectiveCollapsed && (
									<motion.div
										key={`label-${group}`}
										initial={{ opacity: 0 }}
										animate={{ opacity: 1 }}
										exit={{ opacity: 0 }}
										transition={{ duration: 0.15 }}
										style={{
											fontSize: 9,
											fontWeight: 700,
											letterSpacing: "0.14em",
											textTransform: "uppercase",
											color: "var(--color-text-faint)",
											padding: "0 10px",
											marginBottom: 4,
											whiteSpace: "nowrap",
										}}
									>
										{GROUP_LABELS[group]}
									</motion.div>
								)}
							</AnimatePresence>

							{/* Items */}
							{items.map((item) => {
								const Icon = item.icon;
								return (
									<NavLink key={item.to} to={item.to} end={item.to === "/"}>
										{({ isActive }) => (
											<motion.div
												whileHover={{ x: effectiveCollapsed ? 0 : 4 }}
												transition={SPRING_NAV}
												style={{
													display: "flex",
													alignItems: "center",
													justifyContent: effectiveCollapsed ? "center" : "flex-start",
													gap: 9,
													padding: effectiveCollapsed ? "8px" : "8px 10px",
													borderRadius: 8,
													marginBottom: 2,
													position: "relative",
													cursor: "pointer",
													background: isActive
														? "rgba(79,110,247,0.10)"
														: "transparent",
													border: isActive
														? "1px solid rgba(79,110,247,0.22)"
														: "1px solid transparent",
													color: isActive
														? "var(--color-accent)"
														: "var(--color-text-muted)",
													transition:
														"background 0.15s, color 0.15s, border-color 0.15s, padding 0.22s ease",
												}}
												{...(effectiveCollapsed && {
													"data-tooltip": item.label,
												})}
											>
												{isActive && !effectiveCollapsed && (
													<motion.div
														layoutId="nav-active-bar"
														transition={SPRING_NAV}
														style={{
															position: "absolute",
															left: 0,
															top: "0%",
															width: 2,
															height: 34,
															borderRadius: 2,
															background: "var(--color-accent)",
															boxShadow: "0 0 6px var(--color-accent)",
														}}
													/>
												)}

												<Icon
													size={effectiveCollapsed ? 18 : 14}
													strokeWidth={isActive ? 2.2 : 1.75}
													style={{ flexShrink: 0, transition: "width 0.22s ease, height 0.22s ease" }}
												/>

												{/* Label fades in/out without layout jank */}
												<AnimatePresence initial={false}>
													{!effectiveCollapsed && (
														<motion.span
															key={`label-${item.to}`}
															initial={{ opacity: 0, x: -4 }}
															animate={{ opacity: 1, x: 0 }}
															exit={{ opacity: 0, x: -4 }}
															transition={{ duration: 0.15, ease: "easeOut" }}
															style={{
																fontSize: 12,
																fontWeight: isActive ? 600 : 400,
																letterSpacing: isActive ? "0.01em" : "normal",
																whiteSpace: "nowrap",
																overflow: "hidden",
															}}
														>
															{item.label}
														</motion.span>
													)}
												</AnimatePresence>

												{/* Arrow hint — only when expanded & inactive */}
												<AnimatePresence initial={false}>
													{!effectiveCollapsed && !isActive && (
														<motion.span
															key={`arrow-${item.to}`}
															initial={{ opacity: 0, x: -4 }}
															animate={{ opacity: 0 }} // starts invisible; hover CSS handles show
															exit={{ opacity: 0 }}
															whileHover={{ opacity: 1, x: 0 }}
															transition={{ duration: 0.12 }}
															style={{
																marginLeft: "auto",
																fontSize: 9,
																color: "var(--color-text-faint)",
																fontFamily: "var(--font-mono)",
																whiteSpace: "nowrap",
															}}
														>
															→
														</motion.span>
													)}
												</AnimatePresence>
											</motion.div>
										)}
									</NavLink>
								);
							})}
						</motion.div>
					);
				})}
			</nav>

			{/* ── Footer / status strip ────────────────────────────────────────── */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.35, duration: 0.3 }}
				style={{
					padding: effectiveCollapsed ? "8px" : "12px",
					borderTop: "1px solid var(--color-border)",
					display: "flex",
					flexDirection: "column",
					gap: 8,
					transition: "padding 0.22s ease",
				}}
			>
				<div
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: effectiveCollapsed ? "center" : "flex-start",
						gap: 8,
						padding: effectiveCollapsed ? "6px" : "8px 10px",
						borderRadius: 8,
						background: "rgba(16,185,129,0.07)",
						border: "1px solid rgba(16,185,129,0.18)",
						transition: "padding 0.22s ease",
					}}
					{...(effectiveCollapsed && {
						"data-tooltip": "Backend Online",
					})}
				>
					<motion.span
						animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
						transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
						style={{
							width: 6,
							height: 6,
							borderRadius: "50%",
							background: "#10B981",
							flexShrink: 0,
							display: "inline-block",
							boxShadow: "0 0 5px #10B981",
						}}
					/>
					<AnimatePresence initial={false}>
						{!effectiveCollapsed && (
							<motion.span
								key="backend-label"
								initial={{ opacity: 0, x: -4 }}
								animate={{ opacity: 1, x: 0 }}
								exit={{ opacity: 0, x: -4 }}
								transition={{ duration: 0.15 }}
								style={{
									fontSize: 10,
									color: "#10B981",
									fontFamily: "var(--font-mono)",
									fontWeight: 600,
									whiteSpace: "nowrap",
								}}
							>
								Backend Online
							</motion.span>
						)}
					</AnimatePresence>
				</div>

				<AnimatePresence initial={false}>
					{!effectiveCollapsed && (
						<motion.div
							key="progress-block"
							initial={{ opacity: 0, height: 0 }}
							animate={{ opacity: 1, height: "auto" }}
							exit={{ opacity: 0, height: 0 }}
							transition={{ duration: 0.2, ease: "easeInOut" }}
							style={{ overflow: "hidden" }}
						>
							<p
								style={{
									fontSize: 9,
									color: "var(--color-text-faint)",
									fontFamily: "var(--font-mono)",
									marginBottom: 5,
									letterSpacing: "0.04em",
								}}
							>
								Ready to classify
							</p>
							<div
								style={{
									height: 3,
									width: "100%",
									background: "var(--color-border)",
									borderRadius: 99,
									overflow: "hidden",
								}}
							>
								<motion.div
									initial={{ width: 0 }}
									animate={{ width: "100%" }}
									transition={{
										delay: 0.5,
										duration: 1.2,
										ease: [0.16, 1, 0.3, 1],
									}}
									style={{
										height: "100%",
										background: "linear-gradient(90deg, #4F6EF7, #7C3AED)",
										borderRadius: 99,
									}}
								/>
							</div>
						</motion.div>
					)}
				</AnimatePresence>
			</motion.div>

			{/* ── Collapse toggle button (desktop only) ────────────────────────── */}
			{!isMobile && (
				<motion.button
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.4 }}
					onClick={toggleCollapse}
					style={{
						position: "absolute",
						right: 5,
						top: "10%",
						transform: "translateY(-50%)",
						width: 24,
						height: 24,
						borderRadius: "50%",
						background: "var(--color-surface)",
						border: "1px solid var(--color-border)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						cursor: "pointer",
						color: "var(--color-text-muted)",
						zIndex: 10,
						boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
					}}
				>
						<motion.span
							key={isCollapsed ? "right" : "left"}
							initial={{ opacity: 0, rotate: -45 }}
							animate={{ opacity: 1, rotate: 0 }}
							exit={{ opacity: 0, rotate: 45 }}
							transition={{ duration: 0.15 }}
							style={{ display: "flex", alignItems: "center" }}
						>
							{isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
						</motion.span>
				</motion.button>
			)}

			{/* Tooltip CSS */}
			<style>{`
        [data-tooltip] { position: relative; }
        [data-tooltip]:hover::after {
          content: attr(data-tooltip);
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 12px;
          padding: 6px 10px;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          color: var(--color-text);
          white-space: nowrap;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 1000;
          pointer-events: none;
        }
        [data-tooltip]:hover::before {
          content: '';
          position: absolute;
          left: 100%;
          top: 50%;
          transform: translateY(-50%);
          margin-left: 6px;
          border-width: 6px;
          border-style: solid;
          border-color: transparent var(--color-border) transparent transparent;
          z-index: 1000;
          pointer-events: none;
        }
      `}</style>
		</motion.aside>
	);
}