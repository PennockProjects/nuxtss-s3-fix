export interface S3Command {
    command: string,
    commandType: string, // "cp" | "rm"
    commandStatus: string, // "generated" | "source-not-found" | "duplicate-sources" | 
                           // "target-not-found' | "duplicate-targets" | "skipped" | "error" | "error-unknown"
    targetKey: string,
    targetLayout: string,   // "flat" | "index" | "same"
    isTarget: boolean, 
    sourceKey: string,
    sourceLayout: string,   // "flat" | "index" | "same"
    isSource: boolean,
}
