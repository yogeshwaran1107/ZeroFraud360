package com.SIH.ZeroFraud360.fraud.repository;

import com.SIH.ZeroFraud360.fraud.domain.DecisionRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface DecisionRequestRepository extends JpaRepository<DecisionRequest, Long> {

    Optional<DecisionRequest> findByRequestId(String requestId);
}
