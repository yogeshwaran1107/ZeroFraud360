package com.SIH.ZeroFraud360.fraud.repository;

import com.SIH.ZeroFraud360.fraud.domain.AlertStatus;
import com.SIH.ZeroFraud360.fraud.domain.FraudAlert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FraudAlertRepository extends JpaRepository<FraudAlert, Long> {

    Optional<FraudAlert> findByAlertId(String alertId);

    Optional<FraudAlert> findByDedupKey(String dedupKey);

    boolean existsByDedupKey(String dedupKey);

    List<FraudAlert> findAllByStatus(AlertStatus status);

    List<FraudAlert> findAllByOrderByCreatedAtDesc();
}
