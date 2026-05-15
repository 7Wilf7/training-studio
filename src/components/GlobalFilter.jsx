import { s } from "../styles";
import { FILTER_GROUPS } from "../constants";

/**
 * Filter state shape (held in App):
 *   {
 *     all: boolean,                          // when true, everything matches; other fields ignored
 *     groups: {
 *       run:      { enabled, subs: string[] },  // subs: [] = ALL children selected; non-empty = explicit subset
 *       strength: { enabled, subs: string[] },
 *       hiit:     { enabled, subs: string[] },  // HIIT has no children, subs stays []
 *     }
 *   }
 */
export const INITIAL_FILTER = {
  all: true,
  groups: {
    run: { enabled: false, subs: [] },
    strength: { enabled: false, subs: [] },
    hiit: { enabled: false, subs: [] },
  },
};

export function logMatchesFilter(log, filter) {
  if (filter.all) return true;
  const g = filter.groups;
  if (g.run.enabled && (log.type === "Running" || log.type === "Trail Running")) {
    if (g.run.subs.length === 0) return true;
    if (g.run.subs.includes(log.type)) return true;
  }
  if (g.strength.enabled && log.type === "Strength") {
    if (g.strength.subs.length === 0) return true;
    if (Array.isArray(log.subTypes) && log.subTypes.some(st => g.strength.subs.includes(st))) return true;
  }
  if (g.hiit.enabled && log.type === "HIIT") return true;
  return false;
}

function pillLabel(group, state) {
  if (!state.enabled) return group.label;
  if (state.subs.length === 0 || state.subs.length === group.children.length) {
    return group.label;
  }
  const labels = state.subs.map(id => {
    const child = group.children.find(c => c.id === id);
    return child ? child.label : id;
  });
  return labels.join("+");
}

export function GlobalFilter({ filter, setFilter, openDropdown, setOpenDropdown }) {

  function setAll() {
    setFilter({
      all: true,
      groups: {
        run: { enabled: false, subs: [] },
        strength: { enabled: false, subs: [] },
        hiit: { enabled: false, subs: [] },
      },
    });
    setOpenDropdown(null);
  }

  function disableGroup(key) {
    const next = {
      ...filter,
      groups: { ...filter.groups, [key]: { enabled: false, subs: [] } },
    };
    // If after disabling, nothing is enabled, fall back to "all"
    const stillEnabled = Object.values(next.groups).some(g => g.enabled);
    if (!stillEnabled) next.all = true;
    setFilter(next);
    setOpenDropdown(null);
  }

  function clickPill(key) {
    const cur = filter.groups[key];
    const group = FILTER_GROUPS[key];

    // For groups without children (HIIT): just toggle on/off
    if (group.children.length === 0) {
      if (cur.enabled) {
        disableGroup(key);
      } else {
        setFilter({
          ...filter,
          all: false,
          groups: { ...filter.groups, [key]: { enabled: true, subs: [] } },
        });
      }
      setOpenDropdown(null);
      return;
    }

    // For groups with children: clicking the pill always opens (or closes) the dropdown,
    // and turns the group on if it wasn't already.
    if (!cur.enabled) {
      setFilter({
        ...filter,
        all: false,
        groups: { ...filter.groups, [key]: { enabled: true, subs: [] } },
      });
      setOpenDropdown(key);
    } else {
      setOpenDropdown(openDropdown === key ? null : key);
    }
  }

  function toggleSub(key, subId) {
    const cur = filter.groups[key];
    const group = FILTER_GROUPS[key];

    // Translate the stored "[] = all" shorthand into an explicit list so toggle behaves intuitively
    let effective = cur.subs.length === 0
      ? group.children.map(c => c.id)
      : [...cur.subs];

    if (effective.includes(subId)) {
      effective = effective.filter(x => x !== subId);
    } else {
      effective.push(subId);
    }

    // Don't allow the impossible 0-selection state; treat that as "back to all"
    if (effective.length === 0) {
      effective = group.children.map(c => c.id);
    }

    // Normalize: if all children selected, store [] for cleaner display
    if (effective.length === group.children.length) effective = [];

    setFilter({
      ...filter,
      all: false,
      groups: { ...filter.groups, [key]: { enabled: true, subs: effective } },
    });
  }

  function renderPill(key) {
    const group = FILTER_GROUPS[key];
    const state = filter.groups[key];
    const active = state.enabled;
    const label = pillLabel(group, state);

    return (
      <div key={key} style={{ position: "relative" }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            clickPill(key);
          }}
          style={s.chip(active)}>
          {label}
        </button>
        {openDropdown === key && group.children.length > 0 && (
          <div style={{
            position: "absolute", top: "100%", left: 0, marginTop: 4,
            background: "#fff", border: "1px solid #ddd", borderRadius: 8, padding: 6,
            zIndex: 100, minWidth: 180, boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}>
            {group.children.map(child => {
              const checked = state.subs.length === 0 || state.subs.includes(child.id);
              return (
                <label key={child.id}
                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", fontSize: 13, color: "#333", cursor: "pointer", borderRadius: 4 }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f5f5f5"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <input type="checkbox" checked={checked}
                    onChange={() => toggleSub(key, child.id)}
                    style={{ width: 14, height: 14 }} />
                  {child.label}
                </label>
              );
            })}
            <div style={{ borderTop: "1px solid #eee", marginTop: 4, paddingTop: 4 }}>
              <button onClick={() => disableGroup(key)}
                style={{ display: "block", width: "100%", border: "none", background: "transparent", padding: "5px 10px", textAlign: "left", fontSize: 12, color: "#c0392b", cursor: "pointer", borderRadius: 4 }}>
                ✕ Disable this filter
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div data-global-filter style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap", alignItems: "center", position: "relative" }}>
      <span style={{ ...s.muted, marginRight: 4 }}>Type:</span>
      <button onClick={setAll} style={s.chip(filter.all)}>All</button>
      <span style={{ color: "#ccc", fontSize: 12 }}>|</span>
      {renderPill("run")}
      {renderPill("strength")}
      {renderPill("hiit")}
    </div>
  );
}
