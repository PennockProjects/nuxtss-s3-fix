export enum S3CommandStatus {
    DUPLICATE_SOURCES = "duplicate-sources",
    DUPLICATE_TARGETS = "duplicate-targets",
    ERROR = "error",
    ERROR_NO_KEYS = "error-no-keys",
    ERROR_KEYS_UNDEFINED = "error-keys-undefined",
    GENERATED = "generated",
    NO_SOURCE = "no-source",
    NO_TARGET = "no-target",
    NOT_CHECKED = "not-checked",
    SKIPPED = "skipped",
    TARGET_EXISTS = "target-exists",
    UNKNOWN = "unknown"
}

export enum S3Layout {
    FLAT = "flat",
    INDEX = "index",
    SAME_AND_INDEX = "sameAndIndex",
    SAME_AND_FLAT = "sameAndFlat",
    SAME_AS_DIRECTORY = "sameAsDir",
    UNKNOWN = "unknown"
}

export interface S3Command {
    command: string,
    commandType: string, // "cp" | "rm"
    commandStatus: S3CommandStatus,
    targetKey: string,
    targetLayout: S3Layout,
    isTarget: boolean, 
    sourceKey: string,
    sourceLayout: S3Layout,
    isSource: boolean,
}
