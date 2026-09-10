package com.SIH.IndianBankSimulation.common.security;

import com.SIH.IndianBankSimulation.account.repository.BankAccountRepository;
import com.SIH.IndianBankSimulation.auth.domain.User;
import com.SIH.IndianBankSimulation.auth.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;
    private final BankAccountRepository accountRepository;

    public CustomUserDetailsService(UserRepository userRepository, BankAccountRepository accountRepository) {
        this.userRepository = userRepository;
        this.accountRepository = accountRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String identifier) throws UsernameNotFoundException {
        // 1. Try finding by username
        Optional<User> userOpt = userRepository.findByUsername(identifier);

        // 2. Try finding by account number (e.g. 5-digit 10001, 10002 or 10-digit)
        if (userOpt.isEmpty()) {
            userOpt = accountRepository.findByAccountNumber(identifier)
                    .map(account -> account.getCustomer().getUser());
        }

        // 3. Try finding by email
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(identifier);
        }

        User user = userOpt.orElseThrow(() ->
                new UsernameNotFoundException("User not found with identifier (username, account number, or email): " + identifier));
        return UserPrincipal.create(user);
    }

    @Transactional(readOnly = true)
    public UserDetails loadUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + id));
        return UserPrincipal.create(user);
    }
}
