package com.SIH.IndianBankSimulation.outbox.repository;

import com.SIH.IndianBankSimulation.outbox.domain.OutboxEvent;
import com.SIH.IndianBankSimulation.outbox.domain.OutboxStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, Long> {

    Optional<OutboxEvent> findByEventId(String eventId);

    List<OutboxEvent> findAllByStatusOrderByCreatedAtAsc(OutboxStatus status);
}
