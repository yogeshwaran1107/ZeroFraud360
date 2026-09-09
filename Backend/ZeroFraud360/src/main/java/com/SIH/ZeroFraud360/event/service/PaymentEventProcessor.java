package com.SIH.ZeroFraud360.event.service;

import com.SIH.ZeroFraud360.event.dto.PaymentSuccessEvent;

public interface PaymentEventProcessor {

    void process(PaymentSuccessEvent event);
}
