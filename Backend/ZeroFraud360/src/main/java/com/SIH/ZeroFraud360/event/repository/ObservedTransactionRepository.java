package com.SIH.ZeroFraud360.event.repository;

import com.SIH.ZeroFraud360.event.domain.ObservedTransaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface ObservedTransactionRepository extends JpaRepository<ObservedTransaction, Long> {

    Optional<ObservedTransaction> findByEventId(String eventId);

    Optional<ObservedTransaction> findByTransactionId(String transactionId);

    @Query("SELECT ot FROM ObservedTransaction ot WHERE ot.receiverAccountId = :receiverAccountId " +
            "AND ot.status = 'SUCCESS' " +
            "AND ot.occurredAt >= :windowStart AND ot.occurredAt < :occurredAt " +
            "ORDER BY ot.occurredAt DESC")
    List<ObservedTransaction> findCandidateInflows(
            @Param("receiverAccountId") String receiverAccountId,
            @Param("windowStart") Instant windowStart,
            @Param("occurredAt") Instant occurredAt);

    List<ObservedTransaction> findBySenderAccountIdOrderByOccurredAtDesc(String senderAccountId);

    List<ObservedTransaction> findByReceiverAccountIdOrderByOccurredAtDesc(String receiverAccountId);
}
