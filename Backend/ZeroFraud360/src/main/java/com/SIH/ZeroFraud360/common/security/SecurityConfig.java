package com.SIH.ZeroFraud360.common.security;

import com.SIH.ZeroFraud360.common.correlation.CorrelationContext;
import com.SIH.ZeroFraud360.common.correlation.CorrelationFilter;
import com.SIH.ZeroFraud360.common.exception.ApiErrorResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.SecurityContextHolderFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.time.Instant;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

    private final CorrelationFilter correlationFilter;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    public SecurityConfig(CorrelationFilter correlationFilter,
                          JwtAuthenticationFilter jwtAuthenticationFilter,
                          ObjectMapper objectMapper) {
        this.correlationFilter = correlationFilter;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
        this.objectMapper = objectMapper;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                // CSRF disabled because ZeroFraud360 is a stateless REST API using Bearer JWT tokens.
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler())
                )
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(
                                "/api/auth/login",
                                "/internal/v1/events/**",
                                "/actuator/**",
                                "/error",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/",
                                "/index.html",
                                "/static/**",
                                "/*.css",
                                "/*.js",
                                "/*.ico",
                                "/*.png"
                        ).permitAll()
                        // Protected authentication endpoints
                        .requestMatchers("/api/auth/me", "/api/auth/logout").authenticated()
                        // Fraud monitoring APIs - authorized for all 3 officer roles
                        .requestMatchers("/api/fraud/**").hasAnyRole("POLICE", "CYBER", "BANK")
                        // Notification feed APIs - authorized for all 3 officer roles
                        .requestMatchers("/api/notifications/**").hasAnyRole("POLICE", "CYBER", "BANK")
                        // Officer control APIs - authorized for all 3 officer roles
                        .requestMatchers("/api/officer/**").hasAnyRole("POLICE", "CYBER", "BANK")
                        // Deny any other unmapped request by requiring authentication
                        .anyRequest().authenticated()
                )
                .addFilterBefore(correlationFilter, SecurityContextHolderFilter.class)
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    private AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiErrorResponse err = new ApiErrorResponse(
                    Instant.now(),
                    HttpServletResponse.SC_UNAUTHORIZED,
                    "UNAUTHORIZED",
                    "Authentication is required.",
                    CorrelationContext.getCorrelationId(),
                    null
            );
            objectMapper.writeValue(response.getOutputStream(), err);
        };
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, accessDeniedException) -> {
            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            ApiErrorResponse err = new ApiErrorResponse(
                    Instant.now(),
                    HttpServletResponse.SC_FORBIDDEN,
                    "ACCESS_DENIED",
                    "You do not have permission to access this resource.",
                    CorrelationContext.getCorrelationId(),
                    null
            );
            objectMapper.writeValue(response.getOutputStream(), err);
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        config.setAllowedHeaders(List.of("*"));
        config.setExposedHeaders(List.of("X-Correlation-Id", "Authorization"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
