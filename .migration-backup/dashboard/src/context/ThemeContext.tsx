import React,{createContext,useContext,useState,useEffect} from 'react';
type T='light'|'dark';
interface Ctx{theme:T;toggle:()=>void;}
const C=createContext<Ctx>({theme:'light',toggle:()=>{}});
export function ThemeProvider({children}:{children:React.ReactNode}){
  const[t,setT]=useState<T>(()=>(localStorage.getItem('s-theme')==='dark'?'dark':'light'));
  useEffect(()=>{document.documentElement.classList.toggle('dark',t==='dark');localStorage.setItem('s-theme',t);},[t]);
  return <C.Provider value={{theme:t,toggle:()=>setT(p=>p==='dark'?'light':'dark')}}>{children}</C.Provider>;
}
export const useTheme=()=>useContext(C);
