export interface LabelAnchor {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}
export function overlaps(a: LabelAnchor, b: LabelAnchor, gap = 4) {
  return (
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 + gap &&
    a.y < b.y + b.height + gap &&
    b.y < a.y + a.height + gap
  );
}
/** Place presentation labels close to their anchors without sharing a rectangle. */
export function placeLabels(
  anchors: readonly LabelAnchor[],
  bounds: { width: number; height: number },
  reserved: readonly LabelAnchor[] = [],
) {
  const placed: LabelAnchor[] = [];
  for (const anchor of [...anchors].sort(
    (a, b) => b.y - a.y || a.id.localeCompare(b.id),
  )) {
    const candidates: LabelAnchor[] = [];
    for (let dy = 0; dy <= 240; dy += 12)
      for (const dx of [0, -44, 44, -88, 88, -132, 132])
        candidates.push({
          ...anchor,
          x: Math.max(
            anchor.width / 2 + 8,
            Math.min(bounds.width - anchor.width / 2 - 8, anchor.x + dx),
          ),
          y: Math.max(
            78,
            Math.min(bounds.height - anchor.height - 8, anchor.y - dy),
          ),
        });
    candidates.sort(
      (a, b) =>
        (a.x - anchor.x) ** 2 +
        (a.y - anchor.y) ** 2 -
        ((b.x - anchor.x) ** 2 + (b.y - anchor.y) ** 2),
    );
    placed.push(
      candidates.find(
        (candidate) =>
          !placed.some((other) => overlaps(candidate, other)) &&
          !reserved.some(
            (other) => other.id !== anchor.id && overlaps(candidate, other),
          ),
      ) ?? candidates[0],
    );
  }
  return placed;
}
export function placeFloatingLabel(
  anchor: LabelAnchor,
  occupied: readonly LabelAnchor[],
  bounds: { width: number; height: number },
) {
  for (let dy = 0; dy <= 240; dy += 24) {
    for (const dx of [0, -48, 48, -96, 96]) {
      const candidate = {
        ...anchor,
        x: Math.max(
          anchor.width / 2 + 8,
          Math.min(bounds.width - anchor.width / 2 - 8, anchor.x + dx),
        ),
        y: Math.max(78, anchor.y - dy),
      };
      if (!occupied.some((label) => overlaps(candidate, label)))
        return candidate;
    }
  }
  return anchor;
}
