import type { LabelPosition, Seed } from "./paint-engine";

export type Picture = { id: string; title: string; image: string; preview: string; palette: string[]; names: string[]; seeds: Seed[]; defaultNumber: number; difficulty: "easy" | "more"; assignments?: Record<number, number>; labelPositions?: Record<number, LabelPosition> };
export type SavedDrawing = { id: string; picture: Picture; fills: Record<number, number>; thumbnail: string; total: number; updatedAt: number };
export const MAGIC_PALETTE = ["#E6F6E8", "#F8AED2", "#B6A0E9", "#F7D564", "#89DCC0", "#8DCDF1"];
export const PICTURES: Picture[] = [
  { id: "unicorn", title: "Cloud Unicorn", image: "/pictures/unicorn-lines.png", preview: "/pictures/unicorn-cloud.png", palette: MAGIC_PALETTE, names: ["Mint cream", "Rose pink", "Lavender", "Sunshine", "Mint", "Sky blue"], difficulty: "easy", defaultNumber: 6,
    seeds: [[.50,.055,6],[.50,.113,5],[.50,.161,4],[.50,.211,3],[.50,.255,2],[.46,.325,4],[.353,.359,1],[.61,.418,1],[.481,.394,2],[.48,.457,2],[.566,.494,2],[.589,.596,2],[.454,.518,1],[.462,.711,1],[.35,.809,1],[.586,.804,1],[.718,.675,3],[.715,.759,3],[.28,.535,2],[.714,.549,2],[.144,.618,1],[.87,.619,1],[.488,.894,1]] },
  { id: "kitty", title: "Flower Kitty", image: "/pictures/kitty-lines.png", preview: "/pictures/hello-kitty.png", palette: ["#FFFCF3","#E63850","#77BF79","#F8AED2","#242134","#F7D564"], names: ["White", "Red", "Green", "Pink", "Black", "Yellow"], difficulty: "more", defaultNumber: 4,
    seeds: [[.396,.332,1],[.674,.786,1],[.406,.801,1],[.277,.679,1],[.759,.671,1],[.729,.211,1],[.594,.202,2],[.67,.288,2],[.797,.28,2],[.594,.687,2],[.316,.59,2],[.502,.607,1],[.693,.607,1],[.374,.681,3],[.596,.244,2],[.736,.301,2],[.36,.618,6],[.321,.436,5],[.664,.439,5],[.498,.481,6],[.196,.419,5],[.194,.469,5],[.24,.514,5],[.791,.408,5],[.802,.458,5],[.768,.504,5]] },
  { id: "cow", title: "Clover Cow", image: "/pictures/cow-lines.png", preview: "/pictures/cow-preview.png", palette: ["#F8AED2","#77BF79","#8DCDF1","#F2DDAD","#795643","#BC9572"], names: ["Pink", "Grass green", "Sky blue", "Cream", "Chocolate", "Caramel"], difficulty: "more", defaultNumber: 4,
    seeds: [[.476,.075,3],[.843,.263,3],[.760,.253,3],[.663,.268,3],[.935,.546,3],[.822,.769,2],[.368,.94,2],[.116,.06,3],[.312,.05,3],[.621,.06,3],[.862,.06,3],[.877,.159,3],[.73,.152,3],[.611,.195,3],[.902,.28,3],[.946,.431,3],[.875,.58,3],[.131,.58,3],[.054,.324,3],[.058,.196,3],[.043,.434,3],[.046,.527,3],[.17,.124,6],[.447,.132,6],[.261,.883,6],[.405,.913,6],[.55,.865,6],[.698,.914,6],[.153,.206,1],[.491,.203,1],[.18,.368,1],[.433,.369,1],[.209,.48,1],[.39,.486,1],[.577,.737,1],[.084,.693,2],[.188,.744,2],[.077,.83,2],[.153,.916,2],[.286,.91,2],[.372,.735,2],[.462,.782,2],[.625,.799,2],[.597,.935,2],[.532,.922,2],[.86,.825,2],[.897,.887,2],[.79,.884,2],[.957,.67,2],[.778,.703,2],[.156,.29,5],[.458,.266,5],[.259,.368,5],[.349,.368,5],[.526,.32,5],[.769,.383,5],[.573,.47,5],[.376,.612,5],[.23,.613,5],[.544,.685,5],[.734,.62,5],[.9,.661,5],[.705,.811,5],[.454,.863,5],[.316,.8,5]] }
];

