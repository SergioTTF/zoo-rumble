const GLYPHS: Record<string, readonly string[]> = {
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
};

function PixelWord({ word, className }: { word: string; className: string }) {
  const unit = 4;
  const advance = 24;
  const blocks = [...word].flatMap((letter, letterIndex) =>
    GLYPHS[letter].flatMap((row, y) =>
      [...row].flatMap((filled, x) =>
        filled === '1'
          ? [
              <rect
                key={`${letterIndex}-${x}-${y}`}
                x={letterIndex * advance + x * unit}
                y={y * unit}
                width={unit}
                height={unit}
              />,
            ]
          : [],
      ),
    ),
  );

  return (
    <svg
      className={`pixel-word ${className}`}
      viewBox={`0 0 ${word.length * advance - unit} 28`}
      role="presentation"
      shapeRendering="crispEdges"
    >
      <g className="pixel-word-shadow" transform="translate(3 4)">
        {blocks}
      </g>
      <g className="pixel-word-face">{blocks}</g>
    </svg>
  );
}

export function GameLogo() {
  return (
    <h1 className="game-logo" aria-label="Zoo Rumble">
      <span className="logo-mark" aria-hidden="true">
        <img
          src={`${import.meta.env.BASE_URL}assets/brand/zoo-rumble-bear-mark-v2.png`}
          alt=""
        />
      </span>
      <span className="logo-words" aria-hidden="true">
        <PixelWord word="ZOO" className="pixel-word-zoo" />
        <PixelWord word="RUMBLE" className="pixel-word-rumble" />
      </span>
    </h1>
  );
}
