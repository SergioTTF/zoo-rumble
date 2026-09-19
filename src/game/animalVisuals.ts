import artMetadata from './animalArtMetadata.json';
import type { Facing } from './directionalAnimation';

export const ANIMAL_ICONS: Readonly<Record<string, string>> = {
  bear: '🐻',
  rabbit: '🐰',
  wolf: '🐺',
  dog: '🐶',
  fox: '🦊',
  hyena: '🐾',
  chicken: '🐔',
  penguin: '🐧',
  eagle: '🦅',
  monkey: '🐒',
  baboon: '🐵',
  gorilla: '🦍',
  jackal: '🐕',
  parrot: '🦜',
  owl: '🦉',
  chimpanzee: '🐵',
};

export const ANIMAL_ART: Readonly<Record<string, string>> = Object.fromEntries(
  Object.keys(ANIMAL_ICONS).map((id) => [
    id,
    `${import.meta.env.BASE_URL}assets/animals/directional/${id}.png`,
  ]),
);

export const ANIMAL_SHEETS: Readonly<Record<string, string>> =
  Object.fromEntries(
    Object.keys(ANIMAL_ICONS).map((id) => [
      id,
      `${import.meta.env.BASE_URL}assets/animals/animated-v1/${id}-sheet.png`,
    ]),
  );

export const ANIMAL_LAYOUT: Readonly<
  Record<
    string,
    {
      frameSize: number;
      foot: number;
      starY: number;
      starYs: Readonly<Record<Facing, number>>;
    }
  >
> = artMetadata;

export const ANIMAL_POSE_TIMINGS: Readonly<
  Record<string, { walk: readonly number[]; attack: readonly number[] }>
> = {
  bear: { walk: [60, 60, 60, 60], attack: [60, 100, 100, 100] },
  rabbit: { walk: [40, 40, 40, 40], attack: [30, 50, 70, 50] },
  wolf: { walk: [45, 45, 45, 45], attack: [40, 70, 80, 70] },
  penguin: { walk: [65, 65, 65, 65], attack: [40, 70, 80, 70] },
  gorilla: { walk: [60, 60, 60, 60], attack: [60, 100, 100, 100] },
};
