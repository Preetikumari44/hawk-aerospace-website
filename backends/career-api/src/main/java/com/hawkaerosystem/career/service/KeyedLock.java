package com.hawkaerosystem.career.service;

import java.util.Arrays;
import java.util.concurrent.locks.ReentrantLock;
import org.springframework.stereotype.Component;

/**
 * Striped lock used to serialise concurrent submissions that share an email or phone number inside one JVM, so the
 * "check duplicate, then insert" sequence is atomic per applicant. Across several backend instances the optional
 * unique indexes (db/migrations/V2__optional_unique_indexes.sql) are the authoritative guard.
 */
@Component
public class KeyedLock {

    private static final int STRIPES = 64;

    private final ReentrantLock[] locks = new ReentrantLock[STRIPES];

    public KeyedLock() {
        for (int i = 0; i < STRIPES; i++) {
            locks[i] = new ReentrantLock();
        }
    }

    /** Locks every stripe the keys map to, always in ascending order (no deadlocks). Close the lease to release. */
    public Lease acquire(String... keys) {
        int[] stripes = Arrays.stream(keys)
                .mapToInt(k -> Math.floorMod(k == null ? 0 : k.hashCode(), STRIPES))
                .distinct()
                .sorted()
                .toArray();
        for (int s : stripes) {
            locks[s].lock();
        }
        return () -> {
            for (int i = stripes.length - 1; i >= 0; i--) {
                locks[stripes[i]].unlock();
            }
        };
    }

    @FunctionalInterface
    public interface Lease extends AutoCloseable {
        @Override
        void close();
    }
}
