import {useState} from "react";
import {Settings} from "lucide-react";
export default function Settings(){
  return(
    <div className="p-6 bg-slate-50 dark:bg-slate-950 min-h-screen">
      <div className="flex items-center gap-3 mb-6">
        <Settings size={24} className="text-blue-600"/>
        <div><h1 className="text-2xl font-bold text-slate-900 dark:text-white">Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Platform configuration</p></div>
      </div>
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-8 text-center">
        <Settings size={48} className="text-slate-300 dark:text-slate-600 mx-auto mb-4"/>
        <p className="text-slate-500 dark:text-slate-400 text-sm">Full interactive features coming soon</p>
      </div>
    </div>
  );
}
