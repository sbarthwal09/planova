import { describe, expect, it } from "vitest";
import { getVisualizerState } from "./home";

describe("getVisualizerState", () => {
    it("maps a saved project into visualizer navigation state", () => {
        expect(
            getVisualizerState({
                id: "p1",
                name: "Residence p1",
                sourceImage: "https://planova-1.puter.site/project/p1/source.png",
                renderedImage: "https://planova-1.puter.site/project/p1/rendered.png",
                timestamp: 123,
            }),
        ).toEqual({
            initialImage: "https://planova-1.puter.site/project/p1/source.png",
            initialRender: "https://planova-1.puter.site/project/p1/rendered.png",
            name: "Residence p1",
        });
    });

    it("handles a missing rendered image and name", () => {
        expect(
            getVisualizerState({
                id: "p2",
                sourceImage: "data:image/png;base64,AAA",
                timestamp: 456,
            }),
        ).toEqual({
            initialImage: "data:image/png;base64,AAA",
            initialRender: null,
            name: undefined,
        });
    });
});
