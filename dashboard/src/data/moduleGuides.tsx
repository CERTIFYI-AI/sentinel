import { guides1 } from './guides/guides1';
import { guides2 } from './guides/guides2';
import { guides3 } from './guides/guides3';

export interface ArticleSection {
  id: string;
  title: string;
  content: React.ReactNode;
}

export interface Article {
  id: string;
  title: string;
  description: string;
  sections: ArticleSection[];
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  articles: Article[];
}

export const COLLECTIONS: Collection[] = [
  ...guides1,
  ...guides2,
  ...guides3,
];

// Mapping routes to specific collections to open by default
export const ROUTE_TO_COLLECTION_MAP: Record<string, string> = {
  '/overview': 'overview',
  '/tasks': 'overview',
  '/notifications': 'overview',
  '/reporting': 'overview',
  '/ciso': 'overview',

  '/models': 'ai-governance',
  '/aiia': 'ai-governance',
  '/use-cases': 'ai-governance',
  '/model-validation': 'ai-governance',
  '/agents': 'ai-governance',
  '/trust-engine': 'ai-governance',

  '/ai-gateway': 'ai-gateway',
  '/mcp-gateway': 'mcp-gateway',

  '/security': 'security',
  '/security/scans': 'security',
  '/security/red-team': 'security',
  '/security/policies': 'security',

  '/compliance': 'compliance',
  '/frameworks': 'compliance',
  '/evidence-vault': 'compliance',
  '/policies': 'compliance',
  '/reg-radar': 'compliance',

  '/risks': 'risk-response',
  '/risk/incidents': 'risk-response',
  '/remediation-tracker': 'risk-response',
  '/hitl': 'risk-response',

  '/vendors': 'vendors-privacy',
  '/dsr': 'vendors-privacy',
  '/supply-chain': 'vendors-privacy',
  '/marketplace': 'vendors-privacy',

  '/datasets': 'data-sustainability',
  '/esg-reports': 'data-sustainability',

  '/peer-intelligence': 'enterprise-intelligence',
  '/autopilot': 'enterprise-intelligence',

  '/access-control': 'organization',
  '/continuity': 'organization',
  '/ethics-reporting': 'organization',
};