export type Library = { version: 1; custom: Picture[]; drawings: SavedDrawing[] };
export const EMPTY_LIBRARY: Library = { version: 1, custom: [], drawings: [] };
const STORAGE_KEY = "pigment-library-v1";

export function readLibrary(): Library {
  function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  function hasValidAssignments(value: unknown, colorCount: number): boolean {
    return isRecord(value) && Object.entries(value).every(([id, number]) => /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && typeof number === "number" && Number.isInteger(number) && number >= 1 && number <= colorCount);
  }

  function isImageSource(value: unknown): value is string {
    return typeof value === "string" && (/^\/pictures\/[\w-]+\.png$/.test(value) || /^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(value));
  }

  function isPicture(value: unknown): value is Picture {
    if (!isRecord(value) || typeof value.id !== "string" || !value.id || typeof value.title !== "string" || !value.title.trim()) return false;
    if (!isImageSource(value.image) || !isImageSource(value.preview)) return false;
    if (!Array.isArray(value.palette) || !value.palette.length || value.palette.length > 20 || !value.palette.every((color) => typeof color === "string" && /^#[A-Fa-f0-9]{6}$/.test(color))) return false;
    if (!Array.isArray(value.names) || value.names.length !== value.palette.length || !value.names.every((name) => typeof name === "string" && name.trim())) return false;
    if (value.difficulty !== "easy" && value.difficulty !== "more") return false;
    if (typeof value.defaultNumber !== "number" || !Number.isInteger(value.defaultNumber) || value.defaultNumber < 1 || value.defaultNumber > value.palette.length) return false;
    if (!Array.isArray(value.seeds) || !value.seeds.every((seed) => Array.isArray(seed) && seed.length === 3 && seed.every((part) => typeof part === "number" && Number.isFinite(part)) && seed[0] >= 0 && seed[0] <= 1 && seed[1] >= 0 && seed[1] <= 1 && Number.isInteger(seed[2]) && seed[2] >= 1 && seed[2] <= (value.palette as unknown[]).length)) return false;
    if (value.assignments !== undefined && !hasValidAssignments(value.assignments, value.palette.length)) return false;
    return value.labelPositions === undefined || (isRecord(value.labelPositions) && Object.entries(value.labelPositions).every(([id, position]) => /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && isRecord(position) && typeof position.x === "number" && Number.isFinite(position.x) && position.x >= 0 && position.x <= 1 && typeof position.y === "number" && Number.isFinite(position.y) && position.y >= 0 && position.y <= 1));
  }

  function isSavedDrawing(value: unknown): value is SavedDrawing {
    return isRecord(value) && typeof value.id === "string" && Boolean(value.id) && isPicture(value.picture) && hasValidAssignments(value.fills, value.picture.palette.length) && isImageSource(value.thumbnail) && typeof value.total === "number" && Number.isInteger(value.total) && value.total > 0 && Object.keys(value.fills as Record<string, unknown>).length <= value.total && typeof value.updatedAt === "number" && Number.isFinite(value.updatedAt) && value.updatedAt > 0;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_LIBRARY;
  const value: unknown = JSON.parse(raw);
  if (!isRecord(value) || value.version !== 1 || !Array.isArray(value.custom) || !value.custom.every(isPicture) || !Array.isArray(value.drawings) || !value.drawings.every(isSavedDrawing)) throw new Error("Your saved gallery couldn't be read. Download drawings before clearing browser storage.");
  return value as Library;
}
export function writeLibrary(library: Library): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}
