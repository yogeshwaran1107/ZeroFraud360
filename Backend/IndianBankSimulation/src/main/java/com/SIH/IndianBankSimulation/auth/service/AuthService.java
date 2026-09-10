package com.SIH.IndianBankSimulation.auth.service;

import com.SIH.IndianBankSimulation.auth.domain.Role;
import com.SIH.IndianBankSimulation.auth.domain.User;
import com.SIH.IndianBankSimulation.auth.domain.UserStatus;
import com.SIH.IndianBankSimulation.auth.dto.AuthResponse;
import com.SIH.IndianBankSimulation.auth.dto.LoginRequest;
import com.SIH.IndianBankSimulation.auth.dto.RegisterRequest;
import com.SIH.IndianBankSimulation.auth.dto.UserProfileDto;
import com.SIH.IndianBankSimulation.auth.repository.RoleRepository;
import com.SIH.IndianBankSimulation.auth.repository.UserRepository;
import com.SIH.IndianBankSimulation.common.exception.DuplicateResourceException;
import com.SIH.IndianBankSimulation.common.exception.ResourceNotFoundException;
import com.SIH.IndianBankSimulation.common.security.JwtProvider;
import com.SIH.IndianBankSimulation.common.security.UserPrincipal;
import com.SIH.IndianBankSimulation.customer.domain.Customer;
import com.SIH.IndianBankSimulation.customer.repository.CustomerRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final CustomerRepository customerRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final long expirationMs;

    public AuthService(
            AuthenticationManager authenticationManager,
            UserRepository userRepository,
            RoleRepository roleRepository,
            CustomerRepository customerRepository,
            PasswordEncoder passwordEncoder,
            JwtProvider jwtProvider,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.customerRepository = customerRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
        this.expirationMs = expirationMs;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getUsername(), request.getPassword())
        );

        UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
        String token = jwtProvider.generateToken(principal);

        List<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return new AuthResponse(token, "Bearer", expirationMs, principal.getId(), principal.getUsername(), roles);
    }

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new DuplicateResourceException("Username '" + request.getUsername() + "' is already registered.");
        }
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email '" + request.getEmail() + "' is already registered.");
        }
        if (customerRepository.existsByMobileNumber(request.getMobileNumber())) {
            throw new DuplicateResourceException("Mobile number '" + request.getMobileNumber() + "' is already registered.");
        }

        Role customerRole = roleRepository.findByName("ROLE_CUSTOMER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_CUSTOMER")));

        User user = new User(
                request.getUsername(),
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                UserStatus.ACTIVE
        );
        user.setRoles(Set.of(customerRole));
        User savedUser = userRepository.save(user);

        Customer customer = new Customer(
                savedUser,
                request.getFullName(),
                request.getMobileNumber(),
                request.getEmail()
        );
        customerRepository.save(customer);

        UserPrincipal principal = UserPrincipal.create(savedUser);
        String token = jwtProvider.generateToken(principal);

        List<String> roles = principal.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList();

        return new AuthResponse(token, "Bearer", expirationMs, savedUser.getId(), savedUser.getUsername(), roles);
    }

    @Transactional(readOnly = true)
    public UserProfileDto getProfile(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", String.valueOf(userId)));

        Customer customer = customerRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Customer profile for user id", String.valueOf(userId)));

        List<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .toList();

        return new UserProfileDto(user.getId(), user.getUsername(), user.getEmail(),
                customer.getFullName(), customer.getMobileNumber(), roles);
    }
}
