import React from 'react';
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}
export function SentinelInput({ error, leftIcon, rightIcon, style, ...rest }: InputProps) {
  return (
    <div style={{ position:'relative', display:'flex', alignItems:'center' }}>
      {leftIcon && <span style={{ position:'absolute', left:10, color:'hsl(var(--text-4))', pointerEvents:'none' }}>{leftIcon}</span>}
      <input
        {...rest}
        style={{
          width:'100%',
          background:'hsl(var(--bg-surface))',
          border:`1px solid ${error ? 'hsl(var(--s-er-br))' : 'hsl(var(--border))'}`,
          color:'hsl(var(--text-1))',
          fontSize:13,
          padding: leftIcon ? '7px 10px 7px 32px' : '7px 10px',
          paddingRight: rightIcon ? 32 : 10,
          outline:'none',
          ...style
        }}
        onFocus={e => { e.target.style.borderColor='hsl(var(--brand))'; e.target.style.boxShadow='0 0 0 1px hsl(var(--brand))'; }}
        onBlur={e => { e.target.style.borderColor=error?'hsl(var(--s-er-br))':'hsl(var(--border))'; e.target.style.boxShadow='none'; }}
      />
      {rightIcon && <span style={{ position:'absolute', right:10, color:'hsl(var(--text-4))' }}>{rightIcon}</span>}
    </div>
  );
}
