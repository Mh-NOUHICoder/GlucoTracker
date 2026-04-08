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
                    sendNotification("GlucoTrack AI Reminder", "Hi there, it's time for your morning glucose check. 🌞");
                    localStorage.setItem(morningKey, "true");
                 }

                 // Noon Alert
                 if (currentHour === nHour && currentMinute >= nMin && !localStorage.getItem(noonKey)) {
                    sendNotification("GlucoTrack AI Reminder", "Friendly reminder to complete your midday glucose check. 🍽️");
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
              sendNotification("Hydration Reminder 💧", "Staying hydrated is essential for processing glucose. Remember to drink a glass of water!");
              localStorage.setItem(`last_water_${user.id}`, String(now.getTime()));
           }
        }

      } catch (_e) {
        console.error("Smart Reminder Error", _e);
      }
    };

    const sendNotification = (title: string, body: string) => {
      if ("Notification" in window && Notification.permission === "granted") {
         if (swRegistration.current) {
            swRegistration.current.showNotification(title, {
               body,
               icon: "/glucotracker.png", // Fallback if no specific badge
               badge: "/glucotracker.png",
               data: { url: "/upload" }
            });
         } else {
            // Fallback to normal Notification API if SW isn't ready
            new Notification(title, { body, icon: "/glucotracker.png" });
         }
      }
    };

    const interval = setInterval(checkReminders, 1000 * 60 * 5); // Check every 5 min
    checkReminders(); // check immediately
    
    return () => clearInterval(interval);
  }, [user, t]);

  return null;
}

