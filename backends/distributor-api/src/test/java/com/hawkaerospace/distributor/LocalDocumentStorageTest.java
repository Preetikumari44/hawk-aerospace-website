package com.hawkaerospace.distributor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.hawkaerospace.distributor.storage.LocalDocumentStorage;
import com.hawkaerospace.distributor.storage.StorageException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LocalDocumentStorageTest {

    @TempDir Path root;

    @Test
    void storesUnderGeneratedNameAndResolvesInsideRoot() throws Exception {
        LocalDocumentStorage s = new LocalDocumentStorage(root);
        String ref = s.store(UUID.randomUUID(), "pdf", "x".getBytes());
        Path p = s.resolve(ref);
        assertThat(p).startsWith(root.toRealPath());
        assertThat(Files.readString(p)).isEqualTo("x");
        s.deleteQuietly(ref);
        assertThatThrownBy(() -> s.resolve(ref)).isInstanceOf(StorageException.class);
    }

    @Test
    void rejectsTraversalAndForeignReferences() {
        LocalDocumentStorage s = new LocalDocumentStorage(root);
        for (String bad : new String[] {"../../etc/passwd", "/etc/passwd", "2026/01/../../x.pdf", "evil.pdf", null, "2026/01/not-a-uuid.pdf"}) {
            assertThatThrownBy(() -> s.resolve(bad)).isInstanceOf(StorageException.class);
        }
        assertThatThrownBy(() -> s.store(UUID.randomUUID(), "../x", new byte[1])).isInstanceOf(StorageException.class);
    }
}
