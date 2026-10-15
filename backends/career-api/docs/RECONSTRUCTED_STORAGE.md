# Reconstructed `storage` package

The supplied `hawk-career-next.zip` did **not** contain `src/main/java/com/hawkaerosystem/career/storage/`
(`FileStorageService`, `StorageCategory`, `StoredFile`, `DetectedType`, `FileSignature`). The project's own
`.gitignore` contains the line `storage/`, which matches that package directory, so it was dropped when the ZIP
was created. Every other class imports it, so the backend could not compile as supplied.

These five classes were **re-written from their call sites** (`ApplicationService`, `ApplicationPersistenceService`,
`NotificationService`, `HealthController`), the README ("path-traversal protection, content sniffing") and the
test expectations. They are not the original files. If you still have the original package, copy it over this folder
and delete this note.

Behaviour implemented: random UUID file names under `<STORAGE_ROOT>/cv|license/`, extension whitelist
(pdf, jpg, jpeg, png, webp), magic-byte check that must agree with the extension, per-file size limit
(`UPLOAD_MAX_FILE_SIZE`), owner-only permissions where supported, path-traversal guard in `resolve()`,
null-safe `deleteQuietly()`, `isWritable()` readiness probe.

The `.gitignore` line was changed to `/storage/` (the runtime upload directory at the project root only) so this
cannot happen again.
