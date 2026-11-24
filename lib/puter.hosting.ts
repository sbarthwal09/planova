import { puter } from "@heyputer/puter.js";
import { STORAGE_PATHS } from "./constants";
import {
    HOSTING_CONFIG_KEY,
    createHostingSlug,
    fetchBlobFromUrl,
    getHostedUrl,
    getImageExtension,
    imageUrlToPngBlob,
    isHostedUrl,
} from "./utils";

export const getOrCreateHostingConfig = async (): Promise<HostingConfig | null> => {
    const existing = (await puter.kv.get(HOSTING_CONFIG_KEY)) as HostingConfig | null;

    if (typeof existing?.subdomain === "string" && existing.subdomain) {
        return { subdomain: existing.subdomain };
    }

    const subdomain = createHostingSlug();

    try {
        await puter.fs.mkdir(STORAGE_PATHS.ROOT, { createMissingParents: true }).catch(() => undefined);
        const created = await puter.hosting.create(subdomain, STORAGE_PATHS.ROOT);
        const config: HostingConfig = { subdomain: created.subdomain || subdomain };
        await puter.kv.set(HOSTING_CONFIG_KEY, config);
        return config;
    } catch (e) {
        console.warn(`Could not create hosting: ${e}`);
        return null;
    }
};

export const uploadImageToHosting = async ({
    hosting,
    url,
    projectId,
    label,
}: StoreHostedImageParams): Promise<HostedAsset | null> => {
    if (!hosting?.subdomain || !url || !projectId) return null;
    if (isHostedUrl(url)) return { url };

    try {
        const resolved =
            label === "rendered"
                ? await imageUrlToPngBlob(url).then((blob) =>
                      blob ? { blob, contentType: "image/png" } : null,
                  )
                : await fetchBlobFromUrl(url);

        if (!resolved) return null;

        const contentType =
            resolved.contentType || resolved.blob.type || "application/octet-stream";
        const ext = getImageExtension(contentType, url);
        const fileName = `${label}.${ext}`;
        const relativePath = `project/${projectId}/${fileName}`;
        const filePath = `${STORAGE_PATHS.ROOT}/${relativePath}`;

        await puter.fs.mkdir(`${STORAGE_PATHS.ROOT}/project/${projectId}`, {
            createMissingParents: true,
        });
        await puter.fs.write(
            filePath,
            new File([resolved.blob], fileName, { type: contentType }),
        );

        const hostedUrl = getHostedUrl(hosting, relativePath);
        return hostedUrl ? { url: hostedUrl } : null;
    } catch (e) {
        console.warn(`Failed to store hosted image: ${e}`);
        return null;
    }
};
