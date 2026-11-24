import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { STORAGE_PATHS } from "./constants";
import { HOSTING_CONFIG_KEY } from "./utils";

const mocks = vi.hoisted(() => ({
    kvGet: vi.fn(),
    kvSet: vi.fn(),
    hostingCreate: vi.fn(),
    fsMkdir: vi.fn(),
    fsWrite: vi.fn(),
    imageUrlToPngBlob: vi.fn(),
}));

vi.mock("@heyputer/puter.js", () => ({
    puter: {
        kv: { get: mocks.kvGet, set: mocks.kvSet },
        hosting: { create: mocks.hostingCreate },
        fs: { mkdir: mocks.fsMkdir, write: mocks.fsWrite },
    },
}));

vi.mock("./utils", async (importOriginal) => {
    const actual = await importOriginal<typeof import("./utils")>();
    return { ...actual, imageUrlToPngBlob: mocks.imageUrlToPngBlob };
});

import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";

beforeEach(() => {
    vi.clearAllMocks();
    mocks.kvGet.mockResolvedValue(null);
    mocks.kvSet.mockResolvedValue(true);
    mocks.hostingCreate.mockResolvedValue({ subdomain: "planova-generated" });
    mocks.fsMkdir.mockResolvedValue(undefined);
    mocks.fsWrite.mockResolvedValue(undefined);
    mocks.imageUrlToPngBlob.mockResolvedValue(null);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getOrCreateHostingConfig", () => {
    it("reuses a saved subdomain", async () => {
        mocks.kvGet.mockResolvedValueOnce({ subdomain: "saved-subdomain" });

        await expect(getOrCreateHostingConfig()).resolves.toEqual({
            subdomain: "saved-subdomain",
        });
        expect(mocks.hostingCreate).not.toHaveBeenCalled();
    });

    it("creates, persists and returns a new subdomain", async () => {
        const config = await getOrCreateHostingConfig();

        expect(mocks.fsMkdir).toHaveBeenCalledWith(STORAGE_PATHS.ROOT, {
            createMissingParents: true,
        });
        expect(mocks.hostingCreate).toHaveBeenCalledWith(
            expect.stringMatching(/^planova-/),
            STORAGE_PATHS.ROOT,
        );
        expect(mocks.kvSet).toHaveBeenCalledWith(HOSTING_CONFIG_KEY, config);
        expect(config?.subdomain).toBeTruthy();
    });

    it("returns null when hosting creation fails", async () => {
        mocks.hostingCreate.mockRejectedValueOnce(new Error("quota exceeded"));

        await expect(getOrCreateHostingConfig()).resolves.toBeNull();
        expect(mocks.kvSet).not.toHaveBeenCalled();
    });
});

describe("uploadImageToHosting", () => {
    const hosting = { subdomain: "planova-1" };

    it("skips upload for an already hosted image", async () => {
        const url = "https://planova-1.puter.site/project/p1/source.png";

        await expect(
            uploadImageToHosting({ hosting, url, projectId: "p1", label: "source" }),
        ).resolves.toEqual({ url });
        expect(mocks.fsWrite).not.toHaveBeenCalled();
    });

    it("uploads a data URL source image under the project folder", async () => {
        const result = await uploadImageToHosting({
            hosting,
            url: "data:image/png;base64,aGVsbG8=",
            projectId: "p1",
            label: "source",
        });

        expect(mocks.fsMkdir).toHaveBeenCalledWith("planova/project/p1", {
            createMissingParents: true,
        });
        expect(mocks.fsWrite).toHaveBeenCalledWith(
            "planova/project/p1/source.png",
            expect.objectContaining({ name: "source.png", type: "image/png" }),
        );
        expect(result).toEqual({
            url: "https://planova-1.puter.site/project/p1/source.png",
        });
    });

    it("converts rendered images to PNG before uploading", async () => {
        mocks.imageUrlToPngBlob.mockResolvedValueOnce(new Blob(["png"], { type: "image/png" }));

        const result = await uploadImageToHosting({
            hosting,
            url: "https://example.com/render.jpeg",
            projectId: "p1",
            label: "rendered",
        });

        expect(mocks.imageUrlToPngBlob).toHaveBeenCalledWith("https://example.com/render.jpeg");
        expect(mocks.fsWrite).toHaveBeenCalledWith(
            "planova/project/p1/rendered.png",
            expect.objectContaining({ name: "rendered.png", type: "image/png" }),
        );
        expect(result).toEqual({
            url: "https://planova-1.puter.site/project/p1/rendered.png",
        });
    });

    it("returns null when the image cannot be fetched", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

        await expect(
            uploadImageToHosting({
                hosting,
                url: "https://example.com/missing.png",
                projectId: "p1",
                label: "source",
            }),
        ).resolves.toBeNull();
        expect(mocks.fsWrite).not.toHaveBeenCalled();
    });

    it("returns null without hosting config", async () => {
        await expect(
            uploadImageToHosting({
                hosting: null,
                url: "data:image/png;base64,aGk=",
                projectId: "p1",
                label: "source",
            }),
        ).resolves.toBeNull();
    });
});
