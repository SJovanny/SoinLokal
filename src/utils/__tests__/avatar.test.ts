import {
  getDicebearUrl,
  generateRandomSeed,
  generateAvatarBatch,
  nameToSeed,
} from '../avatar';

describe('getDicebearUrl', () => {
  it('builds a URL with the seed', () => {
    const url = getDicebearUrl('test-seed');
    expect(url).toContain('api.dicebear.com');
    expect(url).toContain('test-seed');
    expect(url).toContain('png');
  });

  it('encodes special characters in seed', () => {
    const url = getDicebearUrl('hello world&foo=bar');
    expect(url).toContain(encodeURIComponent('hello world&foo=bar'));
  });

  it('accepts custom size', () => {
    const url = getDicebearUrl('seed', 512);
    expect(url).toContain('size=512');
  });

  it('defaults to size 256', () => {
    const url = getDicebearUrl('seed');
    expect(url).toContain('size=256');
  });
});

describe('generateRandomSeed', () => {
  it('returns a string of length 16', () => {
    expect(generateRandomSeed()).toHaveLength(16);
  });

  it('contains only alphanumeric characters', () => {
    const seed = generateRandomSeed();
    expect(seed).toMatch(/^[A-Za-z0-9]+$/);
  });

  it('generates different seeds', () => {
    const seeds = new Set(Array.from({ length: 50 }, () => generateRandomSeed()));
    expect(seeds.size).toBe(50);
  });
});

describe('generateAvatarBatch', () => {
  it('returns the requested count', () => {
    expect(generateAvatarBatch(5)).toHaveLength(5);
    expect(generateAvatarBatch(0)).toHaveLength(0);
    expect(generateAvatarBatch(1)).toHaveLength(1);
  });

  it('each element is a valid seed', () => {
    const batch = generateAvatarBatch(10);
    batch.forEach((seed) => {
      expect(typeof seed).toBe('string');
      expect(seed).toHaveLength(16);
    });
  });
});

describe('nameToSeed', () => {
  it('generates deterministic seed from name', () => {
    expect(nameToSeed('Jean', 'Dupont')).toBe('jean.dupont');
  });

  it('trims whitespace', () => {
    expect(nameToSeed('  Jean  ', '  Dupont  ')).toBe('jean.dupont');
  });

  it('lowercases', () => {
    expect(nameToSeed('JEAN', 'DUPONT')).toBe('jean.dupont');
  });

  it('same input gives same output', () => {
    const s1 = nameToSeed('Alice', 'Martin');
    const s2 = nameToSeed('Alice', 'Martin');
    expect(s1).toBe(s2);
  });
});
