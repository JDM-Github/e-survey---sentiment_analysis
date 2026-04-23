import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Nav from "./layout/nav";
import Header from "./layout/header";
import Dashboard from "./routes/dashboard";
import Single from "./routes/single";
import Batch from "./routes/batch";
import CategoryBatch from "./routes/category-batch";
import Accuracy from "./routes/accuracy";

const routeTitles: Record<string, string> = {
	"/": "Dashboard",
	"/single": "Single Classification",
	"/batch": "Batch Classification",
	"/category": "Category Batch",
	"/accuracy": "Accuracy Test",
};

function TitleUpdater() {
	const location = useLocation();

	useEffect(() => {
		const title = routeTitles[location.pathname] || "e-SURVEY";
		document.title = `e-SURVEY | ${title}`;
	}, [location]);

	return null;
}

export default function App() {
	return (
		<div className="flex h-screen overflow-hidden bg-[var(--color-bg)] text-[var(--color-text)] font-sans">
			<TitleUpdater />
			<Nav />
			<div className="flex flex-col flex-1 min-w-0 overflow-hidden">
				<Header />
				<main className="flex-1 overflow-hidden">
					<AnimatePresence mode="wait">
						<Routes>
							<Route path="/" element={<Dashboard />} />
							<Route path="/single" element={<Single />} />
							<Route path="/batch" element={<Batch />} />
							<Route path="/category" element={<CategoryBatch />} />
							<Route path="/accuracy" element={<Accuracy />} />
						</Routes>
					</AnimatePresence>
				</main>
				<motion.footer
					initial={{ y: 20, opacity: 0 }}
					animate={{ y: 0, opacity: 1 }}
					transition={{ duration: 0.3, delay: 0.2 }}
					style={{ borderTop: "1px solid var(--color-border)" }}
					className="h-9 bg-gradient-to-r from-[#1B3769]/5 to-[#2D5299]/5 flex items-center justify-between px-6"
				>
					<span className="text-[9px] text-white/20 font-mono">
						Developed By: John Dave Pega
					</span>
				</motion.footer>
			</div>
		</div>
	);
}