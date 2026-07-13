export const BUILD_MODE = import.meta.env.DEV ? "development" : "production";
export const IS_DEV_BUILD = BUILD_MODE === "development";

/** Apply the compile-time build identity before React paints either Tauri window. */
export function applyBuildIdentity() {
  const root = document.documentElement;
  root.dataset.buildMode = BUILD_MODE;
  root.classList.toggle("dev-build", IS_DEV_BUILD);

  if (IS_DEV_BUILD && !document.title.startsWith("DEV · ")) {
    document.title = `DEV · ${document.title}`;
  }
}
