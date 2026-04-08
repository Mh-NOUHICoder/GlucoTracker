"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import localforage from "localforage";
import { useI18n } from "@/lib/i18n";

export default function BackgroundServices() {
  const { user } = useUser();
  const { t } = useI18n();
  const swRegistration = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!user) return;

    // Register Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        swRegistration.current = reg;
      }).catch(err => console.error("Service Worker registration failed", err));
    }

    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
      Notification.requestPermission();
    }

    const checkReminders = async () => {
      try {
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const todayStr = now.toDateString();

        // 1. Glucose Reminders
        const isGlucoEnabled = localStorage.getItem("notify_gluco") !== "false";
        if (isGlucoEnabled) {
           const cachedStr = await localforage.getItem(`readings_${user.id}`);
           if (cachedStr) {
               const readings = cachedStr as { created_at: string }[];
               let lastLoggedAt = 0;
               readings.forEach(r => {
                 const d = new Date(r.created_at).getTime();
                 if (d > lastLoggedAt) lastLoggedAt = d;
               });

               const timeSinceLastLog = now.getTime() - lastLoggedAt;
               const hoursSinceLastLog = timeSinceLastLog / (1000 * 60 * 60);

               // Activates if last recorded entry was more than 48 hours ago
               if (hoursSinceLastLog >= 48) {
                 const morningTimeStr = localStorage.getItem("notify_morning_time") || "08:00";
                 const noonTimeStr = localStorage.getItem("notify_noon_time") || "12:30";
                 
                 const [mHour, mMin] = morningTimeStr.split(":").map(Number);
                 const [nHour, nMin] = noonTimeStr.split(":").map(Number);

                 const morningKey = `reminder_morning_${user.id}_${todayStr}`;
                 const noonKey = `reminder_noon_${user.id}_${todayStr}`;

                 // Morning Alert
                 if (currentHour === mHour && currentMinute >= mMin && !localStorage.getItem(morningKey)) {
                    sendNotification(t("gluco_reminder_title"), t("morning_gluco_body"));
                    localStorage.setItem(morningKey, "true");
                 }

                 // Noon Alert
                 if (currentHour === nHour && currentMinute >= nMin && !localStorage.getItem(noonKey)) {
                    sendNotification(t("gluco_reminder_title"), t("noon_gluco_body"));
                    localStorage.setItem(noonKey, "true");
                 }
               }
           }
        }

        // 2. Hydration Reminders
        const isWaterEnabled = localStorage.getItem("notify_water") === "true";
        if (isWaterEnabled) {
           const waterInterval = Number(localStorage.getItem("water_interval") || 2);
           const lastWaterStr = localStorage.getItem(`last_water_${user.id}`);
           const lastWater = lastWaterStr ? Number(lastWaterStr) : 0;
           
           if (now.getTime() - lastWater >= waterInterval * 60 * 60 * 1000) {
              sendNotification(t("hydration_title"), t("hydration_body"));
              localStorage.setItem(`last_water_${user.id}`, String(now.getTime()));
           }
        }

      } catch (_e) {
        console.error("Smart Reminder Error", _e);
      }
    };

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        console.error("Audio playback failed", e);
      }
    };

    const sendNotification = (title: string, body: string) => {
      playNotificationSound();
      
      if ("Notification" in window && Notification.permission === "granted") {
         if (swRegistration.current) {
            swRegistration.current.showNotification(title, {
               body,
               icon: "/glucotracker.png", // Fallback if no specific badge
               badge: "/glucotracker.png",
               data: { url: "/upload" },
               silent: false,
               vibrate: [200, 100, 200]
            } as any);
         } else {
            // Fallback to normal Notification API if SW isn't ready
            const notification = new Notification(title, { body, icon: "/glucotracker.png", silent: false });
         }
      }
    };

    const interval = setInterval(checkReminders, 1000 * 60 * 5); // Check every 5 min
    checkReminders(); // check immediately
    
    return () => clearInterval(interval);
  }, [user, t]);

  return null;
}

