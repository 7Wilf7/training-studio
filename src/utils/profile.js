import {
  FIXED_SYSTEM_PROMPT, PROFILE_REQUIRED_FIELDS,
  GENDERS, OCCUPATIONS, RUN_EXPERIENCE, RACE_TYPES_DONE,
  INJURY_HISTORY, EQUIPMENT_AVAILABLE,
  COACH_STYLES, OUTPUT_LENGTHS, INTERVENTION_LEVELS,
} from "../constants";

export function calculateAge(birthDate, today = new Date()) {
  if (!birthDate) return null;
  const d = new Date(birthDate);
  if (isNaN(d.getTime())) return null;
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age >= 0 && age < 150 ? age : null;
}

export function isProfileComplete(profile) {
  if (!profile) return false;
  return PROFILE_REQUIRED_FIELDS.every(f => {
    const v = profile[f];
    return Array.isArray(v) ? v.length > 0 : !!v;
  });
}

function labelFor(opts, id) {
  return opts.find(o => o.id === id)?.label || id;
}

function labelsFor(opts, ids) {
  return (ids || []).map(id => opts.find(o => o.id === id)?.label || id);
}

/**
 * Profile block — short, structured, NOT a wall of text.
 * Goes into the system prompt so the model knows who it's talking to.
 */
export function profileBlock(profile) {
  if (!profile) return "";
  const lines = [];
  const age = calculateAge(profile.birthDate);
  if (age != null) lines.push(`Age: ${age}`);
  if (profile.gender) lines.push(`Gender: ${labelFor(GENDERS, profile.gender)}`);
  if (profile.city) lines.push(`Located in: ${profile.city} (use this for terrain/venue suggestions if relevant)`);
  if (profile.occupation) {
    const occLabel = profile.occupation === "other" && profile.occupationOther
      ? `Other — ${profile.occupationOther.trim()}`
      : labelFor(OCCUPATIONS, profile.occupation);
    lines.push(`Day job: ${occLabel}`);
  }
  if (profile.experience) lines.push(`Years of running training: ${labelFor(RUN_EXPERIENCE, profile.experience)}`);
  const raceTypes = labelsFor(RACE_TYPES_DONE, profile.raceTypes);
  if (raceTypes.length) lines.push(`Race types done: ${raceTypes.join(", ")}`);
  const recent = labelsFor(INJURY_HISTORY, profile.recentInjuries);
  if (recent.length) lines.push(`Recent injuries (last 6 months): ${recent.join(", ")}`);
  if (profile.injuriesNote && profile.injuriesNote.trim()) {
    lines.push(`Injury notes (older history / context, do not over-weight): ${profile.injuriesNote.trim()}`);
  }
  const equip = labelsFor(EQUIPMENT_AVAILABLE, profile.equipment);
  if (equip.length) lines.push(`Available equipment: ${equip.join(", ")}`);
  if (profile.equipmentOther && profile.equipmentOther.trim()) {
    lines.push(`Other equipment: ${profile.equipmentOther.trim()}`);
  }
  if (profile.notes && profile.notes.trim()) lines.push(`Extra notes: ${profile.notes.trim()}`);
  if (!lines.length) return "";
  return `[User Profile]\n${lines.join("\n")}`;
}

export function coachConfigBlock(cfg) {
  if (!cfg) return "";
  const styleLabel = labelFor(COACH_STYLES, cfg.style);
  const lengthLabel = labelFor(OUTPUT_LENGTHS, cfg.outputLength);
  const interventionLabel = labelFor(INTERVENTION_LEVELS, cfg.intervention);
  return `[Coach Config]
Style: ${styleLabel}
Output length: ${lengthLabel}
Risk reminders: ${interventionLabel}`;
}

/**
 * Assemble the full system prompt:
 *   Fixed instructions (unchangeable)
 *   + User profile (static)
 *   + Coach config (user-selected style/length/intervention)
 *   + Dynamic data block (races + recent activities, prepared by caller)
 */
export function buildSystemPrompt({ profile, coachConfig, dataBlock }) {
  return [
    FIXED_SYSTEM_PROMPT,
    profileBlock(profile),
    coachConfigBlock(coachConfig),
    dataBlock || "",
  ].filter(Boolean).join("\n\n");
}
