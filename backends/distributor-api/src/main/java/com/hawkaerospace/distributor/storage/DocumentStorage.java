package com.hawkaerospace.distributor.storage;

import java.nio.file.Path;
import java.util.UUID;

/** Private document store. Implementations must never expose a public URL. */
public interface DocumentStorage {

    /** Stores bytes under a server-generated name and returns the safe reference to persist. */
    String store(UUID applicationId, String extension, byte[] content);

    /** Resolves a stored reference to a readable path, or throws {@link StorageException}. */
    Path resolve(String reference);

    /** Best-effort removal (used when the database save fails after the file was written). */
    void deleteQuietly(String reference);
}
