package com.SIH.ZeroFraud360.auth.service;

import com.SIH.ZeroFraud360.auth.domain.User;
import com.SIH.ZeroFraud360.auth.dto.AuthResponse;
import com.SIH.ZeroFraud360.auth.dto.LoginRequest;
import com.SIH.ZeroFraud360.auth.dto.UserProfileDto;
import com.SIH.ZeroFraud360.auth.repository.UserRepository;
import com.SIH.ZeroFraud360.auth.security.JwtProvider;
import com.SIH.ZeroFraud360.auth.security.UserPrincipal;
import com.SIH.ZeroFraud360.common.exception.ResourceNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;

    @Value("${security.login.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${security.login.lock-duration-seconds:300}")
    private int lockDurationSeconds;

    public AuthService(UserRepository userRepository,
                       PasswordEncoder passwordEncoder,
                       JwtProvider jwtProvider) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtProvider = jwtProvider;
    }

    @Transactional(noRollbackFor = BadCredentialsException.class)
    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.username())
                .orElseThrow(() -> {
                    log.warn("Login failure [AUDIT]: Unknown username='{}'", request.username());
                    return new BadCredentialsException("Invalid username or password.");
                });

        Instant now = Instant.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            log.warn("Login rejected [AUDIT]: Account '{}' is locked until {}", user.getUsername(), user.getLockedUntil());
            throw new BadCredentialsException("Account is temporarily locked due to repeated failed attempts. Please try again later.");
        }

        if (!user.isEnabled()) {
            log.warn("Login rejected [AUDIT]: Account '{}' is disabled", user.getUsername());
            throw new BadCredentialsException("Account is disabled.");
        }

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            int attempts = user.getFailedLoginAttempts() + 1;
            user.setFailedLoginAttempts(attempts);
            if (attempts >= maxFailedAttempts) {
                user.setLockedUntil(now.plusSeconds(lockDurationSeconds));
                log.warn("Account locked [AUDIT]: username='{}' reached {} failed attempts. Locked for {}s.",
                        user.getUsername(), attempts, lockDurationSeconds);
            }
            userRepository.save(user);
            log.warn("Login failure [AUDIT]: Bad credentials for username='{}'", user.getUsername());
            throw new BadCredentialsException("Invalid username or password.");
        }

        // Login successful: reset attempts and lock
        user.setFailedLoginAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);

        UserPrincipal principal = UserPrincipal.create(user);
        String token = jwtProvider.generateToken(principal);

        log.info("Login success [AUDIT]: username='{}', role='{}'", user.getUsername(), user.getRole().name());

        return new AuthResponse(
                token,
                "Bearer",
                jwtProvider.getExpirationSeconds(),
                user.getUsername(),
                user.getRole().name()
        );
    }

    @Transactional(readOnly = true)
    public UserProfileDto getCurrentUserProfile(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new ResourceNotFoundException("User", username));

        return new UserProfileDto(
                user.getUsername(),
                user.getRole().name(),
                user.isEnabled()
        );
    }
}
