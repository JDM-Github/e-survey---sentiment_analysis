/// <reference types="vite/client" />

declare global {
    interface Window {
        electronAPI?: {
            isElectron: boolean;
            getAllRuns_batch: () => Promise<any[]>;
            saveRun_batch: (run: any) => Promise<void>;
            clearAllRuns_batch: () => Promise<void>;

            getAllRuns_category_batch: () => Promise<StoredRun[]>;
            saveRun_category_batch: (run: StoredRun) => Promise<void>;
            clearAllRuns_category_batch: () => Promise<void>;

            getAllRuns_accuracy: () => Promise<StoredRun[]>;
            saveRun_accuracy: (run: StoredRun) => Promise<void>;
            clearAllRuns_accuracy: () => Promise<void>;

            getAllRuns_single: () => Promise<StoredRun[]>;
            saveRun_single: (run: StoredRun) => Promise<void>;
            clearAllRuns_single: () => Promise<void>;
        };
    }
}
export { };