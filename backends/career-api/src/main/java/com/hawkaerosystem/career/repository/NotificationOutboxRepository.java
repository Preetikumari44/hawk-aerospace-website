package com.hawkaerosystem.career.repository;

import com.hawkaerosystem.career.entity.NotificationOutbox;
import com.hawkaerosystem.career.entity.NotificationStatus;
import java.time.Instant;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificationOutboxRepository extends JpaRepository<NotificationOutbox, Long> {

    @Query("select o from NotificationOutbox o "
            + "where o.status in :statuses and o.updatedAt < :cutoff order by o.id")
    List<NotificationOutbox> findDue(@Param("statuses") Collection<NotificationStatus> statuses,
                                     @Param("cutoff") Instant cutoff,
                                     Pageable pageable);
}
