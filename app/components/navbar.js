"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/hooks/useStrings";

export default function Navbar() {
  const { t } = useStrings();
  const [coords, setCoords] = useState(t('navbar.determining'));
  const router = useRouter();

  // Получаем координаты при загрузке
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setCoords(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        },
        (error) => {
          console.error(error);
          setCoords(t('navbar.geolocationError'));
        }
      );
    } else {
      setCoords(t('navbar.geolocationUnavailable'));
    }
  }, []);

  return (
    <div className="flex items-center justify-between bg-green-900 text-white p-6 rounded-xl shadow-md m-2">
      {/* Левая часть */}
      <div className="flex items-center space-x-2">
        <span className="material-symbols-outlined text-lg">location_on</span>
        <span className="text-sm">{coords}</span>
      </div>

      {/* Правая часть */}
      <div className="flex items-center space-x-6">
        <span
          className="material-symbols-outlined text-lg cursor-pointer hover:text-green-300 transition"
          onClick={() => router.push("/pages/homeScreen")}
        >
          home
        </span>
        {/* <span className="material-symbols-outlined text-lg cursor-pointer hover:text-green-300 transition">
          search
        </span> */}
        <span
          className="material-symbols-outlined text-lg cursor-pointer hover:text-green-300 transition"
          onClick={() => router.push("/pages/settings")}
        >
          settings
        </span>
      </div>
    </div>
  );
}
