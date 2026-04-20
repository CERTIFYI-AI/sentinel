import { useState, useCallback } from 'react';

export type Validator = (value: any, all?: any) => string | null;
export type Schema = Record<string, Validator[]>;

export const validators = {
  required: (msg='Required'): Validator => (v) => (v===undefined||v===null||v==='' ? msg : null),
  minLen: (n: number, msg?: string): Validator => (v) => (typeof v==='string' && v.length<n ? (msg||`Min ${n} chars`) : null),
  maxLen: (n: number, msg?: string): Validator => (v) => (typeof v==='string' && v.length>n ? (msg||`Max ${n} chars`) : null),
  email: (msg='Invalid email'): Validator => (v) => (v && !/^[^@]+@[^@]+\.[^@]+$/.test(v) ? msg : null),
  url: (msg='Invalid URL'): Validator => (v) => { if(!v) return null; try { new URL(v); return null;} catch { return msg; } },
  oneOf: (opts: any[], msg='Invalid value'): Validator => (v) => (v && !opts.includes(v) ? msg : null),
  number: (msg='Must be a number'): Validator => (v) => (v!=='' && v!==null && isNaN(Number(v)) ? msg : null),
};

export function useValidation<T extends Record<string, any>>(schema: Schema) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const validate = useCallback((values: T): boolean => {
    const next: Record<string, string> = {};
    for (const k of Object.keys(schema)) {
      for (const fn of schema[k]) {
        const err = fn(values[k], values);
        if (err) { next[k] = err; break; }
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }, [schema]);
  const clear = (k?: string) => setErrors(prev => { if(!k) return {}; const n={...prev}; delete n[k]; return n; });
  return { errors, validate, clear, setErrors };
}
