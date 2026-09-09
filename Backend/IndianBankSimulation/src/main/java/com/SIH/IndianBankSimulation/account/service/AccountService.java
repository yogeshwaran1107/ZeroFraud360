package com.SIH.IndianBankSimulation.account.service;

import com.SIH.IndianBankSimulation.account.domain.BankAccount;
import com.SIH.IndianBankSimulation.account.dto.AccountBalanceDto;
import com.SIH.IndianBankSimulation.account.dto.AccountResponseDto;
import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.common.exception.ResourceNotFoundException;
import com.SIH.IndianBankSimulation.common.exception.UnauthorizedAccountAccessException;
import com.SIH.IndianBankSimulation.customer.domain.Customer;
import com.SIH.IndianBankSimulation.customer.repository.CustomerRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class AccountService {

    private final BankAccountRepository accountRepository;
    private final CustomerRepository customerRepository;

    public AccountService(BankAccountRepository accountRepository, CustomerRepository customerRepository) {
        this.accountRepository = accountRepository;
        this.customerRepository = customerRepository;
    }

    @Transactional(readOnly = true)
    public List<AccountResponseDto> getAccountsForUser(Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer for user id", String.valueOf(userId)));

        return accountRepository.findAllByCustomerId(customer.getId()).stream()
                .map(this::toDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public AccountBalanceDto getPrimaryAccountBalanceForUser(Long userId) {
        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer for user id", String.valueOf(userId)));

        List<BankAccount> accounts = accountRepository.findAllByCustomerId(customer.getId());
        if (accounts.isEmpty()) {
            throw new ResourceNotFoundException("No accounts found for customer", customer.getFullName());
        }

        BankAccount primary = accounts.get(0);
        return new AccountBalanceDto(
                primary.getAccountNumber(),
                primary.getUpiId(),
                primary.getCurrency(),
                primary.getAvailableBalance()
        );
    }

    @Transactional(readOnly = true)
    public AccountResponseDto getAccountByNumber(String accountNumber, Long authenticatedUserId) {
        BankAccount account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new ResourceNotFoundException("Account", accountNumber));

        Customer customer = customerRepository.findByUserId(authenticatedUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer for user id", String.valueOf(authenticatedUserId)));

        // Strict authorization check: customer must own the account
        if (!account.getCustomer().getId().equals(customer.getId())) {
            throw new UnauthorizedAccountAccessException("You are not authorized to view account " + accountNumber);
        }

        return toDto(account);
    }

    public AccountResponseDto toDto(BankAccount account) {
        return new AccountResponseDto(
                account.getId(),
                account.getAccountNumber(),
                account.getIfsc(),
                account.getBank().getBankCode(),
                account.getBank().getName(),
                account.getCustomer().getFullName(),
                account.getCurrency(),
                account.getStatus().name(),
                account.getAvailableBalance(),
                account.getUpiId()
        );
    }
}
