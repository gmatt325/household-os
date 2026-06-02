// Single source of truth for task categories.
// `key` must match the Postgres `task_category` enum (puppy | todos | workouts | plant_watering).
// `addable` = whether it appears in the manual Add-Task dropdown.
//   Workouts is excluded because that row is driven by the fitness program, not manual entry.
// To add a genuinely new category later you must ALSO extend the `task_category`
// enum in Supabase (ALTER TYPE task_category ADD VALUE '...').
export const CATEGORIES = [
  { key: 'puppy', label: 'Puppy', color: '#C4724A', addable: true },
  { key: 'todos', label: 'Tasks', color: '#7A6590', addable: true },
  { key: 'workouts', label: 'Workouts', color: '#4A8E72', addable: false },
  { key: 'plant_watering', label: 'Plants', color: '#6A9A42', addable: true },
]

export const ADDABLE_CATEGORIES = CATEGORIES.filter((c) => c.addable)
