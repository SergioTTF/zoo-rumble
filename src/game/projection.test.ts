import { expect, it } from 'vitest';
import {
  cellAt,
  clientCell,
  project,
  tileCorners,
  unitDepth,
} from './projection';

it('round trips every cell and points inside its diamond', () => {
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 8; x++) {
      const p = project({ x, y });
      expect(cellAt(p.x, p.y)).toEqual({ x, y });
      for (const corner of tileCorners({ x, y }))
        expect(
          cellAt(p.x + (corner.x - p.x) * 0.9, p.y + (corner.y - p.y) * 0.9),
        ).toEqual({ x, y });
    }
});
it('rejects off-platform drops and supports resized canvases', () => {
  expect(cellAt(0, 0)).toBeNull();
  expect(cellAt(350, 60)).toBeNull();
  expect(cellAt(950, 500)).toBeNull();
  const p = project({ x: 2, y: 3 });
  expect(
    clientCell(20 + p.x / 2, 80 + p.y / 2, {
      left: 20,
      top: 80,
      width: 480,
      height: 320,
    }),
  ).toEqual({ x: 2, y: 3 });
  expect(clientCell(0, 0, { left: 0, top: 0, width: 0, height: 0 })).toBeNull();
});
it('places nearer units above farther units consistently', () => {
  expect(unitDepth({ x: 2, y: 2 })).toBeGreaterThan(unitDepth({ x: 2, y: 1 }));
  expect(unitDepth({ x: 2, y: 1 })).toBeLessThan(unitDepth({ x: 1, y: 2 }));
});

it('puts the player side in the foreground and fits all 48 tiles', () => {
  expect(project({ x: 0, y: 2 }).y).toBeGreaterThan(project({ x: 7, y: 2 }).y);
  for (let y = 0; y < 6; y++)
    for (let x = 0; x < 8; x++) {
      for (const p of tileCorners({ x, y })) {
        expect(p.x).toBeGreaterThan(0);
        expect(p.x).toBeLessThan(960);
        expect(p.y).toBeGreaterThan(90);
        expect(p.y).toBeLessThan(590);
      }
    }
});
