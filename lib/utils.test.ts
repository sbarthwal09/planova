import { afterEach, describe, expect, it, vi } from "vitest";
import {
    HOSTING_CONFIG_KEY,
    HOSTING_DOMAIN_SUFFIX,
    createHostingSlug,
    dataUrlToBlob,
    fetchBlobFromUrl,
    getHostedUrl,
    getImageExtension,
    imageUrlToPngBlob,
    isHostedUrl,
} from "./utils";

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("hosting helpers", () => {
    it("exposes stable hosting constants", () => {
        expect(HOSTING_CONFIG_KEY).toBe("planova_hosting_config");
        expect(HOSTING_DOMAIN_SUFFIX).toBe(".puter.site");
    });

    it("accepts only real puter subdomain URLs", () => {
        expect(isHostedUrl("https://planova-1.puter.site/project/a/source.png")).toBe(true);
        expect(isHostedUrl("https://planova-1.puter.site")).toBe(true);
        expect(isHostedUrl("https://example.com/?next=planova.puter.site")).toBe(false);
        expect(isHostedUrl("https://puter.site/file.png")).toBe(false);
        expect(isHostedUrl("data:image/png;base64,AAA")).toBe(false);
        expect(isHostedUrl(123)).toBe(false);
        expect(isHostedUrl(null)).toBe(false);
    });

    it("creates unique slugs", () => {
        const first = createHostingSlug();
        const second = createHostingSlug();

        expect(first).toMatch(/^planova-[0-9a-z]+-[0-9a-z]+$/);
        expect(first).not.toBe(second);
    });

    it("builds hosted URLs from bare or qualified subdomains", () => {
        expect(getHostedUrl({ subdomain: "planova-1" }, "project/a/source.png")).toBe(
            "https://planova-1.puter.site/project/a/source.png",
        );
        expect(
            getHostedUrl({ subdomain: "planova-1.puter.site" }, "/project/a/source.png"),
        ).toBe("https://planova-1.puter.site/project/a/source.png");
        expect(getHostedUrl({ subdomain: "" }, "project/a/source.png")).toBeNull();
    });
});

describe("image helpers", () => {
    it("normalizes image extensions from content types, data URLs and paths", () => {
        expect(getImageExtension("image/jpeg", "")).toBe("jpg");
        expect(getImageExtension("image/jpg", "")).toBe("jpg");
        expect(getImageExtension("image/svg+xml", "")).toBe("svg");
        expect(getImageExtension("", "data:image/svg+xml;base64,AAA")).toBe("svg");
        expect(getImageExtension("", "https://example.com/plan.webp?v=1")).toBe("webp");
        expect(getImageExtension("application/octet-stream", "plan")).toBe("png");
    });

    it("decodes base64 and plain data URLs", async () => {
        const base64 = dataUrlToBlob("data:image/png;base64,aGVsbG8=");
        expect(base64?.contentType).toBe("image/png");
        expect(await base64?.blob.text()).toBe("hello");

        const plain = dataUrlToBlob("data:text/plain;charset=utf-8,hello%20world");
        expect(plain?.contentType).toBe("text/plain");
        expect(await plain?.blob.text()).toBe("hello world");
    });

    it("rejects malformed data URLs", () => {
        expect(dataUrlToBlob("not-a-data-url")).toBeNull();
        expect(dataUrlToBlob("data:image/png;base64,%%%")).toBeNull();
    });

    it("fetches remote blobs and reports failures as null", async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            blob: async () => new Blob(["remote"], { type: "image/png" }),
            headers: new Map([["content-type", "image/png"]]),
        });
        vi.stubGlobal("fetch", fetchMock);

        const remote = await fetchBlobFromUrl("https://example.com/plan.png");
        expect(fetchMock).toHaveBeenCalledWith("https://example.com/plan.png");
        expect(remote?.contentType).toBe("image/png");
        expect(await remote?.blob.text()).toBe("remote");

        fetchMock.mockResolvedValueOnce({ ok: false });
        await expect(fetchBlobFromUrl("https://example.com/missing.png")).resolves.toBeNull();

        const local = await fetchBlobFromUrl("data:image/png;base64,aGk=");
        expect(await local?.blob.text()).toBe("hi");
    });

    it("returns null when there is no browser canvas", async () => {
        await expect(imageUrlToPngBlob("https://example.com/plan.png")).resolves.toBeNull();
    });
});
