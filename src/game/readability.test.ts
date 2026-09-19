import { expect, it } from 'vitest';
import { overlaps, placeLabels, placeFloatingLabel } from './readability';

it('keeps labels off neighboring animal silhouettes', () => {
  const anchor = { id: 'a', x: 400, y: 300, width: 78, height: 44 };
  const silhouette = { id: 'b', x: 400, y: 310, width: 80, height: 70 };
  const [label] = placeLabels([anchor], { width: 960, height: 640 }, [
    silhouette,
  ]);
  expect(overlaps(label, silhouette)).toBe(false);
});

it('places new damage text around existing labels without relocating them', () => {
  const anchor = { id: 'damage', x: 400, y: 300, width: 42, height: 22 };
  const occupied = [{ ...anchor, id: 'old' }];
  const copy = structuredClone(occupied);
  expect(
    overlaps(
      placeFloatingLabel(anchor, occupied, { width: 960, height: 640 }),
      occupied[0],
    ),
  ).toBe(false);
  expect(occupied).toEqual(copy);
});

it('separates crowded health labels deterministically and keeps them within the arena', () => {
  const anchors = Array.from({ length: 12 }, (_, i) => ({
    id: `unit-${i}`,
    x: 450 + (i % 3) * 12,
    y: 350 + Math.floor(i / 3) * 12,
    width: 64,
    height: 26,
  }));
  const labels = placeLabels(anchors, { width: 960, height: 640 });
  expect(
    placeLabels([...anchors].reverse(), { width: 960, height: 640 }),
  ).toEqual(labels);
  for (const [i, label] of labels.entries()) {
    expect(label.x - label.width / 2).toBeGreaterThanOrEqual(0);
    expect(label.y).toBeGreaterThanOrEqual(78);
    for (const other of labels.slice(i + 1))
      expect(overlaps(label, other)).toBe(false);
  }
});
