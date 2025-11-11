import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processKeysRmActions, executeS3Remove, createRmActions } from "./s3RmCommands";
import { S3Report } from "../types/S3Report";
import { S3CommandStatus, S3CommandType, S3Layout } from "../types/S3Command";
import { checkS3Objects } from "./s3CommandUtils";
import { removeS3Object } from "./awsS3Utils";

vi.mock(import("../../src/utils/s3CommandUtils"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    // your mocked methods
    checkS3Objects: vi.fn(),
  }
})

vi.mock("../../src/utils/awsS3Utils", () => ({
  removeS3Object: vi.fn(),
}));

describe("processKeysRmActions", () => {
  let s3Report: S3Report;

  beforeEach(() => {
    s3Report = {
      bucketUri: "s3://test-bucket",
      bucketUriRegion: "s3://test-bucket:region://us-west-2",
      sitemapFileLocator: "s3://test-bucket/sitemap.xml",
      s3PathLayoutNew: S3Layout.SINGLE,
      paths: [],
      pathsExcluded: [],
      isExecute: false,
      keysAll: [],
      keysStatus: {},
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should generate remove commands for flat and index keys when the same key exists", async () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    vi.mocked(checkS3Objects).mockResolvedValue({
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    });

    const result = await processKeysRmActions(s3Report);

    expect(result.s3RemoveCommands).toHaveLength(2);
    expect(result.s3RemoveCommands[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/flat.html",
    });
    expect(result.s3RemoveCommands[1]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/index.html",
    });
  });

  it("should skip generating remove commands when the same key does not exist", async () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    vi.mocked(checkS3Objects).mockResolvedValue({
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    });

    const result = await processKeysRmActions(s3Report);

    expect(result.s3RemoveCommands).toHaveLength(0);
    expect(result.s3RemoveKeysSkipped).toHaveLength(2);
    expect(result.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/flat.html",
    });
    expect(result.s3RemoveKeysSkipped[1]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/index.html",
    });
  });

  it("should skip generating remove commands when same key exist", async () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    vi.mocked(checkS3Objects).mockResolvedValue({
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    });

    const result = await processKeysRmActions(s3Report);

    expect(result.s3RemoveCommands).toHaveLength(0);
    expect(result.s3RemoveKeysSkipped).toHaveLength(1);
    expect(result.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.LAYOUT_OPTIMIZED
    });
  });

  it("should handle duplicate targets and skip generating commands", async () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    vi.mocked(checkS3Objects).mockResolvedValue({
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    });

    const result = await processKeysRmActions(s3Report);

    expect(result.s3RemoveCommands).toHaveLength(2);
    expect(result.s3RemoveKeysSkipped).toHaveLength(0);
  });
});

describe("executeS3Remove", () => {
  it("should execute the remove command for a given key", async () => {
    vi.mocked(removeS3Object).mockResolvedValue();

    const result = await executeS3Remove("s3://test-bucket", "path/to/remove.html");

    expect(removeS3Object).toHaveBeenCalledWith("s3://test-bucket", "path/to/remove.html");
    expect(result).toEqual(undefined);
  });

  it("should handle errors during remove execution", async () => {
    vi.mocked(removeS3Object).mockRejectedValue(new Error("Remove failed"));

    await expect(executeS3Remove("s3://test-bucket", "path/to/remove.html")).rejects.toThrow("Remove failed");
  });
});

describe("createRmActions SINGLE", () => {
  let s3Report: S3Report;

  beforeEach(() => {
    s3Report = {
      bucketUri: "s3://test-bucket",
      bucketUriRegion: "s3://test-bucket:region://us-west-2",
      sitemapFileLocator: "s3://test-bucket/sitemap.xml",
      s3PathLayoutNew: S3Layout.SINGLE,
      paths: [],
      pathsExcluded: [],
      keysAll: [],
      keysStatus: {},
      isExecute: false,
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should generate remove commands for flat and index keys when the same key exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(2);
    expect(s3Report.s3RemoveCommands[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/flat.html",
    });
    expect(s3Report.s3RemoveCommands[1]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/index.html",
    });
  });

  it("should skip generating remove commands when no target keys exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.LAYOUT_OPTIMIZED
    });

  });

  it("should handle generating flat remove commands", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
    expect(s3Report.s3RemoveCommands[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/flat.html",
    });
  });

  it("should handle generating index remove commands", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
    expect(s3Report.s3RemoveCommands[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/index.html",
    });
  });


  it("should skip generating removes for target keys 'index' and 'flat' when the source key 'same' does not exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(2);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/flat.html",
    });
    expect(s3Report.s3RemoveKeysSkipped[1]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/index.html",
    });
  });

  it("should skip generating remove for target keys 'index' when the source key 'same' does not exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/index.html",
    });
  });

  it("should skip generating remove for target keys 'flat' when the source key 'same' does not exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/flat.html",
    });
  });

  it("should skip generating removes when 'flat', 'index', and 'same'", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
  });
});

describe("createRmActions DOUBLE layout", () => {
  let s3Report: S3Report;

  beforeEach(() => {
    s3Report = {
      bucketUri: "s3://test-bucket",
      bucketUriRegion: "s3://test-bucket:region://us-west-2",
      sitemapFileLocator: "s3://test-bucket/sitemap.xml",
      s3PathLayoutNew: S3Layout.DOUBLE,
      paths: [],
      pathsExcluded: [],
      keysAll: [],
      keysStatus: {},
      isExecute: false,
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should generate remove commands for flat and index keys when the same key exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(1);
    expect(s3Report.s3RemoveCommands[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/flat.html",
    });
  });

  it("should not generate or skip remove commands when no target keys exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
  });

  it("should handle generating flat remove commands", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
    expect(s3Report.s3RemoveCommands[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/flat.html",
    });
  });

  it("should handle not generating remove actions when keys are already DOUBLE layout", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.LAYOUT_OPTIMIZED,
    });
  });


  it("should skip generating removes for target keys 'index' and 'flat' when the source key 'same' does not exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/flat.html",
    });
  });

  it("should skip generating remove for target keys 'index' when the source key 'same' does not exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
  });

  it("should skip generating remove for target keys 'flat' when the source key 'same' does not exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.NO_SOURCE,
      targetKey: "path/to/flat.html",
    });
  });

  it("should skip generating removes when 'flat', 'index', and 'same'", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
  });
});


describe("createRmActions with undefined keys and unsupported layout", () => {
  let s3Report: S3Report;

  beforeEach(() => {
    s3Report = {
      bucketUri: "s3://test-bucket",
      bucketUriRegion: "s3://test-bucket:region://us-west-2",
      sitemapFileLocator: "s3://test-bucket/sitemap.xml",
      s3PathLayoutNew: S3Layout.SINGLE,
      paths: [],
      pathsExcluded: [],
      keysAll: [],
      keysStatus: {},
      isExecute: false,
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should skip generating commands when keysAll contains undefined keys", () => {
    s3Report.keysAll = [undefined, "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(1);
    expect(s3Report.s3RemoveKeysSkipped[0]).toMatchObject({
      commandType: S3CommandType.REMOVE,
      commandStatus: S3CommandStatus.ERROR_KEYS_UNDEFINED,
      targetKey: "path/to/flat.html",
    });

  });

  it("should skip generating commands when the layout is unsupported", () => {
    s3Report.s3PathLayoutNew = S3Layout.UNKNOWN;
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createRmActions(objectKeysFound, s3Report);

    expect(s3Report.s3RemoveCommands).toHaveLength(0);
    expect(s3Report.s3RemoveKeysSkipped).toHaveLength(0);
  });
});
