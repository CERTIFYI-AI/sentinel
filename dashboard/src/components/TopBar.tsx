import { useLocation, Link } from 'react-router-dom';
export default function TopBar() {
  const loc = useLocation();
  const page = loc.pathname.split('/').filter(Boolean).pop() || 'Dashboard';
  const title = page.charAt(0).toUpperCase() + page.slice(1).replace(/-/g,' ');
  return (
    <div style={{height:52,borderBottom:'1px solid hsl(var(--border))',display:'flex',alignItems:'center',padding:'0 24px',fontFamily:'Outfit,sans-serif',background:'hsl(var(--card))',flexShrink:0,gap:16}}>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <span style={{fontSize:14,color:'hsl(var(--muted-foreground))'}}>⌂</span>
        <span style={{fontSize:14,fontWeight:500,color:'hsl(var(--foreground))'}}>{title}</span>
      </div>
      <div style={{flex:1}} />
      <div style={{display:'flex',alignItems:'center',gap:12}}>
        <button style={{background:'none',border:'1px solid hsl(var(--border))',borderRadius:6,padding:'5px 12px',fontSize:12,cursor:'pointer',color:'hsl(var(--foreground))',fontFamily:'Outfit'}}>⌕ Search</button>
        <button style={{background:'none',border:'1px solid hsl(var(--border))',borderRadius:6,padding:'5px 10px',fontSize:13,cursor:'pointer',color:'hsl(var(--foreground))',position:'relative' as const}}>✉<span style={{position:'absolute' as const,top:-4,right:-4,background:'hsl(var(--destructive))',color:'#fff',borderRadius:8,fontSize:9,padding:'0 4px',fontWeight:600}}>2</span></button>
        <Link to="/settings" style={{background:'hsl(var(--brand))',color:'#fff',border:'none',borderRadius:6,padding:'5px 14px',fontSize:12,cursor:'pointer',fontFamily:'Outfit',textDecoration:'none',fontWeight:500}}>+ Add new</Link>
      </div>
    </div>
  );
}
