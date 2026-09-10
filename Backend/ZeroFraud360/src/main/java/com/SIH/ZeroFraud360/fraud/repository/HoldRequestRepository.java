package com.SIH.ZeroFraud360.fraud.repository;

import com.SIH.ZeroFraud360.fraud.domain.HoldRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface HoldRequestRepository extends JpaRepository<HoldRequest, Long> {

    Optional<HoldRequest> findByRequestId(String requestId);

    Optional<HoldRequest> findByAlertId(String alertId);
}
