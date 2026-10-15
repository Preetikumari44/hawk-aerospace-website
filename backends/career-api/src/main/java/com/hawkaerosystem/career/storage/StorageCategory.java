package com.hawkaerosystem.career.storage;

/** Sub-directory (below STORAGE_ROOT) an uploaded document is written to. */
public enum StorageCategory {
    CV("cv"),
    LICENSE("license");

    private final String directory;

    StorageCategory(String directory) {
        this.directory = directory;
    }

    public String directory() {
        return directory;
    }
}
