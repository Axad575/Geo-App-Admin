"use client";
import { useRouter } from "next/navigation";
import { useStrings } from "@/app/hooks/useStrings";

export default function Sidebar() {
    const router = useRouter();
    const { t } = useStrings();

    const usersBtn = (e) => {
        e.preventDefault();
        console.log("Library button clicked");
        router.push("/pages/usersScreen");
    };

    const projectsBtn = (e) => {
        e.preventDefault();
        console.log("Projects button clicked");
        router.push("/pages/projectsScreen");
    };

    const newsBtn = (e) => {
        e.preventDefault();
        console.log("News button clicked");
        router.push("/pages/newsScreen");
    };

    const meetingsBtn = (e) => {
        e.preventDefault();
        console.log("Meetings button clicked");
        router.push("/pages/meetingsScreen");
    };


  return (
    <div className="sticky top-2 w-56 h-screen bg-green-800 text-white flex flex-col justify-between rounded-lg shadow-lg m-2 shrink-0 z-10">
      <div>
        <div className="p-4 text-2xl font-semibold">Geo-app</div>

        <div className="flex flex-col space-y-4 mt-4 px-4">
          <button onClick={usersBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.users')}
          </button>
          <button onClick={projectsBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.projects')}
          </button>
          <button onClick={newsBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.news')}
          </button>
          <button onClick={meetingsBtn} className="bg-green-400 text-black py-2 rounded-md hover:bg-green-300 transition">
            {t('nav.meetings')}
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
