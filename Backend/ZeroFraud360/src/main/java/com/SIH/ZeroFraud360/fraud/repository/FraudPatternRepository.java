package com.SIH.ZeroFraud360.fraud.repository;

import com.SIH.ZeroFraud360.fraud.domain.FraudPattern;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FraudPatternRepository extends JpaRepository<FraudPattern, Long> {

    Optional<FraudPattern> findByPatternId(String patternId);

    List<FraudPattern> findAllByOrderByCreatedAtDesc();

    List<FraudPattern> findByStatusOrderByCreatedAtDesc(String status);
}
