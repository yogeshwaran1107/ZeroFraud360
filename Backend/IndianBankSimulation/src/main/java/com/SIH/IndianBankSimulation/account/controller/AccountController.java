package com.SIH.IndianBankSimulation.account.controller;

import com.SIH.IndianBankSimulation.account.dto.AccountBalanceDto;
import com.SIH.IndianBankSimulation.account.dto.AccountResponseDto;
import com.SIH.IndianBankSimulation.account.service.AccountService;
import com.SIH.IndianBankSimulation.common.security.UserPrincipal;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
public class AccountController {

    private final AccountService accountService;

    public AccountController(AccountService accountService) {
        this.accountService = accountService;
    }

    @GetMapping("/me")
    public ResponseEntity<List<AccountResponseDto>> getMyAccounts(@AuthenticationPrincipal UserPrincipal principal) {
        List<AccountResponseDto> accounts = accountService.getAccountsForUser(principal.getId());
        return ResponseEntity.ok(accounts);
    }

    @GetMapping("/me/balance")
    public ResponseEntity<AccountBalanceDto> getMyBalance(@AuthenticationPrincipal UserPrincipal principal) {
        AccountBalanceDto balance = accountService.getPrimaryAccountBalanceForUser(principal.getId());
        return ResponseEntity.ok(balance);
    }

    @GetMapping("/{accountNumber}")
    public ResponseEntity<AccountResponseDto> getAccountByNumber(
            @PathVariable String accountNumber,
            @AuthenticationPrincipal UserPrincipal principal) {
        AccountResponseDto account = accountService.getAccountByNumber(accountNumber, principal.getId());
        return ResponseEntity.ok(account);
    }
}
