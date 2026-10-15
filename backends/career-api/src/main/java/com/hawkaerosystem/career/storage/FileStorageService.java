package com.hawkaerosystem.career.storage;

import com.hawkaerosystem.career.config.AppProperties;
import com.hawkaerosystem.career.exception.FileTooLargeException;
import com.hawkaerosystem.career.exception.InvalidUploadException;
import com.hawkaerosystem.career.exception.StorageException;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.FileSystems;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Arrays;
import java.util.Locale;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Writes uploaded CV / licence documents to a private directory (STORAGE_ROOT), outside any web root.
 *
 * <ul>
 *   <li>file names are random UUIDs; the client-supplied name is never used for the path</li>
 *   <li>the extension must be pdf / jpg / jpeg / png / webp AND the leading bytes must match that type</li>
 *   <li>files are written owner-read/write only where the file system supports POSIX permissions</li>
 * </ul>
 *
 * NOTE: this class was reconstructed from its call sites (ApplicationService, NotificationService, HealthController)
 * and the README, because the original {@code storage/} package was missing from the supplied ZIP (the
 * project's .gitignore line {@code storage/} excluded it). See docs/RECONSTRUCTED_STORAGE.md.
 */
@Service
public class FileStorageService {

    private static final Logger log = LoggerFactory.getLogger(FileStorageService.class);
    private static final boolean POSIX = FileSystems.getDefault().supportedFileAttributeViews().contains("posix");

    private final Path root;
    private final long maxBytes;

    public FileStorageService(AppProperties properties) {
        this.root = Path.of(properties.storage().root()).toAbsolutePath().normalize();
        this.maxBytes = properties.upload().maxFileSize().toBytes();
    }

    /**
     * Validates and stores one upload.
     *
     * @param field name of the form field, reported back in the error
     * @param label human readable name used in error messages ("CV", "Drone licence copy")
     */
    public StoredFile store(MultipartFile file, StorageCategory category, String field, String label) {
        if (file == null || file.isEmpty()) {
            throw new InvalidUploadException(field, label + " is required.");
        }
        if (file.getSize() > maxBytes) {
            throw new FileTooLargeException(field, label + " must be " + humanSize(maxBytes) + " or smaller.");
        }

        String original = file.getOriginalFilename() == null ? "" : file.getOriginalFilename();
        int dot = original.lastIndexOf('.');
        DetectedType byName = dot < 0 ? null : DetectedType.fromExtension(original.substring(dot + 1)).orElse(null);
        if (byName == null) {
            throw new InvalidUploadException(field, label + " must be a PDF, JPG, PNG or WebP file.");
        }

        byte[] header = new byte[FileSignature.HEADER_LENGTH];
        int read;
        try (InputStream in = file.getInputStream()) {
            read = in.readNBytes(header, 0, header.length);
        } catch (IOException e) {
            throw new StorageException("Could not read the uploaded file", e);
        }
        DetectedType byContent = FileSignature.detect(Arrays.copyOf(header, read), read).orElse(null);
        if (byContent == null || byContent != byName) {
            throw new InvalidUploadException(field, label + " is not a valid PDF, JPG, PNG or WebP file.");
        }

        String key = category.directory() + "/" + UUID.randomUUID() + "." + byContent.extension();
        Path target = resolve(key);
        try {
            Files.createDirectories(target.getParent());
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, target, StandardCopyOption.REPLACE_EXISTING);
            }
            if (POSIX) {
                Files.setPosixFilePermissions(target, PosixFilePermissions.fromString("rw-------"));
            }
        } catch (IOException e) {
            deleteQuietly(target);
            throw new StorageException("Could not store the uploaded file", e);
        }
        return new StoredFile(key, byContent, file.getSize());
    }

    /** Absolute path of a storage key. Refuses anything that would leave STORAGE_ROOT (path traversal). */
    public Path resolve(String key) {
        if (key == null || key.isBlank()) {
            throw new IllegalArgumentException("Empty storage key");
        }
        Path resolved = root.resolve(key).normalize();
        if (!resolved.startsWith(root) || resolved.equals(root)) {
            throw new IllegalArgumentException("Storage key escapes the storage root");
        }
        return resolved;
    }

    /** Removes a stored file after a failed submission; never throws and accepts null. */
    public void deleteQuietly(StoredFile file) {
        if (file != null) {
            deleteQuietly(resolve(file.key()));
        }
    }

    private void deleteQuietly(Path path) {
        try {
            Files.deleteIfExists(path);
        } catch (IOException e) {
            log.warn("Could not remove a stored upload ({})", e.getClass().getSimpleName());
        }
    }

    /** Readiness probe: the root exists (or can be created) and a file can be written into it. */
    public boolean isWritable() {
        try {
            Files.createDirectories(root);
            Path probe = Files.createTempFile(root, ".probe-", ".tmp");
            Files.deleteIfExists(probe);
            return true;
        } catch (IOException | RuntimeException e) {
            log.warn("Storage readiness check failed ({})", e.getClass().getSimpleName());
            return false;
        }
    }

    private static String humanSize(long bytes) {
        long mb = bytes / (1024 * 1024);
        return bytes % (1024 * 1024) == 0 && mb > 0 ? mb + " MB" : String.format(Locale.ROOT, "%.1f MB", bytes / 1048576.0);
    }
}
