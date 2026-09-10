package com.SIH.IndianBankSimulation.hold.repository;

import com.SIH.IndianBankSimulation.hold.domain.AccountHold;
import com.SIH.IndianBankSimulation.hold.domain.HoldStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface AccountHoldRepository extends JpaRepository<AccountHold, Long> {

    Optional<AccountHold> findByHoldId(String holdId);

    List<AccountHold> findAllByAccountIdAndStatus(String accountId, HoldStatus status);

    List<AccountHold> findAllByStatusAndExpiresAtLessThanEqual(HoldStatus status, Instant now);

    @Query("SELECT COALESCE(SUM(h.amount), 0) FROM AccountHold h WHERE h.accountId = :accountId AND (h.status = :status OR h.status = com.SIH.IndianBankSimulation.hold.domain.HoldStatus.BLOCKED)")
    BigDecimal sumActiveHoldAmount(@Param("accountId") String accountId, @Param("status") HoldStatus status);
}
