"use client";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/hooks/useStrings";

export default function Sidebar() {
    const router = useRouter();
    const { t } = useStrings();

    const projectsBtn = (e) => {
        e.preventDefault();
        console.log("Projects button clicked");
        router.push("/pages/projects");
    };

    const newsBtn = (e) => {
        e.preventDefault();
        console.log("News button clicked");
        router.push("/pages/news");
    };

    const meetingsBtn = (e) => {
        e.preventDefault();
        console.log("Meetings button clicked");
        router.push("/pages/meetings");
    };

    const usersBtn = (e) => {
        e.preventDefault();
        console.log("Users button clicked");
        router.push("/pages/users");
    };

    const subscriptionBtn = (e) => {
        e.preventDefault();
        console.log("Subscription button clicked");
        router.push("/pages/subscription");
    };


  return (
    <div className="sticky top-2 w-56 h-screen bg-green-800 text-white flex flex-col justify-between rounded-lg shadow-lg m-2 shrink-0 z-10">
      <div>
        <div className="p-4 text-2xl font-semibold">Geo-Note</div>

        <div className="flex flex-col space-y-4 mt-4 px-4">
          <button onClick={projectsBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.projects')}
          </button>
          <button onClick={newsBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.news')}
          </button>
          <button onClick={meetingsBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.meetings')}
          </button>
          <button onClick={usersBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            Пользователи
          </button>
          <button onClick={subscriptionBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            Подписка
          </button>
          
        </div>
      </div>

      <div className="p-4 text-xs text-gray-200">
        <p>Made by abdu1axad</p>
        <p>Copyright 2025</p>
      </div>
    </div>
  );
}
