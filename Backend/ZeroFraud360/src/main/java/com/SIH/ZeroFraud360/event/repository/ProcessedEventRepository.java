package com.SIH.ZeroFraud360.event.repository;

import com.SIH.ZeroFraud360.event.domain.ProcessedEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, Long> {

    boolean existsByEventIdAndConsumerName(String eventId, String consumerName);
}
