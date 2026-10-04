

export const svgNs = "http://www.w3.org/2000/svg";

export function createSvg(tag) {
    return document.createElementNS(svgNs, tag);
}

