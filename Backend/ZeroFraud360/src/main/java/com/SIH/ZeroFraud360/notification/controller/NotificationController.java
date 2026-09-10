package com.SIH.ZeroFraud360.notification.controller;

import com.SIH.ZeroFraud360.notification.service.NotificationBroadcastService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationBroadcastService notificationService;

    public NotificationController(NotificationBroadcastService notificationService) {
        this.notificationService = notificationService;
    }

    @GetMapping
    public ResponseEntity<List<NotificationBroadcastService.NotificationRecord>> getRecentNotifications() {
        return ResponseEntity.ok(notificationService.getRecentNotifications());
    }

    @GetMapping("/alert/{alertId}")
    public ResponseEntity<List<NotificationBroadcastService.NotificationRecord>> getNotificationsForAlert(@PathVariable("alertId") String alertId) {
        return ResponseEntity.ok(notificationService.getNotificationsForAlert(alertId));
    }
}
