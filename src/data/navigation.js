export const WORKSPACE_PATHS = Object.freeze({
  home: "/",
  record: "/record",
  documents: "/documents",
  dictionary: "/dictionary",
  billing: "/billing",
  settings: "/settings"
});

const PAGE_BY_PATH = new Map(Object.entries(WORKSPACE_PATHS).map(([page, path]) => [path, page]));

export function workspacePageFromPath(pathname) {
  const normalized = `/${String(pathname || "").split("?")[0].split("#")[0].split("/").filter(Boolean).join("/")}`;
  if (["/billing/success", "/billing/fail"].includes(normalized)) return "billing";
  return PAGE_BY_PATH.get(normalized === "/" ? "/" : normalized.replace(/\/$/, "")) || "home";
}

export function workspacePathForPage(page) {
  return WORKSPACE_PATHS[page] || WORKSPACE_PATHS.home;
}
