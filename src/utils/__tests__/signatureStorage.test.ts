import { serializeSignatureToSVG, type StrokeData } from '../signatureStorage';

describe('serializeSignatureToSVG', () => {
  it('generates valid SVG with no strokes', () => {
    const svg = serializeSignatureToSVG([]);
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain('<svg xmlns=');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('fill="white"');
  });

  it('includes a path for each stroke', () => {
    const strokes: StrokeData[] = [
      { path: 'M 10 10 L 20 20', color: '#000000', width: 2 },
      { path: 'M 30 30 L 40 40', color: '#FF0000', width: 3 },
    ];
    const svg = serializeSignatureToSVG(strokes);
    expect(svg).toContain('d="M 10 10 L 20 20"');
    expect(svg).toContain('stroke="#000000"');
    expect(svg).toContain('stroke-width="2"');
    expect(svg).toContain('d="M 30 30 L 40 40"');
    expect(svg).toContain('stroke="#FF0000"');
    expect(svg).toContain('stroke-width="3"');
  });

  it('sets correct SVG viewBox and dimensions', () => {
    const svg = serializeSignatureToSVG([]);
    expect(svg).toContain('viewBox="0 0 350 250"');
    expect(svg).toContain('width="350"');
    expect(svg).toContain('height="250"');
  });

  it('uses proper SVG attributes for paths', () => {
    const strokes: StrokeData[] = [
      { path: 'M 0 0', color: '#000', width: 1 },
    ];
    const svg = serializeSignatureToSVG(strokes);
    expect(svg).toContain('fill="none"');
    expect(svg).toContain('stroke-linecap="round"');
    expect(svg).toContain('stroke-linejoin="round"');
  });
});
