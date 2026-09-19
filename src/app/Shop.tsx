import { useState } from 'react';
import { ANIMALS, abilityDescription } from '../content/animals';
import { ECONOMY_RULES, LEVEL_XP, TIER_COSTS } from '../content/economy';
import { availableShopOdds, playerLevel } from '../run/Economy';
import { useSandbox } from '../stores/sandbox';
import { ANIMAL_ART } from '../game/animalVisuals';
import { TRAITS } from '../content/traits';

export function Shop() {
  const state = useSandbox();
  const [over, setOver] = useState(false);
  const dragged = state.squad.animals.find(
    (a) => a.instanceId === state.draggingId,
  );
  const sale = dragged
    ? TIER_COSTS[ANIMALS.find((a) => a.id === dragged.animalId)!.tier]
    : null;
  const { economy } = state;
  const level = playerLevel(economy.xp);
  const nextXP = level < 6 ? LEVEL_XP[(level + 1) as 3 | 4 | 5 | 6] : 30;
  const progress =
    level === 6
      ? 100
      : ((economy.xp - LEVEL_XP[level]) / (nextXP - LEVEL_XP[level])) * 100;
  const ready = state.status === 'ready';
  return (
    <section
      data-sell-zone
      className={`shop-panel ${dragged ? 'sell-available' : ''} ${over && dragged ? 'sell-hover' : ''}`}
      aria-label="Animal shop"
      onDragOver={(e) => {
        if (ready && dragged) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setOver(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null))
          setOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        if (ready) state.sell(e.dataTransfer.getData('text/plain'));
        state.setDragging(null);
      }}
    >
      {dragged && ready && (
        <div className="sell-banner" role="status">
          Drop {ANIMALS.find((a) => a.id === dragged.animalId)!.name} here to
          sell · +{sale} gold
        </div>
      )}
      <div className="shop-header">
        <h2>ANIMAL SHOP</h2>
        <span className="gold-count">● {economy.gold} GOLD</span>
        <button
          disabled={!ready || economy.gold < ECONOMY_RULES.rerollCost}
          onClick={state.reroll}
        >
          ↻ Reroll · 1 gold
        </button>
      </div>
      <div className="shop-offers">
        {economy.shop.map((offer, slot) => {
          const animal = ANIMALS.find((a) => a.id === offer?.animalId);
          return (
            <button
              key={`${economy.refresh}:${slot}`}
              className={`shop-offer tier-${offer?.tier ?? 0}`}
              disabled={!ready || !offer || economy.gold < offer.cost}
              aria-label={
                offer
                  ? `Buy ${animal?.name}, tier ${offer.tier}, ${offer.cost} gold`
                  : `Shop slot ${slot + 1}: sold`
              }
              onClick={() => {
                if (offer) state.buy(offer.id);
              }}
            >
              {offer && animal ? (
                <>
                  <span className="offer-tier">TIER {offer.tier}</span>
                  <img
                    className="offer-icon"
                    src={ANIMAL_ART[animal.id]}
                    alt=""
                    draggable={false}
                  />
                  <strong>{animal.name}</strong>
                  <span className="offer-traits">
                    {animal.traits
                      .map((id) => TRAITS.find((t) => t.id === id)!.name)
                      .join(' · ') || 'No trait'}
                  </span>
                  <small className="offer-stats">
                    {animal.role} · {animal.baseStats.health} HP ·{' '}
                    {animal.baseStats.attack} ATK
                  </small>
                  <small className="offer-ability">
                    {abilityDescription(animal)}
                  </small>
                  <span className="offer-price">● {offer.cost}</span>
                </>
              ) : (
                <span className="sold-offer">SOLD</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="level-panel">
        <div className="level-badge">LV {level}</div>
        <div className="xp-info">
          <span>
            {level === 6 ? 'MAX LEVEL' : `${economy.xp} / ${nextXP} XP`}{' '}
            <small>Squad capacity: {level}</small>
          </span>
          <div className="xp-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          disabled={
            !ready || level === 6 || economy.gold < ECONOMY_RULES.xpPurchaseCost
          }
          onClick={state.buyXP}
        >
          +4 XP · 4 gold
        </button>
      </div>
      <div className="shop-odds" aria-label="Shop tier odds">
        {availableShopOdds(level).map((odds, index) => (
          <span key={index} className={`tier-${index + 1}`}>
            T{index + 1}: {Math.round(odds * 100)}%
          </span>
        ))}
        <span className="roster-note">
          {ANIMALS.length} animals · {TRAITS.length} traits
        </span>
      </div>
      <small className="sell-note">
        Drag an animal into the shop to sell it for its base tier cost (
        {Object.values(TIER_COSTS).join('/')} gold).
      </small>
    </section>
  );
}
