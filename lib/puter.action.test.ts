import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
    signIn: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn(),
    kvSet: vi.fn(),
    kvList: vi.fn(),
    getOrCreateHostingConfig: vi.fn(),
    uploadImageToHosting: vi.fn(),
}));

vi.mock("@heyputer/puter.js", () => ({
    puter: {
        auth: {
            signIn: mocks.signIn,
            signOut: mocks.signOut,
            getUser: mocks.getUser,
        },
        kv: { set: mocks.kvSet, list: mocks.kvList },
    },
}));

vi.mock("./puter.hosting", () => ({
    getOrCreateHostingConfig: mocks.getOrCreateHostingConfig,
    uploadImageToHosting: mocks.uploadImageToHosting,
}));

import { createProject, getCurrentUser, listProjects, signIn, signOut } from "./puter.action";

const baseItem: DesignItem = {
    id: "p1",
    name: "Residence p1",
    sourceImage: "data:image/png;base64,AAA",
    renderedImage: null,
    timestamp: 123,
};

const hosting = { subdomain: "planova-1" };

beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrCreateHostingConfig.mockResolvedValue(hosting);
    mocks.uploadImageToHosting.mockImplementation(
        async ({ label }: StoreHostedImageParams) => ({
            url: `https://planova-1.puter.site/project/p1/${label}.png`,
        }),
    );
    mocks.kvSet.mockResolvedValue(true);
    mocks.kvList.mockResolvedValue([]);
});

describe("auth actions", () => {
    it("delegates sign in and sign out to Puter", async () => {
        mocks.signIn.mockResolvedValueOnce("signed-in");
        mocks.signOut.mockResolvedValueOnce("signed-out");

        await expect(signIn()).resolves.toBe("signed-in");
        await expect(signOut()).resolves.toBe("signed-out");
    });

    it("returns null when the current user cannot be loaded", async () => {
        mocks.getUser.mockRejectedValueOnce(new Error("not signed in"));

        await expect(getCurrentUser()).resolves.toBeNull();
    });
});

describe("listProjects", () => {
    it("returns valid projects newest first", async () => {
        mocks.kvList.mockResolvedValueOnce([
            { key: "planova:project:old", value: { ...baseItem, id: "old", timestamp: 10 } },
            { key: "planova:project:new", value: { ...baseItem, id: "new", timestamp: 20 } },
        ]);

        await expect(listProjects()).resolves.toEqual([
            expect.objectContaining({ id: "new", timestamp: 20 }),
            expect.objectContaining({ id: "old", timestamp: 10 }),
        ]);
        expect(mocks.kvList).toHaveBeenCalledWith("planova:project:*", true);
    });

    it("filters out malformed records", async () => {
        mocks.kvList.mockResolvedValueOnce([
            { key: "bad-id", value: { ...baseItem, id: 1 } },
            { key: "bad-image", value: { ...baseItem, sourceImage: null } },
            { key: "bad-time", value: { ...baseItem, timestamp: "yesterday" } },
            { key: "good", value: baseItem },
        ]);

        await expect(listProjects()).resolves.toEqual([baseItem]);
    });
});

describe("createProject", () => {
    it("hosts the source image and saves a private project", async () => {
        const result = await createProject({ item: baseItem });

        expect(mocks.uploadImageToHosting).toHaveBeenCalledWith({
            hosting,
            url: baseItem.sourceImage,
            projectId: "p1",
            label: "source",
        });
        expect(mocks.kvSet).toHaveBeenCalledWith(
            "planova:project:p1",
            expect.objectContaining({
                id: "p1",
                sourceImage: "https://planova-1.puter.site/project/p1/source.png",
                renderedImage: null,
                isPublic: false,
            }),
        );
        expect(result?.isPublic).toBe(false);
    });

    it("marks public projects and uploads rendered images", async () => {
        const item: DesignItem = {
            ...baseItem,
            renderedImage: "data:image/png;base64,BBB",
        };

        const result = await createProject({ item, visibility: "public" });

        expect(mocks.uploadImageToHosting).toHaveBeenCalledWith(
            expect.objectContaining({ label: "rendered", url: item.renderedImage }),
        );
        expect(result).toEqual(
            expect.objectContaining({
                sourceImage: "https://planova-1.puter.site/project/p1/source.png",
                renderedImage: "https://planova-1.puter.site/project/p1/rendered.png",
                isPublic: true,
            }),
        );
    });

    it("returns null without saving when the source image cannot be hosted", async () => {
        mocks.uploadImageToHosting.mockResolvedValueOnce(null);

        await expect(createProject({ item: baseItem })).resolves.toBeNull();
        expect(mocks.kvSet).not.toHaveBeenCalled();
    });

    it("keeps an already hosted source image when re-saving", async () => {
        const item: DesignItem = {
            ...baseItem,
            sourceImage: "https://planova-1.puter.site/old/source.png",
        };
        mocks.uploadImageToHosting.mockResolvedValueOnce(null);

        const result = await createProject({ item });

        expect(result?.sourceImage).toBe(item.sourceImage);
        expect(mocks.kvSet).toHaveBeenCalled();
    });

    it("returns null when the save itself fails", async () => {
        mocks.kvSet.mockResolvedValueOnce(false);

        await expect(createProject({ item: baseItem })).resolves.toBeNull();
    });

    it("drops stale storage path fields from the saved payload", async () => {
        const result = await createProject({
            item: {
                ...baseItem,
                sourcePath: "old/source.png",
                renderedPath: "old/rendered.png",
                publicPath: "old/public.png",
            },
        });

        expect(result).not.toHaveProperty("sourcePath");
        expect(result).not.toHaveProperty("renderedPath");
        expect(result).not.toHaveProperty("publicPath");
    });
});
