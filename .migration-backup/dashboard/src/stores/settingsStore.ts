import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SettingsState {
  orgName: string;
  domain: string;
  industry: string;
  companySize: string;
  primaryContact: string;
  timezone: string;
  fiscalYearStart: string;
  setOrgName: (name: string) => void;
  updateSettings: (s: Partial<SettingsState>) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      orgName: 'Sentinel Financial Corp',
      domain: 'sentinel-grc.com',
      industry: 'Financial Services',
      companySize: '500-1000',
      primaryContact: 'admin@sentinel-grc.com',
      timezone: 'America/New_York',
      fiscalYearStart: 'January',
      setOrgName: (name) => set({ orgName: name }),
      updateSettings: (s) => set(s),
    }),
    { name: 'sentinel-settings' }
  )
);
