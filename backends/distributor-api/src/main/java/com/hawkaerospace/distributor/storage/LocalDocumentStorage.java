package com.hawkaerospace.distributor.storage;

import com.hawkaerospace.distributor.config.AppProperties;
import java.io.IOException;
import java.nio.file.FileAlreadyExistsException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermission;
import java.nio.file.attribute.PosixFilePermissions;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * Stores uploads on a private directory (STORAGE_ROOT) that is not served by the web application.
 * File names are generated here ({@code yyyy/MM/<random-uuid>.<whitelisted-ext>}); the client's file name is never
 * used as a path. References read back from the database are re-validated and re-confined to the root.
 */
@Component
public class LocalDocumentStorage implements DocumentStorage {

    private static final Logger log = LoggerFactory.getLogger(LocalDocumentStorage.class);
    private static final Pattern REF =
            Pattern.compile("^\\d{4}/\\d{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.(pdf|docx?|pptx?|xlsx?|png|jpe?g)$");

    private final Path root;

    @Autowired
    public LocalDocumentStorage(AppProperties props) {
        this(Path.of(props.storage().root()));
    }

    public LocalDocumentStorage(Path root) {
        this.root = root.toAbsolutePath().normalize();
        try {
            if (Files.notExists(this.root)) {
                try {
                    Files.createDirectories(this.root, ownerOnlyDirAttr());
                } catch (UnsupportedOperationException nonPosix) {
                    Files.createDirectories(this.root);
                }
            }
        } catch (IOException e) {
            throw new StorageException("Cannot create storage root " + this.root, e);
        }
        if (!Files.isDirectory(this.root) || !Files.isWritable(this.root)) {
            throw new StorageException("Storage root is not a writable directory: " + this.root);
        }
    }

    @Override
    public String store(UUID applicationId, String extension, byte[] content) {
        if (extension == null || !extension.matches("[a-z]{3,4}")) {
            throw new StorageException("Invalid extension");
        }
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        // Random name; applicationId is intentionally NOT part of the name so references reveal nothing.
        String ref = "%04d/%02d/%s.%s".formatted(today.getYear(), today.getMonthValue(), UUID.randomUUID(), extension);
        Path target = confine(ref);
        try {
            Files.createDirectories(target.getParent());
            Files.write(target, content, StandardOpenOption.CREATE_NEW, StandardOpenOption.WRITE);
            try {
                Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("rw-------"));
            } catch (UnsupportedOperationException ignored) {
                // non-POSIX file system (e.g. Windows): rely on directory ACLs
            }
        } catch (FileAlreadyExistsException e) {
            throw new StorageException("Generated file name collided", e);
        } catch (IOException e) {
            throw new StorageException("Could not store document", e);
        }
        return ref;
    }

    @Override
    public Path resolve(String reference) {
        Path p = confine(reference);
        if (!Files.isRegularFile(p) || Files.isSymbolicLink(p)) {
            throw new StorageException("Document not found");
        }
        return p;
    }

    @Override
    public void deleteQuietly(String reference) {
        try {
            Files.deleteIfExists(confine(reference));
        } catch (Exception e) {
            log.warn("Could not delete orphaned document {}", reference);
        }
    }

    /** Rejects anything that is not exactly our generated format, then verifies the resolved path stays inside root. */
    private Path confine(String reference) {
        if (reference == null || !REF.matcher(reference).matches()) {
            throw new StorageException("Invalid document reference");
        }
        Path resolved = root.resolve(reference).normalize();
        if (!resolved.startsWith(root)) {
            throw new StorageException("Invalid document reference");
        }
        return resolved;
    }

    private static java.nio.file.attribute.FileAttribute<Set<PosixFilePermission>> ownerOnlyDirAttr() {
        return PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rwx------"));
    }
}
