/**
 * Minimal ambient types for `file-saver`.
 *
 * The package ships no types and @types/file-saver would be another
 * devDependency for one function. Declaring the surface actually used here
 * keeps the build honest without the install.
 */
declare module "file-saver" {
  export function saveAs(data: Blob | File | string, filename?: string): void
}
