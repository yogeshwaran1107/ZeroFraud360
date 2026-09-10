package com.SIH.IndianBankSimulation.common.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.security.Principal;
import java.util.Collection;
import java.util.List;

public class InternalServicePrincipal implements Principal {

    public static final String SERVICE_NAME = "ZERO_FRAUD_360";
    public static final String ROLE_NAME = "ROLE_TRUSTED_SERVICE";

    private final String name;
    private final Collection<? extends GrantedAuthority> authorities;

    public InternalServicePrincipal() {
        this(SERVICE_NAME);
    }

    public InternalServicePrincipal(String name) {
        this.name = name;
        this.authorities = List.of(new SimpleGrantedAuthority(ROLE_NAME));
    }

    @Override
    public String getName() {
        return name;
    }

    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }
}
