import { puter } from "@heyputer/puter.js";
import { getOrCreateHostingConfig, uploadImageToHosting } from "./puter.hosting";
import { isHostedUrl } from "./utils";

const PROJECT_KEY_PREFIX = "planova:project:";

export const signIn = async () => await puter.auth.signIn();

export const signOut = async () => await puter.auth.signOut();

export const getCurrentUser = async () => {
    try {
        return await puter.auth.getUser();
    } catch {
        return null;
    }
};

export const createProject = async ({
    item,
    visibility = "private",
}: CreateProjectParams): Promise<DesignItem | null> => {
    try {
        const hosting = await getOrCreateHostingConfig();

        const hostedSource = item.id
            ? await uploadImageToHosting({
                  hosting,
                  url: item.sourceImage,
                  projectId: item.id,
                  label: "source",
              })
            : null;

        const hostedRender =
            item.id && item.renderedImage
                ? await uploadImageToHosting({
                      hosting,
                      url: item.renderedImage,
                      projectId: item.id,
                      label: "rendered",
                  })
                : null;

        const resolvedSource =
            hostedSource?.url ??
            (isHostedUrl(item.sourceImage) ? item.sourceImage : null);

        if (!resolvedSource) {
            console.warn("Failed to host source image, skipping save.");
            return null;
        }

        const resolvedRender =
            hostedRender?.url ??
            (item.renderedImage && isHostedUrl(item.renderedImage)
                ? item.renderedImage
                : null);

        const {
            sourcePath: _sourcePath,
            renderedPath: _renderedPath,
            publicPath: _publicPath,
            ...rest
        } = item;

        const payload: DesignItem = {
            ...rest,
            sourceImage: resolvedSource,
            renderedImage: resolvedRender,
            isPublic: visibility === "public",
        };

        const saved = await puter.kv.set(`${PROJECT_KEY_PREFIX}${item.id}`, payload);
        return saved ? payload : null;
    } catch (e) {
        console.error("Failed to save project", e);
        return null;
    }
};
