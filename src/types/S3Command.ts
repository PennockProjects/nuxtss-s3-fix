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
    LAYOUT_OPTIMIZED = "layout-optimized",
    SKIPPED = "skipped",
    TARGET_EXISTS = "target-exists",
    UNKNOWN = "unknown"
}

export enum S3Layout {
    FLAT = "flat",
    INDEX = "index",
    DOUBLE = "double",
    MIXED = "mixed",
    SINGLE = "single",
    UNKNOWN = "unknown"
}

export enum S3CommandType {
    COPY = "copy",
    REMOVE = "remove"
}

export interface S3Command {
    command: string,
    commandType: S3CommandType,
    commandStatus: S3CommandStatus,
    targetKey: string,
    targetLayout: S3Layout,
    isTarget: boolean, 
    sourceKey: string,
    sourceLayout: S3Layout,
    isSource: boolean,
}
