package com.hawkaerosystem.career.storage;

/**
 * A document written to private storage.
 *
 * @param key  path relative to STORAGE_ROOT, e.g. {@code cv/3f2c...a1.pdf}; this is what is saved in MySQL
 * @param type the type found by content inspection
 * @param size size in bytes
 */
public record StoredFile(String key, DetectedType type, long size) {
}
