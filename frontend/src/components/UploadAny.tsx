import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { X, TableProperties, ChevronRight } from "lucide-react";
import * as XLSX from "xlsx";
import { Btn } from "./ui";

function colIndexToLetter(idx: number): string {
    let s = "";
    let n = idx + 1;
    while (n > 0) {
        const rem = (n - 1) % 26;
        s = String.fromCharCode(65 + rem) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

/** Strip every newline/carriage-return inside a cell value and replace with space. */
function sanitizeCell(raw: unknown): string {
    return String(raw ?? "")
        .replace(/[\r\n]+/g, " ")
        .trim();
}

// ─── types ───────────────────────────────────────────────────────────────────

interface ColMeta {
    index: number;           // 0-based
    letter: string;          // "A", "B", … "AA" …
    header: string;          // text from row 1 (may be empty)
    label: string;           // what we show in the selector
}

interface UploadAnyXlsxProps {
    onTextsLoaded: (texts: string[]) => void;
    /** Button label; defaults to "Upload Any XLSX" */
    label?: string;
}

// ─── main component ──────────────────────────────────────────────────────────

export function UploadAnyXlsx({
    onTextsLoaded,
    label = "Upload Any XLSX",
}: UploadAnyXlsxProps) {
    const fileRef = useRef<HTMLInputElement>(null);

    // modal state
    const [open, setOpen] = useState(false);
    const [fileName, setFileName] = useState("");
    const [cols, setCols] = useState<ColMeta[]>([]);
    const [rows, setRows] = useState<unknown[][]>([]);   // all rows from sheet
    const [selectedCol, setSelectedCol] = useState<number>(0);
    const [startRow, setStartRow] = useState<number>(2);
    const [preview, setPreview] = useState<string[]>([]);

    // ── open file picker ──────────────────────────────────────────────────────
    const triggerPicker = () => fileRef.current?.click();

    // ── parse xlsx ────────────────────────────────────────────────────────────
    const handleFile = async (file: File) => {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // sheet_to_json with header:1 → array of arrays, preserving empty cells as undefined
        const allRows: unknown[][] = XLSX.utils.sheet_to_json(ws, {
            header: 1,
            defval: "",   // fill missing cells with ""
            raw: false,   // convert everything to strings
        });

        if (allRows.length === 0) return;

        // build column metadata from row 0 (header row)
        const headerRow = allRows[0] ?? [];
        // determine max cols across all rows
        const maxCols = Math.max(...allRows.map(r => r.length));

        const colMetas: ColMeta[] = Array.from({ length: maxCols }, (_, i) => {
            const letter = colIndexToLetter(i);
            const header = sanitizeCell(headerRow[i]);
            return {
                index: i,
                letter,
                header,
                label: header ? `${letter} — ${header}` : `${letter}`,
            };
        });

        setFileName(file.name);
        setCols(colMetas);
        setRows(allRows);
        setSelectedCol(0);
        setStartRow(2);
        setOpen(true);
        buildPreview(allRows, 0, 2);
    };

    // ── live preview (first 5 extracted values) ───────────────────────────────
    const buildPreview = (
        allRows: unknown[][],
        colIdx: number,
        start: number,
    ) => {
        const dataRows = allRows.slice(start - 1);   // start is 1-based
        const values = dataRows
            .map(r => sanitizeCell(r[colIdx]))
            .filter(Boolean)
            .slice(0, 5);
        setPreview(values);
    };

    const handleColChange = (idx: number) => {
        setSelectedCol(idx);
        buildPreview(rows, idx, startRow);
    };

    const handleStartRowChange = (val: string) => {
        const n = Math.max(1, parseInt(val) || 1);
        setStartRow(n);
        buildPreview(rows, selectedCol, n);
    };

    // ── confirm import ────────────────────────────────────────────────────────
    const handleImport = () => {
        const dataRows = rows.slice(startRow - 1);   // startRow is 1-based
        const texts = dataRows
            .map(r => sanitizeCell(r[selectedCol]))
            .filter(Boolean);
        onTextsLoaded(texts);
        handleClose();
    };

    const handleClose = () => {
        setOpen(false);
        setFileName("");
        setCols([]);
        setRows([]);
        setPreview([]);
        if (fileRef.current) fileRef.current.value = "";
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <>
            {/* Hidden file input */}
            <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: "none" }}
                onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                }}
            />

            {/* Trigger button */}
            <Btn variant="ghost" onClick={triggerPicker}>
                <TableProperties size={12} />
                {label}
            </Btn>

            {/* Modal — portalled to document.body, only mounted when open */}
            {open && createPortal(
                <motion.div
                    key="overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.18 }}
                    onClick={handleClose}
                    style={{
                        position: "fixed", inset: 0, zIndex: 9999,
                        background: "rgba(0,0,0,0.6)",
                        backdropFilter: "blur(4px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                >
                    <motion.div
                        key="dialog"
                        initial={{ opacity: 0, scale: 0.96, y: 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 12 }}
                        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: "min(480px, 94vw)",
                            background: "var(--color-surface, #111)",
                            border: "1px solid var(--color-border, #222)",
                            borderRadius: 14,
                            padding: "22px 24px",
                            display: "flex", flexDirection: "column", gap: 18,
                            boxShadow: "0 24px 64px rgba(0,0,0,0.5)",
                        }}
                    >
                        {/* Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <div>
                                <div style={{
                                    fontSize: 10, fontFamily: "var(--font-mono)",
                                    color: "#10B981", letterSpacing: "0.1em",
                                    textTransform: "uppercase", marginBottom: 4,
                                    display: "flex", alignItems: "center", gap: 5,
                                }}>
                                    <TableProperties size={10} />
                                    Import from XLSX
                                </div>
                                <div style={{
                                    fontSize: "0.95rem", fontWeight: 700,
                                    color: "var(--color-text)", letterSpacing: "-0.01em",
                                }}>
                                    {fileName}
                                </div>
                                <div style={{ fontSize: 10.5, color: "var(--color-text-muted)", marginTop: 2 }}>
                                    {rows.length} rows · {cols.length} columns detected
                                </div>
                            </div>
                            <button
                                onClick={handleClose}
                                style={{
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "var(--color-text-muted)", padding: 4, borderRadius: 6,
                                }}
                            >
                                <X size={15} />
                            </button>
                        </div>

                        {/* Column selector */}
                        <div>
                            <label style={labelStyle}>Column to extract</label>
                            <select
                                value={selectedCol}
                                onChange={e => handleColChange(Number(e.target.value))}
                                style={selectStyle}
                            >
                                {cols.map(c => (
                                    <option key={c.index} value={c.index}>
                                        {c.label}
                                    </option>
                                ))}
                            </select>
                            <div style={hintStyle}>Row 1 header is shown after the column letter.</div>
                        </div>

                        {/* Start row */}
                        <div>
                            <label style={labelStyle}>Start row</label>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                <input
                                    type="number"
                                    min={1}
                                    max={rows.length}
                                    value={startRow}
                                    onChange={e => handleStartRowChange(e.target.value)}
                                    style={{
                                        ...inputStyle,
                                        width: 72,
                                    }}
                                />
                                <span style={hintStyle}>
                                    {startRow === 1
                                        ? "Starts from the very first row (including header)"
                                        : `Skips the first ${startRow - 1} row${startRow - 1 !== 1 ? "s" : ""}`}
                                </span>
                            </div>
                        </div>

                        {/* Preview */}
                        {preview.length > 0 && (
                            <div>
                                <label style={labelStyle}>Preview <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>(first {preview.length} values)</span></label>
                                <div style={{
                                    background: "var(--color-bg, #0a0a0a)",
                                    border: "1px solid var(--color-border)",
                                    borderRadius: 8, overflow: "hidden",
                                }}>
                                    {preview.map((v, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                display: "flex", alignItems: "center", gap: 8,
                                                padding: "7px 11px",
                                                borderBottom: i < preview.length - 1 ? "1px solid var(--color-border)" : "none",
                                            }}
                                        >
                                            <span style={{
                                                fontSize: 9.5, fontFamily: "var(--font-mono)",
                                                color: "#10B981", minWidth: 22, flexShrink: 0,
                                            }}>
                                                R{startRow + i}
                                            </span>
                                            <span style={{
                                                fontSize: 11, fontFamily: "var(--font-mono)",
                                                color: "var(--color-text-muted)",
                                                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                                            }}>
                                                {v}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info note */}
                        <div style={{
                            padding: "8px 11px", borderRadius: 8,
                            background: "rgba(16,185,129,0.07)",
                            border: "1px solid rgba(16,185,129,0.15)",
                            fontSize: 10.5, color: "var(--color-text-muted)",
                            fontFamily: "var(--font-mono)", lineHeight: 1.6,
                        }}>
                            ↵ Newlines inside cells will be replaced with spaces so each row maps to exactly one sentiment entry.
                        </div>

                        {/* Actions */}
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                            <Btn variant="ghost" onClick={handleClose}>Cancel</Btn>
                            <Btn
                                variant="primary"
                                onClick={handleImport}
                                disabled={cols.length === 0}
                            >
                                <ChevronRight size={12} />
                                Import {rows.slice(startRow - 1).filter(r => sanitizeCell(r[selectedCol])).length} rows
                            </Btn>
                        </div>
                    </motion.div>
                </motion.div >,
                document.body
            )}
        </>
    );
}

const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 10.5,
    fontWeight: 600,
    color: "var(--color-text-muted)",
    marginBottom: 6,
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
};

const hintStyle: React.CSSProperties = {
    fontSize: 9.5,
    color: "var(--color-text-faint)",
    fontFamily: "var(--font-mono)",
    marginTop: 4,
};

const selectStyle: React.CSSProperties = {
    width: "100%",
    padding: "8px 10px",
    background: "var(--color-bg, #0a0a0a)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontFamily: "var(--font-mono)",
    fontSize: 11.5,
    color: "var(--color-text)",
    cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
    padding: "7px 10px",
    background: "var(--color-bg, #0a0a0a)",
    border: "1px solid var(--color-border)",
    borderRadius: 8,
    fontFamily: "var(--font-mono)",
    fontSize: 12,
    color: "var(--color-text)",
};