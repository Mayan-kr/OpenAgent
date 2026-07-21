export type InteractiveElement = {
  role: string;
  label: string;
  selector: string;
  disabled: boolean;
};

export type DomNode = {
  tag: string;
  role: string | null;
  name: string | null;
  selector: string;
  text: string;
  children: DomNode[];
};

export type FormSummary = {
  selector: string;
  action: string;
  method: string;
  fields: string[];
};

export type TableSummary = {
  selector: string;
  caption: string;
  headers: string[];
  rowCount: number;
};

export type DomSnapshot = {
  landmarks: string[];
  headings: string[];
  forms: FormSummary[];
  tables: TableSummary[];
  tree: DomNode[];
};

export type FormField = {
  index: number;
  selector: string;
  label: string;
  type: string;
  required: boolean;
};

export type ProposedAction = {
  type: "fill";
  index: number;
  selector: string;
  label: string;
  value: string;
};

export type PageContext = {
  url: string;
  title: string;
  text: string;
  selectedText: string;
  interactiveElements: InteractiveElement[];
  formFields: FormField[];
  dom: DomSnapshot;
};

export type ExtensionMessage = { type: "OPEN_SIDE_PANEL" } | { type: "GET_PAGE_CONTEXT" };

export type ProviderConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type ChatMessage = {
  role: "user" | "agent";
  content: string;
  actions?: ProposedAction[];
};

export type ProfileField = { label: string; value: string };
