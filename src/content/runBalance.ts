export const RUN_RULES = {
  lives: 3,
  rounds: 8,
  preparationGold: 10,
  roundXP: 2,
} as const;
export const ENCOUNTERS = [
  { name: 'Wolf pack', pool: ['wolf'], count: 2, stars: 1 },
  {
    name: 'Barnyard brawl',
    pool: ['chicken', 'dog', 'rabbit'],
    count: 3,
    stars: 1,
  },
  { name: 'Forest hunters', pool: ['wolf', 'fox', 'bear'], count: 3, stars: 1 },
  {
    name: 'Cold front',
    pool: ['penguin', 'chicken', 'parrot', 'owl'],
    count: 4,
    stars: 2,
    elites: 1,
  },
  {
    name: 'Jungle patrol',
    pool: ['monkey', 'baboon', 'chimpanzee'],
    count: 4,
    stars: 2,
    elites: 1,
  },
  {
    name: 'Wild pursuit',
    pool: ['wolf', 'fox', 'jackal', 'hyena'],
    count: 4,
    stars: 2,
    elites: 1,
  },
  {
    name: 'Sky guardians',
    pool: ['penguin', 'eagle', 'chicken'],
    count: 5,
    stars: 2,
    elites: 2,
  },
  {
    name: 'King of the wild',
    pool: ['gorilla', 'baboon', 'bear', 'hyena'],
    count: 5,
    stars: 2,
    elites: 2,
  },
] as const;
