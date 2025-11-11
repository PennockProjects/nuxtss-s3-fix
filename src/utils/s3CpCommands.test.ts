import { describe, it, expect, beforeEach } from 'vitest';
import { createCpActions } from "./s3CpCommands";
import { S3Report } from "../types/S3Report";
import { S3CommandStatus, S3Layout, S3CommandType} from "../types/S3Command";

describe("createCpActions validate input", () => {
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
      isExecute: true,
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should skip generating a command when keysAll is empty", () => {
    s3Report.keysAll = [];
    const objectKeysFound = {};

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(0);
  });

  it("should skip generating a command when objectKeysFound is empty", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {};

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(0);
  });

  it("should do nothing when all keys are undefined", () => {
    s3Report.keysAll = [undefined, undefined, undefined];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.ERROR_KEYS_UNDEFINED,
      targetKey: undefined,
    });
  });

  it("should do nothing when keysAll contains invalid paths", () => {
    s3Report.keysAll = ["", "invalid-path", null];
    const objectKeysFound = {
      "": false,
      "invalid-path": false,
      null: false,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.ERROR_KEYS_UNDEFINED,
      targetKey: "",
    });

  });

    it("should do nothing when keysAll is empty", () => {
    s3Report.keysAll = [];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(0);
  });

});


describe("createCpActions for Single Layout", () => {
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
      isExecute: true,
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should skip generating a command when no sources exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };
    // 000

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(0);
  });

  it("should generate a copy command when the index source exists and the target does not", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };
    // 001

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/same.html",
      sourceKey: "path/to/index.html",
      sourceLayout: S3Layout.INDEX,
    });
  });

  it("should generate a copy command when the flat source exists and the target does not", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };
    // 010

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/same.html",
      sourceKey: "path/to/flat.html",
      sourceLayout: S3Layout.FLAT,
    });
  });

  it("should generate a copy index to same key, when both index and same keys already exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };
    // 011

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/same.html",
      sourceKey: "path/to/index.html",
      sourceLayout: S3Layout.MIXED,
    });
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(0);
  });

  it("should skip generating a command when same key and index key already exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };
    // 101

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/same.html",
    });
  });

  it("should skip generating a command when same key and flat key already exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };
    // 110

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/same.html",
    });
  });

  it("should skip generating a command when same, flat, and index keys already exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };
    // 111

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/same.html",
    });
  });

    it("should skip generating commands when keysAll contains undefined keys", () => {
      s3Report.keysAll = ["path/to/same.html", undefined, "path/to/index.html"];
      const objectKeysFound = {
        "path/to/flat.html": true,
        "path/to/index.html": true,
      };
  
      createCpActions(objectKeysFound, s3Report);
  
      expect(s3Report.s3CopyCommands).toHaveLength(0);
      expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
      expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
        commandType: S3CommandType.COPY,
        commandStatus: S3CommandStatus.ERROR_KEYS_UNDEFINED,
        targetKey: "path/to/same.html",
      });
  
    });
  
});

describe("createCpActions for Double", () => {
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
      isExecute: true,
      s3CopyCommands: [],
      s3RemoveCommands: [],
      s3CopyCommandsSkipped: [],
      s3RemoveKeysSkipped: [],
    };
  });

  it("should skip generating a command when no sources exist", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(0);
  });

  it("should generate a copy command for index key to same key when only index key exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/same.html",
      sourceKey: "path/to/index.html",
      sourceLayout: S3Layout.INDEX,
    });
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/index.html",
    });
  });

  it("should generate two copy commands, one flat to same key and one for flat to index, when only the flat key exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(2);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/same.html",
      sourceKey: "path/to/flat.html",
      sourceLayout: S3Layout.FLAT,
    });
    expect(s3Report.s3CopyCommands[1]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/index.html",
      sourceKey: "path/to/flat.html",
      sourceLayout: S3Layout.FLAT,
    });
  });

  it("should generate a copy command for index to same key, when both index and flat exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": false,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/same.html",
      sourceKey: "path/to/index.html",
      sourceLayout: S3Layout.INDEX,
    });
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/index.html",
    });
  });

  it("should generate a copy from same to index key, when only the same key exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": false,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/index.html",
      sourceKey: "path/to/same.html",
      sourceLayout: S3Layout.SINGLE,
    });
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/same.html",
    });
  });

  it("should skip generating any commands when same and index keys already exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": false,
      "path/to/index.html": true,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.LAYOUT_OPTIMIZED,
      targetKey: "path/to/same.html",
    });
  });

  it("should generate a command to copy flat to index key when same and flat keys already exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": false,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(1);
    expect(s3Report.s3CopyCommands[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.GENERATED,
      targetKey: "path/to/index.html",
      sourceKey: "path/to/same.html",
      sourceLayout: S3Layout.MIXED,
    });
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/same.html",
    });
  });

  it("should skip generating commands when same, flat, and index keys already exists", () => {
    s3Report.keysAll = ["path/to/same.html", "path/to/flat.html", "path/to/index.html"];
    const objectKeysFound = {
      "path/to/same.html": true,
      "path/to/flat.html": true,
      "path/to/index.html": true,
    };

    createCpActions(objectKeysFound, s3Report);

    expect(s3Report.s3CopyCommands).toHaveLength(0);
    expect(s3Report.s3CopyCommandsSkipped).toHaveLength(1);
    expect(s3Report.s3CopyCommandsSkipped[0]).toMatchObject({
      commandType: S3CommandType.COPY,
      commandStatus: S3CommandStatus.TARGET_EXISTS,
      targetKey: "path/to/same.html",
    });
  });

});

