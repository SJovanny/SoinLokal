export interface StrokeData {
  path: string;
  color: string;
  width: number;
}

export function serializeSignatureToSVG(strokes: StrokeData[]): string {
  const pathsXML = strokes
    .map(
      (s) =>
        `<path d="${s.path}" stroke="${s.color}" stroke-width="${s.width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 350 250" width="350" height="250">
  <rect width="100%" height="100%" fill="white"/>
  ${pathsXML}
</svg>`;
}
