import { ANIMALS } from '../content/animals';
import { TRAITS } from '../content/traits';
import { calculateTraits } from '../simulation/traits/Traits';
import { useSandbox } from '../stores/sandbox';

export function TraitPanel() {
  const squad = useSandbox((s) => s.squad);
  const statuses = calculateTraits(
    squad.animals.filter((a) => a.location.kind === 'board'),
    ANIMALS,
    TRAITS,
  );
  return (
    <section className="trait-panel" aria-label="Squad traits">
      <h2>SQUAD TRAITS</h2>
      <p>
        Distinct deployed species count. Duplicates receive buffs but add no
        count. Bench animals don’t.
      </p>
      {statuses.map((status) => (
        <details
          className={`trait-row ${status.active ? 'active-trait' : ''}`}
          key={status.definition.id}
        >
          <summary>
            <strong>{status.definition.name}</strong>
            <span>
              {status.count}/
              {status.next?.requiredUnits ??
                status.active?.requiredUnits ??
                status.definition.thresholds[0].requiredUnits}
            </span>
            <b>{status.active ? 'ACTIVE' : 'INACTIVE'}</b>
          </summary>
          <div className="trait-description">
            <p>
              Breakpoints:{' '}
              {status.definition.thresholds
                .map((t) => t.requiredUnits)
                .join(' / ')}
            </p>
            {status.active ? (
              <p>{status.active.description}</p>
            ) : (
              <p>
                Deploy {status.next?.requiredUnits} different{' '}
                {status.definition.name} species to activate.
              </p>
            )}
            {status.definition.thresholds.map((threshold) => (
              <p
                className={
                  status.active?.requiredUnits === threshold.requiredUnits
                    ? 'current-threshold'
                    : ''
                }
                key={threshold.requiredUnits}
              >
                <b>({threshold.requiredUnits})</b> {threshold.description}
              </p>
            ))}
          </div>
        </details>
      ))}
    </section>
  );
}
