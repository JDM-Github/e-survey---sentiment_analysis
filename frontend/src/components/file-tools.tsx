import { useRef } from "react";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Btn } from "./ui";

interface FileUploadProps {
    onTextsLoaded: (texts: string[]) => void;
    onCategoriesLoaded?: (categories: string[]) => void;
    label?: string;
    hasCategory?: boolean;
}

export function FileUpload({
    onTextsLoaded,
    onCategoriesLoaded,
    label = "Upload CSV / XLSX",
    hasCategory = false
}: FileUploadProps) {
    const ref = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        const ext = file.name.split(".").pop()?.toLowerCase();

        if (ext === "csv") {
            const text = await file.text();
            const lines = text
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);

            const hasHeader = lines[0]?.toLowerCase().includes("text");

            const dataRows = hasHeader ? lines.slice(1) : lines;

            const texts: string[] = [];
            const categoriesSet = new Set<string>();

            for (const row of dataRows) {
                const parts = row.match(/(".*?"|[^,]+)(?=\s*,|\s*$)/g) || [];
                const cleanParts = parts.map(p => p.replace(/^"|"$/g, '').trim());

                const textValue = cleanParts[0];
                if (textValue) {
                    texts.push(textValue);
                }

                if (hasCategory && cleanParts.length > 1 && cleanParts[1]) {
                    const cats = cleanParts[1].split(',').map(c => c.trim()).filter(Boolean);
                    cats.forEach(c => categoriesSet.add(c));
                }
            }

            onTextsLoaded(texts);
            if (hasCategory && onCategoriesLoaded) {
                onCategoriesLoaded(Array.from(categoriesSet));
            }

        } else if (ext === "xlsx" || ext === "xls") {
            const buf = await file.arrayBuffer();
            const wb = XLSX.read(buf);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows: string[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });

            const firstCell = String(rows[0]?.[0] ?? "").toLowerCase().trim();
            const hasHeader = firstCell === "text";
            const dataRows = hasHeader ? rows.slice(1) : rows;

            const texts: string[] = [];
            const categoriesSet = new Set<string>();

            for (const row of dataRows) {
                const textValue = String(row[0] ?? "").trim();
                if (textValue) {
                    texts.push(textValue);
                }

                if (hasCategory && row.length > 1 && row[1]) {
                    const catCell = String(row[1]).trim();
                    const cats = catCell.split(',').map(c => c.trim()).filter(Boolean);
                    cats.forEach(c => categoriesSet.add(c));
                }
            }

            onTextsLoaded(texts);
            if (hasCategory && onCategoriesLoaded) {
                onCategoriesLoaded(Array.from(categoriesSet));
            }
        }
    };

    return (
        <>
            <input
                ref={ref}
                type="file"
                accept=".csv,.xlsx,.xls"
                style={{ display: "none" }}
                onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                    e.target.value = "";
                }}
            />
            <Btn variant="ghost" onClick={() => ref.current?.click()}>
                <Upload size={12} />
                {label}
            </Btn>
        </>
    );
}

/* ─── Download template CSV ──────────────────────────────────── */
interface DownloadTemplateProps {
    type: "batch" | "category";
}

export function DownloadTemplate({ type }: DownloadTemplateProps) {
    const handleDownload = () => {
        let csv = "";
        let filename = "";

        if (type === "batch") {
            csv = `text\nMaganda ang serbisyo nila\nHindi ako nasatisfy sa produkto\nOkay naman ang lasa\nSobrang ganda ng packaging\nMahal pero sulit`;
            filename = "batch_template.csv";
        } else {
            csv = `text,categories\nMaganda ang produkto,"look,feel,quality"\nHindi masarap ang pagkain,"look,feel,quality"\nOkay naman ang presyo,"look,feel,quality"`;
            filename = "category_batch_template.csv";
        }

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Btn variant="ghost" onClick={handleDownload}>
            <Download size={12} />
            Template
        </Btn>
    );
}

/* ─── Results downloader ─────────────────────────────────────── */
export function DownloadResults({
    results,
    filename,
}: {
    results: Record<string, any>[];
    filename?: string;
}) {
    const handleDownload = () => {
        if (!results.length) return;
        const keys = Object.keys(results[0]);
        const header = keys.join(",");
        const rows = results.map((r) =>
            keys.map((k) => `"${String(r[k] ?? "").replace(/"/g, '""')}"`).join(",")
        );
        const csv = [header, ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = filename ?? "results.csv"; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Btn variant="ghost" onClick={handleDownload} disabled={!results.length}>
            <FileSpreadsheet size={12} />
            Export CSV
        </Btn>
    );
}